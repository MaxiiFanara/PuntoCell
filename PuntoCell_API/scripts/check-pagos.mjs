// Chequeo del módulo de pagos. Sin framework: node:assert y un main() que
// corta en el primer error. Correr con:
//   docker compose exec api node scripts/check-pagos.mjs
import assert from 'node:assert/strict';
import { crearMercadoPagoClient } from '../src/modules/pagos/mercadopago.client.js';
import { crearPagosService } from '../src/modules/pagos/pagos.service.js';

const casos = [];
const test = (nombre, fn) => casos.push([nombre, fn]);

// --- mercadopago.client.js ---

test('crearPreferencia manda el token y devuelve el init_point', async () => {
  let recibido = null;
  const fetchFalso = async (url, opciones) => {
    recibido = { url, opciones };
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'pref-1', init_point: 'https://mp/checkout/pref-1' }),
    };
  };

  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  const pref = await client.crearPreferencia({ items: [] });

  assert.equal(pref.init_point, 'https://mp/checkout/pref-1');
  assert.equal(recibido.url, 'https://api.mercadopago.com/checkout/preferences');
  assert.equal(recibido.opciones.method, 'POST');
  assert.equal(recibido.opciones.headers.Authorization, 'Bearer TEST-abc');
});

test('crearPreferencia tira error con el detalle que devuelve MP', async () => {
  const fetchFalso = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ message: 'invalid unit_price' }),
  });

  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  await assert.rejects(
    () => client.crearPreferencia({ items: [] }),
    /invalid unit_price/
  );
});

test('obtenerPago devuelve null cuando MP responde 404', async () => {
  const fetchFalso = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  assert.equal(await client.obtenerPago('999'), null);
});

test('obtenerPago pega al endpoint de pagos con el id', async () => {
  let urlRecibida = null;
  const fetchFalso = async (url) => {
    urlRecibida = url;
    return { ok: true, status: 200, json: async () => ({ id: 123, status: 'approved' }) };
  };
  const client = crearMercadoPagoClient({ accessToken: 'TEST-abc', fetchImpl: fetchFalso });
  const pago = await client.obtenerPago('123');

  assert.equal(urlRecibida, 'https://api.mercadopago.com/v1/payments/123');
  assert.equal(pago.status, 'approved');
});

// --- pagos.service.js: crearCheckout ---

// Catálogo falso con la misma forma que devuelve CatalogoService.getProductosVendibles().
const catalogoFalso = (productos) => ({
  getProductosVendibles: async () => ({ productos, cotizacionDolar: 1000 }),
});

const PRODUCTOS = [
  { id: '4', name: 'Apple iPhone 14 Pro', priceUsd: 1871100, stock: 2, categoria: 'celulares' },
  { id: '9', name: 'Funda Silicona', priceUsd: 3024, stock: 0, categoria: 'accesorios' },
];

const mpFalso = () => {
  const llamadas = [];
  return {
    llamadas,
    crearPreferencia: async (pref) => {
      llamadas.push(pref);
      return { id: 'pref-1', init_point: 'https://mp/checkout/pref-1' };
    },
    obtenerPago: async () => null,
  };
};

const servicioDePrueba = (mp) =>
  crearPagosService({
    catalogoService: catalogoFalso(PRODUCTOS),
    mpClient: mp,
    backUrlBase: 'http://localhost:5173',
    webhookUrl: '',
  });

test('crearCheckout usa el precio de la base y no el que manda el carrito', async () => {
  const mp = mpFalso();
  const servicio = servicioDePrueba(mp);

  await servicio.crearCheckout({
    items: [{ id: '4', cantidad: 2, price: 1 }], // precio manipulado por el cliente
    comprador: { email: 'test@test.com', nombre: 'Ana', telefono: '351000000' },
  });

  const pref = mp.llamadas[0];
  assert.equal(pref.items.length, 1);
  assert.equal(pref.items[0].unit_price, 1871100);
  assert.equal(pref.items[0].quantity, 2);
  assert.equal(pref.items[0].currency_id, 'ARS');
});

test('crearCheckout rechaza con 409 si no alcanza el stock y no llama a MP', async () => {
  const mp = mpFalso();
  const servicio = servicioDePrueba(mp);

  await assert.rejects(
    () => servicio.crearCheckout({
      items: [{ id: '4', cantidad: 5 }],
      comprador: { email: 'test@test.com' },
    }),
    (err) => {
      assert.equal(err.status, 409);
      assert.deepEqual(err.detalle, [{ id: '4', motivo: 'sin_stock', disponible: 2 }]);
      return true;
    }
  );

  assert.equal(mp.llamadas.length, 0);
});

test('crearCheckout rechaza con 409 un producto que no esta en el catalogo', async () => {
  const mp = mpFalso();
  const servicio = servicioDePrueba(mp);

  await assert.rejects(
    () => servicio.crearCheckout({
      items: [{ id: '404', cantidad: 1 }],
      comprador: { email: 'test@test.com' },
    }),
    (err) => {
      assert.equal(err.status, 409);
      assert.deepEqual(err.detalle, [{ id: '404', motivo: 'inexistente', disponible: 0 }]);
      return true;
    }
  );
});

test('crearCheckout junta todos los motivos de rechazo en una sola respuesta', async () => {
  const servicio = servicioDePrueba(mpFalso());

  await assert.rejects(
    () => servicio.crearCheckout({
      items: [{ id: '9', cantidad: 1 }, { id: '404', cantidad: 1 }],
      comprador: { email: 'test@test.com' },
    }),
    (err) => {
      assert.equal(err.detalle.length, 2);
      return true;
    }
  );
});

test('crearCheckout no manda notification_url si no hay webhook configurado', async () => {
  const mp = mpFalso();
  const servicio = servicioDePrueba(mp);

  const { initPoint, externalReference } = await servicio.crearCheckout({
    items: [{ id: '4', cantidad: 1 }],
    comprador: { email: 'test@test.com' },
  });

  assert.equal(initPoint, 'https://mp/checkout/pref-1');
  assert.ok(externalReference.length > 0);
  assert.equal('notification_url' in mp.llamadas[0], false);
  assert.equal(mp.llamadas[0].external_reference, externalReference);
});

test('crearCheckout no manda auto_return con back_urls http (MP lo rechaza)', async () => {
  const mp = mpFalso();
  const servicio = servicioDePrueba(mp);

  await servicio.crearCheckout({
    items: [{ id: '4', cantidad: 1 }],
    comprador: { email: 'test@test.com' },
  });

  assert.equal('auto_return' in mp.llamadas[0], false);
  assert.equal(
    mp.llamadas[0].back_urls.success,
    'http://localhost:5173/catalogo/pago/resultado'
  );
});

// --- pagos.service.js: consultarPago ---

const servicioConPago = (pago) =>
  crearPagosService({
    catalogoService: catalogoFalso(PRODUCTOS),
    mpClient: { crearPreferencia: async () => ({}), obtenerPago: async () => pago },
    backUrlBase: 'http://localhost:5173',
    webhookUrl: '',
  });

const PAGO_MP = {
  id: 123456,
  status: 'approved',
  external_reference: 'ref-abc',
  transaction_amount: 3742200,
  date_approved: '2026-09-16T10:00:00.000-03:00',
  date_created: '2026-09-16T09:59:00.000-03:00',
  payment_method_id: 'visa',
  additional_info: {
    items: [{ id: '4', title: 'Apple iPhone 14 Pro', quantity: '2', unit_price: '1871100' }],
  },
};

test('consultarPago normaliza un pago aprobado y arma el comprobante desde MP', async () => {
  const resultado = await servicioConPago(PAGO_MP).consultarPago('123456');

  assert.equal(resultado.estado, 'approved');
  assert.equal(resultado.paymentId, '123456');
  assert.equal(resultado.externalReference, 'ref-abc');
  assert.equal(resultado.total, 3742200);
  assert.equal(resultado.medio, 'visa');
  assert.equal(resultado.fecha, '2026-09-16T10:00:00.000-03:00');
  assert.deepEqual(resultado.items, [
    { id: '4', title: 'Apple iPhone 14 Pro', quantity: 2, unitPrice: 1871100 },
  ]);
});

test('consultarPago mapea in_process a pending', async () => {
  const resultado = await servicioConPago({ ...PAGO_MP, status: 'in_process' }).consultarPago('1');
  assert.equal(resultado.estado, 'pending');
});

test('consultarPago mapea cancelled a rejected', async () => {
  const resultado = await servicioConPago({ ...PAGO_MP, status: 'cancelled' }).consultarPago('1');
  assert.equal(resultado.estado, 'rejected');
});

test('consultarPago cae en desconocido ante un estado que MP agregue despues', async () => {
  const resultado = await servicioConPago({ ...PAGO_MP, status: 'charged_back' }).consultarPago('1');
  assert.equal(resultado.estado, 'desconocido');
});

test('consultarPago usa date_created cuando el pago no fue aprobado', async () => {
  const pendiente = { ...PAGO_MP, status: 'pending', date_approved: null };
  const resultado = await servicioConPago(pendiente).consultarPago('1');
  assert.equal(resultado.fecha, '2026-09-16T09:59:00.000-03:00');
});

test('consultarPago devuelve null si MP no conoce el pago', async () => {
  assert.equal(await servicioConPago(null).consultarPago('999'), null);
});

test('consultarPago no explota si MP no manda additional_info', async () => {
  const sinInfo = { ...PAGO_MP, additional_info: undefined };
  const resultado = await servicioConPago(sinInfo).consultarPago('1');
  assert.deepEqual(resultado.items, []);
});

test('consultarPago descarta un id invalido sin llegar a llamar a MP', async () => {
  let llamado = false;
  const servicio = crearPagosService({
    catalogoService: catalogoFalso(PRODUCTOS),
    mpClient: {
      crearPreferencia: async () => ({}),
      obtenerPago: async () => { llamado = true; return PAGO_MP; },
    },
    backUrlBase: 'http://localhost:5173',
    webhookUrl: '',
  });

  // '0' es el que importa: MP lo rechaza con 400 y salía como 500 al comprador.
  for (const id of ['0', '-5', 'abc', '', null, undefined]) {
    assert.equal(await servicio.consultarPago(id), null, `id inválido: ${id}`);
  }
  assert.equal(llamado, false);
});

// --- pagos.service.js: registro de la venta (Nivel 3) ---

const PAGO_CRUDO = {
  id: 178428934069,
  status: 'approved',
  external_reference: 'ref-abc',
  transaction_amount: 6048,
  date_approved: '2026-09-16T10:00:00.000-03:00',
  // Tarjeta de crédito en 3 cuotas: el caso que hoy se registraba mal.
  payment_method_id: 'master',
  payment_type_id: 'credit_card',
  installments: 3,
  // El documento del payer es el de la cuenta de Mercado Pago, no el que el
  // comprador escribió en el checkout: ese viaja en metadata.dni.
  payer: { email: 'comprador@testuser.com', identification: { number: '1111111', type: 'DNI' } },
  metadata: { nombre: 'Ana Prueba', dni: '38222333', email: 'ana@formulario.com', celular: '3510001122' },
  additional_info: { items: [{ id: '2', title: 'Funda Silicona', quantity: '2', unit_price: '3024' }] },
};

// models falso: solo lo que usa confirmarVenta. El findOne de Usuario mira el
// where para poder distinguir la búsqueda por DNI de la búsqueda por email.
const modelsFalsos = ({ ventaExistente = null, clientePorDni = null, clientePorEmail = null } = {}) => {
  const creados = { usuarios: [], busquedas: [] };
  return {
    creados,
    Venta: { findOne: async () => ventaExistente },
    Usuario: {
      findOne: async ({ where }) => {
        if (where?.DNI !== undefined) {
          creados.busquedas.push({ por: 'DNI', valor: where.DNI });
          return clientePorDni;
        }
        creados.busquedas.push({ por: 'Email', valor: where?.Email });
        return clientePorEmail;
      },
      create: async (d) => { creados.usuarios.push(d); return { Id: 77, ...d }; },
    },
    Cotizacion: {
      findAll: async () => [
        { Id: 1, Clave: 'DolarBlue', Valor: 1450, CreatedAt: '2026-09-01' },
        { Id: 2, Clave: 'DolarOficial', Valor: 1000, CreatedAt: '2026-09-01' },
      ],
    },
    PrecioArticulo: {
      findAll: async () => [{ IdInventario: 2, CostoReal: 1890, FechaDesde: '2026-01-01' }],
    },
    MetodoPago: {
      findAll: async () => [
        { Id: 1, Nombre: 'efectivo' },
        { Id: 2, Nombre: 'billetera virtual (qr/alias)' },
        { Id: 3, Nombre: 'transferencia bancaria' },
        { Id: 4, Nombre: 'tarjeta de debito' },
        { Id: 5, Nombre: 'tarjeta de credito' },
        { Id: 6, Nombre: 'cuotas' },
      ],
    },
  };
};

const servicioNivel3 = (models, ventaServiceFalso, pagoCrudo = PAGO_CRUDO) =>
  crearPagosService({
    catalogoService: catalogoFalso(PRODUCTOS),
    mpClient: { crearPreferencia: async () => ({ init_point: 'x' }), obtenerPago: async () => pagoCrudo },
    backUrlBase: 'http://localhost:5173',
    webhookUrl: '',
    models,
    ventaService: ventaServiceFalso,
    ventaOnline: { idEmpleado: 6, idTurnoCaja: 2, idMetodoPago: 2 },
  });

test('la venta se arma con TotalVenta en dolares y TotalVentaARS en pesos', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } });

  const resultado = await servicio.consultarPago('178428934069');

  assert.equal(resultado.ventaId, 99);
  assert.equal(payload.TotalVentaARS, 6048);
  // 6048 / 1450 = 4.17. La base guarda los precios en pesos y TotalVenta en USD.
  assert.equal(payload.TotalVenta, 4.17);
  // 1890 de CostoReal x 2 unidades
  assert.equal(payload.TotalCosto, 3780);
  assert.equal(payload.IdCotizacionDolar, 1);
});

test('el detalle apunta al inventario que devuelve MP, con el precio en pesos', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } });
  await servicio.consultarPago('178428934069');

  assert.deepEqual(payload.Detalles, [{ IdArticulo: 2, Cantidad: 2, PrecioUnitario: 3024 }]);
  assert.equal(payload.Pagos.length, 1);
  assert.equal(payload.Pagos[0].Monto, 6048);
});

test('la venta usa la identidad online configurada', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } });
  await servicio.consultarPago('178428934069');

  assert.equal(payload.IdEmpleado, 6);
  assert.equal(payload.IdTurnoCaja, 2);
  assert.ok(payload.Observaciones.includes('MP:178428934069'));
});

test('no se registra dos veces el mismo pago', async () => {
  let llamadas = 0;
  const models = modelsFalsos({ ventaExistente: { Id: 55 } });
  const servicio = servicioNivel3(models, { create: async () => { llamadas++; return { Id: 99 }; } });

  const resultado = await servicio.consultarPago('178428934069');

  assert.equal(resultado.ventaId, 55);
  assert.equal(llamadas, 0);
});

test('el cliente nuevo se crea con el DNI del checkout, no con el de la cuenta de MP', async () => {
  const models = modelsFalsos();
  const servicio = servicioNivel3(models, { create: async () => ({ Id: 99 }) });
  await servicio.consultarPago('178428934069');

  const u = models.creados.usuarios[0];
  // Los dos vienen del formulario, no de la cuenta de Mercado Pago:
  // MP devolvería comprador@testuser.com y documento 1111111.
  assert.equal(u.Email, 'ana@formulario.com');
  assert.equal(u.DNI, '38222333');
  assert.equal(u.Nombre, 'Ana');
  assert.equal(u.Apellido, 'Prueba');
  assert.equal(u.Celular, '3510001122');
  assert.equal(u.EsCliente, true);
});

test('si el DNI ya es cliente del local, la venta queda a nombre de esa persona', async () => {
  let payload = null;
  const models = modelsFalsos({ clientePorDni: { Id: 5 } });
  const servicio = servicioNivel3(models, { create: async (d) => { payload = d; return { Id: 99 }; } });
  await servicio.consultarPago('178428934069');

  assert.equal(payload.IdCliente, 5);
  assert.equal(models.creados.usuarios.length, 0, 'no puede crear un duplicado');
  assert.deepEqual(models.creados.busquedas[0], { por: 'DNI', valor: '38222333' });
});

test('si el DNI no esta pero el email si, se reusa ese cliente', async () => {
  let payload = null;
  const models = modelsFalsos({ clientePorEmail: { Id: 8 } });
  const servicio = servicioNivel3(models, { create: async (d) => { payload = d; return { Id: 99 }; } });
  await servicio.consultarPago('178428934069');

  assert.equal(payload.IdCliente, 8);
  assert.equal(models.creados.usuarios.length, 0);
});

test('sin DNI en el metadata no se busca por documento y cae al de la cuenta de MP', async () => {
  const models = modelsFalsos();
  const servicio = servicioNivel3(models, { create: async () => ({ Id: 99 }) }, {
    ...PAGO_CRUDO,
    metadata: { ...PAGO_CRUDO.metadata, dni: '' },
  });
  await servicio.consultarPago('178428934069');

  assert.equal(models.creados.busquedas.some((b) => b.por === 'DNI'), false);
  assert.equal(models.creados.usuarios[0].DNI, '1111111');
});

test('no se busca por el email de la cuenta de MP, solo por el del formulario', async () => {
  const models = modelsFalsos({ clientePorEmail: { Id: 2012 } });
  const servicio = servicioNivel3(models, { create: async () => ({ Id: 99 }) });
  await servicio.consultarPago('178428934069');

  const busquedaEmail = models.creados.busquedas.find((b) => b.por === 'Email');
  // Si buscara por comprador@testuser.com (la cuenta de MP), dos personas
  // distintas pagando desde la misma cuenta se colapsarían en un solo cliente.
  assert.equal(busquedaEmail.valor, 'ana@formulario.com');
});

test('si no alcanza el stock el pago se informa igual, con aviso y sin ventaId', async () => {
  const servicio = servicioNivel3(modelsFalsos(), {
    create: async () => { throw new Error('Stock insuficiente para el producto (Id 2).'); },
  });

  const resultado = await servicio.consultarPago('178428934069');

  assert.equal(resultado.estado, 'approved');
  assert.equal(resultado.ventaId, null);
  assert.ok(resultado.avisoRegistro.length > 0);
});

test('un pago rechazado no registra ninguna venta', async () => {
  let llamadas = 0;
  const servicio = servicioNivel3(
    modelsFalsos(),
    { create: async () => { llamadas++; return { Id: 99 }; } },
    { ...PAGO_CRUDO, status: 'rejected' }
  );

  const resultado = await servicio.consultarPago('178428934069');

  assert.equal(resultado.estado, 'rejected');
  assert.equal(llamadas, 0);
});

test('el endpoint publico no filtra datos personales del comprador', async () => {
  const servicio = servicioNivel3(modelsFalsos(), { create: async () => ({ Id: 99 }) });
  const resultado = await servicio.consultarPago('178428934069');

  const serializado = JSON.stringify(resultado);
  assert.equal(serializado.includes('comprador@testuser.com'), false, 'no puede salir el email');
  assert.equal(serializado.includes('1111111'), false, 'no puede salir el DNI');
});

test('crearCheckout manda nombre y DNI en el metadata de la preferencia', async () => {
  const mp = mpFalso();
  const servicio = servicioDePrueba(mp);

  await servicio.crearCheckout({
    items: [{ id: '4', cantidad: 1 }],
    // Con puntos, como lo escribe cualquiera.
    comprador: { email: 'a@b.com', nombre: 'Ana Prueba', dni: '38.222.333', celular: '3510001122' },
  });

  const meta = mp.llamadas[0].metadata;
  assert.equal(meta.nombre, 'Ana Prueba');
  // Se normaliza a solo dígitos: así matchea contra el DNI guardado en la base.
  assert.equal(meta.dni, '38222333');
  // El email va en el metadata porque MP devuelve el de la cuenta, no este.
  assert.equal(meta.email, 'a@b.com');
  assert.equal(meta.celular, '3510001122');
});

test('el medio de pago sale del tipo que informa MP, no de uno fijo', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } });
  await servicio.consultarPago('178428934069');

  // credit_card -> 'tarjeta de credito' (Id 5), no el 2 configurado por entorno.
  assert.equal(payload.Pagos[0].IdMetodoPago, 5);
});

test('dinero en cuenta se registra como billetera virtual', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } }, {
    ...PAGO_CRUDO, payment_type_id: 'account_money', payment_method_id: 'account_money', installments: 1,
  });
  await servicio.consultarPago('178428934069');

  assert.equal(payload.Pagos[0].IdMetodoPago, 2);
});

test('pagar en efectivo por Rapipago se registra como efectivo', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } }, {
    ...PAGO_CRUDO, payment_type_id: 'ticket', payment_method_id: 'rapipago', installments: 1,
  });
  await servicio.consultarPago('178428934069');

  assert.equal(payload.Pagos[0].IdMetodoPago, 1);
});

test('un tipo de pago que MP agregue despues cae al metodo configurado', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } }, {
    ...PAGO_CRUDO, payment_type_id: 'crypto_transfer', installments: 1,
  });
  await servicio.consultarPago('178428934069');

  assert.equal(payload.Pagos[0].IdMetodoPago, 2);
});

test('las cuotas de tarjeta NO se registran como el metodo cuotas', async () => {
  let payload = null;
  const servicio = servicioNivel3(modelsFalsos(), { create: async (d) => { payload = d; return { Id: 99 }; } });
  await servicio.consultarPago('178428934069');

  // 'cuotas' (Id 6) en este sistema significa que financia el local y arma un
  // cronograma de Cuota. Con MP financia el emisor y el local cobra todo junto.
  assert.notEqual(payload.Pagos[0].IdMetodoPago, 6);
  // Pero el dato no se pierde: queda en la observación para poder conciliar.
  assert.ok(payload.Pagos[0].Observacion.includes('3 cuotas'));
  assert.ok(payload.Pagos[0].Observacion.includes('master'));
});

// --- runner ---

const main = async () => {
  for (const [nombre, fn] of casos) {
    try {
      await fn();
      console.log(`  ok  ${nombre}`);
    } catch (err) {
      console.error(`FALLA  ${nombre}`);
      console.error(err);
      process.exit(1);
    }
  }
  console.log(`\n${casos.length} chequeos pasaron`);
};

main();

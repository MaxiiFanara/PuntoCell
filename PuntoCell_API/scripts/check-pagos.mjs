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
    items: [{ title: 'Apple iPhone 14 Pro', quantity: '2', unit_price: '1871100' }],
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
    { title: 'Apple iPhone 14 Pro', quantity: 2, unitPrice: 1871100 },
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

import { randomUUID } from 'node:crypto';
import { Op } from 'sequelize';

const error409 = (detalle) => {
  const err = new Error('Hay productos que ya no se pueden comprar');
  err.status = 409;
  err.detalle = detalle;
  return err;
};

// MP tiene más estados de los que le importan a la vitrina. Se colapsan a tres,
// y lo que no está en el mapa cae en 'desconocido' para que agregar un estado
// nuevo del lado de MP no rompa la pantalla de resultado.
const ESTADOS = {
  approved: 'approved',
  authorized: 'approved',
  pending: 'pending',
  in_process: 'pending',
  in_mediation: 'pending',
  rejected: 'rejected',
  cancelled: 'rejected',
  refunded: 'rejected',
};

// catalogoService y mpClient se inyectan para poder chequear el módulo sin base
// ni red (scripts/check-pagos.mjs).
export const crearPagosService = ({
  catalogoService,
  mpClient,
  backUrlBase,
  webhookUrl,
  models = null,
  ventaService = null,
  ventaOnline = {},
}) => {

  const crearCheckout = async ({ items = [], comprador = {} }) => {
    if (!items.length) {
      const err = new Error('El carrito está vacío');
      err.status = 400;
      throw err;
    }

    // Se revalida contra el catálogo real en vez de confiar en el carrito: el
    // localStorage del comprador es editable y mandaría el precio que quiera.
    // Se reusa CatalogoService para que el precio cobrado sea exactamente el
    // mismo que muestra la vitrina (misma resolución de lista minorista vigente).
    // ponytail: trae el catálogo entero para validar N ítems. Si el catálogo
    // crece, filtrar por ids en el propio service del catálogo.
    // Sin IdSucursal: se valida contra el inventario de todas las sedes, igual
    // que lo que ve el comprador. Filtrar por una sola hacía que un producto de
    // la otra sucursal se rechazara como "inexistente" al ir a pagar.
    const { productos } = await catalogoService.getProductosVendibles();
    const porId = new Map(productos.map((p) => [String(p.id), p]));

    const rechazados = [];
    const itemsPreferencia = [];

    for (const item of items) {
      const id = String(item.id);
      const cantidad = Math.max(1, Number(item.cantidad) || 0);
      const producto = porId.get(id);

      if (!producto) {
        rechazados.push({ id, motivo: 'inexistente', disponible: 0 });
        continue;
      }
      if (Number(producto.stock) < cantidad) {
        rechazados.push({ id, motivo: 'sin_stock', disponible: Number(producto.stock) });
        continue;
      }

      itemsPreferencia.push({
        id,
        title: producto.name,
        quantity: cantidad,
        // Precio de la base, en pesos y sin convertir: es lo que muestra el catálogo.
        unit_price: Number(producto.priceUsd),
        currency_id: 'ARS',
      });
    }

    if (rechazados.length) throw error409(rechazados);

    const externalReference = randomUUID();
    const resultado = `${backUrlBase}/catalogo/pago/resultado`;

    const preferencia = {
      items: itemsPreferencia,
      external_reference: externalReference,
      payer: {
        email: comprador.email,
        name: comprador.nombre,
        phone: comprador.telefono ? { number: String(comprador.telefono) } : undefined,
      },
      // MP devuelve el metadata intacto en el pago. Es la única forma de recuperar
      // el nombre y el teléfono del comprador: cuando paga con su cuenta de Mercado
      // Pago, el payer que vuelve trae first_name, last_name y phone en null.
      metadata: {
        nombre: comprador.nombre || '',
        telefono: comprador.telefono ? String(comprador.telefono) : '',
      },
      back_urls: { success: resultado, pending: resultado, failure: resultado },
    };

    // auto_return exige back_urls https; con localhost, MP rechaza la preferencia
    // entera. En desarrollo el comprador vuelve con el botón de MP.
    if (backUrlBase.startsWith('https://')) preferencia.auto_return = 'approved';

    // MP no puede alcanzar localhost: sin URL pública no se manda notification_url.
    if (webhookUrl) preferencia.notification_url = webhookUrl;

    const pref = await mpClient.crearPreferencia(preferencia);

    return { initPoint: pref.init_point, externalReference };
  };

  const resolverCliente = async (pagoCrudo) => {
    const { Usuario } = models;
    const email = pagoCrudo.payer?.email || null;

    if (email) {
      const existente = await Usuario.findOne({ where: { Email: email } });
      if (existente) return existente.Id;
    }

    // Usuario exige DNI, Nombre, Apellido, Email y Celular NOT NULL. MP aporta el
    // email y el documento; el nombre y el teléfono vienen del metadata que
    // mandamos al crear la preferencia. Lo que falte lleva un relleno explícito
    // en vez de romper el alta.
    const nombreCompleto = (pagoCrudo.metadata?.nombre || '').trim();
    const [nombre, ...resto] = nombreCompleto.split(/\s+/).filter(Boolean);

    const creado = await Usuario.create({
      DNI: pagoCrudo.payer?.identification?.number || `MP${pagoCrudo.id}`,
      Nombre: nombre || 'Comprador',
      Apellido: resto.join(' ') || 'Online',
      Email: email || `mp-${pagoCrudo.id}@sin-email.local`,
      Celular: pagoCrudo.metadata?.telefono || '-',
      EsCliente: true,
      Activo: true,
    });

    return creado.Id;
  };

  const confirmarVenta = async (normalizado, pagoCrudo) => {
    const { Venta, Cotizacion, PrecioArticulo } = models;
    const marca = `MP:${normalizado.paymentId}`;

    // Idempotencia: el webhook reintenta y además puede llegar a la vez que la
    // pantalla de resultado. Sin tabla propia, el vínculo pago→venta vive acá.
    const yaRegistrada = await Venta.findOne({ where: { Observaciones: { [Op.like]: `%${marca}%` } } });
    if (yaRegistrada) return yaRegistrada.Id;

    const cotizaciones = await Cotizacion.findAll({ order: [['CreatedAt', 'DESC']] });
    const cotizacion =
      cotizaciones.find((c) => (c.Clave || '').toLowerCase().includes('blue')) || cotizaciones[0];
    if (!cotizacion) throw new Error('No hay cotización de dólar cargada');

    const idsInventario = normalizado.items.map((i) => Number(i.id)).filter(Boolean);
    const precios = await PrecioArticulo.findAll({ where: { IdInventario: { [Op.in]: idsInventario } } });

    // Costo por renglón: el más reciente de los que haya.
    const costoPorInventario = new Map();
    for (const p of precios) {
      const previo = costoPorInventario.get(p.IdInventario);
      if (!previo || new Date(p.FechaDesde) > new Date(previo.FechaDesde)) {
        costoPorInventario.set(p.IdInventario, p);
      }
    }

    const totalCosto = normalizado.items.reduce(
      (acc, i) => acc + (Number(costoPorInventario.get(Number(i.id))?.CostoReal) || 0) * i.quantity,
      0
    );

    // La base guarda los precios en pesos pero Venta.TotalVenta en dólares
    // (Venta 1: 844,63 × 1450 = 1.224.720). VentaService.create recalcula
    // TotalVentaARS con esta misma cotización, así que vuelve al monto cobrado.
    const totalVenta = Number((normalizado.total / Number(cotizacion.Valor)).toFixed(2));

    const creada = await ventaService.create({
      Fecha: normalizado.fecha ? new Date(normalizado.fecha) : new Date(),
      TotalVenta: totalVenta,
      TotalVentaARS: normalizado.total,
      TotalCosto: Number(totalCosto.toFixed(2)),
      Observaciones: `Venta online. ${marca}. Ref ${normalizado.externalReference || '-'}`,
      EstadoPago: true,
      IdTurnoCaja: ventaOnline.idTurnoCaja,
      IdCliente: await resolverCliente(pagoCrudo),
      IdEmpleado: ventaOnline.idEmpleado,
      IdCotizacionDolar: cotizacion.Id,
      Detalles: normalizado.items.map((i) => ({
        IdArticulo: Number(i.id),
        Cantidad: i.quantity,
        PrecioUnitario: i.unitPrice,
      })),
      Pagos: [{
        IdMetodoPago: ventaOnline.idMetodoPago,
        Monto: normalizado.total,
        Observacion: `Mercado Pago ${normalizado.paymentId}`,
        FechaPago: normalizado.fecha || new Date(),
        IdTurnoCaja: ventaOnline.idTurnoCaja,
      }],
    });

    return creada?.Id ?? creada?.get?.('Id') ?? null;
  };

  const consultarPago = async (paymentId) => {
    // Ante un id inválido como "0", MP responde 400 y no 404, así que el endpoint
    // devolvía 500 por una URL que cualquiera puede escribir. Se descarta acá y no
    // en el controller para cubrir también al webhook, que llama por este mismo camino.
    if (!/^[1-9]\d*$/.test(String(paymentId ?? ''))) return null;

    const pago = await mpClient.obtenerPago(paymentId);
    if (!pago) return null;

    // El comprobante se arma con lo que devuelve MP, no con el carrito del
    // navegador: así sigue siendo reproducible si el comprador pagó desde otro
    // dispositivo o vuelve al link más tarde.
    const items = (pago.additional_info?.items || []).map((i) => ({
      id: String(i.id ?? ''),
      title: i.title,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unit_price) || 0,
    }));

    const normalizado = {
      estado: ESTADOS[pago.status] || 'desconocido',
      paymentId: String(pago.id),
      externalReference: pago.external_reference || null,
      total: Number(pago.transaction_amount) || 0,
      items,
      fecha: pago.date_approved || pago.date_created || null,
      medio: pago.payment_method_id || null,
      ventaId: null,
    };

    // El email y el DNI del comprador NO se agregan al objeto que se devuelve:
    // este endpoint es público y cualquiera con un id de pago los leería.
    if (normalizado.estado === 'approved' && ventaService && models) {
      try {
        normalizado.ventaId = await confirmarVenta(normalizado, pago);
      } catch (err) {
        // El cobro ya ocurrió y no se puede deshacer desde acá. Se informa al
        // comprador con el número de pago para que el local lo resuelva a mano.
        console.error(`No se pudo registrar la venta del pago ${normalizado.paymentId}:`, err.message);
        normalizado.avisoRegistro =
          'Tu pago se acreditó, pero no pudimos registrar el pedido automáticamente. Guardá el número de pago y escribinos para coordinar la entrega.';
      }
    }

    return normalizado;
  };

  return { crearCheckout, consultarPago };
};

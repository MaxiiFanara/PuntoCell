// ============================================================================
// Script de poblado de datos de prueba para PuntoCell.
//
// Genera volumen realista contra la API real (localhost:3000), para poder
// probar el sistema con más datos: marcas, modelos (incluyendo tablet y
// notebook, que hoy tienen poco o nada cargado), fallas por categoría,
// proveedores, clientes, inventario, ventas y órdenes de reparación en
// distintos estados.
//
// Requisitos antes de correrlo:
//   1. El backend tiene que estar corriendo en http://localhost:3000
//      (node ./src/server.js desde PuntoCell_API).
//   2. Se ejecuta con Node desde la carpeta PuntoCell_API:
//        node scripts/seed-datos-prueba.mjs
//
// Es seguro correrlo varias veces: las cosas que ya existen (marcas,
// modelos, fallas, proveedores por nombre) se saltean en vez de duplicarse
// o romper. Clientes, inventario, ventas y órdenes SÍ se generan de nuevo
// cada vez que lo corrés (así podés ir sumando volumen).
//
// Podés ajustar las cantidades en la sección CONFIG más abajo.
// ============================================================================

import jwt from 'jsonwebtoken';
import cookieSignature from 'cookie-signature';
import { env } from '../src/core/config/env.js';

const BASE_URL = 'http://localhost:3000/api';

// ── CONFIG ──────────────────────────────────────────────────────────────────
const CANT_CLIENTES   = 15;
const CANT_INVENTARIO = 40;
const CANT_VENTAS     = 30;
const CANT_ORDENES    = 25;

// ── Autenticación: generamos la cookie de sesión directamente (evita
//    depender de que el login con usuarios de prueba funcione) ─────────────
function generarCookieSesion(idUsuario, rol, sucursal) {
  const token = jwt.sign({ id: idUsuario, rol, sucursal, type: 'session' }, env.JWT.SECRET, { expiresIn: '8h' });
  return 'jwt_punto_cell=' + encodeURIComponent('s:' + cookieSignature.sign(token, env.JWT.SECRET));
}
const COOKIE = generarCookieSesion(1, 1, 1); // usuario Id=1, rol Administrador

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.errors) ? data.errors.join(' | ') : (data.message || `HTTP ${res.status}`);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data.data ?? data;
}

// Para inserciones que pueden chocar con algo que ya existe (nombre
// duplicado, etc.) — loguea y sigue en vez de cortar todo el script.
async function apiSafe(method, path, body, label) {
  try {
    return await api(method, path, body);
  } catch (err) {
    console.log(`  · omitido (${label}): ${err.message}`);
    return null;
  }
}

const rand    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDNI = () => String(randInt(20000000, 45000000));
const randIMEI = () => Array.from({ length: 15 }, () => randInt(0, 9)).join('');

let totalCreados = 0;
const resumen = [];
function log(seccion, cantidad) {
  resumen.push(`${seccion}: ${cantidad}`);
  totalCreados += cantidad;
}

console.log('════════════════════════════════════════════════');
console.log(' Poblando PuntoCell con datos de prueba...');
console.log('════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════════════════
// 1. MARCAS EXTRA
// ═══════════════════════════════════════════════════════════════════════════
console.log('▶ Marcas...');
const NOMBRES_MARCAS_EXTRA = ['google', 'huawei', 'lenovo', 'dell', 'hp', 'asus', 'lg'];
const marcasActuales = await api('GET', '/inventario/marca-articulos');
const marcaIdPorNombre = new Map(marcasActuales.map((m) => [m.Nombre.toLowerCase(), m.Id]));
let marcasCreadas = 0;
for (const nombre of NOMBRES_MARCAS_EXTRA) {
  if (marcaIdPorNombre.has(nombre)) continue;
  const creada = await apiSafe('POST', '/inventario/marca-articulos', { Nombre: nombre }, `marca ${nombre}`);
  if (creada) { marcaIdPorNombre.set(nombre, creada.Id); marcasCreadas++; }
}
log('Marcas nuevas', marcasCreadas);
console.log(`  ${marcaIdPorNombre.size} marcas disponibles en total.\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. MODELOS EXTRA (categorías: 1=smartphone, 2=tablet, 3=notebook)
// ═══════════════════════════════════════════════════════════════════════════
console.log('▶ Modelos (con foco en tablet y notebook, que hoy tienen poco dato)...');
const CAT_SMARTPHONE = 1, CAT_TABLET = 2, CAT_NOTEBOOK = 3;

const MODELOS_EXTRA = [
  // smartphone
  { nombre: 'Pixel 8', marca: 'google', cat: CAT_SMARTPHONE },
  { nombre: 'Pixel 8 Pro', marca: 'google', cat: CAT_SMARTPHONE },
  { nombre: 'Galaxy S23', marca: 'samsung', cat: CAT_SMARTPHONE },
  { nombre: 'Galaxy S23 Ultra', marca: 'samsung', cat: CAT_SMARTPHONE },
  { nombre: 'Mate 50', marca: 'huawei', cat: CAT_SMARTPHONE },
  { nombre: 'iPhone 14', marca: 'apple', cat: CAT_SMARTPHONE },
  { nombre: 'iPhone 14 Pro Max', marca: 'apple', cat: CAT_SMARTPHONE },
  // tablet
  { nombre: 'iPad 9na Gen', marca: 'apple', cat: CAT_TABLET },
  { nombre: 'iPad Air', marca: 'apple', cat: CAT_TABLET },
  { nombre: 'Galaxy Tab A9', marca: 'samsung', cat: CAT_TABLET },
  { nombre: 'Galaxy Tab S9', marca: 'samsung', cat: CAT_TABLET },
  { nombre: 'Redmi Pad SE', marca: 'xiaomi', cat: CAT_TABLET },
  { nombre: 'Lenovo Tab M10', marca: 'lenovo', cat: CAT_TABLET },
  // notebook
  { nombre: 'MacBook Air M2', marca: 'apple', cat: CAT_NOTEBOOK },
  { nombre: 'MacBook Pro 14', marca: 'apple', cat: CAT_NOTEBOOK },
  { nombre: 'Inspiron 15', marca: 'dell', cat: CAT_NOTEBOOK },
  { nombre: 'Pavilion 14', marca: 'hp', cat: CAT_NOTEBOOK },
  { nombre: 'IdeaPad 3', marca: 'lenovo', cat: CAT_NOTEBOOK },
  { nombre: 'ThinkPad E14', marca: 'lenovo', cat: CAT_NOTEBOOK },
  { nombre: 'Vivobook 15', marca: 'asus', cat: CAT_NOTEBOOK },
];

const modelosActuales = await api('GET', '/inventario/modelo-articulos');
const modeloExiste = (nombre, idMarca) =>
  modelosActuales.some((m) => m.Nombre.toLowerCase() === nombre.toLowerCase() && m.IdMarcaArticulo === idMarca);

let modelosCreados = 0;
const modelosPorCategoria = { [CAT_SMARTPHONE]: [], [CAT_TABLET]: [], [CAT_NOTEBOOK]: [] };
for (const m of modelosActuales) modelosPorCategoria[m.IdCategoriaArticulo]?.push(m);

for (const { nombre, marca, cat } of MODELOS_EXTRA) {
  const idMarca = marcaIdPorNombre.get(marca);
  if (!idMarca) continue;
  if (modeloExiste(nombre, idMarca)) continue;
  const creado = await apiSafe(
    'POST', '/inventario/modelo-articulos',
    { Nombre: nombre, IdMarcaArticulo: idMarca, IdCategoriaArticulo: cat },
    `modelo ${nombre}`
  );
  if (creado) { modelosCreados++; modelosPorCategoria[cat].push({ Id: creado.Id, Nombre: nombre, IdCategoriaArticulo: cat }); }
}
log('Modelos nuevos', modelosCreados);
console.log(`  smartphone: ${modelosPorCategoria[CAT_SMARTPHONE].length}, tablet: ${modelosPorCategoria[CAT_TABLET].length}, notebook: ${modelosPorCategoria[CAT_NOTEBOOK].length}\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 3. FALLAS EXTRA PARA TABLET Y NOTEBOOK (hoy solo existían para smartphone)
// ═══════════════════════════════════════════════════════════════════════════
console.log('▶ Fallas para tablet y notebook...');
const FALLAS_TABLET = [
  'Pantalla táctil no responde', 'Batería no carga', 'Puerto de carga dañado',
  'No enciende', 'Pantalla rota / rayada',
];
const FALLAS_NOTEBOOK = [
  'Teclado no funciona', 'No enciende / pantalla negra', 'Se calienta y se apaga solo',
  'Batería no carga', 'Bisagra de pantalla rota', 'Muy lenta / hay que formatear',
];

const fallasActuales = await api('GET', '/reparaciones/fallas');
const fallaExiste = (nombre, idCat) =>
  fallasActuales.some((f) => f.Nombre.toLowerCase() === nombre.toLowerCase() && f.IdCategoriaArticulo === idCat);

let fallasCreadas = 0;
for (const nombre of FALLAS_TABLET) {
  if (fallaExiste(nombre, CAT_TABLET)) continue;
  const creada = await apiSafe('POST', '/reparaciones/fallas', { Nombre: nombre, IdCategoriaArticulo: CAT_TABLET }, `falla tablet ${nombre}`);
  if (creada) fallasCreadas++;
}
for (const nombre of FALLAS_NOTEBOOK) {
  if (fallaExiste(nombre, CAT_NOTEBOOK)) continue;
  const creada = await apiSafe('POST', '/reparaciones/fallas', { Nombre: nombre, IdCategoriaArticulo: CAT_NOTEBOOK }, `falla notebook ${nombre}`);
  if (creada) fallasCreadas++;
}
log('Fallas nuevas', fallasCreadas);

const fallasPorCategoria = { [CAT_SMARTPHONE]: [], [CAT_TABLET]: [], [CAT_NOTEBOOK]: [] };
for (const f of await api('GET', '/reparaciones/fallas')) fallasPorCategoria[f.IdCategoriaArticulo]?.push(f);
console.log(`  smartphone: ${fallasPorCategoria[CAT_SMARTPHONE].length}, tablet: ${fallasPorCategoria[CAT_TABLET].length}, notebook: ${fallasPorCategoria[CAT_NOTEBOOK].length}\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 4. PROVEEDORES EXTRA
// ═══════════════════════════════════════════════════════════════════════════
console.log('▶ Proveedores...');
const localidades = await api('GET', '/usuarios/localidades');
const PROVEEDORES_EXTRA = [
  { Nombre: 'Samsung Argentina Mayorista', Email: 'mayorista@samsung-ar.com', Celular: '3511234567' },
  { Nombre: 'Notebooks del Centro SRL', Email: 'ventas@notebooksdelcentro.com', Celular: '3517654321' },
];
const proveedoresActuales = await api('GET', '/compras/proveedores');
let proveedoresCreados = 0;
for (const p of PROVEEDORES_EXTRA) {
  if (proveedoresActuales.some((x) => x.Nombre.toLowerCase() === p.Nombre.toLowerCase())) continue;
  const creado = await apiSafe('POST', '/compras/proveedores', { ...p, IdLocalidad: rand(localidades).Id }, `proveedor ${p.Nombre}`);
  if (creado) proveedoresCreados++;
}
log('Proveedores nuevos', proveedoresCreados);
const proveedores = await api('GET', '/compras/proveedores');
console.log(`  ${proveedores.length} proveedores disponibles en total.\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 5. CLIENTES
// ═══════════════════════════════════════════════════════════════════════════
console.log(`▶ Clientes (${CANT_CLIENTES})...`);
const NOMBRES = ['Lucas', 'Martina', 'Facundo', 'Camila', 'Tomás', 'Valentina', 'Bruno', 'Sofía', 'Agustín', 'Julieta', 'Nicolás', 'Micaela', 'Franco', 'Delfina', 'Santiago', 'Abril', 'Mateo', 'Catalina', 'Joaquín', 'Renata'];
const APELLIDOS = ['González', 'Rodríguez', 'Pérez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Romero', 'Sosa', 'Torres', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Aguirre', 'Molina'];

const clientesCreados = [];
for (let i = 0; i < CANT_CLIENTES; i++) {
  const nombre = rand(NOMBRES);
  const apellido = rand(APELLIDOS);
  const dni = randDNI();
  const payload = {
    DNI: dni,
    Nombre: nombre,
    Apellido: apellido,
    Email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}${randInt(1, 999)}@mail.com`,
    Celular: `351${randInt(1000000, 9999999)}`,
    EsCliente: true,
    IdLocalidad: rand(localidades).Id,
  };
  const creado = await apiSafe('POST', '/usuarios/', payload, `cliente ${nombre} ${apellido}`);
  if (creado) clientesCreados.push({ ...payload, Id: creado.Id });
}
log('Clientes nuevos', clientesCreados.length);
console.log(`  ${clientesCreados.length}/${CANT_CLIENTES} clientes creados.\n`);

if (clientesCreados.length === 0) {
  console.log('⚠ No se pudo crear ningún cliente nuevo — reutilizando clientes existentes para ventas/órdenes.');
}
const clientesExistentes = (await api('GET', '/usuarios/')).filter((u) => u.EsCliente);
const poolClientes = clientesCreados.length > 0 ? clientesCreados : clientesExistentes;

// ═══════════════════════════════════════════════════════════════════════════
// 6. INVENTARIO (Articulo + Inventario) para los modelos disponibles
// ═══════════════════════════════════════════════════════════════════════════
console.log(`▶ Inventario (${CANT_INVENTARIO} artículos)...`);
const sucursales = await api('GET', '/usuarios/sucursales');
const colores = await api('GET', '/inventario/colores');
const memorias = await api('GET', '/inventario/memorias');
const baterias = await api('GET', '/inventario/baterias');
const almacenamientos = await api('GET', '/inventario/almacenamientos');

const todosModelos = await api('GET', '/inventario/modelo-articulos');
const modelosDispositivo = todosModelos.filter((m) => [CAT_SMARTPHONE, CAT_TABLET, CAT_NOTEBOOK].includes(m.IdCategoriaArticulo));

const PRECIO_BASE_POR_CATEGORIA = { [CAT_SMARTPHONE]: [200, 1400], [CAT_TABLET]: [150, 900], [CAT_NOTEBOOK]: [300, 1800] };

let inventarioCreado = 0;
for (let i = 0; i < CANT_INVENTARIO; i++) {
  const modelo = rand(modelosDispositivo);
  if (!modelo) break;
  const [min, max] = PRECIO_BASE_POR_CATEGORIA[modelo.IdCategoriaArticulo] || [100, 500];
  const precioCosto = randInt(min, max);

  const articulo = await apiSafe(
    'POST', '/inventario/articulos',
    {
      Nombre: `${modelo.Nombre} (lote ${i + 1})`,
      EsSerializado: true, EsVendible: true, EsRepuesto: false, Activo: true,
      IdModeloArticulo: modelo.Id,
    },
    `articulo ${modelo.Nombre}`
  );
  if (!articulo) continue;

  const creado = await apiSafe(
    'POST', '/inventario/inventarios',
    {
      IMEI: randIMEI(),
      PrecioCosto: precioCosto,
      PrecioMayor: Math.round(precioCosto * 1.15),
      PrecioMenor: Math.round(precioCosto * 1.35),
      Stock: randInt(1, 8),
      MesesGarantiaLocal: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
      IdSucursal: rand(sucursales).Id,
      IdArticulo: articulo.Id,
      IdEstadoInventario: 1,
      IdProveedor: rand(proveedores).Id,
      IdColor: rand(colores).Id,
      IdMemoria: rand(memorias).Id,
      IdBateria: rand(baterias).Id,
      IdAlmacenamiento: rand(almacenamientos).Id,
    },
    `inventario ${modelo.Nombre}`
  );
  if (creado) inventarioCreado++;
}
log('Inventario nuevo', inventarioCreado);
console.log(`  ${inventarioCreado}/${CANT_INVENTARIO} items de inventario creados.\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 7. VENTAS
// ═══════════════════════════════════════════════════════════════════════════
console.log(`▶ Ventas (${CANT_VENTAS})...`);
const cotizaciones = await api('GET', '/ventas/cotizaciones');
const cotizacion = cotizaciones[0] ?? { Id: 1, Valor: 1000 };
const metodosPago = await api('GET', '/finanzas/metodo-pagos');
const empleados = (await api('GET', '/usuarios/')).filter((u) => !u.EsCliente);

let inventarioVendible = [];
for (const s of sucursales) {
  const items = await api('GET', `/inventario/inventarios?IdSucursal=${s.Id}`);
  inventarioVendible.push(...items.filter((it) => it.Stock > 0 && it.PrecioMenor));
}

let ventasCreadas = 0;
for (let i = 0; i < CANT_VENTAS; i++) {
  if (inventarioVendible.length === 0 || poolClientes.length === 0) break;
  const cantidadItems = randInt(1, 3);
  const itemsElegidos = Array.from({ length: cantidadItems }, () => rand(inventarioVendible));

  const detalles = itemsElegidos.map((it) => ({
    IdArticulo: it.Id,
    Cantidad: 1,
    PrecioUnitario: Number(it.PrecioMenor),
  }));
  const totalVenta = detalles.reduce((s, d) => s + d.PrecioUnitario * d.Cantidad, 0);
  const totalCosto = itemsElegidos.reduce((s, it) => s + Number(it.PrecioCosto), 0);

  const fechaAleatoria = new Date(Date.now() - randInt(0, 90) * 24 * 60 * 60 * 1000).toISOString();
  const cliente = rand(poolClientes);
  const empleado = rand(empleados);
  const metodo = rand(metodosPago);

  const creada = await apiSafe(
    'POST', '/ventas',
    {
      Fecha: fechaAleatoria,
      TotalVenta: totalVenta,
      TotalVentaARS: Math.round(totalVenta * Number(cotizacion.Valor)),
      TotalCosto: totalCosto,
      IdTurnoCaja: 1,
      IdCliente: cliente.Id,
      IdEmpleado: empleado.Id,
      IdCotizacionDolar: cotizacion.Id,
      Detalles: detalles,
      Pagos: [{ IdMetodoPago: metodo.Id, Monto: totalVenta, Cotizacion: Number(cotizacion.Valor), FechaPago: fechaAleatoria, IdTurnoCaja: 1 }],
    },
    `venta #${i + 1}`
  );
  if (creada) ventasCreadas++;
}
log('Ventas nuevas', ventasCreadas);
console.log(`  ${ventasCreadas}/${CANT_VENTAS} ventas creadas.\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 8. ÓRDENES DE REPARACIÓN (en distintos estados, para probar el dashboard
//    y las estadísticas con variedad)
// ═══════════════════════════════════════════════════════════════════════════
console.log(`▶ Órdenes de reparación (${CANT_ORDENES})...`);

// Distribución de estados finales a alcanzar: 1=en espera 2=en reparación
// 3=terminado 4=entregado 5=anulado. Más peso en "entregado" porque las
// estadísticas y el dashboard solo cuentan órdenes Entregadas.
const DISTRIBUCION_ESTADOS = [1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 5];

async function avanzarOrden(idOrden, estadoObjetivo) {
  const pasos = estadoObjetivo === 5
    ? [5]
    : [2, 3, 4].slice(0, estadoObjetivo - 1);

  for (const estado of pasos) {
    const payload = { IdEstadoOrden: estado, ObservacionTecnico: `Cambio automático de estado (seed) a ${estado}.` };
    if (estado === 3) payload.PrecioManoObra = randInt(5000, 45000);
    if (estado === 4) payload.pagoFinal = { IdMetodoPago: rand(metodosPago).Id, IdTurnoCaja: 1 };
    await apiSafe('PATCH', `/reparaciones/ordenes-reparacion/${idOrden}/estado`, payload, `orden ${idOrden} -> estado ${estado}`);
  }
}

let ordenesCreadas = 0;
for (let i = 0; i < CANT_ORDENES; i++) {
  if (poolClientes.length === 0 || modelosDispositivo.length === 0) break;
  const cliente = rand(poolClientes);
  const modelo = rand(modelosDispositivo);
  const fallasDisponibles = fallasPorCategoria[modelo.IdCategoriaArticulo] || [];
  if (fallasDisponibles.length === 0) continue;
  const idsFallas = Array.from(new Set(Array.from({ length: randInt(1, 2) }, () => rand(fallasDisponibles).Id)));

  const creada = await apiSafe(
    'POST', '/reparaciones/ordenes-reparacion',
    {
      cliente: {
        DNI: cliente.DNI, Nombre: cliente.Nombre, Apellido: cliente.Apellido,
        Email: cliente.Email, Celular: cliente.Celular,
      },
      dispositivo: {
        IMEI: randIMEI(),
        Desbloqueo: rand(['Sin clave', '1234', '0000', 'Patrón en L']),
        Observaciones: rand(['Ingresa con rayones en la tapa.', 'Sin funda ni cargador.', 'Pantalla con protector colocado.', '']),
        IdModeloArticulo: modelo.Id,
      },
      idsFallas,
      observacionIngreso: 'Orden generada por script de datos de prueba.',
    },
    `orden #${i + 1}`
  );
  if (!creada) continue;
  ordenesCreadas++;

  const estadoObjetivo = rand(DISTRIBUCION_ESTADOS);
  const idOrdenCreada = creada.IdOrden;
  if (idOrdenCreada) await avanzarOrden(idOrdenCreada, estadoObjetivo);
}
log('Órdenes nuevas', ordenesCreadas);
console.log(`  ${ordenesCreadas}/${CANT_ORDENES} órdenes creadas (con avance de estado aleatorio).\n`);

// ═══════════════════════════════════════════════════════════════════════════
console.log('════════════════════════════════════════════════');
console.log(' Resumen');
console.log('════════════════════════════════════════════════');
resumen.forEach((l) => console.log(`  · ${l}`));
console.log(`\n  Total de registros nuevos: ${totalCreados}`);
console.log('════════════════════════════════════════════════\n');

process.exit(0);

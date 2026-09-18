# Cambios de backend para la tienda online

Nota de traspaso para el equipo de backend. Reúne **todo** lo que esta rama tocó
fuera del frontend: el catálogo público, la pasarela de Mercado Pago, el registro
de la venta online y la configuración de Docker. Reemplaza a las dos notas
anteriores (`cambios-a-backend-necesarios-para-catalogo.md` y
`cambios-a-backend-mercadopago.md`).

---

## 1. Resumen

| Área | Qué cambió | ¿Rompe algo? |
|---|---|---|
| Catálogo público | Expone `categoria`, `modelo` y `sucursal`; deja de exponer `category` | **Sí**: se quitó `category` (ver 2.1) |
| Pagos | Módulo nuevo `src/modules/pagos/` con tres endpoints públicos | No, es aditivo |
| Ventas | Un pago aprobado crea una `Venta` real y descuenta stock | No se modificó `VentaService`, pero **aparecen ventas nuevas** en todos los módulos |
| Datos | Dos filas seed: empleado "Tienda Online" y turno "Caja Online" | No hay cambios de esquema |
| Docker / config | Variables `MP_*`, `CORS_ORIGIN` configurable, proxy `/api` en Vite | No, todas con default |

**No se tocó ningún modelo de Sequelize, ninguna asociación, ninguna tabla ni
ningún script SQL existente. No se instaló ninguna dependencia.**

## 2. Archivos existentes que se tocaron

| Archivo | Cambio |
|---|---|
| `PuntoCell_API/src/modules/catalogo/catalogo.service.js` | Dos `include` nuevos (`categoria`, `sucursal`) y tres campos en la salida (ver sección 3) |
| `PuntoCell_API/src/routes/index.js` | Un import y `router.use('/pagos', pagosRoutes())`, **antes** de `requireAuth` |
| `PuntoCell_API/src/core/config/env.js` | Bloque `MP` al final del objeto `env` |
| `docker-compose.yml` | Variables `MP_*` en `api`; `CORS_ORIGIN` pasa a leerse del entorno; `API_PROXY_TARGET` y `VITE_API_URL` en `front` |
| `.env.example` | Las seis variables `MP_*` |
| `PuntoCell_WebPage/vite.config.js` | Proxy `/api` → API (ver sección 9) |
| `PuntoCell_WebPage/src/services/api.js` | `API_URL` pasa de `http://localhost:3000/api` fijo a `/api` |

Archivos nuevos:

| Archivo | Para qué |
|---|---|
| `src/modules/pagos/mercadopago.client.js` | Único punto que habla con Mercado Pago. Dos llamadas HTTP |
| `src/modules/pagos/pagos.service.js` | Revalida el carrito, arma la preferencia, normaliza el estado y registra la venta |
| `src/modules/pagos/pagos.controller.js` | Traducción HTTP, sin lógica |
| `src/modules/pagos/pagos.routes.js` | Las tres rutas y el armado de sus dependencias |
| `scripts/seed-tienda-online.sql` | Las dos filas de identidad de la venta online. Idempotente |
| `scripts/check-pagos.mjs` | 36 chequeos del servicio de pagos, sin red ni base |

El módulo de pagos **reusa sin modificar** `CatalogoService`, `VentaService`,
`VentaDAO` y `DetalleVentaDAO`. `VentaService` se instancia en `pagos.routes.js`
en vez de sacarlo del contenedor, porque `ventas.module.js` solo expone
controllers y no se quiso tocar.

## 3. Catálogo público: `GET /api/catalogo/productos`

### 3.1 Categoría real en vez del modelo — rompe contrato

El campo `category` devolvía el nombre del **modelo** (`iPhone 15 Pro`), así que
cada producto era casi su propia categoría y el filtro no agrupaba nada. Ahora se
trae la asociación `modelo.categoria`, que ya existía, y la salida separa los dos
conceptos:

```jsonc
// antes
{ "id": "4", "name": "Apple iPhone 14 Pro", "category": "iPhone 14 Pro" }

// ahora
{ "id": "4", "name": "Apple iPhone 14 Pro", "categoria": "smartphone",
  "modelo": "iPhone 14 Pro", "sucursal": "La Calera Centro" }
```

| Campo | Origen | Si falta |
|---|---|---|
| `categoria` | `CategoriaProducto.Nombre` | `'otros'` |
| `modelo` | `ModeloProducto.Nombre` | `null` |

**`category` ya no existe.** Un consumidor que lo lea recibe `undefined` sin
error. El único consumidor relevado es el frontend público, que ya está adaptado.

### 3.2 Stock de las dos sucursales — aditivo

El frontend llamaba con `IdSucursal=1` fijo y solo veía La Calera Centro. Un
producto sin stock en Centro pero con stock en Stoecklin figuraba como agotado, y
la pasarela lo rechazaba como "inexistente" al ir a pagar.

Ahora el frontend no manda `IdSucursal`, y cada renglón de `Inventario` trae el
nombre de su sucursal (asociación `sucursal`, ya existente). Solo se expone
`Sucursal.Nombre`, nada interno. El endpoint **sigue aceptando `IdSucursal`** y
respetándolo: quien lo mande obtiene lo mismo que antes, más el campo nuevo.

## 4. Endpoints de pago

Los tres son públicos, igual que `/api/catalogo`, porque el comprador no tiene
login. Se verificó que registrarlos antes de `requireAuth` no abre ninguna ruta
privada (`GET /api/ventas` sigue devolviendo 401).

```
POST /api/pagos/checkout
  body  { items: [{ id, cantidad }], comprador: { email, nombre, dni, celular } }
  200   { status: "success", data: { initPoint, externalReference } }
  400   carrito vacío
  409   { status: "error", message, detalle: [{ id, motivo, disponible }] }
        motivo ∈ "inexistente" | "sin_stock"

GET  /api/pagos/:paymentId
  200   { status: "success", data: {
            estado, paymentId, externalReference, total, items, fecha, medio,
            ventaId, avisoRegistro? } }
        estado ∈ "approved" | "pending" | "rejected" | "desconocido"
        items  → [{ id, title, quantity, unitPrice }]
        ventaId → Id de la Venta registrada, o null si no se registró
        avisoRegistro → solo si el pago se aprobó pero la venta falló (ver 7.6)
  404   pago inexistente, o id que no es un entero positivo

POST /api/pagos/webhook
  body  { type, data: { id } }    ← del body solo se usa data.id
  200   siempre
```

- El `id` de `items` es el **`Inventario.Id`**, el mismo `id` que devuelve el catálogo.
- El webhook responde 200 incluso ante un error interno: cualquier otro código
  hace que Mercado Pago reintente en bucle.
- **Los datos del comprador solo se validan en el frontend** (email con formato,
  nombre de 3+ caracteres, DNI de 7 a 9 dígitos, celular de 8+ dígitos). El
  backend no los rechaza si faltan: completa con valores de relleno al crear el
  cliente (ver 7.3). Si alguien llama al endpoint directo, la venta se registra
  igual con un cliente genérico.

## 5. Seguridad, y por qué está así

**El backend nunca confía en el carrito.** El checkout recibe solo
`{ id, cantidad }` y relee precio y stock de la base con
`CatalogoService.getProductosVendibles()`. El carrito vive en el `localStorage`
del navegador: sin esto, cualquiera podría editarlo y comprar un iPhone a $1. Si
algo no existe o no alcanza el stock, responde 409 **antes** de crear la
preferencia. Reusar `CatalogoService` garantiza además que se cobra exactamente
el precio que muestra la vitrina (misma lista minorista vigente).

**El estado del pago siempre se le pregunta a Mercado Pago.** Nunca se lee del
query string de la vuelta ni del body del webhook, que son falsificables. La
pantalla de resultado y el webhook terminan en la misma función, que hace
`GET /v1/payments/:id` contra Mercado Pago.

**Por eso no se valida la firma `x-signature` del webhook.** Del body solo se
toma el id, y se verifica contra Mercado Pago antes de usarlo. Si algún día el
webhook pasara a confiar en el contenido de la notificación, **habría que
agregar la validación de firma**.

**Los datos personales no salen por el endpoint público.** `GET /api/pagos/:id`
no devuelve email ni DNI del comprador: cualquiera con un número de pago lo
puede consultar.

**No hay ningún endpoint que diga si un DNI es cliente.** El cruce se hace solo
en el backend al registrar la venta; un endpoint así sería público y permitiría
averiguar quién le compra al local.

## 6. Variables de entorno

Se cargan en el `.env` **de la raíz del repo**, junto al `docker-compose.yml`. Un
`.env` dentro de `PuntoCell_API/` no lo lee nadie cuando la API corre en Docker,
y las variables llegan vacías sin ningún error visible.

| Variable | Servicio | Obligatoria | Para qué |
|---|---|---|---|
| `MP_ACCESS_TOKEN` | api | Sí, para cobrar | Token de la aplicación de Mercado Pago. **Nunca debe llegar al frontend** |
| `MP_BACK_URL_BASE` | api | No (`http://localhost:5173`) | Base del frontend a la que Mercado Pago devuelve al comprador |
| `MP_WEBHOOK_URL` | api | No (vacío) | URL pública del webhook. Vacía = no se manda `notification_url` |
| `MP_ID_EMPLEADO` | api | Sí, para registrar ventas | Id del `Usuario` "Tienda Online" |
| `MP_ID_TURNO_CAJA` | api | Sí, para registrar ventas | Id del `TurnoCaja` "Caja Online" |
| `MP_ID_METODO_PAGO` | api | Sí, para registrar ventas | Id de `billetera virtual (qr/alias)`: el método por defecto |
| `CORS_ORIGIN` | api | No (`http://localhost:5173`) | Antes estaba fijo en el compose; ahora se puede sobrescribir |
| `API_PROXY_TARGET` | front | No (`http://api:3000`) | Adónde reenvía Vite las llamadas a `/api` |
| `VITE_API_URL` | front | No (vacío) | Solo para un deploy sin el proxy de Vite delante |

Los tres `MP_ID_*` los imprime el script de seed al final. Los valores de
`.env.example` (6, 2, 2) son los de la base de desarrollo y **pueden no coincidir
con otra base**.

La API levanta sin `MP_ACCESS_TOKEN`: nada lo lee al arrancar, solo fallan las
llamadas a Mercado Pago. Si faltan los `MP_ID_*`, se cobra igual pero la venta no
se registra (cae en el caso de la sección 7.6).

## 7. La venta se registra — qué van a ver en sus módulos

Cuando Mercado Pago confirma un pago, el módulo llama a
**`VentaService.create()` tal cual está**, y ese servicio hace lo de siempre en
una transacción: crea la `Venta` y sus `DetalleVenta`, descuenta `Stock` del
`Inventario` con lock de fila y registra el `PagoVenta`.

**Las ventas online aparecen en dashboards, reportes, caja y bitácora,
mezcladas con las del local.** Se distinguen por el empleado "Tienda Online", el
turno "Caja Online", o porque `Observaciones` arranca con `Venta online. MP:<id>`.

### 7.1 Identidad de la venta online

`Venta` exige `IdTurnoCaja`, `IdEmpleado`, `IdCliente` e `IdCotizacionDolar`, los
cuatro NOT NULL con FK, y una compra a las 3 de la mañana no tiene turno abierto
ni empleado. Se resolvió con dos filas de **datos** que siembra
`scripts/seed-tienda-online.sql`:

| Fila | Detalle |
|---|---|
| `Usuario` "Tienda Online" | Email `tienda.online@puntocell.local`, DNI `00000000`, rol vendedor (3), sucursal 1. Su `Pwd` es `CUENTA-DE-SISTEMA-SIN-LOGIN`, que **no es un hash bcrypt válido**: ninguna contraseña autentica esa cuenta |
| `TurnoCaja` "Caja Online" | Sucursal 1. **Queda siempre abierto** (`FechaCierre` NULL) para no mezclar las ventas online con el arqueo del turno real. Lo van a ver siempre abierto en los listados de caja |

La cotización es la más reciente cuya `Clave` contiene "blue", o la más reciente
de todas si no hay ninguna.

### 7.2 Convención de moneda

Verificada contra la venta de referencia de la base de desarrollo
(`TotalVenta 844,63 × 1450 = TotalVentaARS 1.224.720`):

| Campo | Moneda |
|---|---|
| `PrecioArticulo.ValorFinal`, `PrecioArticulo.CostoReal`, `DetalleVenta.PrecioUnitario` | pesos |
| `Venta.TotalVentaARS`, `Venta.TotalCosto` | pesos |
| `Venta.TotalVenta` | dólares = pesos ÷ cotización |

La venta online sigue exactamente esa convención. `TotalCosto` se calcula con el
`CostoReal` del `PrecioArticulo` más reciente de cada renglón.

### 7.3 El cliente es real, y se resuelve por DNI

Al confirmar el pago:

1. Se busca un `Usuario` con ese **DNI**. Si existe, la venta queda a su nombre y
   el resto de los datos se ignoran.
2. Si no, se busca por el **email del formulario**. Cubre a quien ya compró y
   tipeó mal el documento, y evita chocar contra el índice único de
   `Usuario.Email`, que haría fallar el alta y perder la venta.
3. Si tampoco, se crea el cliente con `EsCliente = 1`. El nombre completo se
   parte en la primera palabra (`Nombre`) y el resto (`Apellido`).

Los datos viajan en el **`metadata` de la preferencia**, no se leen del `payer`
que devuelve Mercado Pago: cuando el comprador paga con su cuenta de MP, el
`payer` trae nombre y teléfono en `null`, y el email y documento son los **de la
cuenta de MP**, no los de la persona. Usarlos hacía que dos compradores que
pagaran desde la misma cuenta se colapsaran en un solo cliente.

Rellenos si un dato falta (solo pasa si se llama al endpoint sin el frontend):
DNI → documento de la cuenta de MP o `MP<paymentId>`; nombre → `Comprador`;
apellido → `Online`; email → `mp-<paymentId>@sin-email.local`; celular → `-`.

### 7.4 El medio de pago sale de lo que informa Mercado Pago

`payment_type_id` se traduce a los métodos que **ya existen** en `MetodoPago`,
buscando **por nombre** (los ids pueden cambiar entre bases, los nombres no):

| Mercado Pago informa | Se registra como |
|---|---|
| `credit_card` | tarjeta de credito |
| `debit_card`, `prepaid_card` | tarjeta de debito |
| `account_money` | billetera virtual (qr/alias) |
| `bank_transfer`, `atm` | transferencia bancaria |
| `ticket` (Rapipago, Pago Fácil) | efectivo |
| cualquier otro | el de `MP_ID_METODO_PAGO` |

**Un pago en cuotas con tarjeta no se registra como `cuotas`.** En este sistema
ese método significa que el local financia y genera un cronograma en `Cuota`;
con Mercado Pago financia el emisor y el local cobra todo junto. El detalle queda
en `PagoVenta.Observacion`, por ejemplo
`Mercado Pago master 3 cuotas - pago 178450433075`.

### 7.5 Idempotencia

El webhook reintenta y puede llegar a la vez que la pantalla de resultado. Sin
tabla propia, el vínculo pago→venta vive en `Venta.Observaciones` y se consulta
con `LIKE '%MP:<paymentId>%'` antes de crear nada. Verificado: tres consultas
seguidas al mismo pago devuelven la misma venta y no duplican venta, cliente ni
descuento de stock.

Es deliberadamente barato. Si algún día hay una tabla de pedidos online, ese
vínculo debería pasar a una columna indexada.

### 7.6 Si la venta no se puede registrar

Si falla el registro (stock agotado entre el pago y la confirmación, `MP_ID_*`
sin configurar, etc.), `VentaService.create()` aborta su transacción. **No se
duplicó su lógica para forzar el registro.** El pago queda cobrado, la venta no,
la respuesta trae `avisoRegistro` y la pantalla le muestra al comprador el número
de pago para que el local lo resuelva a mano. En el log de la API queda un
`console.error` con el id del pago.

### 7.7 Redondeo del total en pesos

**No es específico de las ventas online.** `Venta.TotalVenta` guarda dólares con
dos decimales y `VentaService.create()` recalcula
`TotalVentaARS = TotalVenta × cotización`. Con el dólar a 1450, cada centavo de
dólar vale $14,50, así que cualquier venta arrastra hasta ±$7,25 de error.

| | |
|---|---|
| Mercado Pago cobró | 6.048,00 |
| `TotalVenta` = 6048 ÷ 1450 | 4,1710… → **4,17** |
| `TotalVentaARS` recalculado | 4,17 × 1450 = **6.046,50** |
| Diferencia | **1,50** |

`PagoVenta.Monto` guarda el importe exacto, así que la plata que entró está bien;
lo que queda desalineado es el total de cabecera contra la suma de pagos. No se
resuelve desde el módulo de pagos: la decisión (más precisión en `TotalVenta`, o
tomar `TotalVentaARS` como valor primario) es de ustedes.

## 8. Pendientes del lado de backend (no se tocaron)

- **`priceUsd` devuelve pesos.** El campo del catálogo sale de
  `PrecioArticulo.ValorFinal`, que está en pesos. El frontend lo usa tal cual
  (ver el comentario en `ProductContext.jsx`). Conviene renombrarlo a `precio` o
  `precioArs`; si en cambio se decide que `ValorFinal` pase a dólares, hay que
  volver a multiplicar por la cotización en ese mismo lugar.
- **Bug en el punto de venta.** `PuntoVentaScreen.jsx` toma `PrecioUnitario`
  (en pesos) y arma `TotalVentaARS = TotalVenta × valorDolar` como si fueran
  dólares: una funda de $3.024 quedaría registrada como $4.384.800. No se tocó
  porque ese frontend no es de esta rama. Ojo: si alguien "corrige" la convención
  mirando el punto de venta en vez de los datos, rompe las dos cosas.
- **No hay campo de imagen de producto.** Ni `Producto` ni `Inventario` tienen
  columna de imagen. Para fotos reales hace falta columna, endpoint de upload y
  storage.
- **`/api/catalogo/productos` y `/api/pagos/*` no están en
  `GUIA_TESTING_ENDPOINTS.md`.** Son los únicos endpoints públicos del sistema.
- **El checkout trae el catálogo entero para validar N ítems.** Con el volumen
  actual no importa; si crece, conviene un método de `CatalogoService` que filtre
  por ids (está marcado en `pagos.service.js`).

## 9. El proxy `/api` y el túnel https

El frontend ahora pide siempre a `/api`, del mismo origen, y el servidor de Vite
reenvía a la API. Motivos:

- **La cookie de sesión.** Con la API en otro origen la cookie era cross-site:
  andaba en localhost pero, servido el front desde otro dominio, el login
  entraba y rebotaba porque el navegador no la mandaba.
- **Probar la vuelta automática de Mercado Pago.** `auto_return` exige
  `back_urls` en https. Para probarlo en desarrollo el front se expone por un
  túnel de cloudflared, por eso `allowedHosts` admite `.trycloudflare.com`.

El proxy reescribe el header `Origin` a `http://localhost:5173`: servido por el
túnel, la API veía el dominio del túnel y lo rechazaba por CORS. Ese salto lo
hace el servidor de Vite, no el navegador.

**Para producción:** esto es configuración del **servidor de desarrollo**. Un
deploy con build estático necesita su propio proxy `/api` delante (nginx o
similar) o definir `VITE_API_URL` con la URL de la API, y en ese caso volver a
revisar CORS y la cookie.

## 10. Qué falta para producción

- **URL pública para `MP_WEBHOOK_URL`.** En desarrollo va vacía porque Mercado
  Pago no alcanza `localhost`; el flujo se confirma por la vuelta al sitio. En
  producción el webhook cubre al comprador que cierra el navegador antes de volver.
- **Credenciales de producción.** Hoy se usa el token de prueba (`TEST-...`).
- **`MP_BACK_URL_BASE` en https.** Solo con https se manda
  `auto_return: "approved"` y el comprador vuelve solo al sitio.
- **Correr `scripts/seed-tienda-online.sql`** en la base de producción y cargar
  los tres `MP_ID_*` que imprime.

## 11. Cómo probarlo

Chequeo del servicio, sin red ni base:

```
docker compose exec api node scripts/check-pagos.mjs
```

Credenciales de prueba: en el panel de desarrolladores de Mercado Pago, crear una
aplicación y copiar el **Access Token de prueba** (empieza con `TEST-`). Para
pagar se usan los usuarios y tarjetas de prueba que documenta Mercado Pago; el
resultado del pago se controla con el nombre del titular.

## 12. Cómo revertir

**Pagos** (el código es aditivo):

1. Borrar `src/modules/pagos/`, `scripts/check-pagos.mjs` y
   `scripts/seed-tienda-online.sql`.
2. Sacar de `src/routes/index.js` el import de `pagosRoutes` y
   `router.use('/pagos', pagosRoutes())`.

El bloque `MP` de `env.js` y las variables del compose quedan inertes si sobran.

**Catálogo:** revertir en `catalogo.service.js` los dos `include` (`categoria`,
`sucursal`) y los campos del `map`. Ojo: el frontend actual espera `categoria` y
`sucursal`.

**Proxy:** volver `API_URL` a la URL absoluta de la API en `services/api.js` y
sacar el bloque `server` de `vite.config.js`.

**Los datos son otra cosa.** Revertir el código no borra las ventas registradas
ni devuelve el stock. Para encontrarlas:

```sql
SELECT * FROM Venta WHERE Observaciones LIKE 'Venta online. MP:%';
```

Las dos filas seed no se pueden borrar mientras una venta las referencie. Para
dar de baja el canal online sin perder historial, cerrar el turno "Caja Online"
cargándole `FechaCierre`.

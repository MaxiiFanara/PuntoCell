# Guía de Testing — Módulo Compras (+ Precios)

Documento generado a partir de lectura directa del código actual (`src/modules/compras`, `src/modules/precios`, `src/core/middlewares`, `db/init/init.sql`), verificado línea por línea contra cada `*.dto.js`, `*.service.js`, `*.controller.js` y `*.model.js`. Las secciones 2 (`POST /compras/compras`), 6 (`POST /compras/pagos-compra`) y 7 (`cuenta-corriente-proveedor`) además fueron **probadas en vivo** contra el contenedor de desarrollo (los 3 casos de uso del analista funcional — contado, crédito, parcial —, los pagos posteriores, el rechazo de sobrepago y el rollback transaccional) — el resto del documento sigue siendo lectura de código, no ejecución real; es la guía para que lo termines de ejecutar vos, endpoint por endpoint, con bodies concretos de camino feliz y de error.

Base URL: `http://localhost:3000/api`

**Estado real de la implementación (importante):** la mayoría del módulo es **CRUD puro** (controller → service → DAO, sin lógica de negocio adicional salvo lo que se aclara caso por caso). Las excepciones son `POST /compras/compras` (sección 2.3) y `POST /compras/pagos-compra` (sección 6.3): ambos están orquestados y son transaccionales. `POST /compras/compras` crea la cabecera (con su estado financiero — `EstadoPago`/`SaldoPendiente` — calculado, soportando compra al contado/crédito/parcial), resuelve/crea `Inventario`, arma `DetalleCompra`, calcula `PrecioArticulo` con fallback de `ListaPrecio` y registra la deuda + los pagos iniciales en `CuentaCorrienteProveedor`. `POST /compras/pagos-compra` registra pagos posteriores contra el saldo pendiente de una compra existente, actualizándola y agregando el `Haber` correspondiente. Todo con rollback completo si algo falla en el medio. Lo que **todavía no existe** es el resto de los endpoints "de negocio" pedidos para Compras (`GET /compras` con `totalPagado` calculado, `GET /compras/:id` con `detalles[]` y `subtotal` enriquecidos) — quedan en una fase posterior. Esta guía sirve para probar lo que ya está corriendo.

---

## Cómo autenticarse

Igual que el resto de la API: cookie firmada `jwt_punto_cell` vía `requireAuth`. Sin cookie → **401** `{"status":"error","message":"No autorizado. Por favor, inicie sesión."}`.

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"Identificador":"admin","Pwd":"talleres123456"}'
# luego reusar en cada request:
curl -b cookies.txt http://localhost:3000/api/...
```

Usuarios seed de `db/init/init.sql` (todos con password `talleres123456`): `admin` (Id 1, rol 1 - administrador), `owner` (Id 2, rol 2), `vendedor` (Id 3, rol 3), `tecnico` (Id 4, rol 4). Ningún endpoint de Compras/Precios exige `isAdmin` — cualquier usuario autenticado puede pegarle a todos.

## Postman

Mismo flujo que el resto de los módulos: variable `baseUrl = http://localhost:3000/api`, `POST {{baseUrl}}/auth/login` una vez (Postman guarda la cookie solo), y de ahí en más cada request de abajo tal cual.

## Cómo está armada esta guía

Para **cada** entidad del módulo se documentan sus 5 operaciones por separado — `GET` (listado), `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id` — cada una con:
- el o los **caminos felices** (body válido → status y forma de la respuesta esperada), y
- todos los **caminos de error** relevantes (body/Id inválido → status y mensaje exacto esperado).

**No existe `PATCH` en ningún endpoint de este módulo** (ni de Precios) — solo `GET`/`POST`/`PUT`/`DELETE`, confirmado en `compras.routes.js` y `precios.routes.js`. En la práctica **`PUT` funciona como un `PATCH`**: los `*UpdateSchema` de Joi marcan todos los campos como opcionales (nunca `.required()`), así que podés mandar un body con un solo campo y el resto queda como estaba — no hace falta reenviar el objeto completo. Si buscás probar "PATCH", usá `PUT` con body parcial: es exactamente ese comportamiento.

## Comportamiento general de errores (válido para TODO este documento)

- **Ningún service de Compras ni de Precios setea `err.statusCode`** en sus errores de negocio ("no encontrado", "ya existe", etc.) — a diferencia de otros módulos ya corregidos (`reparaciones`, `inventario`). Eso significa que **todo error de negocio acá cae al 500 genérico** de `error.middleware.js`: `{"status":"error","message":"<el mensaje del throw>"}`. No es un bug de este documento, es el estado real del código.
- Validación Joi (`validateFields`) fallida → **400** `{"errors": ["\"Campo\" is required", ...]}` — un string por cada campo que falla, **todos a la vez** (`abortEarly: false`). Si mandás un body vacío `{}` a un POST, el array trae un mensaje por cada campo `required()` del schema, no solo el primero.
- `validateFields` usa `stripUnknown: true`: cualquier campo que mandes y no esté en el schema (typos, campos de otra entidad, campos calculados como `ValorFinal`) se **descarta en silencio**, no da error.
- `validateFields` usa `convert: true`: un string numérico (`"5"`) se convierte solo a `number` y pasa; un string no numérico (`"cinco"`) falla con `"must be a number"`. Igual con fechas: `Joi.date()` intenta parsear cualquier string; solo con `.iso()` (algunos schemas la tienen, otros no — se aclara caso por caso) exige formato `YYYY-MM-DD`/ISO 8601 estricto.
- Los campos `number().precision(2)` (montos) **no rechazan** más de 2 decimales — con `convert: true`, Joi redondea en silencio (`100.126` → `100.13`). No es un caso de error válido para testear.
- FK inexistente al **crear o actualizar** (`IdProveedor`, `IdCompra`, `IdMetodoPago`, `IdTurnoCaja`, `IdArticulo`/`IdInventario`, `IdEmpleado`, `IdListaPrecio`, etc.) → SQL Server tira `SequelizeForeignKeyConstraintError` → **400** automático `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`. Ningún service valida esto antes del INSERT/UPDATE — depende 100% de la constraint de la base. **Excepciones (los dos endpoints transaccionales orquestados, secciones 2.3 y 6.3):** `POST /compras/compras` y `POST /compras/pagos-compra` corren dentro de una transacción cuyo `catch` reconstruye cualquier error como un `Error` genérico antes de propagarlo, así que ahí adentro **todo cae como `500`, nunca `400`** — pero la mayoría de los campos con FK (`IdProveedor`/`IdEmpleado`/`IdSucursalDestino`/`IdTurnoCaja`/`IdMetodoPago`/`IdInventario`/`IdArticulo`/`IdCompra`) están validados explícitamente antes de tocar la base, así que en la práctica vas a ver un mensaje de negocio limpio (`"Proveedor no encontrado (Id=...)."`, etc.) en vez del texto crudo de SQL Server. El texto crudo solo puede aparecer para FKs que **no** se validan a mano ahí (ej. `IdColor`/`IdMemoria`/`IdBateria`/`IdAlmacenamiento` de un renglón nuevo de `Detalles`).
- **La misma constraint también dispara al hacer `DELETE`** sobre un registro que otra tabla referencia (no hay `ON DELETE CASCADE` en ninguna FK de este módulo, confirmado en `db/init/init.sql`): borrar una `Compra` que ya tiene `DetalleCompra`/`PagoCompra`/`DevolucionCompra` asociados devuelve el mismo 400 de integridad referencial, no un 200. Se detalla en la sección de `Compra`.
- Camino feliz: **200** en GET/PUT/DELETE, **201** en POST, siempre `{"status":"success","data":...}`.
- `GET /:id` con un `Id` **no numérico** (`/proveedores/abc`) no está validado en la ruta ni en el service — el driver de SQL Server rechaza la conversión de tipo del parámetro y el error cae al `catch` del controller. No verificado en vivo en este documento (depende de la versión del driver `tedious`), pero se puede esperar un **500** con un mensaje interno de la librería (no un mensaje de negocio limpio tipo "no encontrado"). Vale la pena probarlo una vez para confirmar que el server no explota, no para memorizar el texto exacto.
- Paginado: `GET` de listado acepta `?page=` y `?limit=` por query string, pero **`limit` solo tiene efecto si además mandás `page`** (`base.dao.js::getAll`) — `?limit=5` solo, sin `page`, devuelve la tabla completa igual. `?page=1&limit=5` sí pagina.

---

## 1. Proveedor (`/api/compras/proveedores`)

Baja lógica: `DELETE` no borra la fila, hace `Activo:false`. `GET /proveedores` (listado) filtra siempre `WHERE Activo:true` — un proveedor dado de baja desaparece del listado pero sigue existiendo (`GET /proveedores/:id` lo sigue devolviendo).

Schema create (`proveedorSchema`): `Nombre`, `Email` y `Celular` son **los tres obligatorios y únicos** (string, trim, **lowercase automático** en `Nombre`/`Email`, formato email en `Email`, max 100/100/20 respectivamente, req). `IdLocalidad` (int positivo, opcional, admite `null`) sigue siendo el único campo opcional.
Schema update (`proveedorUpdateSchema`): los mismos 3 campos siguen siendo opcionales **de mandar** (no hace falta reenviar todo el objeto en un `PUT`), pero si los mandás **no pueden ir vacíos/`null`** — dejaron de admitir `allow(null, '')`. + `Activo` (boolean, opcional).

**Sobre los saltos en el `Id`:** vas a ver huecos grandes entre Ids (ej. 1008 → 1012) a medida que probás — es el comportamiento normal de `IDENTITY` en SQL Server, no un bug de este documento ni del código: cada intento de `INSERT`, **incluso uno que termina fallando** (por ejemplo, por un duplicado de `Email`/`Celular`/`Nombre`), ya consumió un valor de `Id` antes de que la base lo rechace, y SQL Server no reutiliza esos números salteados. Pasa en cualquier tabla del sistema, no solo `Proveedor`.

**Unicidad (los tres campos, no solo `Nombre`):** `Nombre`, `Email` y `Celular` tienen que ser únicos entre proveedores. La validación corre en `proveedor.service.js` (`_validarDuplicados`) antes de tocar la base, así que el error es siempre un mensaje de negocio limpio (`"Ya existe un proveedor con ese <campo>"`), nunca el texto crudo de una constraint SQL. A nivel de base, `Email` y `Celular` tienen además un índice único **filtrado** (`WHERE Email IS NOT NULL` / `WHERE Celular IS NOT NULL`, mismo patrón que `UQ_Inventario_IMEI`) — como ahora son obligatorios esto es más una red de seguridad que algo que vayas a disparar por API.

### 1.1 `GET /compras/proveedores` — listar

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/proveedores
```
→ `200` `{"status":"success","data":[ {...Proveedor con Activo:true...}, ... ]}` — trae los 2 del seed (`Distribuidora CBA`, `Apple Importaciones S.A.`) más los que hayas creado y no hayas dado de baja.

**Con paginado:**
```bash
curl -b cookies.txt "http://localhost:3000/api/compras/proveedores?page=1&limit=1"
```
→ `200` con un solo elemento.

**Error:** sin cookie → `401` (ver sección general).

### 1.2 `GET /compras/proveedores/:id` — obtener uno

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/proveedores/1
```
→ `200` `{"status":"success","data":{"Id":1,"Nombre":"distribuidora cba",...}}`

**Error: `Id` inexistente**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/proveedores/999999
```
→ `500` `{"status":"error","message":"Proveedor no encontrado"}`

### 1.3 `POST /compras/proveedores` — crear

**Camino feliz:**
```json
{ "Nombre": "Distribuidora Test", "Email": "ventas@test.com", "Celular": "3511234567", "IdLocalidad": 1 }
```
→ `201`, y `data.Nombre` viene en minúsculas (`"distribuidora test"`) por el `.lowercase()` del schema, aunque lo mandaste con mayúsculas.

**Bodies de error:**

*Falta `Email` (antes pasaba, ahora es obligatorio):*
```json
{ "Nombre": "Proveedor Sin Email", "Celular": "3510000099", "IdLocalidad": 1 }
```
→ `400` `{"errors":["\"Email\" is required"]}`

*Falta `Celular` (antes pasaba, ahora es obligatorio):*
```json
{ "Nombre": "Proveedor Sin Celular", "Email": "nuevo1@test.com" }
```
→ `400` `{"errors":["\"Celular\" is required"]}`

*Body vacío (para ver el array completo de errores — los 3 campos son requeridos):*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required","\"Email\" is required","\"Celular\" is required"]}`

*`Nombre` demasiado corto (`min(2)`):*
```json
{ "Nombre": "A", "Email": "a@a.com", "Celular": "123" }
```
→ `400` `{"errors":["\"Nombre\" length must be at least 2 characters long"]}`

*`Email` con formato inválido:*
```json
{ "Nombre": "Proveedor Con Email Malo", "Email": "no-es-un-email", "Celular": "123" }
```
→ `400` `{"errors":["\"Email\" must be a valid email"]}`

*`IdLocalidad` no positivo:*
```json
{ "Nombre": "Proveedor Localidad Invalida", "Email": "b@b.com", "Celular": "124", "IdLocalidad": -1 }
```
→ `400` `{"errors":["\"IdLocalidad\" must be a positive number"]}`

*`IdLocalidad` inexistente en la tabla `Localidad` (FK):*
```json
{ "Nombre": "Proveedor FK Rota", "Email": "c@c.com", "Celular": "125", "IdLocalidad": 999999 }
```
→ `400` `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`

*Regla de negocio: `Nombre` duplicado* (la comparación es post-`.lowercase()` de Joi, exacta):
```json
{ "Nombre": "distribuidora cba", "Email": "otro@test.com", "Celular": "126" }
```
→ `500` `{"status":"error","message":"Ya existe un proveedor con ese nombre"}` (ya existe en el seed)

*Regla de negocio: `Email` duplicado (verificado en vivo):*
```json
{ "Nombre": "Otro Proveedor", "Email": "ventas@distribuidoracba.com", "Celular": "127" }
```
→ `500` `{"status":"error","message":"Ya existe un proveedor con ese email"}`

*Regla de negocio: `Celular` duplicado (verificado en vivo):*
```json
{ "Nombre": "Otro Proveedor Mas", "Email": "otro2@test.com", "Celular": "3514445555" }
```
→ `500` `{"status":"error","message":"Ya existe un proveedor con ese celular"}` (`3514445555` es el celular de "Distribuidora CBA" en el seed)

### 1.4 `PUT /compras/proveedores/:id` — actualizar (parcial)

**Camino feliz (un solo campo, el resto queda igual):**
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/compras/proveedores/3 \
  -H "Content-Type: application/json" \
  -d '{"Celular":"3511110000"}'
```
→ `200`, solo cambia `Celular`.

**Camino feliz (reactivar/desactivar manualmente):**
```json
{ "Activo": false }
```
→ `200` — nota: esto es equivalente a lo que hace `DELETE`, pero llamado directo por `PUT`.

**Bodies de error:**

*`Id` inexistente:*
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/compras/proveedores/999999 -d '{"Celular":"123"}'
```
→ `500` `{"status":"error","message":"Proveedor no encontrado"}`

*`Nombre` duplicado contra otro proveedor existente:*
```json
{ "Nombre": "apple importaciones s.a." }
```
(mandado sobre el proveedor Id 1, que no se llama así) → `500` `{"status":"error","message":"Ya existe un proveedor con ese nombre"}` — el service excluye el propio Id de la comparación, así que reenviar el **mismo** valor (`Nombre`, `Email` o `Celular`) sobre el **mismo** proveedor **no** da error (verificado en vivo: reenviar el propio `Email` de un proveedor sobre sí mismo devuelve `200`).

*`Email` o `Celular` duplicado contra OTRO proveedor (verificado en vivo):*
```json
{ "Email": "ventas@distribuidoracba.com" }
```
→ `500` `{"status":"error","message":"Ya existe un proveedor con ese email"}`

*Tipo inválido (`Activo` no booleano):*
```json
{ "Activo": "si" }
```
→ `400` `{"errors":["\"Activo\" must be a boolean"]}`

*Email inválido:*
```json
{ "Email": "roto@" }
```
→ `400` `{"errors":["\"Email\" must be a valid email"]}`

*Intentar vaciar `Email` o `Celular` a `null` (ya no se admite, a diferencia de antes — verificado en vivo):*
```json
{ "Email": null }
```
→ `400` `{"errors":["\"Email\" must be a string"]}` — para "borrar" el email de un proveedor hoy no hay forma limpia por API (tendría que ser una fase posterior si hace falta).

### 1.5 `DELETE /compras/proveedores/:id` — baja lógica

**Camino feliz:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/proveedores/4
```
→ `200` `{"status":"success","data":{"message":"Proveedor dado de baja exitosamente"}}` — la fila sigue en la tabla con `Activo:false`; comprobalo con `GET /proveedores/4` (200, lo trae igual) vs. `GET /proveedores` (200, ya no aparece en la lista).

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/proveedores/999999
```
→ `500` `{"status":"error","message":"Proveedor no encontrado"}`

**No aplica aquí** el caso de integridad referencial en `DELETE` (sección general): como es baja lógica, nunca se ejecuta un `DELETE FROM Proveedor` real, así que no hay forma de que una FK lo bloquee — podés "borrar" (desactivar) un proveedor aunque tenga `Inventario` o `Compra` apuntándole.

---

## 2. Compra (`/api/compras/compras`... ver nota de ruta)

**Nota de ruta:** el router monta esto como `router.get('/compras', ...)` **dentro** de `comprasRoutes`, que a su vez se monta en `/api/compras`. La URL real es `{{baseUrl}}/compras/compras` (queda "compras" duplicado en la URL — así está hoy en `compras.routes.js`, no es un error de este documento).

**El `POST` ya NO es un simple insert de cabecera — está orquestado y es transaccional.** `GET` y `DELETE` no cambiaron de comportamiento (siguen operando solo sobre la fila `Compra`); `PUT` perdió la capacidad de editar `TotalCosto` a mano (ver 2.4). Toda la lógica nueva está en `POST`, documentada en 2.3.

`Compra` ahora tiene dos columnas más, calculadas **siempre** por el backend, nunca aceptadas del body en ningún endpoint:
- `EstadoPago` (`SMALLINT`): `1` = Pendiente (no se pagó nada), `2` = Parcial, `3` = Pagado.
- `SaldoPendiente` (`DECIMAL(18,2)`): `TotalCosto - TotalPagado`, nunca negativo.

### 2.1 `GET /compras/compras` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/compras/compras
```
→ `200`, trae la `Compra` Id 1 del seed (`TotalCosto: 4000000`, `EstadoPago: 3`, `SaldoPendiente: 0` — está pagada, el seed tiene su `PagoCompra` correspondiente —, `IdProveedor: 2`, `IdSucursalDestino: 1`, `IdEmpleado: 3`) + las que crees. No incluye `detalles` (mismo `getAll` de siempre).

### 2.2 `GET /compras/compras/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/compras/1
```
→ `200` (fila plana, sin `detalles` — este método no se tocó)

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/compras/999999
```
→ `500` `{"status":"error","message":"Compra no encontrada"}`

### 2.3 `POST /compras/compras` — registrar compra completa (orquestado, transaccional)

Reemplaza al insert simple anterior. En una sola transacción: valida la cabecera, calcula el estado financiero, crea `Compra`, resuelve cada renglón de `Detalles[]` contra `Inventario` (existente o nuevo), crea el `DetalleCompra` correspondiente, calcula/crea el `PrecioArticulo` según la `ListaPrecio` de la categoría del producto (con fallback a la lista Id=1), registra la deuda total en `CuentaCorrienteProveedor` (**siempre**, aunque se pague todo al contado) y, si vinieron `Pagos[]`, crea cada `PagoCompra` + su `Haber` en la cuenta corriente. **La mercadería ingresa al 100% al stock sin importar la modalidad de pago** — comprá a crédito, al contado o parcial, el `Inventario` se actualiza igual. Si cualquier paso falla, `ROLLBACK` completo (verificado en vivo: ni la `Compra`, ni el stock, ni nada queda a medio crear).

Schema (`compraSchema`): `Fecha` (date ISO, opcional), `IdProveedor`/`IdSucursalDestino`/`IdEmpleado` (int positivo, req), `IdTurnoCaja` (int positivo, **opcional en Joi, pero requerido por el service si mandás `Pagos`**), `Detalles` (array, min 1, requerido, mismo schema por ítem que antes: `IdInventario`/`IdArticulo`/`Cantidad`/`PrecioCostoUnitario`/`IdColor`/`IdMemoria`/`IdBateria`/`IdAlmacenamiento`/`MesesGarantiaMarca`/`MesesGarantiaLocal`/`IMEIs`, sin cambios — ver la sección de "Reglas de negocio" más abajo), y **`Pagos`** (array, opcional, default vacío = compra 100% a crédito). Cada ítem de `Pagos`: `IdMetodoPago` (int positivo, req), `Monto` (number, `.greater(0)`, req), `FechaPago` (date ISO, opcional).

**Cálculo financiero (lo hace el backend, nunca se confía en nada que mande el frontend):**
- `TotalCosto = Σ (Detalles[].Cantidad × Detalles[].PrecioCostoUnitario)`.
- `TotalPagado = Σ Pagos[].Monto` (`0` si no mandás `Pagos`).
- Si `TotalPagado > TotalCosto` → **rechazada, rollback total**, no llega a crear nada.
- `SaldoPendiente = TotalCosto - TotalPagado`. `EstadoPago`: `TotalPagado = 0 → 1` (Pendiente), `TotalPagado < TotalCosto → 2` (Parcial), si no `→ 3` (Pagado).

**Reglas de negocio importantes (verificadas en vivo):**
- La cabecera se valida explícitamente antes de tocar la base: `IdProveedor`, `IdEmpleado` (`Usuario`) y `IdSucursalDestino` (`Sucursal`) inexistentes dan un mensaje de negocio limpio (`"Proveedor no encontrado (Id=...)."`, etc.), **no** el error crudo de FK de SQL Server. Si mandás `Pagos`, también se valida que exista el `IdTurnoCaja` y cada `IdMetodoPago` de la misma forma.
- Un `IdInventario` que pertenece a un producto **serializado** (con IMEI) **no se puede incrementar** — cada unidad serializada es una fila propia. Intentarlo tira error de negocio (ver abajo).
- Un producto **no serializado** nuevo (`IdArticulo` sin `IdInventario`) primero busca si ya existe un `Inventario` para esa combinación `(IdSucursalDestino, IdArticulo, IdEstadoInventario:1)`; si existe, **incrementa esa fila** en vez de crear una segunda (lo exige el índice único filtrado `UQ_Inventario_SucursalProducto`).
- Categoría sin `ListaPrecio` propia (`Activo:true`) → **no es error**, la compra sigue y se agrega un string a `advertencias` avisando que se usó la lista Id=1 de fallback. **Importante:** el `IdCategoriaProducto` de la categoría **nunca** se usa como `IdListaPrecio` — el service busca la fila de `ListaPrecio` cuyo `IdCategoriaProducto` coincida y usa el `Id` real de esa fila (o el `Id=1` si no hay ninguna). Con el seed actual ninguna categoría tiene lista propia, así que vas a ver esta advertencia en casi cualquier compra que hagas.

Respuesta `201` — la forma sigue siendo `{ compra, advertencias }` (ya no es la `Compra` plana del insert simple original), con `totalPagado` agregado al mismo nivel porque no es una columna persistida:
```json
{
  "status": "success",
  "data": {
    "compra": { "Id": 15, "TotalCosto": 65000, "EstadoPago": 2, "SaldoPendiente": 45000, "...": "...", "detalles": [ "..." ] },
    "totalPagado": 20000,
    "advertencias": []
  }
}
```
(`detalles[].IdArticulo` es el `Id` del renglón de `Inventario` afectado — mismo detalle de nombrado que ya se aclara en la sección 3: el atributo se llama `IdArticulo` pero mapea a la columna `IdInventario`.)

**Camino feliz — Caso 1: compra pagada al contado (`EstadoPago: 3`):**
```json
{
  "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 1, "IdTurnoCaja": 1,
  "Detalles": [ { "IdInventario": 2, "Cantidad": 10, "PrecioCostoUnitario": 1500.00 } ],
  "Pagos": [ { "IdMetodoPago": 1, "Monto": 15000.00 } ]
}
```
→ `201`. `TotalCosto: 15000`, `totalPagado: 15000`, `SaldoPendiente: 0`, `EstadoPago: 3`. Se crea 1 `PagoCompra` y la cuenta corriente del proveedor queda con `Debe 15000` / `Haber 15000` / saldo neto `0` para este movimiento.

**Camino feliz — Caso 2: compra totalmente a crédito (`EstadoPago: 1`, sin `Pagos`):**
```json
{
  "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 1,
  "Detalles": [
    { "IdInventario": null, "IdArticulo": 2, "MesesGarantiaLocal": "2027-08-25", "Cantidad": 25, "PrecioCostoUnitario": 3000.00 }
  ],
  "Pagos": []
}
```
→ `201`. `TotalCosto: 75000`, `totalPagado: 0`, `SaldoPendiente: 75000`, `EstadoPago: 1`. **No se crea ningún `PagoCompra`.** La mercadería entra igual al 100% (`Stock += 25` o `Inventario` nuevo, según corresponda). `IdTurnoCaja` ni siquiera hace falta acá porque no hay pagos.

**Camino feliz — Caso 3: compra con pago parcial (`EstadoPago: 2`), detalle mixto con IMEI:**
```json
{
  "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 2, "IdTurnoCaja": 1,
  "Detalles": [
    { "IdInventario": 2, "Cantidad": 10, "PrecioCostoUnitario": 1500.00 },
    {
      "IdInventario": null, "IdArticulo": 1,
      "IdColor": 1, "IdMemoria": 3, "IdBateria": 1, "IdAlmacenamiento": 3,
      "MesesGarantiaLocal": "2027-08-25", "Cantidad": 1, "PrecioCostoUnitario": 50000.00,
      "IMEIs": ["356890123456789"]
    }
  ],
  "Pagos": [ { "IdMetodoPago": 2, "Monto": 20000.00 } ]
}
```
→ `201`. `TotalCosto: 65000`, `totalPagado: 20000`, `SaldoPendiente: 45000`, `EstadoPago: 2`. La cuenta corriente del proveedor queda con dos movimientos nuevos: `Debe 65000` (factura) y `Haber 20000` (el pago), en ese orden.

**Bodies de error:**

*Body vacío:*
```json
{}
```
→ `400` `{"errors":["\"IdProveedor\" is required","\"IdSucursalDestino\" is required","\"IdEmpleado\" is required","\"Detalles\" is required"]}`

*`Detalles` vacío:*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 1, "Detalles": [] }
```
→ `400` `{"errors":["\"Detalles\" must contain at least 1 items"]}`

*Renglón sin `IdInventario` ni `IdArticulo` (Joi los deja pasar, lo valida el service):*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 1, "Detalles": [ { "Cantidad": 1, "PrecioCostoUnitario": 100 } ] }
```
→ `500` `{"status":"error","message":"Cada renglón de la compra debe indicar \"IdInventario\" (existente) o \"IdArticulo\" (para crear uno nuevo)."}`

*Intentar incrementar stock de un `Inventario` serializado (usá el Id 1 del seed, iPhone 13):*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 2, "Detalles": [ { "IdInventario": 1, "Cantidad": 1, "PrecioCostoUnitario": 100 } ] }
```
→ `500` `{"status":"error","message":"El Inventario Id=1 corresponde a un producto serializado (con IMEI): no se le puede incrementar el stock. Cada unidad serializada debe cargarse como un renglón nuevo con su propio IMEI."}`

*Producto serializado con cantidad de `IMEIs` distinta de `Cantidad`:*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 2, "Detalles": [ { "IdArticulo": 1, "Cantidad": 2, "PrecioCostoUnitario": 100, "MesesGarantiaLocal": "2027-01-01", "IMEIs": ["111"] } ] }
```
→ `500` `{"status":"error","message":"El producto Id=1 es serializado (requiere IMEI): se esperaban 2 IMEIs (uno por unidad, campo \"IMEIs\") y se recibieron 1."}`

*IMEI ya usado (por otra fila de `Inventario`, incluida una que hayas cargado vos en un test anterior):*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 2, "Detalles": [ { "IdArticulo": 1, "Cantidad": 1, "PrecioCostoUnitario": 100, "MesesGarantiaLocal": "2027-01-01", "IMEIs": ["<un IMEI que ya exista>"] } ] }
```
→ `500` `{"status":"error","message":"Ya existe un Inventario con el IMEI <imei> (Id=<id>). No se puede repetir en la misma compra."}`

*`IdProveedor` inexistente en la cabecera (ahora da mensaje de negocio limpio, no el error crudo de FK):*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 999999, "Detalles": [ { "IdInventario": 2, "Cantidad": 1, "PrecioCostoUnitario": 100 } ] }
```
→ `500` `{"status":"error","message":"Proveedor no encontrado (Id=999999)."}`

*Pagos que superan el total de la compra (rechazada, rollback total):*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 1, "IdTurnoCaja": 1, "Detalles": [ { "IdInventario": 2, "Cantidad": 1, "PrecioCostoUnitario": 100 } ], "Pagos": [ { "IdMetodoPago": 1, "Monto": 200 } ] }
```
→ `500` `{"status":"error","message":"El total de los pagos (200) no puede superar el total de la compra (100)."}` — verificado que no queda ninguna `Compra` nueva creada.

*`Pagos` presente sin `IdTurnoCaja`:*
```json
{ "IdEmpleado": 1, "IdSucursalDestino": 1, "IdProveedor": 1, "Detalles": [ { "IdInventario": 2, "Cantidad": 1, "PrecioCostoUnitario": 100 } ], "Pagos": [ { "IdMetodoPago": 1, "Monto": 50 } ] }
```
→ `500` `{"status":"error","message":"Falta \"IdTurnoCaja\" (requerido para registrar los pagos iniciales de la compra)."}`

*`IdMetodoPago` inexistente en un pago inicial, o `IdTurnoCaja` inexistente:* mismo criterio, mensajes de negocio limpios: `"Método de pago no encontrado (Id=...)."` / `"Turno de caja no encontrado (Id=...)."`

### 2.4 `PUT /compras/compras/:id` — actualizar (parcial)

`TotalCosto` **ya no se puede editar por acá** — se sacó del `compraUpdateSchema` porque ahora es un campo calculado por el `POST`/`PagoCompra`. `EstadoPago`/`SaldoPendiente` tampoco se exponen nunca en este schema (ni en el de creación) — son de uso exclusivo interno de las transacciones de compra/pago.

**Camino feliz:**
```json
{ "IdEmpleado": 1 }
```
→ `200`

**Bodies de error:**

*`Id` inexistente:*
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/compras/compras/999999 -d '{"IdEmpleado":1}'
```
→ `500` `{"status":"error","message":"Compra no encontrada"}`

*Enviar `TotalCosto` (Joi lo descarta en silencio, `stripUnknown:true`, no da error pero tampoco lo actualiza):*
```json
{ "TotalCosto": 4500000 }
```
→ `200`, pero `TotalCosto` de la compra queda igual que antes — revisalo con un `GET` después para confirmar que no cambió.

*`IdProveedor` inexistente (FK), sobre una Compra Id válida:*
```json
{ "IdProveedor": 999999 }
```
→ `400` integridad referencial (mismo mensaje de siempre — `PUT` **no** pasa por el `catch` transaccional de `POST`, así que acá sí conserva el 400 limpio)

### 2.5 `DELETE /compras/compras/:id` — eliminación física

Acá **sí** es un `DELETE FROM Compra` real (no baja lógica) — a diferencia de `Proveedor`. Este método no se tocó, pero desde el `POST` orquestado (y ahora también la cuenta corriente) es **prácticamente imposible llegar al camino feliz**: toda `Compra` creada por `POST /compras/compras` nace con al menos un `DetalleCompra` y un movimiento `CuentaCorrienteProveedor` (el `Debe` de la factura, siempre) apuntándole, y **no existe ningún endpoint para borrar movimientos de `CuentaCorrienteProveedor`** — así que ya no alcanza con borrar los `DetalleCompra`/`PagoCompra` primero como antes.

**Error: integridad referencial (el único caso realista hoy contra una Compra creada por el POST orquestado):**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/compras/1
```
→ `400` `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}` (`DELETE` sí pasa por el flujo normal del service, no por el `catch` transaccional — conserva el 400 limpio). Aunque borres sus `DetalleCompra` y `PagoCompra` a mano, la FK `FK_CCProv_Compra` de `CuentaCorrienteProveedor` sigue bloqueando el borrado.

**Camino feliz:** hoy solo es alcanzable manipulando la base directamente (fuera de la API) para quitar el movimiento de `CuentaCorrienteProveedor`, o probándolo contra una fila vieja anterior a este cambio que no tenga ese movimiento asociado. Para efectos prácticos, tratá `DELETE /compras/compras/:id` como no disponible una vez que la compra pasó por el flujo nuevo.

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/compras/999999
```
→ `500` `{"status":"error","message":"Compra no encontrada"}`

---

## 3. Detalle de compra (`/api/compras/detalles-compra`)

Cargar un detalle **no mueve stock ni crea `MovimientoStock`** — es una fila plana nada más.

Schema create (`detalleCompraSchema`): `Cantidad` (int, **min 1**, req), `PrecioCostoUnitario` (number, precision 2, min 0, req), `IdCompra` (int positivo, req), `IdArticulo` (int positivo, req — **ojo:** pese al nombre, la FK real (`field: 'IdInventario'`) apunta a un `Id` de **`Inventario`**, no de `Producto`/`Articulo`; usá los Id 1 o 2 del seed).
Schema update: los mismos 4 campos, todos opcionales.

### 3.1 `GET /compras/detalles-compra` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/compras/detalles-compra
```
→ `200`, trae el `DetalleCompra` Id 1 del seed (`Cantidad: 5`, `PrecioCostoUnitario: 800000`, `IdCompra: 1`, apunta a Inventario Id 1) + los que crees.

### 3.2 `GET /compras/detalles-compra/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/detalles-compra/1
```
→ `200`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/detalles-compra/999999
```
→ `500` `{"status":"error","message":"Detalle de compra no encontrado"}`

### 3.3 `POST /compras/detalles-compra` — crear

**Camino feliz:**
```json
{ "Cantidad": 5, "PrecioCostoUnitario": 800000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `201`

**Camino feliz (cantidad mínima permitida):**
```json
{ "Cantidad": 1, "PrecioCostoUnitario": 0, "IdCompra": 1, "IdArticulo": 2 }
```
→ `201` (`Cantidad` en el límite `min(1)`, `PrecioCostoUnitario` en el límite `min(0)`)

**Bodies de error:**

*Body vacío:*
```json
{}
```
→ `400` `{"errors":["\"Cantidad\" is required","\"PrecioCostoUnitario\" is required","\"IdCompra\" is required","\"IdArticulo\" is required"]}`

*`Cantidad` menor a 1:*
```json
{ "Cantidad": 0, "PrecioCostoUnitario": 50000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than or equal to 1"]}`

*`Cantidad` no entera:*
```json
{ "Cantidad": 2.5, "PrecioCostoUnitario": 50000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be an integer"]}`

*`PrecioCostoUnitario` negativo:*
```json
{ "Cantidad": 1, "PrecioCostoUnitario": -100, "IdCompra": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"PrecioCostoUnitario\" must be greater than or equal to 0"]}`

*`IdCompra` inexistente (FK):*
```json
{ "Cantidad": 1, "PrecioCostoUnitario": 1000, "IdCompra": 999999, "IdArticulo": 1 }
```
→ `400` integridad referencial

*`IdArticulo` inexistente en `Inventario` (FK) — recordá que apunta a Inventario, no a Producto:*
```json
{ "Cantidad": 1, "PrecioCostoUnitario": 1000, "IdCompra": 1, "IdArticulo": 999999 }
```
→ `400` integridad referencial

### 3.4 `PUT /compras/detalles-compra/:id` — actualizar (parcial)

**Camino feliz:**
```json
{ "Cantidad": 10 }
```
→ `200`

**Bodies de error:**

*`Id` inexistente:*
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/compras/detalles-compra/999999 -d '{"Cantidad":1}'
```
→ `500` `{"status":"error","message":"Detalle de compra no encontrado"}`

*`Cantidad` en 0 (viola `min(1)`):*
```json
{ "Cantidad": 0 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than or equal to 1"]}`

*`IdCompra` inexistente (FK) sobre un detalle válido:*
```json
{ "IdCompra": 999999 }
```
→ `400` integridad referencial

### 3.5 `DELETE /compras/detalles-compra/:id`

**Camino feliz:** creá un `DetalleCompra` nuevo (o usá uno que no te importe perder) y:
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/detalles-compra/<id>
```
→ `200` `{"status":"success","data":{"message":"Detalle de compra eliminado exitosamente"}}`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/detalles-compra/999999
```
→ `500` `{"status":"error","message":"Detalle de compra no encontrado"}`

**Sin caso de integridad referencial en `DELETE`:** `DetalleCompra` es una tabla "hoja" — ninguna otra tabla del esquema tiene una FK que apunte a ella, así que siempre se puede borrar sin bloqueo (asumiendo que el `Id` existe).

---

## 4. Devolución de compra (`/api/compras/devoluciones-compra`)

Schema create (`devolucionCompraSchema`): `Fecha` (date **ISO**, opcional), `MontoRecuperado` (number, precision 2, min 0, req), `Motivo` (string, max 200, req), `IdCompra`/`IdTurnoCaja`/`IdEmpleado` (int positivo, req).
Schema update: los mismos 6 campos, todos opcionales.

**IMPORTANTE:** igual que `Compra`, este `POST` solo crea la fila cabecera. No repone stock ni crea `MovimientoStock`/`DetalleDevolucionCompra` — eso se carga aparte (ver sección 5). **El seed no trae ninguna `DevolucionCompra` cargada** — para los caminos felices de `GET/PUT/DELETE` de esta sección primero tenés que crear una con `POST`.

### 4.1 `GET /compras/devoluciones-compra` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/compras/devoluciones-compra
```
→ `200`, `data: []` hasta que crees la primera.

### 4.2 `GET /compras/devoluciones-compra/:id`

**Camino feliz:** (usando el `Id` que te devolvió el `POST` del punto 4.3)
```bash
curl -b cookies.txt http://localhost:3000/api/compras/devoluciones-compra/1
```
→ `200`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/devoluciones-compra/999999
```
→ `500` `{"status":"error","message":"Devolución de compra no encontrada"}`

### 4.3 `POST /compras/devoluciones-compra` — crear

**Camino feliz:**
```json
{ "MontoRecuperado": 800000, "Motivo": "Producto con falla de fábrica", "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `201`

**Bodies de error:**

*Body vacío (los 3 FK + 2 campos propios son requeridos):*
```json
{}
```
→ `400` `{"errors":["\"MontoRecuperado\" is required","\"Motivo\" is required","\"IdCompra\" is required","\"IdTurnoCaja\" is required","\"IdEmpleado\" is required"]}`

*Falta `Motivo`:*
```json
{ "MontoRecuperado": 800000, "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `400` `{"errors":["\"Motivo\" is required"]}`

*`Motivo` excede 200 caracteres:*
```json
{ "MontoRecuperado": 100, "Motivo": "<un string de 201+ caracteres>", "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `400` `{"errors":["\"Motivo\" length must be less than or equal to 200 characters long"]}`

*`MontoRecuperado` negativo:*
```json
{ "MontoRecuperado": -1, "Motivo": "Test", "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `400` `{"errors":["\"MontoRecuperado\" must be greater than or equal to 0"]}`

*`IdCompra` inexistente (FK):*
```json
{ "MontoRecuperado": 100, "Motivo": "Test", "IdCompra": 999999, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `400` integridad referencial

*`IdTurnoCaja` inexistente (FK), mismo formato.*

### 4.4 `PUT /compras/devoluciones-compra/:id` — actualizar (parcial)

**Camino feliz:**
```json
{ "MontoRecuperado": 750000 }
```
→ `200`

**Bodies de error:**

*`Id` inexistente:*
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/compras/devoluciones-compra/999999 -d '{"MontoRecuperado":1}'
```
→ `500` `{"status":"error","message":"Devolución de compra no encontrada"}`

*`Motivo` vacío (string vacío no rompe `required` porque el campo ya existe con valor previo si no lo mandás; pero si lo mandás vacío en un `PUT`, sí se valida `max` normalmente — el caso interesante es un tipo inválido):*
```json
{ "IdEmpleado": "no-numerico" }
```
→ `400` `{"errors":["\"IdEmpleado\" must be a number"]}`

### 4.5 `DELETE /compras/devoluciones-compra/:id`

**Camino feliz (devolución sin detalles asociados):**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/devoluciones-compra/<id>
```
→ `200` `{"status":"success","data":{"message":"Devolución de compra eliminada exitosamente"}}`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/devoluciones-compra/999999
```
→ `500` `{"status":"error","message":"Devolución de compra no encontrada"}`

**Error: integridad referencial (caso avanzado, requiere armar la cadena primero)** — `DetalleDevolucionCompra` tiene FK hacia `DevolucionCompra`, sin cascada. Para reproducirlo:
1. `POST /compras/devoluciones-compra` (te da un `Id`, ej. `5`)
2. `POST /inventario/movimiento-stock` con un `MovimientoStock` nuevo (ver sección 5 para el body)
3. `POST /compras/detalles-devolucion-compra` con `IdDevolucionCompra: 5`
4. `DELETE /compras/devoluciones-compra/5`
→ `400` `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`

---

## 5. Detalle de devolución de compra (`/api/compras/detalles-devolucion-compra`)

Schema create (`detalleDevolucionCompraSchema`): `Cantidad` (int, min 1, req), `IdDevolucionCompra` (int positivo, req), `IdArticulo` (int positivo, req — misma aclaración que en detalle-compra: la FK real apunta a `Inventario`, campo `field: 'IdInventario'`), `IdMovimientoStock` (int positivo, req — **hay que crear el `MovimientoStock` a mano primero**, vía `POST /api/inventario/movimiento-stock` — nota: la ruta es singular, **no** `/movimientos-stock`; este endpoint de Compras no lo genera).
Schema update: los mismos 4 campos, todos opcionales.

**Body para crear el `MovimientoStock` previo** (`movimientoStockSchema`: `Fecha` **requerida** acá, a diferencia de Compra/Devolución donde es opcional):
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/inventario/movimiento-stock \
  -H "Content-Type: application/json" \
  -d '{"Fecha":"2026-08-25","TipoMovimiento":"Egreso por Devolución a Proveedor","Cantidad":1,"IdInventario":1,"IdEmpleado":1}'
```
→ `201`, anotá el `Id` devuelto para usarlo como `IdMovimientoStock` abajo.

**El seed no trae ninguna `DetalleDevolucionCompra`** — igual que en la sección 4, para probar `GET/PUT/DELETE` primero hay que crear una con `POST`, y para el `POST` primero hay que tener una `DevolucionCompra` (sección 4) y un `MovimientoStock` (arriba).

### 5.1 `GET /compras/detalles-devolucion-compra` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/compras/detalles-devolucion-compra
```
→ `200`, `data: []` hasta que crees el primero.

### 5.2 `GET /compras/detalles-devolucion-compra/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/detalles-devolucion-compra/1
```
→ `200`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/detalles-devolucion-compra/999999
```
→ `500` `{"status":"error","message":"Detalle de devolución de compra no encontrado"}`

### 5.3 `POST /compras/detalles-devolucion-compra` — crear

**Camino feliz** (usando `IdDevolucionCompra` y `IdMovimientoStock` que ya creaste vos):
```json
{ "Cantidad": 1, "IdDevolucionCompra": 1, "IdArticulo": 1, "IdMovimientoStock": 3 }
```
→ `201`

También podés probarlo directo contra los datos del seed (sin crear nada previo) usando el `MovimientoStock` Id 1 (`"Ingreso por Compra"`, IdInventario 1) — la FK no distingue tipo de movimiento, así que igual pasa, aunque semánticamente ese movimiento "pertenece" a un ingreso, no a una devolución:
```json
{ "Cantidad": 1, "IdDevolucionCompra": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ requiere que ya exista `DevolucionCompra` Id 1 (creála primero, sección 4) → `201`

**Bodies de error:**

*Body vacío:*
```json
{}
```
→ `400` `{"errors":["\"Cantidad\" is required","\"IdDevolucionCompra\" is required","\"IdArticulo\" is required","\"IdMovimientoStock\" is required"]}`

*`Cantidad` menor a 1:*
```json
{ "Cantidad": 0, "IdDevolucionCompra": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than or equal to 1"]}`

*`IdDevolucionCompra` inexistente (FK):*
```json
{ "Cantidad": 1, "IdDevolucionCompra": 999999, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ `400` integridad referencial

*`IdMovimientoStock` inexistente (FK):*
```json
{ "Cantidad": 1, "IdDevolucionCompra": 1, "IdArticulo": 1, "IdMovimientoStock": 999999 }
```
→ `400` integridad referencial

### 5.4 `PUT /compras/detalles-devolucion-compra/:id` — actualizar (parcial)

**Camino feliz:**
```json
{ "Cantidad": 2 }
```
→ `200`

**Bodies de error:**

*`Id` inexistente:*
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/compras/detalles-devolucion-compra/999999 -d '{"Cantidad":1}'
```
→ `500` `{"status":"error","message":"Detalle de devolución de compra no encontrado"}`

*`IdArticulo` (Inventario) inexistente (FK):*
```json
{ "IdArticulo": 999999 }
```
→ `400` integridad referencial

### 5.5 `DELETE /compras/detalles-devolucion-compra/:id`

**Camino feliz:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/detalles-devolucion-compra/<id>
```
→ `200` `{"status":"success","data":{"message":"Detalle de devolución eliminado exitosamente"}}`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/compras/detalles-devolucion-compra/999999
```
→ `500` `{"status":"error","message":"Detalle de devolución de compra no encontrado"}`

**Sin caso de integridad referencial en `DELETE`:** tabla hoja, nada la referencia.

---

## 6. Pago de compra (`/api/compras/pagos-compra`)

**El `POST` ya no es un insert simple — es "RegistrarPagoPosterior": paga (total o parcialmente) el saldo pendiente de una `Compra` ya existente**, transaccional, dentro de su propia transacción (no la del `POST /compras/compras`, es un pago que llega *después*). Actualiza `Compra.SaldoPendiente`/`EstadoPago` y crea el `Haber` correspondiente en `CuentaCorrienteProveedor`. **`PUT` y `DELETE` fueron eliminados** (rutas, controller y service) — un pago registrado es inmutable; corregir uno mal cargado queda fuera de alcance de este cambio (se resolvería con un movimiento de ajuste tipo nota de crédito, no implementado).

Schema create (`pagoCompraSchema`, sin cambios): `Monto` (number, precision 2, **`.greater(0)`**, req), `FechaPago` (date ISO, opcional, default `new Date()`), `IdCompra`/`IdMetodoPago`/`IdTurnoCaja` (int positivo, req).

### 6.1 `GET /compras/pagos-compra` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/compras/pagos-compra
```
→ `200`, trae el `PagoCompra` Id 1 del seed (`Monto: 4000000`, `IdCompra: 1`, `IdMetodoPago: 3` = "transferencia bancaria", `IdTurnoCaja: 1`) + los que crees.

### 6.2 `GET /compras/pagos-compra/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/pagos-compra/1
```
→ `200`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/pagos-compra/999999
```
→ `500` `{"status":"error","message":"Pago de compra no encontrado"}`

### 6.3 `POST /compras/pagos-compra` — registrar pago posterior (transaccional)

**Camino feliz (pago parcial sobre una Compra con saldo pendiente):**
```json
{ "Monto": 20000, "IdCompra": 15, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `201`, crea el `PagoCompra` y **además** actualiza la `Compra` (`SaldoPendiente -= Monto`, `EstadoPago = 3` si el saldo llega a `0`, si no `2`) y agrega un `Haber` en `CuentaCorrienteProveedor`. Verificado en vivo: sobre una Compra con `SaldoPendiente: 45000`, pagar `20000` la deja en `SaldoPendiente: 25000`, `EstadoPago: 2`; pagar los `25000` restantes después la cierra en `SaldoPendiente: 0`, `EstadoPago: 3`.

**Bodies de error:**

*Body vacío:*
```json
{}
```
→ `400` `{"errors":["\"Monto\" is required","\"IdCompra\" is required","\"IdMetodoPago\" is required","\"IdTurnoCaja\" is required"]}`

*`Monto` igual a 0 o negativo (viola `.greater(0)`):*
```json
{ "Monto": 0, "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"Monto\" must be greater than 0"]}`

*`IdCompra` inexistente:*
```json
{ "Monto": 100, "IdCompra": 999999, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `500` `{"status":"error","message":"Compra no encontrada (Id=999999)."}`

*`IdMetodoPago` inexistente:*
```json
{ "Monto": 100, "IdCompra": 1, "IdMetodoPago": 999, "IdTurnoCaja": 1 }
```
→ `500` `{"status":"error","message":"Método de pago no encontrado (Id=999)."}`

*`IdTurnoCaja` inexistente:*
```json
{ "Monto": 100, "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 999999 }
```
→ `500` `{"status":"error","message":"Turno de caja no encontrado (Id=999999)."}`

*`Monto` mayor al saldo pendiente de la Compra (rechazado — nunca se permite `SaldoPendiente < 0`):*
```json
{ "Monto": 999999999, "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `500` `{"status":"error","message":"El pago (999999999) supera el saldo pendiente de la Compra Id=1 (0)."}` (la Compra Id 1 del seed ya está pagada — probá con una que tenga saldo, ej. una creada a crédito, para ver el mensaje con un saldo mayor a 0).

### 6.4 `PUT` y `DELETE /compras/pagos-compra/:id` — eliminados

Ya no existen. Cualquier request a esas rutas/métodos devuelve **`404`** (Express no encuentra la ruta), verificado en vivo:
```bash
curl -X PUT http://localhost:3000/api/compras/pagos-compra/1 -b cookies.txt -d '{}'
curl -X DELETE http://localhost:3000/api/compras/pagos-compra/1 -b cookies.txt
```
→ ambos `404`, body HTML de Express (`Cannot PUT /api/compras/pagos-compra/1`), no un JSON de error de la API.

---

## 7. Cuenta corriente de proveedor (`/api/compras/cuenta-corriente-proveedor`)

Historial cronológico de deuda por proveedor (`Debe`/`Haber`/`SaldoAcumulado`). **Es de solo lectura por API** — no hay `POST`/`PUT`/`DELETE` expuestos, los movimientos se crean únicamente desde adentro de `POST /compras/compras` (siempre un `Debe` por el total de la compra, más un `Haber` por cada pago inicial) y de `POST /compras/pagos-compra` (un `Haber` por cada pago posterior). `Concepto` es siempre uno de dos valores fijos que arma el backend: `"Factura de Compra"` o `"Pago a cuenta/total"` — nunca texto libre del frontend.

### 7.1 `GET /compras/cuenta-corriente-proveedor` — listar movimientos

**Camino feliz (todos los movimientos):**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/cuenta-corriente-proveedor
```
→ `200`, orden ascendente por `Id` (= orden cronológico real de los movimientos).

**Camino feliz (filtrado por proveedor):**
```bash
curl -b cookies.txt "http://localhost:3000/api/compras/cuenta-corriente-proveedor?idProveedor=2"
```
→ `200`, solo los movimientos de ese proveedor. Verificado en vivo contra el Proveedor Id 2 del seed: la secuencia queda `Debe 4000000` (Compra Id2) → `Debe 4000000` (Compra Id1) → `Haber 4000000` (pago de la Compra Id1) → `Debe 1816600` (Compra Id6) → ... con `SaldoAcumulado` encadenado correctamente en cada fila.

### 7.2 `GET /compras/cuenta-corriente-proveedor/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/cuenta-corriente-proveedor/1
```
→ `200`

**Error: `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/cuenta-corriente-proveedor/999999
```
→ `500` `{"status":"error","message":"Movimiento de cuenta corriente no encontrado"}`

### 7.3 `GET /compras/proveedores/:id/saldo` — saldo global del proveedor

Devuelve el `SaldoAcumulado` del último movimiento del proveedor (no una suma en tiempo real — el backend confía en que cada movimiento ya guardó el saldo resultante en el momento de crearse).

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/proveedores/2/saldo
```
→ `200` `{"status":"success","data":{"IdProveedor":2,"Saldo":5816600}}` (el valor exacto depende de qué compras/pagos hayas hecho vos; verificado en vivo que coincide con el `SaldoAcumulado` del último movimiento de ese proveedor).

**Proveedor sin movimientos todavía:**
```bash
curl -b cookies.txt http://localhost:3000/api/compras/proveedores/<id-de-un-proveedor-nuevo>/saldo
```
→ `200` `{"status":"success","data":{"IdProveedor":<id>,"Saldo":0}}` — no es error, un proveedor sin compras registradas simplemente tiene saldo 0.

**Nota:** esta ruta no valida que el `Id` corresponda a un `Proveedor` real — si le pasás un Id que no existe en `Proveedor`, igual te devuelve `Saldo:0` (mismo comportamiento que "sin movimientos", porque el service solo busca movimientos por `IdProveedor`, no consulta la tabla `Proveedor`).

### Endpoints sin exponer (a propósito)

`POST`, `PUT` y `DELETE` de `/cuenta-corriente-proveedor` no existen — probarlos da `404`. Los movimientos son 100% derivados de `Compra`/`PagoCompra`; si necesitás corregir uno mal generado, hoy no hay forma vía API (fuera de alcance de este cambio, ver nota de la sección 6 sobre nota de crédito).

---

## 8. Lista de precios (`/api/precios/lista-de-precios`)

Módulo aparte de Compras en el código (`src/modules/precios`), pero se prueba junto porque `PrecioArticulo` (sección 9) es la pieza que Compras va a necesitar en la fase de negocio pendiente.

Schema create (`listaPreciosSchema`): `Nombre` (string, max 100, req), `PorcentajeRentabilidad` (number, precision 2, min 0, req), `Activo` (boolean, opcional), `IdCategoriaProducto` (int, opcional, admite `null`).
Schema update: los mismos 4 campos, todos opcionales.

**LIMITACIÓN CONOCIDA — leer antes de probar `IdCategoriaProducto`:** la columna ya existe en el esquema (`db/init/init.sql`), pero el **modelo Sequelize `ListaPrecio` todavía no la mapea como atributo**. Si la mandás en el body, Joi la deja pasar pero Sequelize la descarta en silencio al hacer el `INSERT`/`UPDATE` — no se persiste, no da error. Si pedís el registro de nuevo (`GET /:id`) el campo no va a estar. Esto se resuelve en una fase posterior de modelos.

Tanto `getById` como `remove` en este service **reenvían directo lo que devuelve el DAO, sin chequear null/false**:
- `GET /:id` con `Id` inexistente → **`200`** con `data: null` (no 404, no 500).
- `DELETE /:id` con `Id` inexistente → **`200`** `{"status":"success","data":{"message":"Lista de precios eliminada correctamente"}}` igual, aunque no haya borrado nada.

### 7.1 `GET /precios/lista-de-precios` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/precios/lista-de-precios
```
→ `200`, trae la "Lista General (Default)" Id 1 (`PorcentajeRentabilidad: 30`) + las que crees.

### 7.2 `GET /precios/lista-de-precios/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/precios/lista-de-precios/1
```
→ `200`

**"Error" que no es error — `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/precios/lista-de-precios/999999
```
→ `200` `{"status":"success","data":null}` (revisá el `data`, no el status code, para saber si existe)

### 7.3 `POST /precios/lista-de-precios` — crear

**Camino feliz:**
```json
{ "Nombre": "Mayorista Smartphones", "PorcentajeRentabilidad": 25.00, "Activo": true, "IdCategoriaProducto": 1 }
```
→ `201` — pero al pedir `GET /:id` después, `IdCategoriaProducto` no va a estar en la respuesta (ver limitación conocida arriba).

**Bodies de error:**

*Body vacío:*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required","\"PorcentajeRentabilidad\" is required"]}`

*Falta `PorcentajeRentabilidad`:*
```json
{ "Nombre": "Lista sin porcentaje" }
```
→ `400` `{"errors":["\"PorcentajeRentabilidad\" is required"]}`

*`PorcentajeRentabilidad` negativo:*
```json
{ "Nombre": "Lista Negativa", "PorcentajeRentabilidad": -5 }
```
→ `400` `{"errors":["\"PorcentajeRentabilidad\" must be greater than or equal to 0"]}`

*`Nombre` excede 100 caracteres:*
```json
{ "Nombre": "<string de 101+ caracteres>", "PorcentajeRentabilidad": 10 }
```
→ `400` `{"errors":["\"Nombre\" length must be less than or equal to 100 characters long"]}`

**Nota:** este endpoint **no valida duplicados de `Nombre`** (a diferencia de `Proveedor`) — podés crear dos listas con el mismo nombre sin error.

### 7.4 `PUT /precios/lista-de-precios/:id` — actualizar (parcial)

**Camino feliz:**
```json
{ "PorcentajeRentabilidad": 28 }
```
→ `200`

**"Error" que no es error — `Id` inexistente:** el service llama directo `this.listaPreciosDAO.update(id, data)`, que internamente hace `getById` (devuelve `null`) y como no hay registro, `record.update` nunca se llama → `BaseDAO.update` devuelve `null`. El controller no chequea nada, así que:
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/precios/lista-de-precios/999999 -d '{"PorcentajeRentabilidad":1}'
```
→ `200` `{"status":"success","data":null}` — **no hay 404 ni 500**, es otra limitación conocida de este service (no chequea existencia, a diferencia de todos los services de Compras).

**Error real (sí valida Joi):**
```json
{ "PorcentajeRentabilidad": "no-numerico" }
```
→ `400` `{"errors":["\"PorcentajeRentabilidad\" must be a number"]}`

### 7.5 `DELETE /precios/lista-de-precios/:id`

**Camino feliz:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/precios/lista-de-precios/<id>
```
→ `200` `{"status":"success","data":{"message":"Lista de precios eliminada correctamente"}}`

**"Error" que no es error — `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/precios/lista-de-precios/999999
```
→ `200` igual (mismo mensaje de éxito), porque el service no chequea si `remove` realmente borró algo.

**Cuidado — no hay protección sobre el Id=1 (fallback default):** `DELETE /lista-de-precios/1` la borra sin avisar nada especial. Si la borrás, cualquier lógica de fallback futura que dependa del Id=1 va a fallar. Además, si `PrecioArticulo` Id 1 o 2 (seed) siguen apuntando a `IdListaPrecio: 1`, el `DELETE` de la lista sí va a chocar con la FK de `PrecioArticulo` (sección 9) y te va a devolver `400` de integridad referencial — probalo con una lista sin `PrecioArticulo` asociado si querés ver el camino feliz.

---

## 9. Precios por artículo (`/api/precios/precios-articulos`)

Schema create (`preciosArticulosSchema`): `IdInventario` (int, req — **`.integer()` sin `.positive()`**, a diferencia de las FKs de Compras), `IdListaPrecio` (int, req, mismo detalle), `CostoBase` (number, precision 2, min 0, req), `FechaDesde` (date, req — **sin `.iso()`**, acepta cualquier formato parseable por `Date`), `FechaHasta` (date, opcional, admite `null`).
Schema update: los mismos 5 campos, todos opcionales.

**Los campos `ValorFinal`, `CostosVariables`, `CostoReal` y `PorcentajeGanancia` NO se mandan** — `preciosArticulosService.computeFields()` los calcula solo: `CostosVariables = CostoBase * 0.26`, `CostoReal = CostoBase + CostosVariables`, `PorcentajeGanancia` = el `PorcentajeRentabilidad` de la `ListaPrecio` indicada (0 si `IdListaPrecio` no existe — ver abajo), `ValorFinal = CostoReal * (1 + PorcentajeGanancia/100)`. Si los mandás igual en el body no pasa nada raro: `stripUnknown: true` los descarta en silencio antes de llegar al service.

**No cierra vigencia de un `PrecioArticulo` anterior del mismo `IdInventario` al crear uno nuevo** — podés terminar con dos filas `FechaHasta: null` para el mismo artículo (dos "vigentes" en simultáneo).

Mismas limitaciones que `lista-de-precios`: `getById`/`remove`/`update` no chequean existencia — `GET /:id` con Id inexistente → `200` `data:null`; `DELETE`/`PUT` con Id inexistente → `200` sin error.

### 8.1 `GET /precios/precios-articulos` — listar

```bash
curl -b cookies.txt http://localhost:3000/api/precios/precios-articulos
```
→ `200`, trae los 2 `PrecioArticulo` del seed: Inventario Id 1 (`ValorFinal: 1310400.00`) e Inventario Id 2 (`ValorFinal: 2457.00`), ambos con `IdListaPrecio: 1`.

### 8.2 `GET /precios/precios-articulos/:id`

**Camino feliz:**
```bash
curl -b cookies.txt http://localhost:3000/api/precios/precios-articulos/1
```
→ `200`

**"Error" que no es error — `Id` inexistente:**
```bash
curl -b cookies.txt http://localhost:3000/api/precios/precios-articulos/999999
```
→ `200` `{"status":"success","data":null}`

### 8.3 `POST /precios/precios-articulos` — crear

**Camino feliz (usando la ListaPrecio Id 1 del seed, 30% de rentabilidad):**
```json
{ "IdInventario": 1, "IdListaPrecio": 1, "CostoBase": 800000, "FechaDesde": "2026-08-24" }
```
→ `201`, con `ValorFinal` calculado en `1310400.00` (`CostosVariables: 208000`, `CostoReal: 1008000`, `PorcentajeGanancia: 30`)

**Camino feliz con `FechaHasta`:**
```json
{ "IdInventario": 2, "IdListaPrecio": 1, "CostoBase": 1500, "FechaDesde": "2026-08-24", "FechaHasta": null }
```
→ `201`

**Caso particular (no es un 400, es un comportamiento silencioso a verificar): `IdListaPrecio` inexistente pero que igual pasa la FK** — esto en la práctica no ocurre porque la FK de la base sí existe (`FK_PrecioArt_Lista` o similar) y rompe igual; el detalle relevante es que si en algún momento `IdListaPrecio` fuera opcional/null, `computeFields` pone `PorcentajeGanancia: 0` en vez de fallar. No hay body de prueba directo para esto salvo mandar `IdListaPrecio` con un Id que exista pero cuya lista tenga `PorcentajeRentabilidad: 0`.

**Bodies de error:**

*Body vacío:*
```json
{}
```
→ `400` `{"errors":["\"IdInventario\" is required","\"IdListaPrecio\" is required","\"CostoBase\" is required","\"FechaDesde\" is required"]}`

*Falta `IdInventario`:*
```json
{ "IdListaPrecio": 1, "CostoBase": 800000, "FechaDesde": "2026-08-24" }
```
→ `400` `{"errors":["\"IdInventario\" is required"]}`

*`CostoBase` negativo:*
```json
{ "IdInventario": 1, "IdListaPrecio": 1, "CostoBase": -100, "FechaDesde": "2026-08-24" }
```
→ `400` `{"errors":["\"CostoBase\" must be greater than or equal to 0"]}`

*`FechaDesde` con un valor no parseable como fecha:*
```json
{ "IdInventario": 1, "IdListaPrecio": 1, "CostoBase": 1000, "FechaDesde": "no-es-una-fecha" }
```
→ `400` `{"errors":["\"FechaDesde\" must be a valid date"]}`

*`IdListaPrecio` inexistente (FK — sí rompe la constraint de la base aunque el schema de Joi no use `.positive()`):*
```json
{ "IdInventario": 1, "IdListaPrecio": 999999, "CostoBase": 800000, "FechaDesde": "2026-08-24" }
```
→ `400` integridad referencial

*`IdInventario` inexistente (FK), mismo formato.*

### 8.4 `PUT /precios/precios-articulos/:id` — actualizar (parcial)

Ojo con este `update`: `preciosArticulosService.update()` **recalcula `ValorFinal`/`CostosVariables`/`CostoReal`/`PorcentajeGanancia` de nuevo**, mergeando el registro existente con lo que mandes — si actualizás `CostoBase`, el `ValorFinal` cambia solo.

**Camino feliz:**
```json
{ "CostoBase": 850000 }
```
→ `200`, con `ValorFinal` recalculado usando el `IdListaPrecio` que ya tenía el registro.

**"Error" que no es error — `Id` inexistente:** `service.update()` hace `getById` primero; si es `null`, devuelve `null` directo (`if (!existing) return null;`) sin tocar el DAO:
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/precios/precios-articulos/999999 -d '{"CostoBase":1}'
```
→ `200` `{"status":"success","data":null}`

**Error real (Joi):**
```json
{ "CostoBase": -1 }
```
→ `400` `{"errors":["\"CostoBase\" must be greater than or equal to 0"]}`

### 8.5 `DELETE /precios/precios-articulos/:id`

**Camino feliz:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/precios/precios-articulos/<id>
```
→ `200` `{"status":"success","data":{"message":"Precio-articulo eliminado correctamente"}}`

**"Error" que no es error — `Id` inexistente:**
```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/precios/precios-articulos/999999
```
→ `200` igual, sin error.

---

## Flujo recomendado para probar una "compra completa" de punta a punta

Desde que `POST /compras/compras` quedó orquestado (sección 2.3), el ciclo completo de una compra con stock y precio se hace en un solo request — ya no hace falta encadenar `detalles-compra` a mano:

1. `POST /compras/proveedores` (o usá el Id 1/2 del seed)
2. `POST /compras/compras` con `Detalles[]` y, opcionalmente, `Pagos[]` + `IdTurnoCaja` → esto ya crea la cabecera (con `EstadoPago`/`SaldoPendiente` calculados), el/los `Inventario` (nuevo o incrementado), el/los `DetalleCompra`, el/los `PrecioArticulo`, la deuda en `CuentaCorrienteProveedor` y, si mandaste `Pagos`, el/los `PagoCompra` + su `Haber` en la cuenta corriente — todo en una sola transacción. Guardá el `Id` de la compra devuelta.
3. Si la compra quedó con saldo pendiente (`EstadoPago: 1` o `2`), los pagos posteriores van por `POST /compras/pagos-compra` (sección 6) — ese sí es su propio flujo transaccional aparte, no hace falta repetir la compra.

Lo que **no** automatiza el `POST` orquestado: no crea `MovimientoStock` (si lo necesitás para auditoría, cargalo aparte con `POST /inventario/movimiento-stock`, `TipoMovimiento: "Ingreso por Compra"`) y no calcula ningún dato de venta — el `PrecioArticulo` que crea es el de costo/ganancia, no toca nada del lado de `Venta`.

Y para una devolución (esta parte no cambió — sigue siendo 100% manual, sin orquestar):
1. `POST /compras/devoluciones-compra` con el `IdCompra` de una compra existente → guardá el `Id` (`IdDevolucionCompra`)
2. `POST /inventario/movimiento-stock` con `TipoMovimiento: "Egreso por Devolución a Proveedor"` → guardá el `Id` (`IdMovimientoStock`)
3. `POST /compras/detalles-devolucion-compra` con `IdDevolucionCompra` e `IdMovimientoStock` de los dos pasos anteriores

Ninguno de estos pasos es transaccional entre sí: si el paso 3 falla, los pasos 1 y 2 ya quedaron confirmados en la base.

---

## Referencia rápida — datos de seed disponibles (`db/init/init.sql`)

- Proveedores: Id 1 = "Distribuidora CBA", Id 2 = "Apple Importaciones S.A."
- Sucursales: Id 1 = "centro", Id 2 = "barrio"
- Usuarios/empleados: Id 1 = admin (rol 1), Id 2 = owner (rol 2), Id 3 = vendedor (rol 3), Id 4 = tecnico (rol 4)
- MetodoPago: Id 1 = "efectivo" … Id 7 = "canje" (Id 3 = "transferencia bancaria")
- TurnoCaja: Id 1 (ya cerrado, sucursal 1, apertura y cierre por el empleado Id 3)
- Inventario: Id 1 = lote de 5 iPhone 13 256GB (Producto Id 1), Id 2 = lote de 20 fundas (Producto Id 3)
- ListaPrecio: Id 1 = "Lista General (Default)", 30% de rentabilidad, sin categoría asociada
- PrecioArticulo: uno para Inventario Id 1 (`ValorFinal: 1310400.00`) y otro para Inventario Id 2 (`ValorFinal: 2457.00`), ambos con `IdListaPrecio: 1`
- MovimientoStock: Id 1 = ingreso de 5 iPhones a Inventario Id 1 (`TipoMovimiento: "Ingreso por Compra"`, IdEmpleado 3), Id 2 = ingreso de 20 fundas a Inventario Id 2
- **Compra: Id 1 ya existe** (`TotalCosto: 4000000`, `EstadoPago: 3`, `SaldoPendiente: 0` — pagada al contado —, `IdProveedor: 2`, `IdSucursalDestino: 1`, `IdEmpleado: 3`) — **tiene hijos** (`DetalleCompra` Id 1, `PagoCompra` Id 1 y 2 movimientos en `CuentaCorrienteProveedor`), usala para probar el caso de integridad referencial en `DELETE /compras/compras/1`, no para un `DELETE` de camino feliz.
- **DetalleCompra: Id 1 ya existe** (`Cantidad: 5`, `PrecioCostoUnitario: 800000`, `IdCompra: 1`, apunta a Inventario Id 1)
- **PagoCompra: Id 1 ya existe** (`Monto: 4000000`, `IdCompra: 1`, `IdMetodoPago: 3`, `IdTurnoCaja: 1`)
- **CuentaCorrienteProveedor: 2 movimientos del seed para el Proveedor Id 2** — `Debe 4000000` (`IdCompra: 1`, la factura) y `Haber 4000000` (`IdCompra: 1`, `IdPagoCompra: 1`, el pago), con `SaldoAcumulado` final en `0` (la compra ya está saldada). `GET /compras/proveedores/2/saldo` sobre una base recién creada desde `init.sql` debería devolver `Saldo: 0` por este motivo.
- **No hay `DevolucionCompra` ni `DetalleDevolucionCompra` en el seed** — para probar esas dos secciones creá los registros vos con `POST` antes de poder probar `GET/:id`, `PUT` o `DELETE`.

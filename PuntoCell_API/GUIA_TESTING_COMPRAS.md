# Guía de Testing — Módulo Compras (+ Precios)

Documento generado a partir de lectura directa del código actual (`src/modules/compras`, `src/modules/precios`), verificado línea por línea contra cada `*.dto.js`, `*.service.js` y `*.controller.js`. No es un test en vivo — es la guía para que lo ejecutes vos.

Base URL: `http://localhost:3000/api`

**Estado real de la implementación (importante):** todo lo documentado acá es el módulo tal como está hoy — **CRUD puro** (controller → service → DAO, sin lógica de negocio adicional salvo lo que se aclara caso por caso). Los endpoints "de negocio" pedidos para Compras (`GET /compras` con `totalPagado` calculado, `GET /compras/:id` con `detalles[]` y `subtotal`, y el `POST /compras` orquestado que descuenta/crea Inventario, calcula `PrecioArticulo` con fallback de `ListaPrecio` y registra todo en una transacción) **todavía no existen** — están en una fase posterior del trabajo. Esta guía sirve para probar lo que ya está corriendo.

---

## Cómo autenticarse

Igual que el resto de la API: cookie firmada `jwt_punto_cell` vía `requireAuth`. Sin cookie → **401**.

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

## Comportamiento general de errores (válido para TODO este documento)

- **Ningún service de Compras ni de Precios setea `err.statusCode`** en sus errores de negocio ("no encontrado", "ya existe", etc.) — a diferencia de otros módulos ya corregidos (`reparaciones`, `inventario`). Eso significa que **todo error de negocio acá cae al 500 genérico** de `error.middleware.js`: `{"status":"error","message":"<el mensaje del throw>"}`. No es un bug de este documento, es el estado real del código.
- Validación Joi (`validateFields`) fallida → **400** `{ "errors": ["\"Campo\" is required", ...] }` (array de strings).
- FK inexistente o borrado de un registro referenciado → SQL Server tira `SequelizeForeignKeyConstraintError` → **400** automático `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`.
- Camino feliz: **200** en GET/PUT/DELETE, **201** en POST, siempre `{"status":"success","data":...}`.
- Ningún endpoint de este documento valida en el service que las FKs (`IdProveedor`, `IdCompra`, `IdMetodoPago`, `IdTurnoCaja`, `IdArticulo`/`IdInventario`, `IdListaPrecio`, etc.) existan antes de intentar el INSERT — dependen 100% del `SequelizeForeignKeyConstraintError` de arriba. Mandar un Id inexistente da **400** de integridad referencial, no un mensaje de negocio como "Proveedor no encontrado".

---

## 1. Proveedor (`/api/compras/proveedores`)

Baja lógica (`DELETE` no borra, hace `Activo:false`). `GET /proveedores` solo lista `Activo:true`.

Schema create (`proveedorSchema`): `Nombre` (string, min 2, req, se guarda en minúsculas), `Email` (email, opc), `Celular` (opc), `IdLocalidad` (int, opc).
Schema update: igual + `Activo` (bool, opc).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/proveedores[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Distribuidora Test", "Email": "ventas@test.com", "Celular": "3511234567", "IdLocalidad": 1 }
```
→ `201`

**Bodies de error:**

*Error: nombre duplicado*
```json
{ "Nombre": "distribuidora cba" }
```
→ `500` `{"status":"error","message":"Ya existe un proveedor con ese nombre"}` (ya existe en el seed, comparación exacta post-`.lowercase()` de Joi)

*Error: falta `Nombre`*
```json
{ "Email": "x@x.com" }
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

*Error: `Id` inexistente en GET/PUT/DELETE* → `500` `{"status":"error","message":"Proveedor no encontrado"}`

---

## 2. Compra (`/api/compras/compras`... ver nota de ruta)

**Nota de ruta:** el router monta esto como `router.get('/compras', ...)` **dentro** de `comprasRoutes`, que a su vez se monta en `/api/compras`. La URL real es `{{baseUrl}}/compras/compras` (queda "compras" duplicado en la URL — así está hoy en `compras.routes.js`, no es un error de este documento).

Schema create (`compraSchema`): `Fecha` (date ISO, opc, default now), `TotalCosto` (number ≥0, req), `IdProveedor`/`IdSucursalDestino`/`IdEmpleado` (int positivo, req).

**IMPORTANTE:** este `POST` crea únicamente la fila `Compra`. No crea `DetalleCompra`, no toca `Inventario`/`Stock`, no crea `MovimientoStock`, no calcula `PrecioArticulo` y no registra ningún `PagoCompra`. Para armar una compra completa hoy hay que encadenar manualmente: `POST /compras/compras` → `POST /compras/detalles-compra` (uno por línea) → `POST /compras/pagos-compra`. Nada de esto es transaccional: si un paso falla a mitad de camino, los anteriores quedan confirmados igual.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/compras[/:id]`

**Body camino feliz (POST):**
```json
{ "TotalCosto": 4000000, "IdProveedor": 2, "IdSucursalDestino": 1, "IdEmpleado": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `TotalCosto`*
```json
{ "IdProveedor": 2, "IdSucursalDestino": 1, "IdEmpleado": 1 }
```
→ `400` `{"errors":["\"TotalCosto\" is required"]}`

*Error: `IdProveedor` inexistente*
```json
{ "TotalCosto": 1000, "IdProveedor": 999999, "IdSucursalDestino": 1, "IdEmpleado": 1 }
```
→ `400` `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`

*Error: `Id` inexistente en GET/PUT/DELETE* → `500` `{"status":"error","message":"Compra no encontrada"}`

---

## 3. Detalle de compra (`/api/compras/detalles-compra`)

Cargar un detalle **no mueve stock ni crea `MovimientoStock`** — es una fila plana nada más.

Schema create (`detalleCompraSchema`): `Cantidad` (int ≥1, req), `PrecioCostoUnitario` (number ≥0, req), `IdCompra` (int positivo, req), `IdArticulo` (int positivo, req — **ojo:** pese al nombre, la FK real (`field: 'IdInventario'`) apunta a un `Id` de **`Inventario`**, no de `Producto`/`Articulo`; usá los Id 1 o 2 del seed).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/detalles-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "Cantidad": 5, "PrecioCostoUnitario": 800000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Cantidad` menor a 1*
```json
{ "Cantidad": 0, "PrecioCostoUnitario": 50000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than or equal to 1"]}`

*Error: `IdCompra` inexistente* → `400` integridad referencial (mismo formato que arriba)

*Error: `Id` inexistente en GET/PUT/DELETE* → `500` `{"status":"error","message":"Detalle de compra no encontrado"}`

---

## 4. Devolución de compra (`/api/compras/devoluciones-compra`)

Schema create (`devolucionCompraSchema`): `Fecha` (date ISO, opc), `MontoRecuperado` (number ≥0, req), `Motivo` (string, max 200, req), `IdCompra`/`IdTurnoCaja`/`IdEmpleado` (int positivo, req).

**IMPORTANTE:** igual que `Compra`, este `POST` solo crea la fila cabecera. No repone stock ni crea `MovimientoStock`/`DetalleDevolucionCompra` — eso se carga aparte (ver sección 5).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/devoluciones-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "MontoRecuperado": 800000, "Motivo": "Producto con falla de fábrica", "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `Motivo`*
```json
{ "MontoRecuperado": 800000, "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 1 }
```
→ `400` `{"errors":["\"Motivo\" is required"]}`

*Error: `Id` inexistente en GET/PUT/DELETE* → `500` `{"status":"error","message":"Devolución de compra no encontrada"}`

---

## 5. Detalle de devolución de compra (`/api/compras/detalles-devolucion-compra`)

Schema create (`detalleDevolucionCompraSchema`): `Cantidad` (int ≥1, req), `IdDevolucionCompra` (int positivo, req), `IdArticulo` (int positivo, req — misma aclaración que en detalle-compra: FK real apunta a `Inventario`), `IdMovimientoStock` (int positivo, req — **hay que crear el `MovimientoStock` a mano primero**, vía `/api/inventario/movimientos-stock`; este endpoint no lo genera).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/detalles-devolucion-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "Cantidad": 1, "IdDevolucionCompra": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ `201` (usa el `MovimientoStock` Id 1 del seed; en la práctica ese movimiento ya "pertenece" al ingreso original — para un caso realista creá uno nuevo con `TipoMovimiento: "Egreso por Devolución a Proveedor"` antes de este POST)

**Bodies de error:**

*Error: `IdMovimientoStock` inexistente* → `400` integridad referencial

*Error: `Id` inexistente en GET/PUT/DELETE* → `500` `{"status":"error","message":"Detalle de devolución de compra no encontrado"}`

---

## 6. Pago de compra (`/api/compras/pagos-compra`)

Schema create (`pagoCompraSchema`): `Monto` (number **>0** — `.greater(0)`, no `.min(0)`, req), `FechaPago` (date ISO, opc, default now), `IdCompra`/`IdMetodoPago`/`IdTurnoCaja` (int positivo, req).

Nada acá valida que `SUM(PagoCompra.Monto)` no supere `Compra.TotalCosto` — se puede sobre-pagar sin que la API lo impida.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/pagos-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "Monto": 4000000, "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Monto` igual a 0*
```json
{ "Monto": 0, "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"Monto\" must be greater than 0"]}`

*Error: `Id` inexistente en GET/PUT/DELETE* → `500` `{"status":"error","message":"Pago de compra no encontrado"}`

---

## 7. Lista de precios (`/api/precios/lista-de-precios`)

Schema create (`listaPreciosSchema`): `Nombre` (string, max 100, req), `PorcentajeRentabilidad` (number ≥0, req), `Activo` (bool, opc), `IdCategoriaProducto` (int, opc, allow null).

**LIMITACIÓN CONOCIDA — leer antes de probar `IdCategoriaProducto`:** la columna ya existe en el esquema (`db/init/init.sql`), pero el **modelo Sequelize `ListaPrecio` todavía no la mapea como atributo**. Si la mandás en el body, Joi la deja pasar pero Sequelize la descarta en silencio al hacer el `INSERT`/`UPDATE` — no se persiste, no da error. Vas a ver el campo "aceptado" en el 201 solo si mandás el resto del payload igual; si pedís el registro de nuevo (`GET /:id`) el campo no va a estar. Esto se resuelve en la fase de modelos (`Fase 2`, pendiente).

`GET /:id` **no verifica existencia**: si el `Id` no existe, devuelve `200` con `data: null` (no 404, no 500 — `listaPreciosService.getById` reenvía directo lo que devuelve el DAO sin chequear null).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/precios/lista-de-precios[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Mayorista Smartphones", "PorcentajeRentabilidad": 25.00, "Activo": true, "IdCategoriaProducto": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `PorcentajeRentabilidad`*
```json
{ "Nombre": "Lista sin porcentaje" }
```
→ `400` `{"errors":["\"PorcentajeRentabilidad\" is required"]}`

*Error: eliminar la lista Id=1 (fallback default que usa la regla de negocio de Compras)* → hoy no hay ninguna protección: `DELETE /lista-de-precios/1` la borra sin avisar nada especial. Si la borrás, cualquier lógica de fallback futura que dependa del Id=1 va a fallar.

---

## 8. Precios por artículo (`/api/precios/precios-articulos`)

Schema create (`preciosArticulosSchema`): `IdInventario` (int, req), `IdListaPrecio` (int, req), `CostoBase` (number ≥0, req), `FechaDesde` (date, req), `FechaHasta` (date, opc, allow null).

**Los campos `ValorFinal`, `CostosVariables`, `CostoReal` y `PorcentajeGanancia` NO se mandan** — `preciosArticulosService.computeFields()` los calcula solo: `CostosVariables = CostoBase * 0.26`, `CostoReal = CostoBase + CostosVariables`, `PorcentajeGanancia` = el `PorcentajeRentabilidad` de la `ListaPrecio` indicada, `ValorFinal = CostoReal * (1 + PorcentajeGanancia/100)`. Si los mandás igual en el body no pasa nada raro: `validateFields` usa Joi con `stripUnknown: true`, así que esos campos se descartan en silencio antes de llegar al service (no da error, simplemente los ignora).

**No cierra vigencia de un `PrecioArticulo` anterior del mismo `IdInventario` al crear uno nuevo** — podés terminar con dos filas `FechaHasta: null` para el mismo artículo (dos "vigentes" en simultáneo). Eso es lógica que falta (parte de la Fase 3 de Compras).

`GET /:id` tiene la misma limitación que en `lista-de-precios`: `Id` inexistente → `200` con `data: null`, no error.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/precios/precios-articulos[/:id]`

**Body camino feliz (POST) — usando la ListaPrecio Id 1 del seed (30% de rentabilidad):**
```json
{ "IdInventario": 1, "IdListaPrecio": 1, "CostoBase": 800000, "FechaDesde": "2026-08-24" }
```
→ `201`, con `ValorFinal` calculado en `1310400.00` (`CostosVariables: 208000`, `CostoReal: 1008000`, `PorcentajeGanancia: 30`)

**Bodies de error:**

*Error: falta `IdInventario`*
```json
{ "IdListaPrecio": 1, "CostoBase": 800000, "FechaDesde": "2026-08-24" }
```
→ `400` `{"errors":["\"IdInventario\" is required"]}`

*Error: `IdListaPrecio` inexistente* → `400` integridad referencial (o, si mandás un Id que no rompe la FK pero no existe en `ListaPrecio`... no aplica, la FK siempre lo va a atrapar)

---

## Referencia rápida — datos de seed disponibles (`db/init/init.sql`)

- Proveedores: Id 1 = "Distribuidora CBA", Id 2 = "Apple Importaciones S.A."
- Sucursales: Id 1 = "centro", Id 2 = "barrio"
- Usuarios/empleados: Id 1 = admin (rol 1), Id 2 = owner (rol 2), Id 3 = vendedor (rol 3), Id 4 = tecnico (rol 4)
- MetodoPago: Id 1 = "efectivo" … Id 7 = "canje"
- TurnoCaja: Id 1 (ya cerrado, sucursal 1, apertura y cierre por el empleado Id 3)
- Inventario: Id 1 = lote de 5 iPhone 13 256GB (Producto Id 1), Id 2 = lote de 20 fundas (Producto Id 3)
- ListaPrecio: Id 1 = "Lista General (Default)", 30% de rentabilidad, sin categoría asociada
- PrecioArticulo: uno para Inventario Id 1 (`ValorFinal: 1310400.00`) y otro para Inventario Id 2 (`ValorFinal: 2457.00`), ambos con `IdListaPrecio: 1`

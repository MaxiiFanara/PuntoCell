# Guía de Testing — Endpoints API PuntoCell

Documento generado a partir de lectura directa del código actual (`src/`), verificado contra `../db tesis.md`. No es un test en vivo — es la guía para que lo ejecutes vos. Reemplaza al informe anterior de esta sesión (varios status codes y comportamientos cambiaron con los fixes aplicados hoy).

Base URL: `http://localhost:3000/api`

## Cómo está armado esto

### Autenticación
- Único endpoint público: `POST /api/auth/login` (y `/logout`, `/forgot-password`, `/reset-password`).
- Todo lo demás exige la cookie firmada `jwt_punto_cell` (`requireAuth`, `src/core/middlewares/auth.middleware.js`):
  - Sin cookie → **401** `{"status":"error","message":"No autorizado. Por favor, inicie sesión."}`
  - Cookie inválida/vencida → **401** `{"status":"error","message":"Sesión inválida o expirada."}`
- `isAdmin`: solo pasa con `rol` 1 o 2. Si no → **403** `{"message":"Acceso denegado. Esta acción requiere privilegios de Administrador o Encargado."}`. Rutas que lo usan: `estados-orden` (POST/PUT/DELETE), `fallas` (POST/PUT/DELETE), `estadisticas/finanzas`, `estadisticas/dashboard`.
- `verificarTransicionEstado` (solo en `PATCH /reparaciones/ordenes-reparacion/:id/estado`): roles 1/2 sin restricción; rol 3 solo puede llevar la orden a estado 4 u 5; rol 4 solo a 2, 3 o 5; cualquier otro rol → 403.
- Cómo generar la cookie con curl:
  ```bash
  curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"Identificador":"...", "Pwd":"..."}'
  # luego reusar:
  curl -b cookies.txt http://localhost:3000/api/...
  ```
- Usuarios de prueba en la DB (password `PuntoCell2026!`): `jgonzales@puntocell.test` (Id 13, rol 1), `owner.test@puntocell.test` (Id 14, rol 2), `vendedor.test@puntocell.test` (Id 15, rol 3), `tecnico.test@puntocell.test` (Id 16, rol 4). **Advertencia**: en una prueba reciente el login con estos devolvió "Credenciales inválidas" — si te pasa lo mismo, puede ser un desincronismo del hash guardado; no es algo resoluble desde el frontend.

### Validación de body (Joi)
Casi todos los POST/PUT pasan por `validateFields(schema)`. Si falla → **400**:
```json
{ "errors": ["\"Campo\" is required", "\"OtroCampo\" must be a number"] }
```
Es un **array de strings** (`errors`), no `{message: ...}`.

### Manejo global de errores de negocio (`error.middleware.js`)
- `err.statusCode` si el service lo seteó explícitamente; si no, **500 por defecto** — aunque el mensaje diga "no encontrado" o "ya existe".
- `SequelizeForeignKeyConstraintError` (ej. borrar un registro referenciado, o mandar un FK que no existe y que la DB rechaza a nivel constraint) → **400** automático: `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`
- `SequelizeValidationError`/`SequelizeUniqueConstraintError` → **400** `{"status":"fail","message":"Error de validación en la base de datos.","detalles":[...]}`
- Cualquier otro error de negocio (`CHECK` de SQL Server violado, por ejemplo) no cae en ninguna de las categorías anteriores → **500** genérico.
- `status` es `"fail"` en 4xx, `"error"` en 5xx.
- Camino feliz: **200** en GET/PUT/DELETE, **201** en POST, siempre `{"status":"success","data":...}`.

**IMPORTANTE — este documento indica el status code REAL verificado línea por línea en cada `service.js` de hoy.** Muchos módulos fueron corregidos hoy para tener `statusCode` explícito (`usuario`, `orden-reparacion`, `repuesto-orden`, `dispositivo-cliente`, `estado-orden`, `falla`, `orden-falla`, `seguimiento-orden`, `pago-reparacion`), pero **la mayoría de los demás módulos (inventario, ventas, compras, finanzas) siguen devolviendo 500 por defecto** para "no encontrado"/"ya existe" — no es un bug nuevo, es el estado real actual, documentado módulo por módulo abajo.

---

## Cómo probar con Postman

Todo lo de abajo funciona igual en Postman que en curl — la única diferencia es la herramienta. Configuración de una sola vez:

1. **Variable de entorno**: creá un Environment (ícono de ojo arriba a la derecha → "Add") con una variable `baseUrl` = `http://localhost:3000/api`. A partir de ahí, cada request de este documento se arma como `{{baseUrl}}/lo-que-corresponda`.
2. **Login (una vez por sesión de Postman)**: request `POST {{baseUrl}}/auth/login`, pestaña **Body → raw → JSON**, pegá el body de `Identificador`/`Pwd` (ver módulo Auth abajo) y mandá. Postman guarda automáticamente la cookie `jwt_punto_cell` en su cookie jar (el manejo de cookies está activado por default) — **no hace falta copiar ningún token a mano**. Todas las requests siguientes al mismo dominio (`localhost:3000`) ya van autenticadas solas mientras esa cookie exista.
3. **Armar cualquier request**: elegí el método en el dropdown (GET/POST/PUT/PATCH/DELETE), pegá la URL `{{baseUrl}}/ruta`, y si el endpoint lleva body: pestaña **Body → raw**, tipo **JSON** (dropdown a la derecha de "raw"), pegá el objeto de los ejemplos de abajo.
4. **Para probar 401 (sin sesión)**: abrí la cookie jar de Postman (ícono "Cookies" debajo del botón Send, o Settings → Cookies), buscá el dominio `localhost`, y borrá la cookie `jwt_punto_cell` a mano. También podés loguearte primero con credenciales inválidas para nunca llegar a tener cookie, o correr la request en una pestaña/tab nueva sin haber hecho login ahí.
5. **Para probar 403 por rol**: hacé login con uno de los usuarios de prueba de rol más bajo (`vendedor.test@puntocell.test` rol 3, `tecnico.test@puntocell.test` rol 4) y pegale a un endpoint marcado `isAdmin` o con restricción de rol.

De acá en adelante, cada endpoint tiene su línea `**Postman:**` con método+URL, y bloques de body de ejemplo en JSON — tanto para el camino feliz como para cada error controlado ya documentado en su sección de errores.

---

## 1. Auth (`/api/auth`) — público

### `POST /auth/login`
Middleware: `preventDoubleLogin`.
Body (`loginSchema`): `Identificador` (string, req — email o `UsuarioEmpleado`), `Pwd` (string, req).
```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"Identificador":"jgonzales@puntocell.test","Pwd":"PuntoCell2026!"}'
```
→ 200, cookie `jwt_punto_cell`, `{"status":"success","message":"Autenticación exitosa","data":{"user":{...sin Pwd...}}}`.

Errores:
- Ya logueado → **400** `{"status":"error","message":"Ya tienes una sesión activa."}`
- Falta `Identificador`/`Pwd` → **400** Joi
- Usuario inexistente, password incorrecta, `EsCliente:true`, o `Activo:false` → **401** `{"status":"error","message":"Credenciales inválidas"}` (los 4 casos dan el mismo mensaje, a propósito)

**Postman:** `POST` → `{{baseUrl}}/auth/login`

**Body camino feliz:**
```json
{ "Identificador": "jgonzales@puntocell.test", "Pwd": "PuntoCell2026!" }
```
→ `200` `{"status":"success","message":"Autenticación exitosa","data":{"user":{"Id":13,"Email":"jgonzales@puntocell.test", "...": "..."}}}`

**Bodies de error:**

*Error: ya hay una sesión activa (mandalo dos veces seguidas sin borrar la cookie)*
```json
{ "Identificador": "jgonzales@puntocell.test", "Pwd": "PuntoCell2026!" }
```
→ `400` `{"status":"error","message":"Ya tienes una sesión activa."}`

*Error: falta `Identificador`*
```json
{ "Pwd": "PuntoCell2026!" }
```
→ `400` `{"errors":["\"Identificador\" is required"]}`

*Error: falta `Pwd`*
```json
{ "Identificador": "jgonzales@puntocell.test" }
```
→ `400` `{"errors":["\"Pwd\" is required"]}`

*Error: credenciales inválidas (usuario inexistente o password incorrecta)*
```json
{ "Identificador": "noexiste@puntocell.test", "Pwd": "cualquiera" }
```
→ `401` `{"status":"error","message":"Credenciales inválidas"}`

### `POST /auth/logout`
Sin body. Siempre **200** `{"status":"success","message":"Sesión cerrada exitosamente"}`, limpia la cookie.

**Postman:** `POST` → `{{baseUrl}}/auth/logout` (sin body) → `200` `{"status":"success","message":"Sesión cerrada exitosamente"}` siempre, incluso sin sesión activa.

### `POST /auth/forgot-password`
Body: `Email` (string, formato email, req).
- Email existente → **200**, dispara envío real de mail (`notificacionService`).
- Email inexistente → **también 200**, mismo mensaje genérico (a propósito, no filtra qué emails existen): `{"data":{"message":"Se ha enviado un email con instrucciones..."}}` — ojo, en realidad el service devuelve `"Si el email existe, recibirás un correo de recuperación"` para el caso inexistente vs `"Se ha enviado un email con instrucciones para restablecer tu contraseña"` para el existente — ambos 200, pero el texto SÍ difiere entre los dos casos (contradice la intención de "no revelar", pero es lo que hace el código hoy).
- `Email` faltante/mal formado → **400** Joi.

**Postman:** `POST` → `{{baseUrl}}/auth/forgot-password`

**Body camino feliz (email existente):**
```json
{ "Email": "jgonzales@puntocell.test" }
```
→ `200` `{"status":"success","data":{"message":"Se ha enviado un email con instrucciones para restablecer tu contraseña"}}`

**Bodies de error:**

*Caso especial: email inexistente (NO es un error, sigue dando 200 pero con mensaje distinto)*
```json
{ "Email": "esteemailnoexiste@puntocell.test" }
```
→ `200` `{"status":"success","data":{"message":"Si el email existe, recibirás un correo de recuperación"}}`

*Error: falta `Email`*
```json
{}
```
→ `400` `{"errors":["\"Email\" is required"]}`

*Error: `Email` con formato inválido*
```json
{ "Email": "esto-no-es-un-email" }
```
→ `400` `{"errors":["\"Email\" must be a valid email"]}`

### `POST /auth/reset-password`
Body: `Token` (string, req — el JWT tipo `reset`), `NewPassword` (string, min 8, req).
- Camino feliz: token válido (15 min de vida) → **200**, limpia cookie de sesión, `{"data":{"message":"Contraseña actualizada exitosamente..."}}`.
- Token vencido/inválido/de otro tipo → mensaje `"Token inválido o expirado"` → controller matchea `"Token"` en el string → **400**.
- Nueva contraseña igual a la anterior → mensaje `"La nueva contraseña no puede ser igual a la anterior"` → controller matchea `"contraseña"` → **400**.
- **Usuario del token no existe o inactivo** → mensaje `"Usuario no encontrado"` → **400** (`auth.service.js` le setea `err.statusCode = 400` explícitamente, y `auth.controller.js` respeta `err.statusCode` si está presente — este fue un bug real en una versión anterior de esta guía, ya corregido y verificado en vivo).
- `NewPassword` < 8 caracteres o falta algún campo → **400** Joi.

**Postman:** `POST` → `{{baseUrl}}/auth/reset-password`

**Body camino feliz** (necesitás un token real de tipo `reset`, generado por `forgot-password` o a mano para testear):
```json
{ "Token": "<jwt-tipo-reset-valido>", "NewPassword": "unaPasswordNueva123" }
```
→ `200` `{"status":"success","data":{"message":"Contraseña actualizada exitosamente. Por favor iniciá sesión nuevamente."}}`

**Bodies de error:**

*Error: falta `Token` o `NewPassword`*
```json
{ "NewPassword": "unaPasswordNueva123" }
```
→ `400` `{"errors":["\"Token\" is required"]}`

*Error: `NewPassword` menor a 8 caracteres*
```json
{ "Token": "<jwt-tipo-reset-valido>", "NewPassword": "corta" }
```
→ `400` `{"errors":["\"NewPassword\" length must be at least 8 characters long"]}`

*Error: Token inválido/vencido/de otro tipo*
```json
{ "Token": "esto-no-es-un-jwt-valido", "NewPassword": "unaPasswordNueva123" }
```
→ `400` `{"status":"error","message":"Token inválido o expirado"}`

*Error: Token válido pero de un usuario que no existe/inactivo*
```json
{ "Token": "<jwt-tipo-reset-firmado-con-id-inexistente>", "NewPassword": "unaPasswordNueva123" }
```
→ `400` `{"status":"error","message":"Usuario no encontrado"}`

*Error: nueva contraseña igual a la anterior*
```json
{ "Token": "<jwt-tipo-reset-valido>", "NewPassword": "<la-misma-password-actual-del-usuario>" }
```
→ `400` `{"status":"error","message":"La nueva contraseña no puede ser igual a la anterior"}`

---

## 2. Usuarios y Empresa (`/api/usuarios`)

### 2.1 Usuario (raíz `/api/usuarios`, mezcla empleados y clientes vía `EsCliente`)

#### `GET /usuarios/`
Solo `Activo:true`, sin `Pwd`. Soporta `?page&limit`. Sin filtro de búsqueda server-side.

**Postman:** `GET` → `{{baseUrl}}/usuarios/` (sin body) → `200` lista. Con `?page=1&limit=10` para paginar.

#### `POST /usuarios/`
Body (`usuarioSchema`): `DNI`, `Apellido`, `Nombre`, `Email` (formato email), `Celular` (todos string, req); `Calle`/`Numero`/`Piso`/`Depto` (opc, allow null/''); `EsCliente` (bool, default `false`); `Pwd` (opc, min 6, solo tiene efecto si `EsCliente:true`, para empleados se ignora — ver abajo); `IdLocalidad`/`IdRol`/`IdSucursal` (opc a nivel Joi, la DB puede exigirlos si es empleado).
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/usuarios/ \
  -H "Content-Type: application/json" \
  -d '{"DNI":"12345678","Nombre":"Juan","Apellido":"Perez","Email":"juan@test.com","Celular":"1122334455","EsCliente":true}'
```
→ 201.
Si `EsCliente:false` (empleado): el service genera `UsuarioEmpleado` y una password aleatoria, y dispara `notificacionService.enviarPasswordEmpleado` (si SMTP no está configurado, puede tirar 500 sin pista clara del motivo real).

**Corregido**: en versiones anteriores de esta guía se documentaba que `usuario.service.js#create` (rama empleado) y `#update` descartaban el `Id` de la respuesta (`const { Pwd, Id, ...resultado }`). Verificado en el código actual: las 3 ramas (`create` cliente, `create` empleado, `update`) ya destructuran solo `{ Pwd, ...resultado }` — el `Id` sí viene en la respuesta en los tres casos.

Errores:
- Falta campo requerido → 400 Joi
- `IdRol`/`IdSucursal`/`IdLocalidad` inexistente → **400** explícito, mensaje `"El Rol especificado no existe en el sistema."` / `"La Sucursal especificada no existe en el sistema."` / `"La Localidad especificada no existe en el sistema."`
- Email ya registrado → mensaje `"El correo electrónico ya está registrado"` → controller lo intercepta (`includes('ya está registrado')`) → **400**
- DNI ya registrado → mismo patrón → **400**

**Postman:** `POST` → `{{baseUrl}}/usuarios/`

**Body camino feliz (cliente):**
```json
{ "DNI": "12345678", "Nombre": "Juan", "Apellido": "Perez", "Email": "juan.perez@test.com", "Celular": "1122334455", "EsCliente": true }
```
→ `201` `{"status":"success","data":{"Id":18,"DNI":"12345678","Nombre":"Juan","Apellido":"Perez","Email":"juan.perez@test.com","Celular":"1122334455","EsCliente":true,"Activo":true, "...": "..."}}`

**Body camino feliz (empleado):**
```json
{ "DNI": "87654321", "Nombre": "Ana", "Apellido": "Gomez", "Email": "ana.gomez@puntocell.com.ar", "Celular": "3515551234", "EsCliente": false, "IdRol": 3, "IdSucursal": 1 }
```
→ `201` (dispara email con credenciales generadas)

**Bodies de error:**

*Error: falta `Email`*
```json
{ "DNI": "12345678", "Nombre": "Juan", "Apellido": "Perez", "Celular": "1122334455", "EsCliente": true }
```
→ `400` `{"errors":["\"Email\" is required"]}`

*Error: `IdRol` inexistente*
```json
{ "DNI": "11223344", "Nombre": "Test", "Apellido": "Rol", "Email": "test.rol@test.com", "Celular": "1122334455", "EsCliente": false, "IdRol": 999999 }
```
→ `400` `{"status":"error","message":"El Rol especificado no existe en el sistema."}`

*Error: email ya registrado*
```json
{ "DNI": "99999999", "Nombre": "Duplicado", "Apellido": "Test", "Email": "jgonzales@puntocell.test", "Celular": "1122334455", "EsCliente": true }
```
→ `400` `{"status":"error","message":"El correo electrónico ya está registrado"}`

*Error: DNI ya registrado*
```json
{ "DNI": "46222805", "Nombre": "Duplicado", "Apellido": "Test", "Email": "otro@test.com", "Celular": "1122334455", "EsCliente": true }
```
→ `400` `{"status":"error","message":"El DNI ya está registrado"}`

#### `GET /usuarios/:id`
No existe → **404** explícito `{"message":"Usuario no encontrado"}`.

**Postman:** `GET` → `{{baseUrl}}/usuarios/17` → `200` camino feliz. `GET` → `{{baseUrl}}/usuarios/999999` → `404` `{"message":"Usuario no encontrado"}`.

#### `PUT /usuarios/:id`
Body (`usuarioUpdateSchema`): todos los campos opcionales, incluye además `Activo` (bool).
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/usuarios/17 -H "Content-Type: application/json" -d '{"Celular":"1199998888"}'
```
- No existe → **404** explícito.
- Email/DNI duplicado (de otro usuario) → **400** (mismo patrón que create).

**Postman:** `PUT` → `{{baseUrl}}/usuarios/17`

**Body camino feliz (update parcial):**
```json
{ "Celular": "1199998888" }
```
→ `200` `{"status":"success","data":{"Id":17,"Celular":"1199998888", "...": "..."}}`

**Bodies de error:**

*Error: usuario inexistente*
```json
{ "Celular": "1199998888" }
```
→ (contra `PUT {{baseUrl}}/usuarios/999999`) `404` `{"message":"Usuario no encontrado"}`

*Error: email duplicado (de otro usuario)*
```json
{ "Email": "jgonzales@puntocell.test" }
```
→ `400` `{"status":"error","message":"El correo electrónico ya está registrado"}`

#### `DELETE /usuarios/:id`
Baja lógica (`Activo:false`). No existe → **404** explícito `{"message":"Usuario no encontrado"}`.

**Postman:** `DELETE` → `{{baseUrl}}/usuarios/17` (sin body) → `200`. Contra `{{baseUrl}}/usuarios/999999` → `404` `{"message":"Usuario no encontrado"}`.

### 2.2 Localidades (`/api/usuarios/localidades`)
Schema: `Nombre` (string, min 3 max 100). Create: required. Update: **optional** (corregido hoy, antes exigía `Nombre` siempre en el PUT).
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/usuarios/localidades/1 -H "Content-Type: application/json" -d '{}'
```
→ 200 (antes de hoy hubiera dado 400 Joi).
- `Nombre` faltante/<3 caracteres → 400 Joi (solo en create, o si lo mandás en el update).
- No encontrada / nombre duplicado → **500** (sin `statusCode` explícito).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/usuarios/localidades[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Rosario" }
```
→ `201` `{"status":"success","data":{"Id":5,"Nombre":"Rosario"}}`

**Bodies de error:**

*Error: `Nombre` faltante*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

*Error: `Nombre` menor a 3 caracteres*
```json
{ "Nombre": "Ro" }
```
→ `400` `{"errors":["\"Nombre\" length must be at least 3 characters long"]}`

*Error: nombre duplicado*
```json
{ "Nombre": "Rosario" }
```
→ (mandado dos veces) `500` `{"status":"error","message":"..."}`

*Error: no encontrada (PUT/DELETE a un id inexistente)*
```json
{ "Nombre": "Cualquiera" }
```
→ (contra `PUT {{baseUrl}}/usuarios/localidades/999999`) `500`

### 2.3 Roles (`/api/usuarios/roles`)
Schema: `Nombre` (string min 3 max 100). **No tiene `EsBase`** (se quitó hoy — era un campo fantasma, no existe ni en el modelo ni en la DB; si lo mandás, Joi lo ignora silenciosamente salvo que agregues validación estricta, cosa que este schema no hace).
- `DELETE /roles/:id`: baja lógica (`Activo:false`), sin protección especial — se puede dar de baja cualquier rol.
- No encontrado / nombre duplicado → **500**.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/usuarios/roles[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Supervisor" }
```
→ `201`

**Bodies de error:**

*Error: `Nombre` faltante*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

*Error: nombre duplicado o rol inexistente en PUT/DELETE*
```json
{ "Nombre": "Administrador" }
```
→ `500`

### 2.4 Permisos (`/api/usuarios/permisos`)
Schema: `Nombre` (string min 3 max 150).
- `DELETE /permisos/:id`: **corregido hoy** — antes llamaba `this.permisoDAO.delete(id)` (método inexistente en el DAO base → `TypeError` → 500 SIEMPRE). Ahora usa `.remove(id)` y funciona. Probalo creando y borrando un permiso de prueba.
- No encontrado → **500** (service no setea `statusCode`).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/usuarios/permisos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "GESTIONAR_INVENTARIO" }
```
→ `201`

**Bodies de error:**

*Error: `Nombre` menor a 3 caracteres*
```json
{ "Nombre": "AB" }
```
→ `400` `{"errors":["\"Nombre\" length must be at least 3 characters long"]}`

*Error: no encontrado (para probar el fix del DELETE)*
```
DELETE {{baseUrl}}/usuarios/permisos/999999 (sin body)
```
→ `500` (ya no `TypeError`/crash — el mensaje de "no encontrado" llega limpio, solo que sin `statusCode` propio)

### 2.5 Roles-Permisos (`/api/usuarios/roles-permisos`) — sin PUT, clave compuesta
Schema (solo create): `IdRol` (int positivo, req), `IdPermiso` (int positivo, req).
- `POST` con combinación ya existente → violación `UNIQUE` a nivel DB → depende de si Sequelize la reporta como `SequelizeUniqueConstraintError` (→ 400 automático) o el service la intercepta antes.
- `DELETE /roles-permisos/:idRol/:idPermiso` con combinación inexistente: probalo con `999/999`.

**Postman:** `GET` → `{{baseUrl}}/usuarios/roles-permisos` · `POST` → `{{baseUrl}}/usuarios/roles-permisos` · `DELETE` → `{{baseUrl}}/usuarios/roles-permisos/:idRol/:idPermiso` (sin body)

**Body camino feliz (POST):**
```json
{ "IdRol": 1, "IdPermiso": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `IdRol`*
```json
{ "IdPermiso": 1 }
```
→ `400` `{"errors":["\"IdRol\" is required"]}`

*Error: combinación duplicada*
```json
{ "IdRol": 1, "IdPermiso": 1 }
```
→ (mandado dos veces) `400` (constraint `UNIQUE`, si Sequelize lo reporta como `SequelizeUniqueConstraintError`)

*Error: `DELETE` a combinación inexistente*
```
DELETE {{baseUrl}}/usuarios/roles-permisos/999/999 (sin body)
```
→ depende del service, probablemente `500`/`404` según si hay `statusCode` — verificalo en vivo.

### 2.6 Sucursales (`/api/usuarios/sucursales`)
Schema create: `Nombre` (min2 max100, req), `Calle` (req), `Numero` (max6, req), `Telefono` (opc), `IdLocalidad` (req). Update: todo opcional + `Activa` (bool) — **ojo, el campo real es `Activa`, no `Activo`** (así está en la DB, `db tesis.md` línea 38).
- `DELETE /sucursales/:id`: baja lógica (`Activa:false`).
- No encontrada → **500**.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/usuarios/sucursales[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Sucursal Norte", "Calle": "Av. Siempre Viva", "Numero": "1234", "Telefono": "3515551234", "IdLocalidad": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `Calle`*
```json
{ "Nombre": "Sucursal Norte", "Numero": "1234", "IdLocalidad": 1 }
```
→ `400` `{"errors":["\"Calle\" is required"]}`

*Error: `IdLocalidad` inexistente (violación de FK a nivel DB)*
```json
{ "Nombre": "Sucursal Test", "Calle": "Falsa", "Numero": "123", "IdLocalidad": 999999 }
```
→ `400` (integridad referencial automática) o `500`, según cómo lo capture Sequelize — verificalo en vivo

*Error: update con `Activa: false` (dar de baja) sobre id inexistente*
```json
{ "Activa": false }
```
→ (contra `PUT {{baseUrl}}/usuarios/sucursales/999999`) `500`

---

## 3. Reparaciones (`/api/reparaciones`)

### 3.1 Órdenes de reparación (`/api/reparaciones/ordenes-reparacion`)

#### `GET /ordenes-reparacion`
Soporta `?IdEstadoOrden=N`. Incluye `estado`, `dispositivo.modelo`, `empleado`. Orden `FechaEmision DESC`.

**Postman:** `GET` → `{{baseUrl}}/reparaciones/ordenes-reparacion` (sin body). Con filtro: `{{baseUrl}}/reparaciones/ordenes-reparacion?IdEstadoOrden=1`.

#### `GET /ordenes-reparacion/:id`
No existe → **404** explícito `{"message":"La orden número {id} no existe."}`. Incluye dispositivo→modelo→marca, dispositivo→cliente, seguimientos, fallas, repuestos→inventario.

**Postman:** `GET` → `{{baseUrl}}/reparaciones/ordenes-reparacion/1` → `200`. Contra `{{baseUrl}}/reparaciones/ordenes-reparacion/999999` → `404` `{"message":"La orden número 999999 no existe."}`.

#### `POST /ordenes-reparacion`
Body (`nuevaReparacionSchema`), estructura anidada:
| Campo | Tipo | Regla |
|---|---|---|
| `cliente.Id` | number | opcional (si se pasa, reusa cliente existente) |
| `cliente.DNI/Nombre/Apellido/Email/Celular` | string | requeridos |
| `cliente.Calle/Numero` | string | opcionales |
| `dispositivo.IMEI/Desbloqueo/Observaciones` | string | opcionales |
| `dispositivo.IdModeloArticulo` | int | **requerido** |
| `idsFallas` | array de int | opcional |
| `observacionIngreso` | string | opcional |
| `sena.Monto` | number positivo | requerido SI mandás `sena` |
| `sena.IdMetodoPago`/`IdTurnoCaja` | int | requeridos SI mandás `sena` |

Camino feliz:
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/reparaciones/ordenes-reparacion \
  -H "Content-Type: application/json" \
  -d '{"cliente":{"DNI":"11111111","Nombre":"Test","Apellido":"Cliente","Email":"t@t.com","Celular":"123"},"dispositivo":{"IdModeloArticulo":1},"idsFallas":[1]}'
```
→ 201, `{"data":{"IdOrden":N,"ClienteId":N,"Mensaje":"Orden generada exitosamente"}}`. Si `cliente.DNI` ya existe en la DB, reusa ese cliente (no falla, no crea uno nuevo).

Errores: falta `dispositivo.IdModeloArticulo` o algún campo de `cliente` → 400 Joi. `IdModeloArticulo` inexistente → la transacción falla al insertar el FK → probablemente `SequelizeForeignKeyConstraintError` → 400 automático (no verificado con una llamada real, pero es el comportamiento esperado del catch genérico + Sequelize).

**Postman:** `POST` → `{{baseUrl}}/reparaciones/ordenes-reparacion`

**Body camino feliz (cliente nuevo):**
```json
{
  "cliente": { "DNI": "22334455", "Nombre": "Carlos", "Apellido": "Ruiz", "Email": "carlos.ruiz@test.com", "Celular": "3515552222" },
  "dispositivo": { "IdModeloArticulo": 1, "IMEI": "123456789012345", "Observaciones": "Pantalla rota" },
  "idsFallas": [1],
  "observacionIngreso": "Cliente reporta pantalla rota tras caída"
}
```
→ `201` `{"data":{"IdOrden":3,"ClienteId":18,"Mensaje":"Orden generada exitosamente"}}`

**Body camino feliz (cliente existente, con seña):**
```json
{
  "cliente": { "Id": 17, "DNI": "46222805", "Nombre": "maxi", "Apellido": "fana", "Email": "maximiliano.fanara27@gmail.com", "Celular": "3515559506" },
  "dispositivo": { "IdModeloArticulo": 1 },
  "sena": { "Monto": 5000, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
}
```
→ `201`, reusa el cliente Id 17 en vez de crear uno nuevo.

**Bodies de error:**

*Error: falta `dispositivo.IdModeloArticulo`*
```json
{ "cliente": { "DNI": "11111111", "Nombre": "Test", "Apellido": "Cliente", "Email": "t@t.com", "Celular": "123" }, "dispositivo": {} }
```
→ `400` `{"errors":["\"dispositivo.IdModeloArticulo\" is required"]}`

*Error: falta `cliente.Email`*
```json
{ "cliente": { "DNI": "11111111", "Nombre": "Test", "Apellido": "Cliente", "Celular": "123" }, "dispositivo": { "IdModeloArticulo": 1 } }
```
→ `400` `{"errors":["\"cliente.Email\" is required"]}`

*Error: `sena.Monto` presente pero `sena.IdMetodoPago` ausente*
```json
{ "cliente": { "DNI": "11111111", "Nombre": "Test", "Apellido": "Cliente", "Email": "t@t.com", "Celular": "123" }, "dispositivo": { "IdModeloArticulo": 1 }, "sena": { "Monto": 5000 } }
```
→ `400` `{"errors":["\"sena.IdMetodoPago\" is required"]}`

*Error: `IdModeloArticulo` inexistente*
```json
{ "cliente": { "DNI": "11111111", "Nombre": "Test", "Apellido": "Cliente", "Email": "t@t.com", "Celular": "123" }, "dispositivo": { "IdModeloArticulo": 999999 } }
```
→ probablemente `400` (integridad referencial automática) — no verificado con llamada real, confirmalo vos.

#### `PATCH /ordenes-reparacion/:id/estado`
Middleware: `verificarTransicionEstado` (ver arriba) — corre ANTES que la validación Joi.
Body (`cambiarEstadoSchema`): `IdEstadoOrden` (int positivo, req — **1**=espera, **2**=en reparación, **3**=terminado, **4**=entregado, **5**=anulado), `ObservacionTecnico` (opc, allow ''), `PrecioManoObra` (number ≥0, opc — solo se exige si vas a 3), `repuestos` (array opc, no usado por este endpoint para agregar repuestos — eso es otro endpoint, `POST /repuestos-orden`), `pagoFinal.IdMetodoPago/IdTurnoCaja` (opc, se exige si vas a 4 con saldo pendiente).

**Máquina de estados real** (`orden-reparacion.service.js` línea 141): `1→[2,5]`, `2→[3,5]`, `3→[4]`, `4→[]` (sin salida), `5→[]` (sin salida). Si `estadoActual === nuevoEstado`, no es error, pero exige `ObservacionTecnico` no vacío (para loguear en bitácora sin cambiar de estado).

Errores:
- Rol sin permiso para esa transición (ver `verificarTransicionEstado`) → **403** (esto corre ANTES de tocar la DB, incluso antes de Joi)
- Orden inexistente → **404** explícito `"La orden número {id} no existe."`
- Transición no permitida por la máquina de estados → **400** explícito `"Transición inválida de estado X a Y."`
- Mismo estado sin `ObservacionTecnico` → **400** explícito `"Para agregar un registro a la bitácora debe incluir una observación."`
- **Ir a estado 3 (Terminado) sin `PrecioManoObra`** → **400** explícito (corregido hoy) `"PrecioManoObra es requerido y debe ser un número válido para marcar la orden como Terminada."` — antes de hoy esto guardaba `NaN` silenciosamente en `TotalReparacion`.
- **Ir a estado 4 (Entregado) con saldo pendiente y sin `pagoFinal`** → **400** explícito (corregido hoy) `"Debe registrar el pago final (método de pago y turno de caja) antes de marcar la orden como Entregada, ya que queda un saldo pendiente de {saldo}."` — antes de hoy tiraba `TypeError` (500) al leer `pagoFinal.IdMetodoPago` de `undefined`.
- Ir a estado 5 (Anulado): siempre permitido desde 1 o 2, devuelve el stock de los repuestos ya asignados y pone `CostoRepuestos`/`PrecioManoObra`/`TotalReparacion` en 0.

**Postman:** `PATCH` → `{{baseUrl}}/reparaciones/ordenes-reparacion/1/estado`

**Body camino feliz (1→2, en reparación, sin requerir nada extra):**
```json
{ "IdEstadoOrden": 2, "ObservacionTecnico": "Se inicia diagnóstico" }
```
→ `200`

**Body camino feliz (2→3, terminado, con `PrecioManoObra`):**
```json
{ "IdEstadoOrden": 3, "PrecioManoObra": 15000, "ObservacionTecnico": "Reparación finalizada, pantalla reemplazada" }
```
→ `200`

**Body camino feliz (3→4, entregado, sin saldo pendiente o con `pagoFinal`):**
```json
{ "IdEstadoOrden": 4, "pagoFinal": { "IdMetodoPago": 1, "IdTurnoCaja": 1 }, "ObservacionTecnico": "Entregado al cliente" }
```
→ `200`

**Bodies de error:**

*Error: transición no permitida por la máquina de estados (ej de 1 directo a 4)*
```json
{ "IdEstadoOrden": 4, "ObservacionTecnico": "Intento invalido" }
```
→ `400` `{"status":"error","message":"Transición inválida de estado 1 a 4."}`

*Error: mismo estado sin `ObservacionTecnico`*
```json
{ "IdEstadoOrden": 1 }
```
→ `400` `{"status":"error","message":"Para agregar un registro a la bitácora debe incluir una observación."}`

*Error: ir a Terminado (3) sin `PrecioManoObra`*
```json
{ "IdEstadoOrden": 3, "ObservacionTecnico": "Falta el precio" }
```
→ `400` `{"status":"error","message":"PrecioManoObra es requerido y debe ser un número válido para marcar la orden como Terminada."}`

*Error: ir a Entregado (4) con saldo pendiente y sin `pagoFinal`*
```json
{ "IdEstadoOrden": 4, "ObservacionTecnico": "Sin pago final" }
```
→ `400` `{"status":"error","message":"Debe registrar el pago final (método de pago y turno de caja) antes de marcar la orden como Entregada, ya que queda un saldo pendiente de {saldo}."}`

*Error: rol sin permiso para esa transición (probar logueado como `tecnico.test@puntocell.test`, rol 4, intentando ir a estado 5 desde una orden en estado 1)*
```json
{ "IdEstadoOrden": 5, "ObservacionTecnico": "Intento sin permiso" }
```
→ `403`

*Error: orden inexistente*
```json
{ "IdEstadoOrden": 2, "ObservacionTecnico": "test" }
```
→ (contra `PATCH {{baseUrl}}/reparaciones/ordenes-reparacion/999999/estado`) `404` `{"message":"La orden número 999999 no existe."}`

*Error: falta `IdEstadoOrden`*
```json
{ "ObservacionTecnico": "test" }
```
→ `400` `{"errors":["\"IdEstadoOrden\" is required"]}`

#### `POST /ordenes-reparacion/:id/testemail`
Body: `{"pdfBase64": "..."}`. Falta `pdfBase64` → **400** `{"message":"pdfBase64 es requerido."}` (chequeo manual en el controller, no Joi). Orden inexistente → **404** explícito. Cliente sin email registrado → **422** explícito `"El cliente de esta orden no tiene email registrado."`.

**Postman:** `POST` → `{{baseUrl}}/reparaciones/ordenes-reparacion/1/testemail`

**Body camino feliz:**
```json
{ "pdfBase64": "JVBERi0xLjQKJeLjz9MK...(base64 de un PDF real, truncado)" }
```
→ `200`

**Bodies de error:**

*Error: falta `pdfBase64`*
```json
{}
```
→ `400` `{"message":"pdfBase64 es requerido."}`

*Error: orden inexistente*
```json
{ "pdfBase64": "JVBERi0xLjQK..." }
```
→ (contra `POST {{baseUrl}}/reparaciones/ordenes-reparacion/999999/testemail`) `404`

*Error: cliente de la orden sin email registrado*
```json
{ "pdfBase64": "JVBERi0xLjQK..." }
```
→ (contra una orden cuyo cliente tenga `Email: null`) `422` `{"message":"El cliente de esta orden no tiene email registrado."}`

#### `DELETE /ordenes-reparacion/:id`
**Existe en el controller y el service (con 404 explícito), pero NO está expuesto en `reparaciones.routes.js`** — confirmado, no hay `router.delete('/ordenes-reparacion/:id', ...)`. Pegarle da 404 de Express (ruta no encontrada), no un error de la app.

**Postman:** `DELETE` → `{{baseUrl}}/reparaciones/ordenes-reparacion/1` (sin body) → `404` de Express, cuerpo tipo `Cannot DELETE /api/reparaciones/ordenes-reparacion/1` (HTML o texto plano, no JSON de la app) — confirma que la ruta no existe, no que la orden no exista.

### 3.2 Repuestos de orden (`/api/reparaciones/repuestos-orden`) — sin PUT

#### `POST /repuestos-orden`
Body: `IdOrdenReparacion` (int positivo, req), `IdInventario` (int positivo, req), `Cantidad` (int ≥1, req). **`PrecioCobrado` NO se manda** — el service lo calcula solo desde `Inventario.PrecioMenor`.
Lógica real (transaccional): 1) la orden debe existir y estar en estado 2 (En Reparación) — si no → **400** explícito `"Solo se pueden agregar repuestos a órdenes en estado En Reparación."`; 2) el inventario debe existir y tener stock suficiente — si no → **400** explícito `"Stock insuficiente. Stock disponible: {N}"`; 3) el artículo debe ser `EsRepuesto:true` y `Activo:true` — si no → **400** explícito `"El artículo seleccionado no es un repuesto o no está activo."`; 4) descuenta stock, crea el registro, y suma `CostoRepuestos` en la orden.
- `IdOrdenReparacion`/`IdInventario` inexistentes → mensaje genérico sin `statusCode` → **500**.

**Postman:** `POST` → `{{baseUrl}}/reparaciones/repuestos-orden`

**Body camino feliz (orden en estado 2, con stock suficiente):**
```json
{ "IdOrdenReparacion": 1, "IdInventario": 1, "Cantidad": 1 }
```
→ `201`

**Bodies de error:**

*Error: orden no está en estado "En Reparación"*
```json
{ "IdOrdenReparacion": 1, "IdInventario": 1, "Cantidad": 1 }
```
→ (contra una orden en estado 1, 3, 4 o 5) `400` `{"status":"error","message":"Solo se pueden agregar repuestos a órdenes en estado En Reparación."}`

*Error: stock insuficiente*
```json
{ "IdOrdenReparacion": 1, "IdInventario": 1, "Cantidad": 999999 }
```
→ `400` `{"status":"error","message":"Stock insuficiente. Stock disponible: {N}"}`

*Error: el inventario referenciado no es un repuesto activo*
```json
{ "IdOrdenReparacion": 1, "IdInventario": 2, "Cantidad": 1 }
```
→ (contra un `Inventario` con `articulo.EsRepuesto:false` o `Activo:false`) `400` `{"status":"error","message":"El artículo seleccionado no es un repuesto o no está activo."}`

*Error: `IdOrdenReparacion` o `IdInventario` inexistente*
```json
{ "IdOrdenReparacion": 999999, "IdInventario": 1, "Cantidad": 1 }
```
→ `500`

*Error: falta `Cantidad`*
```json
{ "IdOrdenReparacion": 1, "IdInventario": 1 }
```
→ `400` `{"errors":["\"Cantidad\" is required"]}`

#### `DELETE /repuestos-orden/:id`
Devuelve el stock al inventario y resta `CostoRepuestos` de la orden. No existe → **404** explícito. Orden ya no está en estado 2 → **400** explícito `"Solo se pueden quitar repuestos de órdenes en estado En Reparación."`.

**Postman:** `DELETE` → `{{baseUrl}}/reparaciones/repuestos-orden/1` (sin body) → `200` camino feliz. Contra `{{baseUrl}}/reparaciones/repuestos-orden/999999` → `404`. Contra un repuesto de una orden ya Terminada/Entregada → `400` `{"status":"error","message":"Solo se pueden quitar repuestos de órdenes en estado En Reparación."}`.

#### `GET /reparaciones/inventario/repuestos-disponibles`
Ojo con la ruta completa — cuelga de `reparaciones`, no de `inventario`: `/api/reparaciones/inventario/repuestos-disponibles`. Query opcional `?IdCategoriaArticulo=&IdMarcaArticulo=`. Devuelve Inventario con `Stock > 0` filtrado a artículos `EsRepuesto:true, Activo:true`.

**Postman:** `GET` → `{{baseUrl}}/reparaciones/inventario/repuestos-disponibles` (sin body) → `200`. Con filtros: `?IdCategoriaArticulo=6&IdMarcaArticulo=1`.

### 3.3 Estados de orden (`/api/reparaciones/estados-orden`) — **isAdmin en POST/PUT/DELETE**
Schema: `Nombre` (min3 max50).
- Sin rol admin/encargado en POST/PUT/DELETE → **403**.
- `DELETE /estados-orden/:id`: **corregido hoy** (antes `.delete()` inexistente → 500 siempre; ahora `.remove()` funciona). No encontrado → **404** explícito. Nombre duplicado en create → mensaje sin `statusCode` → **500**.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/reparaciones/estados-orden[/:id]`

**Body camino feliz (POST, logueado como rol 1 o 2):**
```json
{ "Nombre": "En Espera de Repuesto" }
```
→ `201`

**Bodies de error:**

*Error: sin rol admin/encargado (logueado como `vendedor.test@puntocell.test`)*
```json
{ "Nombre": "Test" }
```
→ `403` `{"message":"Acceso denegado. Esta acción requiere privilegios de Administrador o Encargado."}`

*Error: `Nombre` faltante*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

*Error: no encontrado (DELETE, confirma el fix `.remove()`)*
```
DELETE {{baseUrl}}/reparaciones/estados-orden/999999 (sin body, logueado como rol 1/2)
```
→ `404` `{"message":"..."}`

### 3.4 Fallas (`/api/reparaciones/fallas`) — **isAdmin en POST/PUT/DELETE**
Schema: `Nombre` (min3 max100, req), `Activa` (bool, opc), `IdCategoriaArticulo` (int positivo, req).
- `GET /fallas/por-categoria/:idCategoria` (registrada ANTES de `/fallas/:id`, no colisiona).
- No encontrada / `IdCategoriaArticulo` inexistente → **500** (no hay chequeo explícito de FK con `statusCode`, cae a `SequelizeForeignKeyConstraintError` en create si la DB lo rechaza → probablemente 400 automático; en `getById`/`update`/`delete` "no encontrada" → **404** explícito, corregido hoy).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/reparaciones/fallas[/:id]` · `GET` → `{{baseUrl}}/reparaciones/fallas/por-categoria/1`

**Body camino feliz (POST, rol 1/2):**
```json
{ "Nombre": "Pantalla rota", "Activa": true, "IdCategoriaArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: sin rol admin/encargado*
```json
{ "Nombre": "Test", "IdCategoriaArticulo": 1 }
```
→ `403`

*Error: falta `IdCategoriaArticulo`*
```json
{ "Nombre": "Falla sin categoría" }
```
→ `400` `{"errors":["\"IdCategoriaArticulo\" is required"]}`

*Error: `IdCategoriaArticulo` inexistente*
```json
{ "Nombre": "Falla test", "IdCategoriaArticulo": 999999 }
```
→ probablemente `400` (integridad referencial automática), confirmalo en vivo

*Error: falla inexistente (GET/PUT/DELETE)*
```
GET {{baseUrl}}/reparaciones/fallas/999999 (sin body)
```
→ `404`

### 3.5 Dispositivos de cliente (`/api/reparaciones/dispositivos-cliente`)
Schema: `IMEI` (max50, req), `Desbloqueo` (max100, req), `Observaciones` (max500, allow '', req — ojo, es **requerido** aunque permita string vacío), `IdCliente` (int positivo, req), `IdModeloArticulo` (int positivo, req), `IdColor`/`IdMemoria`/`IdBateria`/`IdAlmacenamiento` (opc, allow null).
- No encontrado → **404** explícito.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/reparaciones/dispositivos-cliente[/:id]`

**Body camino feliz (POST):**
```json
{ "IMEI": "987654321098765", "Desbloqueo": "1234", "Observaciones": "", "IdCliente": 17, "IdModeloArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `Observaciones` (requerido aunque permita vacío — mandar `""` es válido, OMITIRLO no)*
```json
{ "IMEI": "987654321098765", "Desbloqueo": "1234", "IdCliente": 17, "IdModeloArticulo": 1 }
```
→ `400` `{"errors":["\"Observaciones\" is required"]}`

*Error: dispositivo inexistente*
```
GET {{baseUrl}}/reparaciones/dispositivos-cliente/999999 (sin body)
```
→ `404`

### 3.6 Orden-Falla (`/api/reparaciones/orden-fallas`)
Schema: `IdOrdenReparacion`, `IdFalla` (ambos int positivo, req en create).
- Combinación duplicada → mensaje explícito `"Esta falla ya está registrada en la orden de reparación"` pero **sin `statusCode`** → **500** (a pesar de tener mensaje claro, no cae en 400).
- `DELETE /orden-fallas/:id`: **corregido hoy** (mismo bug `.delete()`→`.remove()`). No encontrado → **404** explícito.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/reparaciones/orden-fallas[/:id]`

**Body camino feliz (POST):**
```json
{ "IdOrdenReparacion": 1, "IdFalla": 2 }
```
→ `201`

**Bodies de error:**

*Error: combinación duplicada (mandar el mismo body dos veces)*
```json
{ "IdOrdenReparacion": 1, "IdFalla": 1 }
```
→ `500` `{"status":"error","message":"Esta falla ya está registrada en la orden de reparación"}`

*Error: falta `IdFalla`*
```json
{ "IdOrdenReparacion": 1 }
```
→ `400` `{"errors":["\"IdFalla\" is required"]}`

*Error: no encontrado (DELETE, confirma el fix `.remove()`)*
```
DELETE {{baseUrl}}/reparaciones/orden-fallas/999999 (sin body)
```
→ `404`

### 3.7 Seguimientos de orden (`/api/reparaciones/seguimientos-orden`)
Schema: `FechaModificacion` (opc), `ObservacionTecnico` (opc), `IdOrdenReparacion`/`IdEmpleado`/`IdEstadoOrden` (int positivo, req en create).
- `DELETE`: **corregido hoy** (mismo bug). No encontrado → **404** explícito.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/reparaciones/seguimientos-orden[/:id]`

**Body camino feliz (POST):**
```json
{ "IdOrdenReparacion": 1, "IdEmpleado": 13, "IdEstadoOrden": 2, "ObservacionTecnico": "Seguimiento manual de prueba" }
```
→ `201`

**Bodies de error:**

*Error: falta `IdEstadoOrden`*
```json
{ "IdOrdenReparacion": 1, "IdEmpleado": 13 }
```
→ `400` `{"errors":["\"IdEstadoOrden\" is required"]}`

*Error: no encontrado (DELETE, confirma el fix `.remove()`)*
```
DELETE {{baseUrl}}/reparaciones/seguimientos-orden/999999 (sin body)
```
→ `404`

### 3.8 Pagos de reparación (`/api/reparaciones/pagos-reparacion`)
Schema: `Monto` (number, **mayor a 0**, req), `Senia` (opc, min 0), `FechaPago` (opc), `Observacion` (opc), `IdOrdenReparacion`/`IdMetodoPago`/`IdTurnoCaja` (int positivo, req en create).

**Corregido**: en una versión anterior de esta guía se documentaba que `PagoReparacion.Monto` usaba `.min(0)` (permitía `0`) contra un `CHECK(Monto > 0)` real en la DB. Verificado en el código actual: el DTO ya usa `.greater(0)` tanto en create como en update — mandar `Monto: 0` ahora da 400 Joi limpio.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/reparaciones/pagos-reparacion[/:id]`

**Body camino feliz (POST):**
```json
{ "Monto": 5000, "IdOrdenReparacion": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Monto` en 0 (ahora rechazado por Joi, antes reventaba como 500 crudo contra el `CHECK` de la DB)*
```json
{ "Monto": 0, "IdOrdenReparacion": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"Monto\" must be greater than 0"]}`

*Error: `Monto` negativo*
```json
{ "Monto": -100, "IdOrdenReparacion": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"Monto\" must be greater than 0"]}`

*Error: falta `IdTurnoCaja`*
```json
{ "Monto": 5000, "IdOrdenReparacion": 1, "IdMetodoPago": 1 }
```
→ `400` `{"errors":["\"IdTurnoCaja\" is required"]}`

*Error: no encontrado (DELETE, confirma el fix `.remove()`)*
```
DELETE {{baseUrl}}/reparaciones/pagos-reparacion/999999 (sin body)
```
→ `404`

---

## 4. Inventario (`/api/inventario`)

Todos los servicios de este módulo (los 12 sub-recursos de abajo) **no setean `statusCode` en ningún lado** — confirmado por grep, cero coincidencias de `statusCode` en los 12 `service.js`. Esto significa: **"no encontrado" y "ya existe" en TODO este módulo caen siempre a 500**, no hay excepciones. Tenelo en cuenta para cada sub-recurso de abajo, no lo repito en cada uno.

Todos los `UpdateSchema` de este módulo permiten updates parciales (corregido hoy en 9 catálogos + `inventario`/`transferencia`/`movimiento-stock` ya lo tenían de antes). Los services de `inventario`, `transferencia`, `movimiento-stock`, `categoria-articulo`, `modelo-articulo`, `estado-inventario`, `color`, `memoria`, `almacenamiento`, `articulo`, `marca-articulo`, `bateria` ya no revientan al validar FKs/duplicados en un update parcial (guardados con `!== undefined`).

### 4.1 Baterías (`/api/inventario/baterias`)
Schema: `Capacidad` (string max50, req), `Porcentaje` (number 0–100, req), `CiclosCarga` (int ≥0, req).
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/inventario/baterias/1 -H "Content-Type: application/json" -d '{}'
```
→ 200 (antes 400).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/baterias[/:id]`

**Body camino feliz (POST):**
```json
{ "Capacidad": "4000mAh", "Porcentaje": 87, "CiclosCarga": 320 }
```
→ `201`

**Body camino feliz (PUT parcial):**
```json
{}
```
→ `200` (antes de hoy: `400` Joi)

**Bodies de error:**

*Error: `Porcentaje` fuera de rango*
```json
{ "Capacidad": "4000mAh", "Porcentaje": 150, "CiclosCarga": 0 }
```
→ `400` `{"errors":["\"Porcentaje\" must be less than or equal to 100"]}`

*Error: falta `Capacidad`*
```json
{ "Porcentaje": 80, "CiclosCarga": 100 }
```
→ `400` `{"errors":["\"Capacidad\" is required"]}`

*Error: no encontrada / duplicada → **500** (sin `statusCode` explícito en todo el módulo inventario, ver nota al principio de esta sección).*

### 4.2 Colores / 4.3 Estados de inventario / 4.4 Memorias / 4.5 Almacenamientos
Los 4 con el mismo patrón: `colores`→`Nombre` (max100), `estado-inventarios`→`Nombre` (max50), `memorias`→`Capacidad` (max50), `almacenamientos`→`Capacidad` (max50). Todos req en create, opcionales en update.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/colores[/:id]`, `{{baseUrl}}/inventario/estado-inventarios[/:id]`, `{{baseUrl}}/inventario/memorias[/:id]`, `{{baseUrl}}/inventario/almacenamientos[/:id]`

**Bodies camino feliz (POST), uno por catálogo:**
```json
// colores
{ "Nombre": "Azul Medianoche" }
```
```json
// estado-inventarios
{ "Nombre": "Reacondicionado" }
```
```json
// memorias
{ "Capacidad": "256GB" }
```
```json
// almacenamientos
{ "Capacidad": "1TB" }
```
→ `201` en los 4 casos.

**Bodies de error (mismo patrón en los 4):**

*Error: falta el campo requerido (`Nombre` en colores/estado-inventarios, `Capacidad` en memorias/almacenamientos)*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required"]}` (o `"Capacidad"` según el catálogo)

*Error: PUT parcial con `{}` — ya no rompe (corregido hoy)*
```json
{}
```
→ `200`

*Error: no encontrado / duplicado → **500** en los 4 (sin `statusCode`).*

### 4.6 Categoría de artículo (`/api/inventario/categoria-articulos`)
Schema: `Nombre` (max100, req), `EsDispositivo` (bool, req en create).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/categoria-articulos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Tablet", "EsDispositivo": true }
```
→ `201`

**Bodies de error:**

*Error: falta `EsDispositivo`*
```json
{ "Nombre": "Test Categoria" }
```
→ `400` `{"errors":["\"EsDispositivo\" is required"]}`

### 4.7 Marca de artículo (`/api/inventario/marca-articulos`)
Schema: `Nombre` (max100, req), `EsSmartphone` (bool, opc).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/marca-articulos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Huawei", "EsSmartphone": true }
```
→ `201`

**Bodies de error:**

*Error: falta `Nombre`*
```json
{ "EsSmartphone": true }
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

### 4.8 Modelo de artículo (`/api/inventario/modelo-articulos`)
Schema: `Nombre` (max100, req), `IdMarcaArticulo`/`IdCategoriaArticulo` (int, req en create).
**Corregido hoy**: `GET /modelo-articulos` antes solo devolvía `Id`/`Nombre` (el service tenía `ATTRIBUTES: ['Id','Nombre']`, ocultando `IdMarcaArticulo`/`IdCategoriaArticulo`) — esto rompía el cascadeo Tipo→Marca→Modelo del frontend. Ahora devuelve los 4 campos. Verificalo:
```bash
curl -b cookies.txt http://localhost:3000/api/inventario/modelo-articulos
```
→ cada item debe traer `IdMarcaArticulo` e `IdCategoriaArticulo`, no solo `Id`/`Nombre`.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/modelo-articulos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "iPhone 14", "IdMarcaArticulo": 1, "IdCategoriaArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `IdMarcaArticulo`*
```json
{ "Nombre": "Modelo sin marca", "IdCategoriaArticulo": 1 }
```
→ `400` `{"errors":["\"IdMarcaArticulo\" is required"]}`

*Error: `IdCategoriaArticulo` inexistente → `500` (el service valida contra la DB, pero el catch general no le pone `statusCode`).*
```json
{ "Nombre": "Modelo test", "IdMarcaArticulo": 1, "IdCategoriaArticulo": 999999 }
```
→ `500` `{"status":"error","message":"CategoriaArticulo no encontrada"}`

*Error: PUT parcial (verificación del fix de hoy — antes exigía los 3 campos completos)*
```json
{ "Nombre": "iPhone 14 Pro" }
```
→ `200`

### 4.9 Artículo (`/api/inventario/articulos`)
Schema: `Nombre` (max100, req), `EsSerializado`/`EsVendible`/`EsRepuesto` (bool, req en create), `Activo` (bool, opc), `IdModeloArticulo` (int, req en create).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/articulos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "apple iPhone 14 128GB", "EsSerializado": true, "EsVendible": true, "EsRepuesto": false, "IdModeloArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `EsRepuesto`*
```json
{ "Nombre": "Articulo Test", "EsSerializado": true, "EsVendible": true, "IdModeloArticulo": 1 }
```
→ `400` `{"errors":["\"EsRepuesto\" is required"]}`

*Error: `IdModeloArticulo` inexistente*
```json
{ "Nombre": "Articulo Test", "EsSerializado": true, "EsVendible": true, "EsRepuesto": false, "IdModeloArticulo": 999999 }
```
→ `500` `{"status":"error","message":"ModeloArticulo no encontrado"}`

### 4.10 Inventario (`/api/inventario/inventarios`)
Schema create: `IMEI` (opc), `PrecioCosto` (number **≥0**, req), `PrecioMayor`/`PrecioMenor` (opc, ≥0), `Stock` (int **≥0**, opc), `MesesGarantiaLocal` (date, req), `Observaciones` (opc), `IdSucursal`/`IdArticulo`/`IdProveedor` (int, req), `IdEstadoInventario` (opc, default 1), `IdColor`/`IdMemoria`/`IdBateria`/`IdAlmacenamiento` (opc).
```bash
curl -b cookies.txt -H "Content-Type: application/json" -X POST http://localhost:3000/api/inventario/inventarios \
  -d '{"PrecioCosto":800000,"MesesGarantiaLocal":"2026-12-01","IdSucursal":1,"IdArticulo":1,"IdProveedor":1}'
```
→ 201.
**Corregido hoy** (dos capas, ambas verificadas):
1. `PUT /inventarios/:id` con body parcial (ej `{"Stock":5}`) ya no exige el resto de los campos required (antes el `UpdateSchema` era un alias literal del de creación).
2. El `service.js#update` ya no valida `Sucursal`/`Articulo`/`EstadoInventario` si esos campos no vienen en el `data` (antes tiraba "Sucursal no encontrada" con `findByPk(undefined)` en cualquier update parcial que no mandara `IdSucursal`).
```bash
curl -b cookies.txt -X PUT http://localhost:3000/api/inventario/inventarios/1 -H "Content-Type: application/json" -d '{"Stock":3}'
```
→ 200.
Errores: `PrecioCosto`/`Stock`/`PrecioMayor`/`PrecioMenor` negativos → **400** Joi (corregido hoy, antes no había `.min(0)` y la DB los rechazaba con `CHECK` → 500 crudo).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/inventarios[/:id]`

**Body camino feliz (POST):**
```json
{ "PrecioCosto": 800000, "PrecioMayor": 950000, "PrecioMenor": 900000, "MesesGarantiaLocal": "2026-12-01", "IdSucursal": 1, "IdArticulo": 1, "IdProveedor": 1, "IdColor": 1, "IdMemoria": 1 }
```
→ `201`

**Body camino feliz (PUT parcial, solo descuenta stock):**
```json
{ "Stock": 3 }
```
→ `200`

**Bodies de error:**

*Error: `PrecioCosto` negativo (corregido hoy, antes daba 500 crudo)*
```json
{ "PrecioCosto": -100, "MesesGarantiaLocal": "2026-12-01", "IdSucursal": 1, "IdArticulo": 1, "IdProveedor": 1 }
```
→ `400` `{"errors":["\"PrecioCosto\" must be greater than or equal to 0"]}`

*Error: `Stock` negativo en update parcial*
```json
{ "Stock": -1 }
```
→ `400` `{"errors":["\"Stock\" must be greater than or equal to 0"]}`

*Error: falta `IdProveedor`*
```json
{ "PrecioCosto": 800000, "MesesGarantiaLocal": "2026-12-01", "IdSucursal": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"IdProveedor\" is required"]}`

*Error: `IdSucursal` inexistente*
```json
{ "PrecioCosto": 800000, "MesesGarantiaLocal": "2026-12-01", "IdSucursal": 999999, "IdArticulo": 1, "IdProveedor": 1 }
```
→ `500` `{"status":"error","message":"Sucursal no encontrada"}`

### 4.11 Movimiento de stock (`/api/inventario/movimiento-stock`)
Schema: `Fecha` (req), `TipoMovimiento` (max50, req), `Cantidad` (int, req), `Observaciones` (opc), `IdInventario`/`IdEmpleado` (int, req en create). Update parcial ya funciona y ya no revienta validando FKs sin chequear (corregido hoy).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/movimiento-stock[/:id]`

**Body camino feliz (POST):**
```json
{ "Fecha": "2026-08-11T12:00:00.000Z", "TipoMovimiento": "Ajuste manual", "Cantidad": 5, "Observaciones": "Ajuste de prueba", "IdInventario": 1, "IdEmpleado": 13 }
```
→ `201`

**Bodies de error:**

*Error: falta `TipoMovimiento`*
```json
{ "Fecha": "2026-08-11T12:00:00.000Z", "Cantidad": 5, "IdInventario": 1, "IdEmpleado": 13 }
```
→ `400` `{"errors":["\"TipoMovimiento\" is required"]}`

*Error: `IdInventario` inexistente*
```json
{ "Fecha": "2026-08-11T12:00:00.000Z", "TipoMovimiento": "Ingreso", "Cantidad": 1, "IdInventario": 999999, "IdEmpleado": 13 }
```
→ `500` `{"status":"error","message":"Inventario no encontrado"}`

*Error: update parcial con solo `Observaciones` (verificación del fix — antes exigía `IdInventario`/`IdEmpleado` siempre)*
```json
{ "Observaciones": "Nota agregada después" }
```
→ `200`

### 4.12 Transferencias (`/api/inventario/transferencias`)
Schema CRUD: `IdSucursalOrigen`/`IdSucursalDestino`/`IdMovimientoSalida`/`IdMovimientoIngreso` (int, req en create). Update parcial ya funciona (corregido hoy).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/inventario/transferencias[/:id]`

**Body camino feliz (POST, requiere movimientos de stock ya creados):**
```json
{ "IdSucursalOrigen": 1, "IdSucursalDestino": 2, "IdMovimientoSalida": 1, "IdMovimientoIngreso": 2 }
```
→ `201`

**Bodies de error:**

*Error: `IdMovimientoSalida` inexistente*
```json
{ "IdSucursalOrigen": 1, "IdSucursalDestino": 2, "IdMovimientoSalida": 999999, "IdMovimientoIngreso": 2 }
```
→ `500` `{"status":"error","message":"Movimiento salida no encontrado"}`

*Error: update parcial (verificación del fix — antes exigía las 4 FKs siempre)*
```json
{ "IdSucursalDestino": 3 }
```
→ `200`

#### `POST /transferencias/ejecutar` — **sin Joi** (no pasa por `validateFields`)
Body manual: `{IdArticulo, IdSucursalOrigen, IdSucursalDestino, Cantidad, IdEmpleado}`. Transacción real: descuenta stock del origen, crea `MovimientoStock` de salida, suma/crea stock en destino, crea `MovimientoStock` de ingreso, crea el registro `Transferencia`.
- Como no hay Joi, mandar un body incompleto no da 400 limpio — el primer campo faltante que se use en una query (`Inventario.findOne({where:{IdArticulo: data.IdArticulo, IdSucursal: data.IdSucursalOrigen}})`) simplemente no encuentra nada y cae en:
- Sin stock en origen o inventario inexistente → mensaje explícito `"Stock insuficiente en la sucursal de origen"` pero **sin `statusCode`** → **500**.
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/inventario/transferencias/ejecutar \
  -H "Content-Type: application/json" \
  -d '{"IdArticulo":1,"IdSucursalOrigen":1,"IdSucursalDestino":2,"Cantidad":1,"IdEmpleado":13}'
```

**Postman:** `POST` → `{{baseUrl}}/inventario/transferencias/ejecutar`

**Body camino feliz:**
```json
{ "IdArticulo": 1, "IdSucursalOrigen": 1, "IdSucursalDestino": 2, "Cantidad": 1, "IdEmpleado": 13 }
```
→ `201` (o `200`, verificalo — crea `Transferencia` + 2 `MovimientoStock`)

**Bodies de error:**

*Error: sin stock suficiente en origen*
```json
{ "IdArticulo": 1, "IdSucursalOrigen": 1, "IdSucursalDestino": 2, "Cantidad": 999999, "IdEmpleado": 13 }
```
→ `500` `{"status":"error","message":"Stock insuficiente en la sucursal de origen"}`

*Error: body vacío (sin Joi, no da 400 limpio)*
```json
{}
```
→ probablemente `500` al fallar la query interna con `undefined` — confirmalo en vivo, no hay validación explícita.

---

## 5. Ventas (`/api/ventas`)

Ningún service de este módulo setea `statusCode` (confirmado por grep en los 10 `service.js`) — todo "no encontrado" cae a **500**. Todos los `UpdateSchema` permiten updates parciales.

### 5.1 Venta (raíz `/api/ventas`)

#### `GET /ventas/`
Lista simple, sin includes. `?page&limit`.

**Postman:** `GET` → `{{baseUrl}}/ventas/` (sin body) → `200`.

#### `GET /ventas/:id`
Incluye `detalles`. No existe → mensaje genérico `"Error al obtener venta"` (el service envuelve CUALQUIER error, incluso uno de "no encontrada", en este mensaje fijo) → **500** siempre, sin excepción — no vas a ver nunca un 404 acá aunque el id no exista.

**Postman:** `GET` → `{{baseUrl}}/ventas/1` → `200`. Contra `{{baseUrl}}/ventas/999999` (sin body) → `500` `{"status":"error","message":"Error al obtener venta"}`.

#### `POST /ventas/` (crear venta completa, transaccional)
Body (`ventaSchema`, acepta campos extra sin fallar por `.unknown(true)`):
| Campo | Tipo | Regla |
|---|---|---|
| `Fecha` | date | req |
| `TotalVenta`/`TotalVentaARS`/`TotalCosto` | number | req, **≥0** |
| `IdTurnoCaja`/`IdCliente`/`IdEmpleado`/`IdCotizacionDolar` | int | req |
| `IdDescuento` | int | opc, allow null |
| `Detalles[]` | array, min 1 | cada item: `Cantidad` int **>0**, `PrecioUnitario` number **≥0**, `IdArticulo` int (en realidad referencia un `Inventario.Id`, no `Articulo.Id` — el atributo se llama `IdArticulo` mapeado a la columna física `IdInventario`, cuidado con el nombre) |
| `Pagos[]` | array, opc | cada item: `IdMetodoPago` int, `Monto` number **>0**, `Cotizacion`/`Observacion` opc |

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/ventas/ -H "Content-Type: application/json" -d '{
  "Fecha":"2026-08-11T12:00:00.000Z","TotalVenta":900,"TotalVentaARS":1305000,"TotalCosto":800,
  "IdTurnoCaja":1,"IdCliente":17,"IdEmpleado":13,"IdCotizacionDolar":1,
  "Detalles":[{"IdArticulo":1,"Cantidad":1,"PrecioUnitario":900}],
  "Pagos":[{"IdMetodoPago":1,"Monto":900}]
}'
```
→ 201. Crea `Venta`, cada `DetalleVenta`, y cada `PagoVenta` (con `FechaPago`/`IdTurnoCaja` completados automáticamente si no vienen en el item de `Pagos`).
Errores: falta cualquier campo requerido de arriba → 400 Joi. `Cantidad:0` o negativa, `PrecioUnitario`/`TotalVenta` negativos, `Monto:0` en un pago → **400** Joi (corregido hoy). FK inexistente (`IdCliente`, `IdArticulo`, etc.) → la transacción falla en el INSERT → el catch envuelve TODO en `throw new Error(message)` **sin `statusCode`** → **500**, incluso si el motivo real es un FK inexistente (no hay traducción a 400 acá, a diferencia del error automático de Sequelize en otros endpoints CRUD simples — este create es manual con transacción propia y su propio catch que pisa el `statusCode`).

**Postman:** `POST` → `{{baseUrl}}/ventas/`

**Body camino feliz:**
```json
{
  "Fecha": "2026-08-11T12:00:00.000Z",
  "TotalVenta": 900,
  "TotalVentaARS": 1305000,
  "TotalCosto": 800,
  "IdTurnoCaja": 1,
  "IdCliente": 17,
  "IdEmpleado": 13,
  "IdCotizacionDolar": 1,
  "Detalles": [{ "IdArticulo": 1, "Cantidad": 1, "PrecioUnitario": 900 }],
  "Pagos": [{ "IdMetodoPago": 1, "Monto": 900 }]
}
```
→ `201`

**Bodies de error:**

*Error: `Detalles` vacío*
```json
{
  "Fecha": "2026-08-11T12:00:00.000Z", "TotalVenta": 900, "TotalVentaARS": 1305000, "TotalCosto": 800,
  "IdTurnoCaja": 1, "IdCliente": 17, "IdEmpleado": 13, "IdCotizacionDolar": 1,
  "Detalles": []
}
```
→ `400` `{"errors":["\"Detalles\" must contain at least 1 items"]}`

*Error: `Cantidad` en 0 dentro de un detalle*
```json
{
  "Fecha": "2026-08-11T12:00:00.000Z", "TotalVenta": 900, "TotalVentaARS": 1305000, "TotalCosto": 800,
  "IdTurnoCaja": 1, "IdCliente": 17, "IdEmpleado": 13, "IdCotizacionDolar": 1,
  "Detalles": [{ "IdArticulo": 1, "Cantidad": 0, "PrecioUnitario": 900 }]
}
```
→ `400` `{"errors":["\"Detalles[0].Cantidad\" must be greater than 0"]}`

*Error: `Monto` en 0 dentro de un pago*
```json
{
  "Fecha": "2026-08-11T12:00:00.000Z", "TotalVenta": 900, "TotalVentaARS": 1305000, "TotalCosto": 800,
  "IdTurnoCaja": 1, "IdCliente": 17, "IdEmpleado": 13, "IdCotizacionDolar": 1,
  "Detalles": [{ "IdArticulo": 1, "Cantidad": 1, "PrecioUnitario": 900 }],
  "Pagos": [{ "IdMetodoPago": 1, "Monto": 0 }]
}
```
→ `400` `{"errors":["\"Pagos[0].Monto\" must be greater than 0"]}`

*Error: `TotalVenta` negativo*
```json
{
  "Fecha": "2026-08-11T12:00:00.000Z", "TotalVenta": -100, "TotalVentaARS": 1305000, "TotalCosto": 800,
  "IdTurnoCaja": 1, "IdCliente": 17, "IdEmpleado": 13, "IdCotizacionDolar": 1,
  "Detalles": [{ "IdArticulo": 1, "Cantidad": 1, "PrecioUnitario": 900 }]
}
```
→ `400` `{"errors":["\"TotalVenta\" must be greater than or equal to 0"]}`

*Error: `IdCliente` inexistente (FK a nivel DB, cae al catch manual sin statusCode)*
```json
{
  "Fecha": "2026-08-11T12:00:00.000Z", "TotalVenta": 900, "TotalVentaARS": 1305000, "TotalCosto": 800,
  "IdTurnoCaja": 1, "IdCliente": 999999, "IdEmpleado": 13, "IdCotizacionDolar": 1,
  "Detalles": [{ "IdArticulo": 1, "Cantidad": 1, "PrecioUnitario": 900 }]
}
```
→ `500`

#### `PUT /ventas/:id`
Update parcial directo sobre la tabla `Venta` (sin tocar `Detalles`/`Pagos`). No existe → el DAO simplemente no actualiza nada, revisar respuesta.

**Postman:** `PUT` → `{{baseUrl}}/ventas/1`

**Body camino feliz:**
```json
{ "Observaciones": "Actualizado desde Postman" }
```
→ `200`

**Body de error (TotalCosto negativo):**
```json
{ "TotalCosto": -50 }
```
→ `400` `{"errors":["\"TotalCosto\" must be greater than or equal to 0"]}`

#### `DELETE /ventas/:id`
Usa `.remove()` (correcto). Venta con `DetalleVenta`/`PagoVenta` asociados → `SequelizeForeignKeyConstraintError` → **400** automático "integridad referencial" (confirmado en vivo hoy con una venta de prueba).

**Postman:** `DELETE` → `{{baseUrl}}/ventas/1` (sin body) → `400` `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}` si tiene detalles/pagos asociados (el caso normal, siempre que la venta tenga al menos un `DetalleVenta`).

#### `GET /ventas/historico`
**Corregido hoy — antes ignoraba TODOS los query params y devolvía todo.** Ahora filtra de verdad:
| Query param | Filtra sobre |
|---|---|
| `cliente` | `Usuario.Nombre` / `Apellido` / `DNI` del cliente (LIKE, case depende del collation SQL Server) |
| `vendedor` | `Usuario.Nombre` / `Apellido` del empleado |
| `producto` | `Articulo.Nombre` (vía `Detalle→Inventario→Articulo`) |
| `desde` / `hasta` | rango sobre `Venta.Fecha` |
| `montoMin` | `Venta.TotalVentaARS >= montoMin` |

```bash
curl -b cookies.txt "http://localhost:3000/api/ventas/historico?cliente=maxi"
curl -b cookies.txt "http://localhost:3000/api/ventas/historico?montoMin=1000000"
curl -b cookies.txt "http://localhost:3000/api/ventas/historico?desde=2026-01-01&hasta=2026-12-31"
```
Sin resultados → **200** `{"data":[]}` (no es un error).

**Postman:** `GET` → `{{baseUrl}}/ventas/historico?cliente=maxi` (sin body). Otras combinaciones:
- `{{baseUrl}}/ventas/historico?vendedor=fanara` → filtra por `Nombre`/`Apellido` del empleado
- `{{baseUrl}}/ventas/historico?producto=iphone` → filtra por `Articulo.Nombre`
- `{{baseUrl}}/ventas/historico?montoMin=999999999` → solo ventas con `TotalVentaARS >= 999999999`
- `{{baseUrl}}/ventas/historico?cliente=zzznoexiste` → `200` `{"status":"success","data":[]}` (caso sin resultados, no es error)

### 5.2 Detalle de venta (`/api/ventas/detalle-ventas`)
CRUD simple. Schema: `Cantidad` int **>0**, `PrecioUnitario` number **≥0**, `IdVenta`/`IdArticulo` int, todos req en create.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/detalle-ventas[/:id]`

**Body camino feliz (POST):**
```json
{ "Cantidad": 2, "PrecioUnitario": 500, "IdVenta": 1, "IdArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Cantidad` en 0*
```json
{ "Cantidad": 0, "PrecioUnitario": 500, "IdVenta": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than 0"]}`

*Error: `PrecioUnitario` negativo*
```json
{ "Cantidad": 1, "PrecioUnitario": -10, "IdVenta": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"PrecioUnitario\" must be greater than or equal to 0"]}`

### 5.3 Cuotas (`/api/ventas/cuotas`)
Schema: `NumeroCuota` int **>0**, `MontoCuota` number **>0**, `FechaVencimiento` date, `IdVenta`/`IdTurnoCaja` int (todos req en create); `FechaPago` opc, `Recargo` opc **≥0**.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/cuotas[/:id]`

**Body camino feliz (POST):**
```json
{ "NumeroCuota": 1, "MontoCuota": 15000, "FechaVencimiento": "2026-09-11", "IdVenta": 1, "IdTurnoCaja": 1 }
```
→ `201`

**Bodies de error:**

*Error: `MontoCuota` en 0*
```json
{ "NumeroCuota": 1, "MontoCuota": 0, "FechaVencimiento": "2026-09-11", "IdVenta": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"MontoCuota\" must be greater than 0"]}`

*Error: `Recargo` negativo*
```json
{ "NumeroCuota": 1, "MontoCuota": 15000, "FechaVencimiento": "2026-09-11", "IdVenta": 1, "IdTurnoCaja": 1, "Recargo": -50 }
```
→ `400` `{"errors":["\"Recargo\" must be greater than or equal to 0"]}`

### 5.4 Reclamos de garantía (`/api/ventas/reclamos-garantia`)
Schema: `FechaReclamo` date req, `MotivoCliente` max500 req, `Resolucion` opc, `IdDetalleVenta`/`IdEmpleado`/`IdEstadoReclamo` int req en create.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/reclamos-garantia[/:id]`

**Body camino feliz (POST):**
```json
{ "FechaReclamo": "2026-08-11", "MotivoCliente": "El equipo no enciende", "IdDetalleVenta": 1, "IdEmpleado": 13, "IdEstadoReclamo": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `MotivoCliente`*
```json
{ "FechaReclamo": "2026-08-11", "IdDetalleVenta": 1, "IdEmpleado": 13, "IdEstadoReclamo": 1 }
```
→ `400` `{"errors":["\"MotivoCliente\" is required"]}`

### 5.5 Devoluciones (`/api/ventas/devoluciones`)

#### `POST /devoluciones` (transaccional)
Body: `Fecha` opc, `MontoDevuelto` number **≥0** req, `Observaciones` opc, `IdVenta`/`IdTurnoCaja`/`IdEmpleado` int req, `Detalles[]` array min 1 req — cada item: `Cantidad` int **>0**, `IdArticulo` int (= Inventario.Id), **`IdMovimientoStock` int REQUERIDO** (⚠️ cambio de contrato de hoy, antes era opcional).

**⚠️ Importante para probar**: el service (`devolucion-venta.service.js`) **NO crea el `MovimientoStock` automáticamente** — el cliente de la API tiene que crear primero un `MovimientoStock` (`POST /inventario/movimiento-stock`) y mandar su `Id` en cada item de `Detalles`. Si no lo hacés, ahora Joi te va a rechazar con 400 claro ("IdMovimientoStock" is required) en vez de que la DB lo rechace después con un `NOT NULL` crudo.
```bash
curl -b cookies.txt -X POST http://localhost:3000/api/ventas/devoluciones -H "Content-Type: application/json" -d '{
  "Fecha":"2026-08-11","MontoDevuelto":900,"IdVenta":1,"IdTurnoCaja":1,"IdEmpleado":13,
  "Detalles":[{"Cantidad":1,"IdArticulo":1,"IdMovimientoStock":1}]
}'
```
Errores: el service valida `IdVenta`/`IdTurnoCaja`/`IdEmpleado`/`Detalles[].IdArticulo` contra la DB ANTES de insertar, con mensajes tipo `"Venta no encontrada (Id=X)"` — pero el catch general envuelve todo sin `statusCode` → **500** siempre, incluso para estos casos con mensaje claro.

**Postman:** `POST` → `{{baseUrl}}/ventas/devoluciones`

**Body camino feliz** (necesitás un `MovimientoStock` ya creado, ver 4.11):
```json
{
  "Fecha": "2026-08-11", "MontoDevuelto": 900, "IdVenta": 1, "IdTurnoCaja": 1, "IdEmpleado": 13,
  "Detalles": [{ "Cantidad": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }]
}
```
→ `201`

**Bodies de error:**

*Error: falta `IdMovimientoStock` en el detalle (cambio de contrato de hoy — antes era opcional)*
```json
{
  "Fecha": "2026-08-11", "MontoDevuelto": 900, "IdVenta": 1, "IdTurnoCaja": 1, "IdEmpleado": 13,
  "Detalles": [{ "Cantidad": 1, "IdArticulo": 1 }]
}
```
→ `400` `{"errors":["\"Detalles[0].IdMovimientoStock\" is required"]}`

*Error: `Cantidad` en 0*
```json
{
  "Fecha": "2026-08-11", "MontoDevuelto": 900, "IdVenta": 1, "IdTurnoCaja": 1, "IdEmpleado": 13,
  "Detalles": [{ "Cantidad": 0, "IdArticulo": 1, "IdMovimientoStock": 1 }]
}
```
→ `400` `{"errors":["\"Detalles[0].Cantidad\" must be greater than 0"]}`

*Error: `IdVenta` inexistente (validado en el service, pero sin `statusCode`)*
```json
{
  "Fecha": "2026-08-11", "MontoDevuelto": 900, "IdVenta": 999999, "IdTurnoCaja": 1, "IdEmpleado": 13,
  "Detalles": [{ "Cantidad": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }]
}
```
→ `500` `{"status":"error","message":"Venta no encontrada (Id=999999)"}`

### 5.6 Detalle de devolución (`/api/ventas/detalle-devoluciones`)
Mismo cambio: `IdMovimientoStock` ahora **requerido** en create (antes opcional, no coincidía con `NOT NULL` de la DB).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/detalle-devoluciones[/:id]`

**Body camino feliz (POST):**
```json
{ "Cantidad": 1, "IdDevolucionVenta": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `IdMovimientoStock`*
```json
{ "Cantidad": 1, "IdDevolucionVenta": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"IdMovimientoStock\" is required"]}`

*Error: `Cantidad` en 0*
```json
{ "Cantidad": 0, "IdDevolucionVenta": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than 0"]}`

### 5.7 Pagos de venta (`/api/ventas/pagos`)
Schema: `Monto` number **>0** req, `FechaPago` date req, `IdVenta`/`IdMetodoPago`/`IdTurnoCaja` int req en create; `Observacion`/`Pagado` opc.
`PUT /pagos/:id` con `Pagado:true` además actualiza `Venta.EstadoPago = true` si el pago trae `IdVenta` (lógica en `pago-venta.service.js`, transaccional).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/pagos[/:id]`

**Body camino feliz (POST):**
```json
{ "Monto": 900, "FechaPago": "2026-08-11T12:00:00.000Z", "IdVenta": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `201`

**Body camino feliz (PUT, marcar pago como acreditado y sincronizar la venta):**
```json
{ "Pagado": true, "IdVenta": 1 }
```
→ `200`, además pone `Venta.EstadoPago = true`

**Bodies de error:**

*Error: `Monto` en 0*
```json
{ "Monto": 0, "FechaPago": "2026-08-11T12:00:00.000Z", "IdVenta": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"Monto\" must be greater than 0"]}`

*Error: falta `FechaPago`*
```json
{ "Monto": 900, "IdVenta": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"FechaPago\" is required"]}`

### 5.8 Cotizaciones (`/api/ventas/cotizaciones`)
Schema: `Clave` (max50, req — ej `"DolarBlue"`), `Valor` (number, req), `CreatedAt` (opc).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/cotizaciones[/:id]`

**Body camino feliz (POST):**
```json
{ "Clave": "DolarOficial", "Valor": 1050.50 }
```
→ `201`

**Bodies de error:**

*Error: falta `Valor`*
```json
{ "Clave": "DolarOficial" }
```
→ `400` `{"errors":["\"Valor\" is required"]}`

### 5.9 Estado de reclamo (`/api/ventas/estado-reclamos`)
Schema: `Nombre` (max50, req en create, opc en update).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/ventas/estado-reclamos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Aprobada" }
```
→ `201`

**Bodies de error:**

*Error: falta `Nombre`*
```json
{}
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

*Error: PUT parcial con `{}` (ya funciona, confirmado hoy)*
```json
{}
```
→ `200`

---

## 6. Compras (`/api/compras`)

Ningún service setea `statusCode` salvo lo indicado — todo "no encontrado" cae a **500** por defecto. Todos los `UpdateSchema` ya eran parciales de antes (compras nunca tuvo el bug de "UpdateSchema clonado").

### 6.1 Proveedores (`/api/compras/proveedores`)
Schema create: `Nombre` (min2 max100, req), `Email`/`Celular`/`IdLocalidad` (opc). Update: + `Activo` (bool).
`DELETE`: baja lógica ("Proveedor dado de baja exitosamente"), no borra la fila.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/proveedores[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Distribuidora Central", "Email": "ventas@distcentral.com", "Celular": "3515557777", "IdLocalidad": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Nombre` menor a 2 caracteres*
```json
{ "Nombre": "A" }
```
→ `400` `{"errors":["\"Nombre\" length must be at least 2 characters long"]}`

*Error: `Email` con formato inválido*
```json
{ "Nombre": "Proveedor Test", "Email": "no-es-un-email" }
```
→ `400` `{"errors":["\"Email\" must be a valid email"]}`

*Error: DELETE contra id inexistente*
```
DELETE {{baseUrl}}/compras/proveedores/999999 (sin body)
```
→ `500` `{"status":"error","message":"Proveedor no encontrado"}`

### 6.2 Compras (`/api/compras/compras`)
Schema: `Fecha` (opc), `TotalCosto` number **≥0** req, `IdProveedor`/`IdSucursalDestino`/`IdEmpleado` int positivo req.
Es CRUD puro — crear una `Compra` **no** mueve stock ni genera `DetalleCompra`/`MovimientoStock` automáticamente. Si esperás que "cargar una compra" suba el `Stock` del `Inventario`, hoy no pasa — es una decisión de negocio pendiente, no un bug técnico.
`DELETE /compras/:id`: **eliminación física** (no baja lógica) — a diferencia de `Proveedor`. Con `DetalleCompra`/`PagoCompra` asociados → **400** automático (integridad referencial).
**Corregido hoy**: `DELETE` antes llamaba `.delete()` inexistente → 500 siempre; ahora `.remove()` funciona.

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/compras[/:id]`

**Body camino feliz (POST):**
```json
{ "Fecha": "2026-08-11", "TotalCosto": 500000, "IdProveedor": 1, "IdSucursalDestino": 1, "IdEmpleado": 13 }
```
→ `201`

**Bodies de error:**

*Error: `TotalCosto` negativo*
```json
{ "TotalCosto": -100, "IdProveedor": 1, "IdSucursalDestino": 1, "IdEmpleado": 13 }
```
→ `400` `{"errors":["\"TotalCosto\" must be greater than or equal to 0"]}`

*Error: falta `IdProveedor`*
```json
{ "TotalCosto": 500000, "IdSucursalDestino": 1, "IdEmpleado": 13 }
```
→ `400` `{"errors":["\"IdProveedor\" is required"]}`

*Error: DELETE con `DetalleCompra`/`PagoCompra` asociados (confirma el fix `.remove()` — ya no da `TypeError`, ahora sí llega a evaluar la integridad referencial)*
```
DELETE {{baseUrl}}/compras/compras/1 (sin body, sobre una compra con detalles/pagos)
```
→ `400` `{"status":"fail","message":"Error de integridad referencial. Está intentando usar un ID que no existe o borrar un registro que está en uso."}`

### 6.3 Detalle de compra (`/api/compras/detalles-compra`)
Schema: `Cantidad` int **≥1** req, `PrecioCostoUnitario` number **≥0** req, `IdCompra`/`IdArticulo` int positivo req. Mismo comentario: cargar un detalle no mueve stock. **Corregido hoy**: `DELETE` (mismo bug `.delete()`→`.remove()`).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/detalles-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "Cantidad": 10, "PrecioCostoUnitario": 50000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Cantidad` menor a 1*
```json
{ "Cantidad": 0, "PrecioCostoUnitario": 50000, "IdCompra": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"Cantidad\" must be greater than or equal to 1"]}`

*Error: DELETE contra id inexistente (confirma el fix `.remove()`)*
```
DELETE {{baseUrl}}/compras/detalles-compra/999999 (sin body)
```
→ `500`

### 6.4 Devolución de compra (`/api/compras/devoluciones-compra`)
Schema: `MontoRecuperado` number **≥0** req, `Motivo` max200 req, `IdCompra`/`IdTurnoCaja`/`IdEmpleado` int positivo req. **Corregido hoy**: `DELETE` (mismo bug).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/devoluciones-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "MontoRecuperado": 50000, "Motivo": "Lote con fallas de fábrica", "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 13 }
```
→ `201`

**Bodies de error:**

*Error: falta `Motivo`*
```json
{ "MontoRecuperado": 50000, "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 13 }
```
→ `400` `{"errors":["\"Motivo\" is required"]}`

*Error: `MontoRecuperado` negativo*
```json
{ "MontoRecuperado": -50, "Motivo": "Test", "IdCompra": 1, "IdTurnoCaja": 1, "IdEmpleado": 13 }
```
→ `400` `{"errors":["\"MontoRecuperado\" must be greater than or equal to 0"]}`

### 6.5 Detalle de devolución de compra (`/api/compras/detalles-devolucion-compra`)
Schema: `Cantidad` int **≥1** req, `IdDevolucionCompra`/`IdArticulo`/`IdMovimientoStock` int positivo req (los 3 requeridos, coincide con la DB — acá SÍ es requerido `IdMovimientoStock`, a diferencia de cómo estaba antes el análogo en ventas). **Corregido hoy**: `DELETE` (mismo bug).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/detalles-devolucion-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "Cantidad": 2, "IdDevolucionCompra": 1, "IdArticulo": 1, "IdMovimientoStock": 1 }
```
→ `201`

**Bodies de error:**

*Error: falta `IdMovimientoStock`*
```json
{ "Cantidad": 2, "IdDevolucionCompra": 1, "IdArticulo": 1 }
```
→ `400` `{"errors":["\"IdMovimientoStock\" is required"]}`

### 6.6 Pago de compra (`/api/compras/pagos-compra`)
Schema: `Monto` number **>0** req (**corregido hoy**, antes `.min(0)` permitía `0` contra un `CHECK(Monto > 0)` real en la DB — mandar `Monto:0` ahora da 400 Joi limpio en vez de 500 crudo), `FechaPago` opc, `IdCompra`/`IdMetodoPago`/`IdTurnoCaja` int positivo req. **Corregido hoy**: `DELETE` (mismo bug `.delete()`→`.remove()`).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/compras/pagos-compra[/:id]`

**Body camino feliz (POST):**
```json
{ "Monto": 500000, "FechaPago": "2026-08-11", "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `201`

**Bodies de error:**

*Error: `Monto` en 0 (verificación del fix de hoy)*
```json
{ "Monto": 0, "IdCompra": 1, "IdMetodoPago": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"Monto\" must be greater than 0"]}`

*Error: falta `IdMetodoPago`*
```json
{ "Monto": 500000, "IdCompra": 1, "IdTurnoCaja": 1 }
```
→ `400` `{"errors":["\"IdMetodoPago\" is required"]}`

---

## 7. Finanzas (`/api/finanzas`)

### Métodos de pago (`/api/finanzas/metodo-pagos`)
Schema: `Nombre` (max100, req en create, opc en update), `Activo` (bool, opc).
Es el catálogo que alimenta los selects de "forma de pago" en Ventas/Reparaciones/Compras.
`DELETE`: usa `.remove()` directo desde la ruta (`metodoPagoController.remove`), sin capa `delete()` intermedia — no tenía el bug.
No encontrado / nombre duplicado → **500** (sin `statusCode`).

**Postman:** `GET`/`POST`/`PUT`/`DELETE` → `{{baseUrl}}/finanzas/metodo-pagos[/:id]`

**Body camino feliz (POST):**
```json
{ "Nombre": "Mercado Pago", "Activo": true }
```
→ `201`

**Bodies de error:**

*Error: falta `Nombre`*
```json
{ "Activo": true }
```
→ `400` `{"errors":["\"Nombre\" is required"]}`

*Error: PUT parcial con `{}` (ya funciona)*
```json
{}
```
→ `200`

*Error: no encontrado*
```
GET {{baseUrl}}/finanzas/metodo-pagos/999999 (sin body)
```
→ `500`

---

## 8. Estadísticas (`/api/estadisticas`)

### `GET /marca-mas-reparada` / `/dispositivo-mas-reparado` / `/repuesto-mas-usado` / `/falla-mas-repetida`
Cualquier usuario logueado, sin restricción de rol. `?limit=N` → top N; sin `limit` → ranking completo. Leen vistas SQL (`vw_Metricas_*`, solo cuentan órdenes con estado "Entregado"). Sin datos que matcheen → array vacío, no error.

**Postman:** `GET` → `{{baseUrl}}/estadisticas/marca-mas-reparada` (sin body). Con top N: `{{baseUrl}}/estadisticas/marca-mas-reparada?limit=3`. Análogo para `/dispositivo-mas-reparado`, `/repuesto-mas-usado`, `/falla-mas-repetida`. No hay "errores" propios más allá del 401 genérico sin sesión — sin datos que matcheen, el endpoint responde `200` `{"status":"success","data":[]}`.

### `GET /finanzas` / `GET /dashboard` — **isAdmin**
Rol 3/4 → **403**. Con rol 1/2: sin body ni query, `dashboard` compone top-1 de cada métrica + `finanzas` en un solo JSON.
```bash
curl -b cookies.txt http://localhost:3000/api/estadisticas/dashboard
```
Para probar el 403: loguearte como `vendedor.test@puntocell.test` o `tecnico.test@puntocell.test`.

**Postman:** `GET` → `{{baseUrl}}/estadisticas/dashboard` (sin body, logueado como rol 1/2) → `200`. Logueado como rol 3/4 → `403` `{"message":"Acceso denegado. Esta acción requiere privilegios de Administrador o Encargado."}`. Análogo para `{{baseUrl}}/estadisticas/finanzas`.

---

## Resumen de discrepancias detectadas hoy respecto al informe anterior

1. **`usuario.service.js`**: **corregido** — en una versión anterior de esta guía se documentaba que `POST /usuarios/` con `EsCliente:false` (empleado) y **todo** `PUT /usuarios/:id` no traían `Id` en el `data` (destructuring `const { Pwd, Id, ...resultado }`). Verificado en el código actual: las 3 ramas (`create` cliente, `create` empleado, `update`) ya destructuran solo `{ Pwd, ...resultado }` — el `Id` sí viene en la respuesta.
2. **`PagoReparacion.Monto`**: **corregido** — el DTO ya usa `.greater(0)` (antes `.min(0)`, que permitía `0` contra un `CHECK(Monto > 0)` real en la DB). `Monto:0` ahora da 400 Joi limpio.
3. **`POST /auth/reset-password`** con usuario inexistente en el token: **corregido** — `auth.service.js` ahora setea `err.statusCode = 400` explícitamente en ese caso, y `auth.controller.js` respeta `err.statusCode` si está presente. Da 400 con `"Usuario no encontrado"`, ya no 500 genérico.
4. **10 endpoints DELETE que estaban rotos al 100% (`TypeError` → 500 siempre)** por llamar `DAO.delete()` en vez de `DAO.remove()` ya están corregidos y verificados por grep: `permisos` (usuarios-empresa); `compras`, `detalles-compra`, `devoluciones-compra`, `detalles-devolucion-compra`, `pagos-compra` (compras); `estados-orden`, `orden-fallas`, `seguimientos-orden`, `pagos-reparacion` (reparaciones).
5. **`GET /ventas/historico`** ahora filtra de verdad — antes devolvía todo siempre sin importar los query params.
6. **`GET /inventario/modelo-articulos`** ahora devuelve `IdMarcaArticulo`/`IdCategoriaArticulo` (antes los ocultaba, rompía el cascadeo Tipo→Marca→Modelo del frontend).
7. Todos los `UpdateSchema` de la API (revisados módulo por módulo hoy) permiten updates parciales — no encontré ninguna excepción viva salvo las ya documentadas como intencionales (`rolPermisoSchema` no tiene Update porque no hay endpoint PUT para ese recurso).
8. Todas las validaciones `.min(0)`/`.greater(0)` que faltaban respecto a los `CHECK` de `db tesis.md` fueron agregadas hoy en `venta`, `detalle-venta`, `pago-venta`, `cuota`, `descuento`, `devolucion-venta`, `detalle-devolucion-venta`, `inventario`, `pago-compra`, `pago-reparacion` — verificado campo por campo contra el schema SQL real.

## Revisión: Postman + ejemplos de body (camino feliz y error)

Esta revisión agregó, a cada endpoint documentado arriba, una línea `**Postman:**` con método+URL y bloques de body en JSON — tanto el camino feliz como un ejemplo concreto por cada error ya listado en su sección de errores. Los objetos son realistas y coherentes con las reglas Joi de cada DTO (tipos, formatos de fecha ISO, rangos `.min()/.max()`, IDs plausibles). Para los catálogos CRUD idénticos que ya estaban agrupados (baterías/colores/estados-inventario/memorias/almacenamientos), se mantuvo el agrupamiento pero se agregó un ejemplo de body por cada catálogo, usando el nombre real de su campo distintivo.

No se pudieron generar ejemplos de body de error más específicos que "sin `statusCode`" para los endpoints donde la guía original ya señalaba que el service no expone un mensaje/condición distinguible más allá del genérico (ej. varios "no encontrado"/"ya existe" en `inventario`, `ventas`, `compras` que caen a 500 sin más detalle) — en esos casos el bloque de error muestra el body que dispara la condición, pero la respuesta esperada es el mismo 500 genérico documentado arriba, no un mensaje único por caso.

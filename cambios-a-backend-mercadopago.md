# Cambios a backend para la pasarela de pago (Mercado Pago)

Nota de traspaso para el equipo de backend. Resume lo que la rama
`feat/mejora-catalogo-landing` agregó en `PuntoCell_API` para que el catálogo
público pueda cobrar con Mercado Pago, y lo que queda pendiente de su lado.

Continúa la nota anterior, `cambios-a-backend-necesarios-para-catalogo.md`.
La sección 7 de este documento amplía el punto 2.1 de aquella.

---

## 1. Qué se agregó

**Un módulo nuevo y aislado:** `PuntoCell_API/src/modules/pagos/`

| Archivo | Responsabilidad |
|---|---|
| `mercadopago.client.js` | Único punto que habla con la API de Mercado Pago. Dos llamadas HTTP |
| `pagos.service.js`      | Revalida el carrito contra la base, arma la preferencia, normaliza el estado del pago y registra la venta |
| `pagos.controller.js`   | Traducción HTTP. Sin lógica |
| `pagos.routes.js`       | Las tres rutas y el cableado de `CatalogoService` y `VentaService` |

Más dos scripts:

- `PuntoCell_API/scripts/seed-tienda-online.sql` — las dos filas de identidad de
  la venta online (ver sección 8). Idempotente.
- `PuntoCell_API/scripts/check-pagos.mjs` — 28 asserts sobre el servicio, con un
  cliente de Mercado Pago, unos `models` y un `VentaService` falsos. No necesita
  red ni base:

```
docker compose exec api node scripts/check-pagos.mjs
```

**Ningún archivo del módulo importa ni modifica código existente del sistema**,
salvo `CatalogoService`, que se reusa tal cual está (ver sección 4).

**No se instaló ninguna dependencia.** La API de Mercado Pago que se usa acá son
dos llamadas HTTP y Node 20 ya trae `fetch` global, así que no hace falta el SDK
`mercadopago` ni correr `npm install` para levantar la API.

## 2. Qué archivos existentes se tocaron

Exactamente tres, y en los tres el cambio es aditivo:

| Archivo | Cambio |
|---|---|
| `src/routes/index.js` | Un import y una línea: `router.use('/pagos', pagosRoutes())` |
| `src/core/config/env.js` | Un bloque `MP` al final del objeto `env` |
| `docker-compose.yml` | Tres variables en `services.api.environment` |

**No se tocó ningún modelo de Sequelize, ninguna asociación, ninguna tabla y
ningún script SQL.** El esquema de la base queda exactamente como estaba.

La línea de `routes/index.js` va **antes** de `router.use(requireAuth)`, junto a
la de `/catalogo`, porque el comprador del catálogo no tiene login. Se verificó
que esto no abre ninguna ruta privada: `GET /api/ventas` sigue devolviendo 401.

## 3. Contrato de los endpoints

Los tres son públicos (sin token), igual que `/api/catalogo/productos`.

```
POST /api/pagos/checkout
  body  { items: [{ id, cantidad }], comprador: { email, nombre, dni, celular } }
        los cuatro campos de comprador son obligatorios: con ellos se resuelve
        o se da de alta el cliente de la venta (ver sección 8)
  200   { status: "success", data: { initPoint, externalReference } }
  400   carrito vacío
  409   { status, message, detalle: [{ id, motivo, disponible }] }
        motivo ∈ "inexistente" | "sin_stock"

GET  /api/pagos/:paymentId
  200   { status: "success", data: {
            estado, paymentId, externalReference, total, items, fecha, medio } }
        estado ∈ "approved" | "pending" | "rejected" | "desconocido"
        items  → [{ title, quantity, unitPrice }]
  404   pago inexistente

POST /api/pagos/webhook
  body  { type, data: { id } }    ← del body solo se usa data.id
  200   siempre
```

El `id` de `items` en el checkout es el **`Inventario.Id`**, el mismo que devuelve
`GET /api/catalogo/productos` en su campo `id`.

El webhook responde 200 incluso ante un error interno: cualquier otro código hace
que Mercado Pago reintente la notificación en bucle.

## 4. Por qué el módulo reusa `CatalogoService`

`crearCheckout()` llama a `CatalogoService.getProductosVendibles()` en lugar de
reimplementar la resolución de precios. Dos motivos:

1. Garantiza que el precio que se le cobra al comprador es **exactamente** el que
   vio en la vitrina: misma lista minorista, misma vigencia, misma lógica.
2. No duplica la resolución de listas de precio, que es la parte con más reglas
   de negocio de ese servicio.

La contrapartida está marcada con un comentario en el código: trae el catálogo
entero para validar N ítems. Con el volumen actual no es problema; si el catálogo
crece, conviene un método que filtre por ids.

## 5. Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `MP_ACCESS_TOKEN` | Sí | Token de la aplicación de Mercado Pago. **Nunca debe llegar al frontend** |
| `MP_BACK_URL_BASE` | No (default `http://localhost:5173`) | Base del frontend a la que Mercado Pago devuelve al comprador |
| `MP_WEBHOOK_URL` | No (default vacío) | URL pública del webhook. Si está vacía no se manda `notification_url` |
| `MP_ID_EMPLEADO` | Sí, para registrar ventas | Id del `Usuario` "Tienda Online" que devuelve el script de seed |
| `MP_ID_TURNO_CAJA` | Sí, para registrar ventas | Id del `TurnoCaja` "Caja Online" que devuelve el script de seed |
| `MP_ID_METODO_PAGO` | Sí, para registrar ventas | Id de `billetera virtual (qr/alias)` en `MetodoPago` |

La API levanta sin `MP_ACCESS_TOKEN`: nada lo lee al arrancar. Solo fallan las
llamadas que necesitan hablar con Mercado Pago.

Ojo con **dónde** se cargan: el que lee `docker compose` es el `.env` de la raíz
del repo, junto al `docker-compose.yml`. Un `.env` dentro de `PuntoCell_API/` no
lo lee nadie cuando la API corre en Docker, y las variables llegan vacías al
contenedor sin ningún error visible.

## 6. Decisiones de seguridad, con su motivo

**El backend nunca confía en el carrito.** El endpoint de checkout recibe
únicamente `{ id, cantidad }` y vuelve a leer precio y stock de la base. El
carrito vive en el `localStorage` del navegador y es editable: sin esta
revalidación, cualquiera podría editarlo y comprar un iPhone a $1. Si un producto
no existe o no tiene stock suficiente, se devuelve 409 **antes** de crear la
preferencia en Mercado Pago.

**El estado del pago siempre se le pregunta a Mercado Pago.** Nunca se lee del
query string de la `back_url` ni del body del webhook, porque los dos son
falsificables por cualquiera que conozca la URL. Tanto la pantalla de resultado
como el webhook terminan llamando a la misma función, que hace
`GET /v1/payments/:id` contra Mercado Pago.

**Por eso no se valida la firma `x-signature` del webhook.** No es un descuido:
del body del webhook solo se toma el id del pago, y ese id se verifica contra
Mercado Pago antes de usarse. El body nunca se trata como dato. Si en el futuro
el webhook pasara a confiar en el contenido de la notificación, **habría que
agregar la validación de firma**.

## 7. La convención de moneda, y el bug que encontramos en el punto de venta

Amplía el punto 2.1 de `cambios-a-backend-necesarios-para-catalogo.md`, que ya
avisó que el campo `priceUsd` del catálogo devuelve pesos.

**Sus datos están bien.** Lo verificamos contra la única venta que existía en la
base de desarrollo, que sirve de referencia de la convención:

```
Venta 1  |  TotalVenta 844,63  |  TotalVentaARS 1.224.720  |  TotalCosto 1.008.000
DetalleVenta                   |  PrecioUnitario 1.360.800
```

844,63 × 1450 (DólarBlue) = 1.224.713. La convención es inequívoca y coherente:

| Campo | Moneda |
|---|---|
| `PrecioArticulo.ValorFinal`, `PrecioArticulo.CostoReal`, `DetalleVenta.PrecioUnitario` | **pesos** |
| `Venta.TotalVentaARS`, `Venta.TotalCosto` | **pesos** |
| `Venta.TotalVenta` | **dólares** = pesos ÷ cotización |

Esta integración sigue exactamente esa convención, así que las ventas online se
registran igual que cualquier otra.

### Lo que sí está mal: el punto de venta

`PuntoVentaScreen.jsx` toma el `PrecioUnitario` (que está **en pesos**) y arma
`TotalVentaARS = TotalVenta × valorDolar`, tratando ese valor como si fuera
dólares. Con el dólar a 1450, una venta de una funda de $3.024 quedaría
registrada como $4.384.800.

No lo tocamos porque ese frontend no es nuestro. Lo dejamos anotado acá porque
es el mismo campo que consume esta integración, y si alguien "corrige" la
convención mirando el punto de venta en vez de mirar los datos, va a romper las
dos cosas.

### Y el nombre del campo del catálogo sigue mintiendo

`GET /api/catalogo/productos` devuelve `priceUsd`, pero el valor está en pesos.
Conviene renombrarlo a `precio` o `precioArs`. Es una trampa para el próximo que
lo consuma.

## 8. La venta SÍ se registra — qué van a ver en sus módulos

> Esta sección reemplaza a la versión anterior, que decía que la integración
> cobraba sin registrar nada. Eso cambió: **un pago aprobado ahora crea una
> `Venta` real y descuenta stock.**

Cuando Mercado Pago confirma un pago, el módulo llama a
**`VentaService.create()` tal cual está, sin modificarlo**, y ese servicio hace
lo de siempre en una sola transacción: crea la `Venta`, sus `DetalleVenta`,
descuenta el `Stock` del `Inventario` con lock de fila, y registra el
`PagoVenta`.

**Consecuencia directa: las ventas del catálogo online van a aparecer en
dashboards, reportes, caja y bitácora, mezcladas con las del local.** Se pueden
distinguir de tres formas: por el empleado "Tienda Online", por el turno "Caja
Online", y porque el campo `Observaciones` arranca con `Venta online. MP:<id>`.

### Identidad de la venta online

`Venta` exige `IdTurnoCaja`, `IdEmpleado`, `IdCliente` e `IdCotizacionDolar`,
los cuatro NOT NULL con FK, y una compra a las 3 de la mañana no tiene turno de
caja abierto ni empleado que la facture. Se resolvió sembrando dos filas — son
**datos, no cambios de esquema** — con el script idempotente
`scripts/seed-tienda-online.sql`:

| Fila | Detalle |
|---|---|
| `Usuario` "Tienda Online" | Empleado ficticio. Rol `vendedor`, sucursal 1. Su `Pwd` es el texto `CUENTA-DE-SISTEMA-SIN-LOGIN`, que **no es un hash de bcrypt válido**: ninguna contraseña puede autenticar esa cuenta |
| `TurnoCaja` "Caja Online" | **Queda permanentemente abierto** (`FechaCierre` NULL) para no mezclar las ventas online con el arqueo del turno real. Van a verlo siempre abierto en sus listados de caja |

Los tres Id se configuran por entorno: `MP_ID_EMPLEADO`, `MP_ID_TURNO_CAJA` y
`MP_ID_METODO_PAGO`. El método de pago reusa `billetera virtual (qr/alias)`, que
ya existía.

### El cliente es real, y se resuelve por DNI

El checkout pide **email, nombre y apellido, DNI y celular**, los cuatro
obligatorios. Al confirmar el pago:

1. Se busca un `Usuario` con ese **DNI**. Si existe, la venta queda a nombre de
   esa persona y el resto de los datos se ignoran.
2. Si no, se busca por el **email del formulario**. Cubre a quien ya compró y
   tipeó mal el documento, y evita chocar contra el índice único de
   `Usuario.Email`, que haría fallar el alta y perder la venta entera.
3. Si tampoco, se crea el cliente con los datos del checkout y `EsCliente = 1`.

**Todos esos datos viajan en el `metadata` de la preferencia, no se leen del
`payer` que devuelve Mercado Pago.** Es importante y no es un capricho: cuando
el comprador paga con su cuenta de MP, el `payer` trae `first_name`,
`last_name` y `phone` en `null`, y el email y el documento que devuelve son los
de **la cuenta de Mercado Pago**, no los de la persona. Usarlos hacía que dos
compradores distintos que pagaran desde la misma cuenta se colapsaran en un solo
cliente, y que toda venta de alguien no registrado quedara atribuida al primero
que hubiera comprado alguna vez.

El cruce contra la base de clientes ocurre **solo en el backend**. No hay ningún
endpoint que diga si un DNI es cliente: sería público, y permitiría probar
documentos hasta averiguar quién le compra al local.

### El medio de pago sale de lo que informa Mercado Pago

`payment_type_id` se traduce a los métodos que **ya existen** en `MetodoPago`.
No hizo falta agregar ninguno:

| Mercado Pago informa | Se registra como |
|---|---|
| `credit_card` | tarjeta de credito |
| `debit_card`, `prepaid_card` | tarjeta de debito |
| `account_money` | billetera virtual (qr/alias) |
| `bank_transfer`, `atm` | transferencia bancaria |
| `ticket` (Rapipago, Pago Fácil) | efectivo |
| cualquier otro | el de `MP_ID_METODO_PAGO` |

La búsqueda es **por nombre, no por id**: los ids pueden diferir entre bases, los
nombres no. Es el mismo criterio que ya usa el sistema en otros lados.

**Una aclaración de negocio, por si la revisan:** un pago en cuotas con tarjeta
**no** se registra con el método `cuotas`. En este sistema ese método significa
que el local financia y genera un cronograma en `Cuota`; con Mercado Pago
financia el emisor de la tarjeta y el local cobra el total de una vez. Anotarlo
como `cuotas` haría aparecer una cuenta corriente inexistente. El dato no se
pierde: el medio concreto y la cantidad de cuotas quedan en
`PagoVenta.Observacion`, por ejemplo `Mercado Pago master 3 cuotas - pago 178450433075`.

### Idempotencia

El webhook reintenta, y además puede llegar a la vez que la pantalla de
resultado. Sin una tabla propia, el vínculo pago→venta vive en
`Venta.Observaciones` y se consulta con un `LIKE '%MP:<paymentId>%'` antes de
crear nada. Verificado contra la base: tres consultas seguidas al mismo pago
devuelven la misma venta y no duplican ni la venta, ni el cliente, ni el
descuento de stock.

Es una solución deliberadamente barata. Si en algún momento existe una tabla de
pedidos online, ese vínculo debería mudarse a una columna indexada.

### Sobreventa

Si el stock se agotó entre el pago y la confirmación, `VentaService.create()`
aborta la transacción. **No se duplicó su lógica para forzar el registro.** El
pago queda cobrado, la venta no se registra, y la pantalla le avisa al comprador
con el número de pago para que el local lo resuelva a mano. Queda un
`console.error` en el log de la API con el id del pago.

### Redondeo: el total en pesos no coincide exactamente con lo cobrado

Esto **no es específico de las ventas online** y conviene que lo miren.

`Venta.TotalVenta` está en dólares con dos decimales, y `VentaService.create()`
recalcula `TotalVentaARS = TotalVenta × cotización`. Con el dólar a 1450, **cada
centavo de dólar vale 14,50 pesos**, así que el total en pesos de cualquier
venta arrastra hasta ±7,25 de error de redondeo.

Caso real medido en esta integración:

| | |
|---|---|
| Mercado Pago cobró | 6.048,00 |
| `TotalVenta` = 6048 ÷ 1450 | 4,171034… → se guarda **4,17** |
| `TotalVentaARS` recalculado | 4,17 × 1450 = **6.046,50** |
| Diferencia | **1,50** |

`PagoVenta.Monto` sí guarda el importe exacto (6.048,00), así que la plata que
entró está bien registrada; lo que queda desalineado es el total de cabecera, y
con él la suma de pagos contra el total de la venta.

No es resoluble desde el módulo de pagos: dos decimales en dólares no alcanzan
para representar cualquier importe en pesos. Si les importa la conciliación
exacta, la decisión es de ustedes — por ejemplo, ampliar la precisión de
`TotalVenta`, o tomar `TotalVentaARS` como el valor primario en vez del derivado.

## 9. Qué falta para producción

- **Una URL pública para `MP_WEBHOOK_URL`.** En desarrollo va vacía porque
  Mercado Pago no puede alcanzar `localhost`; el flujo se confirma igual por la
  `back_url`. En producción el webhook es la red de seguridad para el caso en que
  el comprador cierre el navegador antes de volver al sitio.
- **Credenciales de producción.** Hoy se usa el token de prueba (`TEST-...`).
- **`MP_BACK_URL_BASE` en https.** El código solo manda `auto_return: "approved"`
  cuando la base es https, porque Mercado Pago rechaza la preferencia entera si
  se lo mandás con `back_urls` en `http://localhost`. Con https, el comprador
  vuelve solo al sitio en vez de tener que tocar un botón.

## 10. Cómo obtener credenciales de prueba

En el panel de desarrolladores de Mercado Pago: crear una aplicación, entrar a
sus credenciales y copiar el **Access Token de prueba** (empieza con `TEST-`).
Para pagar se usan los usuarios y las tarjetas de prueba que Mercado Pago
documenta, donde el resultado del pago se controla con el nombre del titular.

## 11. Cómo revertir

El **código** es aditivo, así que se saca entero:

1. Borrar la carpeta `src/modules/pagos/`.
2. Borrar `scripts/check-pagos.mjs` y `scripts/seed-tienda-online.sql`.
3. Sacar de `src/routes/index.js` el import de `pagosRoutes` y la línea
   `router.use('/pagos', pagosRoutes())`.

El bloque `MP` de `env.js` y las variables del `docker-compose.yml` quedan
inertes si sobran: no hace falta tocarlos.

**Los datos son otra cosa.** Revertir el código deja de generar ventas nuevas,
pero no borra las que ya se registraron ni devuelve el stock descontado. Para
encontrarlas:

```sql
SELECT * FROM Venta WHERE Observaciones LIKE 'Venta online. MP:%';
```

Las dos filas seed (`Usuario` "Tienda Online" y `TurnoCaja` "Caja Online") no se
pueden borrar mientras alguna venta las referencie, por las FK. Si hace falta
dar de baja el canal online sin borrar historial, lo razonable es cerrar el
turno "Caja Online" poniéndole `FechaCierre`, y dejar el resto como está.

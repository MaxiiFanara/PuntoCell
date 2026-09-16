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
| `pagos.service.js`      | Revalida el carrito contra la base, arma la preferencia, normaliza el estado del pago |
| `pagos.controller.js`   | Traducción HTTP. Sin lógica |
| `pagos.routes.js`       | Las tres rutas |

Más un chequeo ejecutable: `PuntoCell_API/scripts/check-pagos.mjs`, 17 asserts
sobre el servicio con un cliente de Mercado Pago falso. No necesita red ni base:

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
  body  { items: [{ id, cantidad }], comprador: { email, nombre, telefono } }
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

La API levanta sin `MP_ACCESS_TOKEN`: nada lo lee al arrancar. Solo fallan las
llamadas que necesitan hablar con Mercado Pago.

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

## 7. Pendiente del lado de backend: el conflicto de moneda

Amplía el punto 2.1 de `cambios-a-backend-necesarios-para-catalogo.md`, que ya
avisó que `priceUsd` devuelve pesos. Al integrar el pago aparecieron las otras
dos piezas del problema. Hoy conviven tres criterios incompatibles:

| Dónde | Qué asume |
|---|---|
| `PrecioArticulo.ValorFinal` (datos) | Está cargado en **pesos**: Apple iPhone 14 Pro = 1.871.100, Funda Silicona = 3.024 |
| `Venta.TotalVenta` (esquema) | Está definido en **dólares**. `venta.service.js` calcula `TotalVentaARS = TotalVenta × cotización` |
| Punto de venta (frontend interno) | Trata ese mismo `ValorFinal` como **dólares**: `PuntoVentaScreen.jsx` hace `TotalVenta × valorDolar` |

Los tres no pueden ser correctos a la vez.

**La corrección es del lado de la API**, no del frontend, porque involucra el
esquema y el significado de los datos. Hay dos caminos:

- `ValorFinal` pasa efectivamente a dólares, y se convierte a pesos en un solo
  lugar. Implica recargar los precios de la base.
- O `Venta.TotalVenta` se redefine en pesos, y se renombra `priceUsd` del
  endpoint del catálogo (que ya hoy miente).

**Qué hace esta integración mientras tanto:** le cobra a Mercado Pago el valor de
`ValorFinal` tal cual, en pesos (`currency_id: "ARS"`), sin convertir por
cotización. Es consistente con lo que muestra el catálogo público y con la plata
que efectivamente se mueve.

**Qué bloquea:** registrar la venta online como una `Venta` del sistema. Ver la
sección 8.

## 8. Qué NO hace esta integración

Esta integración **cobra, pero no registra la venta**. Concretamente, un pago
aprobado en el catálogo **no**:

- crea una fila en `Venta`, `DetalleVenta` ni `PagoVenta`;
- **descuenta stock de `Inventario`**;
- aparece en dashboards, reportes, caja ni bitácora.

El local se entera del pedido por el panel de Mercado Pago y por el mensaje de
WhatsApp que ofrece la pantalla de éxito, con el número de pago incluido.

Esto fue una decisión deliberada, no una limitación técnica. Registrar la venta
implicaría que las compras online empiecen a aparecer en módulos que mantiene
este equipo, y hay tres obstáculos concretos:

1. **`Venta` no admite una venta online.** Exige `IdTurnoCaja`, `IdEmpleado`,
   `IdCliente` e `IdCotizacionDolar`, los cuatro NOT NULL con FK. Una compra a
   las 3 de la mañana no tiene turno de caja abierto ni empleado que la facture.
   Habría que sembrar un usuario "Tienda Online" y un turno de caja virtual
   permanentemente abierto, que aparecería en los arqueos de caja.
2. **El conflicto de moneda de la sección 7** tiene que resolverse primero: sin
   saber en qué unidad va `TotalVenta`, la venta se registraría mal.
3. **Sobreventa.** Si el stock se agota entre el pago y la confirmación,
   `VentaService.create()` tira error. Hay que definir qué hacer con un pago ya
   cobrado que no se puede cumplir.

Si el equipo quiere avanzar con esto, conviene acordarlo antes: el diseño está
escrito y `VentaService.create()` se reusaría tal cual está, sin modificarlo.

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

El módulo es aditivo, así que se saca entero:

1. Borrar la carpeta `src/modules/pagos/`.
2. Borrar `scripts/check-pagos.mjs`.
3. Sacar de `src/routes/index.js` el import de `pagosRoutes` y la línea
   `router.use('/pagos', pagosRoutes())`.

El bloque `MP` de `env.js` y las tres variables del `docker-compose.yml` quedan
inertes si sobran: no hace falta tocarlos.

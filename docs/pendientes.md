# Pendientes de PuntoCell

Backlog acordado el 2026-08-26, al cerrar el rediseño visual. En orden de prioridad definido por el dueño del proyecto.

El rediseño en sí está documentado aparte en [`plan-rediseno-frontend.md`](plan-rediseno-frontend.md). Los bugs de backend ya conocidos están en la sección "Estado real / deuda conocida" del [`CLAUDE.md`](../CLAUDE.md) del repo.

---

## 1. ~~Los `Select` cerrados se ven mal~~ ✅ RESUELTO el 2026-08-27

**Causa encontrada:** el tema tenía `inputSizeSmall: { height: 32, paddingTop: 0, paddingBottom: 0 }`. Ese `height` rígido con padding vertical en cero funciona para un `<input>`, que centra su texto solo, pero un `Select` renderiza un **`div`** y ahí colapsa. Además no existía ningún override de `MuiSelect`, `MuiMenu` ni `MuiMenuItem`: el menú desplegado se veía bien solo porque heredaba el de `MuiPaper`.

**Arreglo:** el input pasó a dimensionarse con `minHeight` + padding (sirve para input y para div), y se agregaron los tres overrides que faltaban.

**Verificado en vivo** con el modal "Buscar dispositivo" abierto: `TextField` 32px, ambos `Select` 32px (antes colapsados), opciones del menú de 32px y 13px de tipografía, radio 9px.

**De paso se arregló otro bug del mismo origen:** MUI define `.MuiDialogTitle-root + & { paddingTop: 0 }` en `DialogContent`, un selector compuesto que le ganaba en especificidad al `padding` plano del tema. El contenido quedaba pegado al título en **todos** los modales. Restaurado con la misma especificidad — medido: `padding-top` 15px.

---

## 2. ~~La landing quedó mal~~ ✅ RESUELTA el 2026-08-27

Portada entera: `LandingPage`, `Navbar`, `Hero`, `Services`, `CatalogHighlight`, `FooterCTA` y `Team`. **35 hex → 0**, último Tailwind del proyecto eliminado, lint limpio.

Tratamiento propio de vitrina —tipografía grande y aire— sobre los mismos tokens del sistema. El hilo que la ata al resto: la marca "PC" idéntica a la del rail, el verde, los eyebrows y la mono para precios.

**Tres cosas que además estaban rotas y se arreglaron de paso:**
- El botón "Consultar por WhatsApp" **no tenía `href`**: no hacía nada. Ahora usa el número de `STORE_CONFIG`, igual que el resto de la vitrina.
- Las 4 fotos de producto venían de `placehold.co`: la landing **dependía de un servicio externo** para renderizar. Reemplazadas por un marcador con tokens.
- Los botones "Ver opciones" de Servicios no tenían acción; se quitaron.

**Queda pendiente del catálogo:** `features/catalogo/` sigue sin portar (2 hex en `WhatsappFloating.jsx`).

---

## 3. El SQL rompe los acentos

**El síntoma:** los nombres con acentos quedan corruptos en la base. El cliente sembrado como "Martín Gómez" se guarda y se muestra como "MartÃ­n GÃ³mez".

**La causa, verificada:**
- `db/init/init.sql` está guardado en UTF-8 **sin BOM** (sus primeros bytes son `55534520` = "USE ", no `efbbbf`).
- Los `INSERT` usan literales de cadena **sin prefijo `N`**, por ejemplo la línea 974: `('38222333', 'Gómez', 'Martín', ...)`.
- Sin BOM y sin `-f 65001`, sqlcmd lee los bytes UTF-8 como Latin-1 y guarda la mojibake. **El dato queda corrupto en reposo**; la API sirve `charset=utf-8` correctamente y solo devuelve lo que hay guardado.
- El servicio `db-init` de `docker-compose.yml` corre `sqlcmd ... -i /init/init.sql` **sin `-f 65001`**, así que cualquier instalación desde cero reproduce el bug.

**Qué hay que hacer:** prefijar con `N` todos los literales con caracteres no ASCII y/o guardar el archivo con BOM UTF-8 (idealmente las dos cosas), agregar `-f 65001` al `db-init` del compose, y revisar que `db tesis.md` quede consistente. Después recrear la base y confirmar que `SELECT Nombre, Apellido FROM Usuario WHERE Id=1` devuelve "Martín Gómez".

**Ojo:** la base local actual ya tiene los datos corruptos. Hay que decidir si se recrea o se corrigen las filas con `UPDATE`.

---

## 4. Bugs reales del frontend y por qué las cosas no funcionan

### 4.1 Los precios no llegan al frontend 🔴 el más grave

Es la causa raíz de casi todo lo que "no anda". El merge del módulo `precios` sacó `PrecioCosto` / `PrecioMenor` / `PrecioMayor` del modelo `Inventario` y los movió a `/api/precios` (`ListaPrecio` + `PrecioArticulo`). El frontend sigue leyendo los campos viejos, que ya no vienen en ninguna respuesta.

Consecuencias verificadas:
- `GET /api/inventario/inventarios` responde 200 pero **sin ninguna clave de precio**.
- Punto de venta: el buscador muestra `U$S 0` y el carrito arma la venta con importe 0.
- **No se puede editar ningún ítem de inventario**: el formulario se llena con un precio vacío y la validación bloquea el guardado.
- Listado y detalle de inventario muestran los precios en 0.

Consumidores a migrar: `features/punto-venta/components/ProductoSearch.jsx`, `features/punto-venta/context/VentaContext.jsx` (~169 y ~181), las vistas de `features/inventario/`, y `features/catalogo/` si muestra precios.

### 4.2 La unidad de moneda de cada campo es ambigua

El `CLAUDE.md` dice que los precios están en dólares. Los datos dicen otra cosa:

| Campo | Valor en la base | Unidad real |
|---|---|---|
| `Venta.TotalVenta` | 620.68 | USD |
| `Venta.TotalVentaARS` | 900000 | ARS |
| `DetalleVenta.PrecioUnitario` | 900000 | **pesos en un campo tratado como dólares** |
| `PagoVenta.Monto` | 900000 | **pesos en un campo tratado como dólares** |
| `Inventario.PrecioCosto` | 800000 | pesos |
| `OrdenReparacion.TotalReparacion` | 40000 | pesos |

Por eso el detalle de la venta #1 muestra un ítem de `$ 1.305.000.000`: el código convierte a pesos un número que ya estaba en pesos. **Hay que definir la unidad de cada campo antes de tocar cualquier cálculo financiero**, y decidir si el problema es el dato semilla o el contrato del código.

### 4.3 Credenciales de prueba inválidas en el login

`LoginPage.jsx` línea 80: `const TEST_USER = { usuario: 'jgonzales', password: 'admin123' }`. Ese usuario **no existe**. Los reales son `admin` / `owner` / `vendedor` / `tecnico`, todos con clave `talleres123456`. El botón "Completar" carga credenciales que van a ser rechazadas.

### 4.4 ~~El PDF del comprobante puede imprimir "undefined, undefined"~~ ✅ RESUELTO el 2026-08-27

El template literal siempre devolvía un string con contenido (la coma), así que el `|| '—'` nunca se activaba. Reemplazado por `[apellido, nombre].filter(Boolean).join(', ') || '—'`, que sí cae en el guion cuando faltan los datos. De paso desapareció el `no-constant-binary-expression` que marcaba eslint.

### 4.5 A la primitiva `Money` le falta una prop de color

`components/ui/Money.jsx` fija `text.primary` internamente y no acepta un color. En `features/precios/precios.jsx` hay celdas donde el valor se colorea a propósito (rojo si el margen es crítico, verde la ganancia), así que ahí no se pudo usar `Money` sin borrar esa semántica en silencio. Se resolvió usando tokens directos, pero la primitiva debería aceptar un `color`.

### 4.6 Compras y Precios no tienen backend

Los 7 archivos traídos de `feat/frontCompras-Precios` funcionan con datos mock (`initialData`, `initialProductos`, `initialReglas`). Llevan el chip "Datos de ejemplo". Falta conectarlos, y en el caso de Precios confirmar contra qué contrato se escribió, porque la rama de la que vino no incluía el módulo `precios` del backend.

### 4.7 Menores, ya identificados

- **`IdTurnoCaja: 1` hardcodeado** en `ModalReparacion.jsx`, `ModalCobro.jsx` e `HistorialVentas.jsx` — el módulo de caja no está implementado.
- **`isAdmin = true` hardcodeado** en `InventarioDetails.jsx`: controla si se ve el costo de ingreso, o sea que hoy lo ve cualquier rol.
- **Pantallas con datos mock, sin backend**: bitácora, permisos, roles y balance. Ya llevan un chip "Datos de ejemplo" para que no se confundan con datos reales. La bitácora además no tiene endpoints (`/api/auditoria` no está montado).
- **Filtro de estado de reparaciones con tres estados poco obvios**: `null` muestra solo activas, `'todos'` muestra todo incluido anulado, cualquier otro valor filtra por ese estado.
- **El frontend apunta a `http://localhost:3000/api` fijo** en `services/api.js`, sin variable de entorno de Vite.
- **Muchos servicios del backend devuelven 500 en vez de 404/409.**

---

## 5. `dev` perdió el alta y la edición de inventario

Detectado el 2026-09-09, verificado contra todas las ramas remotas.

**El síntoma:** en `dev` no hay ninguna forma de editar un ítem de inventario ya cargado — ni corregir un precio, ni un IMEI, ni una observación.

**Qué falta exactamente:** `features/inventario/views/InventarioCreate.jsx` e `InventarioEdit.jsx`, más sus rutas `inventario/nuevo` e `inventario/editar/:id` en `App.jsx`. `InventarioList` tampoco tiene ya los botones que llevaban ahí.

**Dónde se perdieron:** al integrar el diseño nuevo en `src/`. Están en `main`, en todas las `feat/*`, y también en `PuntoCell_WebPage/diseno nuevo/src/` — incluido su `App.jsx`, que **sí** declara las dos rutas (líneas 106-107). O sea que el diseño que se integró las tenía y no llegaron a `src/`.

Comparando `main` contra `dev`, son 4 los archivos que desaparecieron de `src/`. Los otros dos son inocuos: `components/dashboard/KpiCard.jsx` se consolidó en `components/ui/KpiCard.jsx`, y `DashboardMetrics.jsx` fue reemplazado (ninguno tiene referencias colgando).

**Por qué no alcanza con restaurarlos:** los dos `InventarioEdit` que existen siguen leyendo `PrecioCosto` / `PrecioMayor` / `PrecioMenor`, las columnas que la migración de precios sacó de la tabla `Inventario`. Restaurarlos tal cual devuelve una pantalla rota.

Peor: `InventarioForm.jsx` sigue en `dev` con esa misma sección de precios vieja, y **bloquea el submit** exigiendo `precioMenor > 0`. Hoy no molesta porque su único uso sobreviviente —el canje en `ModalCobro.jsx:585`— pasa `modoCanje = true`, que saltea justo esa validación. Se quitó la pantalla en vez de arreglar el formulario.

**Qué haría falta:** migrar primero la sección de precios de `InventarioForm` al modelo nuevo (`PrecioArticulo`) y recién después reponer las rutas. El endpoint del backend sigue existiendo (`inventarioServices.update` hace `PUT`).

**Decisión de producto pendiente:** confirmar con el equipo si el alta/edición de inventario vuelve como pantalla propia, o si el flujo definitivo es "el stock entra solo por Compras" — el backend de compras ya está construido asumiendo lo segundo (crea el `Inventario` y su `PrecioArticulo` en la misma transacción).

---

## Estado del rediseño

Medido el 2026-08-27.

| | Al empezar | Ahora |
|---|---|---|
| `createTheme` compitiendo | 5 | 1 |
| Hex hardcodeados fuera del tema | 1035 | 37 |
| Errores de lint | 46 | 32 |
| Build | pasa | pasa |

Los 37 hex que quedan están todos en landing (35) y catálogo (2) — es decir, exactamente en el pendiente 2. Los 2 que aparecen en `BitacoraList.jsx` son falsos positivos: números de ticket (`#4582`, `#4580`) en datos mock.

**Portado y verificado:** tema único + 6 primitivas, historial de ventas, detalle de venta, shell (rail + topbar), punto de venta, inventario, reparaciones, los 6 modales de reparación, dashboard, admin, reportes, auth, compras y precios.

**Sin portar:** landing y catálogo.

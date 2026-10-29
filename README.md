# PuntoCell

## Changelog & Estabilización (Pasos 1-5)


## Historial de Cambios y Estabilización (Fase 1)

Durante esta fase, se resolvieron problemas críticos de lógica financiera, arqueo de caja, flexibilidad de inventario y configuración de entorno para equipos de desarrollo. A continuación se detalla el trabajo realizado:

### Paso 1: Correcciones en Punto de Venta y Cuotas (Alta Prioridad)

**Error / Problema Enfrentado:**
Existían problemas críticos con el cálculo de saldos y la gestión de los estados de pago al realizar ventas y registrar cuotas. El núcleo financiero no reflejaba adecuadamente los cobros parciales.

**Análisis:**
El sistema no actualizaba correctamente los saldos pendientes en las transacciones a crédito. Se requería asegurar que el estado de pago cambiara a "Pagado" solo cuando el saldo restante llegara exactamente a cero.

**Cambios Específicos:**
- **Base de Datos (DB):** Se ajustó la interacción entre `Ventas` y `Cuotas` con la tabla `EstadosPago`. Al insertar pagos parciales, mantiene el estado "Pendiente" y solo pasa a "Pagado" cuando el saldo es $0.
- **Backend:** Modificamos el endpoint de creación de cuotas. Calcula `SaldoRestante = Venta.Total - Suma(Cuotas)` y actualiza automáticamente el estado.
- **Frontend:** Ajustamos el Punto de Venta para permitir cobros parciales sin exigir el monto total. La UI se re-renderiza en tiempo real para mostrar el saldo pendiente.

### Paso 2: Mejoras en el Módulo de Caja (Arqueo y Detalles)

**Error / Problema Enfrentado:**
El cierre de caja era ciego (no cruzaba efectivo declarado con esperado). Los historiales mostraban descripciones inútiles ("Cobro Id=15") y la tabla no se refrescaba automáticamente.

**Cambios Específicos:**
- **Base de Datos (DB):** Se implementaron JOINs en las consultas para traer nombres de `Clientes` y `Proveedores` a la tabla `MovimientoCaja`.
- **Backend:** Se desarrolló la lógica matemática de Arqueo (`caja.service.js`). Suma `(Monto Inicial + Ingresos - Egresos)` para obtener el Total Esperado. En los servicios de ventas/compras, los registros guardan strings detallados (Ej: *"Cobro de venta #15 - Cliente: Juan Pérez"*).
- **Frontend:** Se programó un modal en el cierre de caja que atrapa el Total Esperado e imprime alertas: **Cuadre Perfecto** (verde), **Faltante** (rojo) o **Sobrante** (amarillo). Se reparó el hook `useEffect` en Ingresos/Egresos.

### Paso 3: Flexibilidad en Canjes y Compras

**Error / Problema Enfrentado:**
Bloqueos restrictivos al ingresar mercadería nueva o recibir canjes. La salud de batería usaba un `enum` inflexible.

**Cambios Específicos:**
- **Base de Datos (DB):** Se agregó la columna numérica `BateriaPorcentaje` en `Inventario` y se eliminaron dependencias estrictas a listas predefinidas. (Impactado en `init.sql`).
- **Backend:** Eliminamos bloqueos en `inventario.service.js` y `compras.service.js`, permitiendo registros de mercadería sin campos estrictos que impedían un flujo ágil.
- **Frontend:** Actualizamos `InventarioForm.jsx` y `CanjeForm.jsx` cambiando el dropdown por un input numérico (0-100) para la batería.

### Paso 4: Lógica Dual de Listas de Precios y Costo Base

**Error / Problema Enfrentado:**
El switch Mayorista/Minorista no funcionaba porque se usaban precios fijos y no Listas de Precios dinámicas.

**Cambios Específicos:**
- **Base de Datos (DB):** Se reemplazaron los precios manuales por márgenes. Se ejecutó un recalculo masivo sobre 2600 productos insertando entradas en `PrecioArticulo` basadas en el CostoBase.
- **Backend:** Se creó la función `reprecificarInventario` que detecta el costo base y aplica el multiplicador de margen para crear precios simultáneos en todas las listas activas.
- **Frontend:** El switch en el Punto de Venta ahora consulta la base de datos para obtener el precio de la Lista vigente (Mayorista/Minorista) dinámicamente.

### Paso 5: Mejoras de Entorno (Developer Experience) y Bitácora

**Error / Problema Enfrentado:**
El usuario no veía su sucursal en el Navbar, faltaban detalles en la auditoría, la API fallaba (Crash 502) por un error de sintaxis y el entorno Docker requería instalaciones manuales.

**Cambios Específicos:**
- **Base de Datos:** Aumentó la densidad de datos guardados en `Bitacora`. `init.sql` fue actualizado para reflejar cambios estructurales.
- **Backend:** Se corrigió un `SyntaxError` (variable duplicada `const art = ...`) que causaba caídas del contenedor. Se mejoró `registerAudit` para incluir `IMEI`, `Nombre` y `Costo` de los movimientos.
- **Frontend:** Se inyectó `nombreSucursal` globalmente para ser visible en el Navbar.
- **Infraestructura (Docker):** Se editó `docker-compose.yml` para incluir `npm install` en el comando de arranque (`command: sh -c "npm install && npm run dev"`), automatizando la instalación de dependencias para todo el equipo.

### Paso 6: Estabilización de Entorno y Semillas de Datos (Fase 2)

**Error / Problema Enfrentado:**
Al clonar el repositorio desde cero y levantar los contenedores con Docker, los nuevos desarrolladores experimentaban caídas críticas en la API (`Invalid column name 'FijadoManual'`) y errores en el motor de generación de datos (Seeds) por falta de stock (`Msg 50001: Stock insuficiente`) o mala generación de precios de artículos.

**Análisis:**
El script de inicialización de la base de datos (`init.sql`) no incluía la columna `FijadoManual` que el backend esperaba. Además, el script de semillas (`seed_engine.sql`) generaba un volumen de ventas aleatorio que en ocasiones superaba el stock real disponible del inventario ingresado. Por último, la lógica de asignación de precios durante las compras en el seed solo consideraba la primera lista de precios activa (`TOP 1`), lo cual rompía la lógica de precios dual (Mayorista/Minorista) implementada en el Paso 4.

**Cambios Específicos:**
- **Base de Datos (`init.sql`):** Se añadió la columna `FijadoManual BIT NOT NULL DEFAULT 0` a la tabla `PrecioArticulo` para sincronizar el esquema con los modelos del ORM (Sequelize) del backend, evitando el crasheo de la API al solicitar productos vendibles.
- **Base de Datos (`seed_engine.sql` - Motor de Semillas):**
  - **Lógica de Stock:** Se ajustó el cálculo aleatorio de cantidades de venta (`@CantVender`). Ahora valida y se topa automáticamente con la cantidad máxima de stock disponible (`SELECT Stock FROM Inventario`), evitando la excepción `Stock insuficiente`.
  - **Lógica Dual de Listas de Precios:** Se reescribió la inserción en `PrecioArticulo` al registrar ingresos por compras. En lugar de insertar solo para una lista (`TOP 1`), se utiliza un `INSERT INTO ... SELECT` que recorre **todas las listas de precios activas** asociadas a la categoría del producto, aplicando el margen de rentabilidad correspondiente a cada una de ellas (o cayendo en un fallback por defecto si no existen). Esto asegura que al inicializar el proyecto, los productos tengan sus precios tanto Mayoristas como Minoristas generados correctamente.
- **Entorno (Docker):** Se revirtió la inyección de `npm install` en tiempo de ejecución para el contenedor del backend, para agilizar el arranque, dado que los volúmenes de `node_modules` deben gestionarse a través del `Dockerfile` o scripts externos sin bloquear el loop de reinicio rápido en desarrollo.

# Mi aporte — Módulo de Reparaciones + Dashboard (Frontend)

> Documento de alcance personal dentro del proyecto grupal **PuntoCell**
> (tesis universitaria — sistema de gestión para taller de reparación de celulares).
>
> Esta branch (`Feat/Reparacion+Dashboard`) contiene **mi parte del proyecto: el
> frontend completo**, con foco en dos módulos que desarrollé de punta a punta.
> Para la documentación general del frontend (stack, instalación, arquitectura
> base) ver el [`README.md`](./README.md); acá describo específicamente qué me
> compete a mí.

---

## 1. Qué me compete

- **El frontend completo** de la aplicación (React 19 + Vite + MUI + Tailwind).
- En particular, dos módulos desarrollados por mí de principio a fin:
  1. **Módulo de Reparaciones** — ciclo de vida completo de una orden de reparación.
  2. **Módulo de Dashboard / Estadísticas** — métricas y finanzas del taller.
- La **capa de servicios** (`src/services/api.js`) que consume la API del backend.
- El manejo de **sesión y permisos por rol** en el cliente.

El backend (`PuntoCell_API`) y la base de datos corresponden a otras partes del
proyecto; acá solo se documenta y versiona el frontend.

---

## 2. Módulo de Reparaciones

Gestión integral de las órdenes de reparación desde el ingreso del equipo hasta
la entrega.

**Componentes principales**

| Archivo | Responsabilidad |
|---------|-----------------|
| `pages/ReparacionesPage.jsx` | Página orquestadora (tabla + filtros + modales) |
| `components/modals/ModalReparacion.jsx` | Crear / Editar / Ver detalle de una orden |
| `components/modals/ModalRegistroCliente.jsx` | Alta de cliente |
| `components/modals/ModalRegistroDispositivo.jsx` | Alta de dispositivo |
| `components/modals/ModalBuscarCliente.jsx` | Búsqueda de cliente por DNI |
| `components/modals/ModalBuscarDispositivo.jsx` | Búsqueda de dispositivo |
| `components/table/TablaReparaciones.jsx` | Listado de órdenes |
| `components/table/EstadoChip.jsx` | Chip visual del estado |
| `components/filters/FiltrosReparaciones.jsx` | Filtros (estado, fecha, texto) |
| `components/layout/AccionesReparacion.jsx` | Acciones por fila según rol |
| `hooks/useOrdenes.js` | Estado global de órdenes, filtros y métricas |
| `hooks/useCatalogos.js` | Catálogos (tipos, marcas, modelos, localidades) |
| `hooks/usePermisos.js` | Permisos por rol |

**Funcionalidades**

- **Nueva orden**: cliente (búsqueda por DNI o registro), dispositivo, fallas y
  seña opcional con método de pago.
- **Modificar orden**: cambio de estado con controles por rol, gestión de
  repuestos contra inventario, mano de obra y observación técnica.
- **Resumen financiero**: `repuestos + mano de obra − seña = total a cobrar`
  (queda `Pendiente…` hasta que la orden es entregada).
- **Pago al entregar**: método de pago registrado en la transacción de entrega.
- **Comprobante PDF**: en el detalle de una orden entregada, botón
  *Descargar PDF* (generado con `jspdf`) con datos del dispositivo, cliente,
  fallas y resumen de costos.

**Estados y transiciones** (definidas en `ModalReparacion.jsx`)

```
1 — En Espera     2 — En Reparación     3 — Terminado
4 — Entregado (terminal)                5 — Anulado (terminal)

const TRANS = { 1: [1,2,5], 2: [2,3,5], 3: [3,4], 4: [4], 5: [5] }
```

El backend valida adicionalmente por rol (`verificarTransicionEstado`).

---

## 3. Módulo de Dashboard / Estadísticas

Panel de métricas del taller, accesible solo para **Admin (rol 1)** y
**Encargado (rol 2)** — ruta `/dashboard` protegida por `AdminRoute` en
`App.jsx`. Todas las métricas se calculan sobre **órdenes entregadas**.

**Componentes principales**

| Archivo | Responsabilidad |
|---------|-----------------|
| `pages/DashboardPage.jsx` | Layout del dashboard (KPIs + finanzas + rankings) |
| `components/dashboard/KpiCard.jsx` | Tarjeta KPI individual |
| `components/dashboard/RankingChartCard.jsx` | Gráfico de ranking Top 5 (`@mui/x-charts`) |
| `components/dashboard/FinanzasPanel.jsx` | Panel de ingresos / costos / ganancia |
| `hooks/useEstadisticas.js` | Carga en paralelo de todas las métricas |

**Métricas mostradas**

- **KPIs principales**: marca más reparada, dispositivo más reparado, repuesto
  más usado y falla más frecuente.
- **Rankings Top 5**: mismos cuatro ejes en gráfico de barras.
- **Panel de finanzas**: total de ingresos, total de costos y ganancia.
- **Recarga manual** con indicador de carga.

**Endpoints de estadísticas consumidos** (`src/services/api.js`)

```
GET /api/estadisticas/marca-mas-reparada
GET /api/estadisticas/dispositivo-mas-reparado
GET /api/estadisticas/repuesto-mas-usado
GET /api/estadisticas/falla-mas-repetida
GET /api/estadisticas/finanzas
```

---

## 4. Sesión y permisos por rol

La sesión se maneja con la cookie `jwt_punto_cell` (httpOnly, firmada) que emite
el backend; todos los requests van con `credentials: 'include'`. El objeto
`usuario` vive en `context/AuthContext.jsx` y los permisos se resuelven en
`hooks/usePermisos.js`.

| Rol | IdRol | Registrar | Modificar | Anular | Entregar | Dashboard |
|-----|-------|-----------|-----------|--------|----------|-----------|
| Admin | 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Encargado | 2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Atención | 3 | ✅ | — | — | ✅ (desde Terminado) | — |
| Técnico | 4 | — | ✅ | — | — | — |

---

## 5. Cómo correr el frontend

```bash
npm install
npm run dev        # Vite en http://localhost:5173
```

Requiere el backend `PuntoCell_API` corriendo en `http://localhost:3000`.

---

## 6. Dependencias que agregué

- `@mui/x-charts` — gráficos de los rankings del dashboard.
- `jspdf` — generación del comprobante PDF de las órdenes entregadas.

---

## 7. Notas de la branch

Esta branch es una **foto completa del frontend tal como está en mi entorno**,
e incluye el módulo de dashboard/estadísticas (nuevo, aún no presente en
`Feat/ModuloReparaciones`), la ruta y navegación asociadas, y los endpoints de
estadísticas en la capa de servicios.

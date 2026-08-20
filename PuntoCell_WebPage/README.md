# PuntoCell — Frontend

Aplicación web para la gestión integral de un taller de reparación de celulares. Proyecto de tesis universitaria.

---

## Stack

| Tecnología | Versión |
|------------|---------|
| React | 19.2 |
| Vite | 8.0 |
| MUI (Material-UI) | 7.x |
| Tailwind CSS | 4.x |
| React Router | 7.x |

---

## Requisitos previos

- Node.js 18+
- Backend `PuntoCell_API` corriendo en `http://localhost:3000`

---

## Instalación y desarrollo

```bash
npm install
npm run dev       # Vite en http://localhost:5173
```

---

## Arquitectura

```
src/
├── context/
│   └── AuthContext.jsx          ← Sesión JWT (cookie httpOnly)
├── services/
│   └── api.js                   ← Capa de servicios — todos los fetch al backend
├── hooks/
│   ├── useOrdenes.js            ← Estado global de órdenes + filtros + métricas
│   ├── useCatalogos.js          ← Catálogos: tipos, marcas, modelos, localidades
│   └── usePermisos.js           ← Permisos por rol
├── pages/
│   ├── ReparacionesPage.jsx     ← Página principal (orquestador)
│   ├── LoginPage.jsx
│   ├── ForgotPasswordPage.jsx
│   └── ResetPasswordPage.jsx
└── components/
    ├── layout/
    │   ├── Navbar.jsx
    │   └── AccionesReparacion.jsx
    ├── dashboard/
    │   └── DashboardMetrics.jsx
    ├── filters/
    │   └── FiltrosReparaciones.jsx
    ├── table/
    │   ├── TablaReparaciones.jsx
    │   └── EstadoChip.jsx
    └── modals/
        ├── ModalReparacion.jsx          ← Crear / Editar / Ver detalle de orden
        ├── ModalRegistroCliente.jsx
        ├── ModalRegistroDispositivo.jsx
        ├── ModalBuscarCliente.jsx
        └── ModalBuscarDispositivo.jsx
```

---

## Autenticación

La sesión se maneja mediante una cookie `jwt_punto_cell` (httpOnly, firmada) que el backend emite al hacer login. Todos los requests incluyen `credentials: 'include'` automáticamente.

El objeto `usuario` disponible en `AuthContext` tiene la forma:

```js
{ Id, Nombre, Apellido, UsuarioEmpleado, Email, IdRol, IdSucursal, ... }
```

---

## Roles y permisos

| Rol | IdRol | Registrar | Modificar | Anular | Entregar | Ver detalle |
|-----|-------|-----------|-----------|--------|----------|-------------|
| Admin | 1 | ✅ | ✅ | ✅ | ✅ | — |
| Encargado | 2 | ✅ | ✅ | ✅ | ✅ | — |
| Atención | 3 | ✅ | — | — | ✅ (desde Terminado) | ✅ |
| Técnico | 4 | — | ✅ | — | — | — |

Los permisos se leen en `src/hooks/usePermisos.js`.

---

## Estados de una orden

```
1 — En Espera
2 — En Reparación
3 — Terminado
4 — Entregado   (terminal)
5 — Anulado     (terminal)
```

Las transiciones válidas están definidas en `ModalReparacion.jsx`:

```js
const TRANS = { 1: [1,2,5], 2: [2,3,5], 3: [3,4], 4: [4], 5: [5] }
```

El backend valida adicionalmente por rol en `verificarTransicionEstado`.

---

## Módulo de reparaciones — funcionalidades principales

- **Nueva orden**: cliente (búsqueda por DNI o registro), dispositivo, fallas, seña opcional con método de pago.
- **Modificar orden**: cambio de estado con controles por rol, gestión de repuestos (inventario), mano de obra, observación técnica.
- **Resumen financiero**: repuestos + mano de obra − seña = total a cobrar. Muestra `Pendiente...` hasta que la orden es entregada.
- **Pago al entregar**: método de pago registrado en la transacción; visible en el detalle de órdenes entregadas.
- **Comprobante PDF**: en el detalle de una orden entregada, botón *Descargar PDF* abre el documento en una nueva pestaña (blob preview) con los datos del dispositivo, cliente, fallas y resumen de costos.
- **Dashboard de métricas**: resumen de órdenes por estado. Toggle oculto vía consola: `kpi()`.

---

## Variables de entorno

El frontend no requiere `.env` en desarrollo (la URL del backend está hardcodeada en `api.js` como `http://localhost:3000/api`).

Para producción, parametrizar en `src/services/api.js`:

```js
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
```

Y crear `.env`:

```
VITE_API_URL=https://tu-dominio.com/api
```

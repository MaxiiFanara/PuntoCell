# PuntoCell

## 1. Objetivo

Desarrollar e implementar un **sistema web y una app mobile** que brinde información sobre los procesos operativos, comerciales y administrativos de las distintas sucursales de PuntoCell, un local de venta y reparación de celulares.

## 2. ¿Qué hace?

Funcionalidades principales:

- Registrar una **orden de reparación**.
- Registrar una **venta** (punto de venta, cobros parciales y cuotas).
- Registrar una **compra** a proveedores.
- **Iniciar sesión** con reCAPTCHA.
- Registrar un **usuario empleado** y un **usuario cliente**.
- Ver y descargar **reportes**.
- Visualizar **dashboards** (ventas, compras, inventario, reparaciones).
- **Notificar al cliente** por correo con Nodemailer.
- Listar el **inventario** y administrar listas de precios.
- Gestionar la **caja** (apertura, arqueo y cierre).
- Consultar el **catálogo online** con pagos por MercadoPago.
- Usar los **asistentes de IA** (técnico y de usuario).

## 3. ¿Cómo probarlo?

Requisitos: **Docker** con **Docker Compose** y el archivo **`.env`** del equipo.

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd PuntoCell

# 2. Copiar el .env en la raíz del proyecto (mismo nivel que docker-compose.yml)
#    Como referencia de las variables, ver .env.example

# 3. Levantar el sistema
docker compose up
```

Al iniciar, la base de datos se crea y se carga con datos de prueba automáticamente.

| Servicio | URL |
|---|---|
| Web | http://localhost:5176 |
| API | http://localhost:3003 |
| SQL Server | `localhost:1436` |

## 4. Stack

| Capa | Tecnologías |
|---|---|
| **Base de datos** | SQL Server 2022 |
| **API** | Node.js, Express 5, Sequelize, Joi, JWT, Nodemailer, Winston, Swagger |
| **Web** | React 19, Vite, Tailwind CSS, MUI (Material UI y X Charts), React Router, jsPDF, Sonner |
| **Infraestructura** | Docker Compose |

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




DATOS .env: 

# =====================================================================
#  Ejecución LOCAL: la DB corre en Docker (servicio `db`), la API y el
#  front corren con `npm run dev` en tu máquina.
#
#    1) docker compose up -d db db-init      # solo la base
#    2) cd PuntoCell_API   && npm install && npm run dev    -> :3000
#    3) cd PuntoCell_WebPage && npm install && npm run dev  -> :5173
# =====================================================================
 
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5176
 
# --- BASE DE DATOS ---
# La API (corriendo local) se conecta al MSSQL del contenedor por el puerto
# publicado en localhost:1433, con el login 'sa'. init.sql NO crea otros logins.
DB_DIALECT=mssql
DB_HOST=localhost
DB_PORT=1433
DB_NAME=PuntoCellDesarrollo
DB_USER=sa
DB_PASSWORD=SuperPassword123!
DB_INSTANCE=
 
# Password del 'sa' que docker-compose inyecta al contenedor MSSQL
# (MSSQL_SA_PASSWORD en `db`/`db-init`). Debe coincidir con DB_PASSWORD de arriba
# y cumplir la política de SQL Server (>=8, 3 de 4: mayús/minús/dígito/símbolo).
DB_SA_PASSWORD=SuperPassword123!
 
# --- SEGURIDAD Y JWT ---
JWT_SECRET=una_clave_secreta_larga_minimo_8_chars
JWT_EXPIRES_IN=8h
ENCRYPTION_KEY=una_clave_de_16_caracteres_minimo
 
# --- SERVIDOR DE CORREOS (SMTP) ---
EMAIL_PORT=587
EMAIL_USER=estudiosfanara@gmail.com
SMTP_PASS=ksge khvq yzgv gojb
 
MP_ACCESS_TOKEN=APP_USR-4397245369288848-091620-201c968d13ef005ca44ed20b27f1a6d4-3696662934
MP_BACK_URL_BASE=http://localhost:5176
MP_WEBHOOK_URL=
MP_ID_EMPLEADO=6
MP_ID_TURNO_CAJA=2
MP_ID_METODO_PAGO=2

OPENROUTER_API_KEY=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
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
OPENROUTER_MODELS=meta-llama/llama-3.1-8b-instruct,meta-llama/llama-3.2-3b-instruct:free,google/gemma-2-9b-it:free,mistralai/mistral-7b-instruct:free,qwen/qwen-2.5-7b-instruct:free,deepseek/deepseek-chat-v3-0324:free,nousresearch/hermes-3-llama-3.1-8b:free
OPENROUTER_SITE_URL=http://localhost:5176
OPENROUTER_APP_NAME=PuntoCell

# --- reCAPTCHA (login) ---
RECAPTCHA_SITE_KEY=6LdaTNgtAAAAABxLuvOKtpBmjEmhWcQkQARx0ub4
VITE_RECAPTCHA_SITE_KEY=6LdaTNgtAAAAABxLuvOKtpBmjEmhWcQkQARx0ub4
RECAPTCHA_API_KEY=AIzaSyAvzWCSPBUtW5prMnkEhWkVQU-73CI1xEA
RECAPTCHA_PROJECT_ID=puntocelll
RECAPTCHA_MIN_SCORE=0.5
RECAPTCHA_ENABLED=true
# --- Comparador de dispositivos (mobileapi.dev) ---
MOBILEAPI_KEY=e8dcb50f3ecfb0426e24dd92e94d43b154bd3d03


VITE_CATALOGO_IMAGES_URL=https://puntocell-catalogo-imagenes-2.s3.us-east-2.amazonaws.com/

import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const candidateEnvPaths = [
  resolve(__dirname, '../../../../..', '.env'),
  resolve(__dirname, '../../../..', '.env')
];

const envPath = candidateEnvPaths.find((candidate) => fs.existsSync(candidate));

if (envPath) {
  dotenv.config({ path: envPath });
}

const defaultCorsOrigin = 'http://localhost:5173,http://localhost:5174,http://localhost:5175';
const corsOriginValue = process.env.CORS_ORIGIN || defaultCorsOrigin;
const corsOrigins = corsOriginValue
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  APP: {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    // URL base del front para los links de los mails (reset de contraseña). Si no se
    // define PUBLIC_FRONT_URL se usa el primer origen CORS (nunca la lista completa).
    FRONTEND_URL: (process.env.PUBLIC_FRONT_URL || corsOrigins[0] || '').replace(/\/+$/, '')
  },
  DB: {
    DIALECT: process.env.DB_DIALECT || 'mssql',
    HOST: process.env.DB_HOST || '192.168.0.161', // Tu IP estática por defecto
    PORT: parseInt(process.env.DB_PORT, 10) || 1433,
    NAME: process.env.DB_NAME,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    INSTANCE: process.env.DB_INSTANCE || undefined
  },
  JWT: {
    SECRET: process.env.JWT_SECRET,
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d'
  },
  RECAPTCHA: {
    // El captcha solo se exige si RECAPTCHA_ENABLED=true (apagado por defecto).
    ENABLED: process.env.RECAPTCHA_ENABLED === 'true',
    API_KEY: process.env.RECAPTCHA_API_KEY,
    PROJECT_ID: process.env.RECAPTCHA_PROJECT_ID,
    SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
    MIN_SCORE: Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5
  },
  SECURITY: {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
  },
  SMTP: {
    USER: process.env.EMAIL_USER,
    PASS: process.env.SMTP_PASS,
    PORT: parseInt(process.env.EMAIL_PORT || 587, 10),  },
  AI: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || '',
    OPENROUTER_MODELS: (process.env.OPENROUTER_MODELS || '')
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean),
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
    OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME || 'PuntoCell'
  },
  SPECS: {
    // mobileapi.dev: fuente de las especificaciones técnicas del comparador.
    // El plan gratuito da 50 créditos/mes y 5 pedidos/min (ver especificaciones.service.js).
    MOBILEAPI_KEY: process.env.MOBILEAPI_KEY || '',
    MOBILEAPI_MONTHLY_LIMIT: Number(process.env.MOBILEAPI_MONTHLY_LIMIT) || 45
  },
  MP: {
    ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
    // Base del frontend para las back_urls a las que MP devuelve al comprador.
    BACK_URL_BASE: process.env.MP_BACK_URL_BASE || 'http://localhost:5173,http://localhost:5174,http://localhost:5175',
    // URL pública del webhook. En desarrollo queda vacía: MP no puede alcanzar
    // localhost, y el flujo se confirma igual por la back_url.
    WEBHOOK_URL: process.env.MP_WEBHOOK_URL || '',
    // Identidad de las ventas online (ver scripts/seed-tienda-online.sql).
    ID_EMPLEADO: Number(process.env.MP_ID_EMPLEADO) || null,
    ID_TURNO_CAJA: Number(process.env.MP_ID_TURNO_CAJA) || null,
    ID_METODO_PAGO: Number(process.env.MP_ID_METODO_PAGO) || null,
  },
  LOG: {
    // Nivel mínimo que se muestra por consola (error | warn | info).
    LEVEL: process.env.LOG_LEVEL || 'info',
    // Nivel mínimo que se guarda en la tabla Bitacora (Origen = 'SISTEMA'). Con 'warn' solo
    // se persisten warn y error, para que los info no hagan crecer la tabla.
    DB_LEVEL: process.env.LOG_DB_LEVEL || 'warn',
    DB_ENABLED: process.env.LOG_DB_ENABLED !== 'false'
  }
};
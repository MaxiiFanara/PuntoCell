import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargamos el .env desde la raíz del proyecto (eliminé el dotenv.config() duplicado)
dotenv.config({ path: resolve(__dirname, '../../../..', '.env') });

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
    CORS_ORIGIN: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins
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
  SECURITY: {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
  },
  SMTP: {
    USER: process.env.EMAIL_USER,
    PASS: process.env.SMTP_PASS,
    PORT: parseInt(process.env.EMAIL_PORT || 587, 10),  },
  AI: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
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
  }
};
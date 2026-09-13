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
    PORT: parseInt(process.env.EMAIL_PORT || 587, 10),  }
};
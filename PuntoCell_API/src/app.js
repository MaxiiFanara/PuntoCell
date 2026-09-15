import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createErrorMiddleware } from './core/middlewares/error.middleware.js';
import { env } from './core/config/env.js';
import globalRouter from './routes/index.js';


const createApp = (container) => {
  const app = express();
  const allowedOrigins = Array.isArray(env.APP.CORS_ORIGIN)
    ? env.APP.CORS_ORIGIN
    : [env.APP.CORS_ORIGIN];

  // 1. Middlewares globales
// 1. Configuración estricta de CORS (Obligatorio para usar Cookies)
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true, // Permite que el navegador envíe y reciba la cookie
  }));
  app.use(express.json());
  app.use(express.urlencoded({extended:true }));

  app.use(cookieParser(env.JWT.SECRET));
  app.use('/api', globalRouter(container));

  app.use(createErrorMiddleware(container?.auditoria?.bitacoraService));
  return app;
};

export default createApp;
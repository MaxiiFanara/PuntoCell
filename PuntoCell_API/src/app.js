import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorMiddleware } from './core/middlewares/error.middleware.js';
import { env } from './core/config/env.js';
import globalRouter from './routes/index.js';


const createApp = (container) => {
  const app = express();

  // 1. Middlewares globales
// 1. Configuración estricta de CORS (Obligatorio para usar Cookies)
  app.use(cors({
    origin: env.APP.CORS_ORIGIN, // Debe ser la URL exacta de tu front (ej: http://localhost:5173)
    credentials: true, // Permite que el navegador envíe y reciba la cookie
  }));
  app.use(express.json());
  app.use(express.urlencoded({extended:true }));

  app.use(cookieParser(env.JWT.SECRET));
  app.use('/api', globalRouter(container));
  
  
  app.use(errorMiddleware);
  return app;
};

export default createApp;
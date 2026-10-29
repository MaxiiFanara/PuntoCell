import Database from './core/db/database.js';
import { createContainer } from './core/container/index.js';
import createApp from './app.js';
import { env } from './core/config/env.js';
import logger from './core/utils/logger.js';

function scheduleDailyAt2359(task) {
  let timeoutId = null;

  const scheduleNext = () => {
    const ahora = new Date();
    const siguiente = new Date(ahora);
    siguiente.setHours(23, 59, 0, 0);

    if (siguiente <= ahora) {
      siguiente.setDate(siguiente.getDate() + 1);
    }

    const delay = Math.max(1000, siguiente.getTime() - Date.now());
    timeoutId = setTimeout(run, delay);
    if (typeof timeoutId.unref === 'function') {
      timeoutId.unref();
    }
  };

  const run = async () => {
    try {
      await task();
    } catch (error) {
      logger.error('❌ Error en la tarea diaria de abandono de reparaciones:', error);
    } finally {
      scheduleNext();
    }
  };

  run();

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

async function startServer() {
  try {
    logger.info('⏳ Iniciando servidor PuntoCell...');

    const db = Database.getInstance();
    await db.connect();


    const container = createContainer();

    const app = createApp(container);

    // 4. Encendido del servidor
    const PORT = env.APP.PORT;
    app.listen(PORT, () => {
      const publicUrl = process.env.PUBLIC_API_URL;
      logger.info(`✅ Servidor corriendo en el puerto: ${PORT}${publicUrl ? ` (acceso externo: ${publicUrl})` : ''}`);
      logger.info(`🚀 Entorno: ${env.APP.NODE_ENV}`);
    });

    scheduleDailyAt2359(async () => {
      const resultado = await container.reparaciones.ordenReparacionService.procesarOrdenesAbandonadas();
      logger.info(`🕒 Proceso de abandono completado: ${resultado.procesadas} procesadas, ${resultado.omitidas} omitidas, ${resultado.errores} con error.`);
    });

  } catch (error) {
    logger.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}


startServer();
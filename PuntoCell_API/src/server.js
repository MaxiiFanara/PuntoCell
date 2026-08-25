import Database from './core/db/database.js';
import { createContainer } from './core/container/index.js';
import createApp from './app.js';
import { env } from './core/config/env.js';

async function startServer() {
  try {
    console.log('⏳ Iniciando servidor PuntoCell...');

    const db = Database.getInstance();
    await db.connect();


    const container = createContainer();

    const app = createApp(container);

    // 4. Encendido del servidor
    const PORT = env.APP.PORT;
    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en el puerto: ${PORT}`);
      console.log(`🚀 Entorno: ${env.APP.NODE_ENV}`);
    });

  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}


startServer();
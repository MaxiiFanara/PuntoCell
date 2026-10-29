import { Sequelize } from 'sequelize';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

class Database {
  static instance;

  constructor() {
    const dialectOptions = {
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    };

    if (env.DB.INSTANCE) {
      dialectOptions.options.instanceName = env.DB.INSTANCE;
    }

    this.sequelize = new Sequelize(env.DB.NAME, env.DB.USER, env.DB.PASSWORD, {
      host: env.DB.HOST,
      port: env.DB.PORT,
      dialect: env.DB.DIALECT || 'mssql',
      logging: false,
      dialectOptions,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }

  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  getConnection() {
    return this.sequelize;
  }

  async connect() {
    try {
      await this.sequelize.authenticate();
      const publicPort = process.env.PUBLIC_DB_PORT;
      const externo = publicPort ? ` (acceso externo: localhost:${publicPort})` : '';
      logger.info(`✅ Conexión a SQL Server establecida correctamente: ${process.env.DB_HOST}:${process.env.DB_PORT}${externo}`);
    } catch (error) {
      logger.error('❌ Error al conectar con la base de datos:', error.message);
      process.exit(1);
    }
  }
}

export default Database;
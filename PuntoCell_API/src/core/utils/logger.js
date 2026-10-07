import winston from 'winston';
import { createLoggerConfig } from '../config/logger.config.js';

// Única instancia de Winston de toda la API. Uso:
//   logger.info('mensaje');
//   logger.warn('mensaje', { IdEmpleado, IdSucursal, Ip });
//   logger.error('mensaje', err);   // el stack y el mensaje SQL van a Bitacora.Detalle
// Bitacora.Origen = 'SISTEMA' para estos registros; la auditoría de usuarios sigue
// pasando por auditar()/registerAudit() con Origen = 'AUDITORIA'.
const logger = winston.createLogger(createLoggerConfig());

export default logger;

import { Op, literal } from 'sequelize';
import { ROL_ANALISTA } from '../constants/roles.js';

// Condición Sequelize para consultas sobre Bitacora: deja afuera los registros generados por el
// usuario analista (inicio/cierre de sesión, etc.), de modo que no aparezcan en la Bitácora ni en
// los dashboards de los demás roles. Los registros se siguen guardando.
export const sinRegistrosDelAnalista = () => ({
  [Op.or]: [
    { IdEmpleado: null },
    { IdEmpleado: { [Op.notIn]: literal(`(SELECT Id FROM Usuario WHERE IdRol = ${ROL_ANALISTA})`) } }
  ]
});

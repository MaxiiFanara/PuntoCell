import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Bitacora', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Detalle: { type: DataTypes.TEXT, allowNull: true },
    IpAddress: { type: DataTypes.STRING(50), allowNull: true },
    Fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    // NULL para acciones previas al login (ej. "Login fallido" con identificador inexistente).
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: true },
    IdSucursal: { type: DataTypes.INTEGER, allowNull: true },
    // Texto que arma el backend describiendo qué pasó. Obligatorio.
    Accion: { type: DataTypes.STRING(150), allowNull: false },
    // Gravedad del registro: info | warn | error.
    Nivel: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'info' },
    // AUDITORIA = acciones de usuarios (lo que lista el front); SISTEMA = logs técnicos de Winston.
    Origen: { type: DataTypes.STRING(15), allowNull: false, defaultValue: 'AUDITORIA' }
  }, {
    tableName: 'Bitacora',
    timestamps: false
  });
};

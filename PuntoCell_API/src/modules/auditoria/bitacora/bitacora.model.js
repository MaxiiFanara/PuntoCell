import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Bitacora', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Detalle: { type: DataTypes.TEXT, allowNull: true },
    IpAddress: { type: DataTypes.STRING(50), allowNull: true },
    Fecha: { type: DataTypes.DATE, allowNull: true },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false },
    IdSucursal: { type: DataTypes.INTEGER, allowNull: false },
    Accion: { type: DataTypes.STRING(100), allowNull: true }
  }, {
    tableName: 'Bitacora',
    timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('ReclamoGarantia', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    FechaReclamo: { type: DataTypes.DATE, allowNull: false },
    MotivoCliente: { type: DataTypes.STRING(500), allowNull: false },
    Resolucion: { type: DataTypes.STRING(500), allowNull: true },
    IdDetalleVenta: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false },
    IdEstadoReclamo: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'ReclamoGarantia', timestamps: false
  });
};

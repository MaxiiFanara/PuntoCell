import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('OrdenReparacion', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    FechaEmision: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    FechaEntrega: { type: DataTypes.DATE, allowNull: true },
    CostoRepuestos: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    PrecioManoObra: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    TotalReparacion: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false },
    IdDispositivoCliente: { type: DataTypes.INTEGER, allowNull: false },
    IdEstadoOrden: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'OrdenReparacion',
    timestamps: false
  });
};
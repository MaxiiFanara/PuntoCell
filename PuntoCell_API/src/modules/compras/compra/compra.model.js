import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Compra', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    TotalCosto: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    EstadoPago: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1 }, // 1=Pendiente, 2=Parcial, 3=Pagado — lo calcula compra.service.js, nunca se recibe del frontend
    SaldoPendiente: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 }, // TotalCosto - TotalPagado
    IdProveedor: { type: DataTypes.INTEGER, allowNull: false },
    IdSucursalDestino: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false } // Asumo NOT NULL por la lógica de negocio
  }, {
    tableName: 'Compra',
    timestamps: false
  });
};
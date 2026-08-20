import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('PagoCompra', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Monto: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    FechaPago: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    IdCompra: { type: DataTypes.INTEGER, allowNull: false },
    IdMetodoPago: { type: DataTypes.INTEGER, allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'PagoCompra',
    timestamps: false
  });
};
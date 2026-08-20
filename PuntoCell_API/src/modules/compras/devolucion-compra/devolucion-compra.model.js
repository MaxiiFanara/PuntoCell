import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('DevolucionCompra', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    MontoRecuperado: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    Motivo: { type: DataTypes.STRING(200), allowNull: false },
    IdCompra: { type: DataTypes.INTEGER, allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'DevolucionCompra',
    timestamps: false
  });
};
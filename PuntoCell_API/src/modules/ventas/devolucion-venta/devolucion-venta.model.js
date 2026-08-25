import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('DevolucionVenta', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false },
    MontoDevuelto: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    Observaciones: { type: DataTypes.STRING, allowNull: true },
    IdVenta: { type: DataTypes.INTEGER, allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'DevolucionVenta', timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('RepuestoOrden', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Cantidad: { type: DataTypes.INTEGER, allowNull: false },
    PrecioCobrado: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    IdOrdenReparacion: { type: DataTypes.INTEGER, allowNull: false },
    IdInventario: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'RepuestoOrden',
    timestamps: false
  });
};
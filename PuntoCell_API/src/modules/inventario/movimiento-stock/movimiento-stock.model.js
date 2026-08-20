import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MovimientoStock', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false },
    TipoMovimiento: { type: DataTypes.STRING(50), allowNull: false },
    Cantidad: { type: DataTypes.INTEGER, allowNull: false },
    Observaciones: { type: DataTypes.TEXT, allowNull: true },
    IdInventario: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'MovimientoStock', timestamps: false
  });
};

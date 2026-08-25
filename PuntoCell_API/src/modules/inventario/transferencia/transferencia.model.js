import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Transferencia', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdSucursalOrigen: { type: DataTypes.INTEGER, allowNull: false },
    IdSucursalDestino: { type: DataTypes.INTEGER, allowNull: false },
    IdMovimientoSalida: { type: DataTypes.INTEGER, allowNull: false },
    IdMovimientoIngreso: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'Transferencia', timestamps: false
  });
};

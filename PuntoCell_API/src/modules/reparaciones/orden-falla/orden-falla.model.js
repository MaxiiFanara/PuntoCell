import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('OrdenFalla', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdOrdenReparacion: { type: DataTypes.INTEGER, allowNull: false },
    IdFalla: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'OrdenFalla',
    timestamps: false
  });
};
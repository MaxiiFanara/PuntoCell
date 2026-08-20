import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('RolPermiso', {
    IdRol: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    IdPermiso: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false }
  }, {
    tableName: 'RolPermiso',
    timestamps: false
  });
};
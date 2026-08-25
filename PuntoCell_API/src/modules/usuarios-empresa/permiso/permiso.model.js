import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Permiso', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(150), allowNull: false }
  }, {
    tableName: 'Permiso',
    timestamps: false
  });
};
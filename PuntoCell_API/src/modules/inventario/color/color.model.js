import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Color', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false }
  }, {
    tableName: 'Color', timestamps: false
  });
};

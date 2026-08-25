import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('EstadoInventario', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(50), allowNull: false }
  }, {
    tableName: 'EstadoInventario', timestamps: false
  });
};

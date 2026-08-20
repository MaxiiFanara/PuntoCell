import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('EstadoReclamo', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(50), allowNull: false }
  }, {
    tableName: 'EstadoReclamo', timestamps: false
  });
};

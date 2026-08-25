import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Memoria', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Capacidad: { type: DataTypes.STRING(50), allowNull: false }
  }, {
    tableName: 'Memoria', timestamps: false
  });
};

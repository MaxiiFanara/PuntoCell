import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Bateria', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Capacidad: { type: DataTypes.STRING(50), allowNull: false },
    Porcentaje: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    CiclosCarga: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'Bateria', timestamps: false
  });
};

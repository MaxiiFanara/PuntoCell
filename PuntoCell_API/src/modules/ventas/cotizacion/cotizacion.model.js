import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Cotizacion', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Clave: { type: DataTypes.STRING(50), allowNull: false },
    Valor: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    CreatedAt: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'Cotizacion', timestamps: false
  });
};

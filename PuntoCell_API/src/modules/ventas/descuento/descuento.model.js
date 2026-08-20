import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Descuento', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    Porcentaje: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    FechaDesde: { type: DataTypes.DATE, allowNull: true },
    FechaHasta: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'Descuento', timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('ListaPrecio', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    PorcentajeRentabilidad: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    IdCategoriaProducto: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'ListaPrecio', schema: 'dbo', timestamps: false });
};

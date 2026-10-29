import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('ListaPrecio', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    PorcentajeRentabilidad: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    FactorCostosVariables: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 26.00 },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // NULL = lista genérica sin categoría (ej. la lista Id=1 default). La DB permite NULL.
    IdCategoriaProducto: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'ListaPrecio', schema: 'dbo', timestamps: false });
};

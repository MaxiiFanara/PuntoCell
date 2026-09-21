import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('PrecioArticulo', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdInventario: { type: DataTypes.INTEGER, allowNull: false },
    IdListaPrecio: { type: DataTypes.INTEGER, allowNull: false },
    ValorFinal: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    CostoBase: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    CostoVariables: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    CostoReal: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    PorcentajeGanancia: { type: DataTypes.DECIMAL(5,2), allowNull: false },
    FechaDesde: { type: DataTypes.DATE, allowNull: false },
    FechaHasta: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'PrecioArticulo', schema: 'dbo', timestamps: false });
};

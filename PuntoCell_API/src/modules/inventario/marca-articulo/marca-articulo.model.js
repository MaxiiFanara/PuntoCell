import { DataTypes } from 'sequelize';

// La tabla física ahora es "MarcaProducto" (antes "MarcaArticulo").
export default (sequelize) => {
  return sequelize.define('MarcaArticulo', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false }
  }, {
    tableName: 'MarcaProducto', timestamps: false
  });
};

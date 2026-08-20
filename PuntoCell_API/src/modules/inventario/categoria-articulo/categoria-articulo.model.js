import { DataTypes } from 'sequelize';

// La tabla física ahora es "CategoriaProducto" (antes "CategoriaArticulo").
export default (sequelize) => {
  return sequelize.define('CategoriaArticulo', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    EsDispositivo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'CategoriaProducto', timestamps: false
  });
};

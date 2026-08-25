// src/modules/inventario/modelo-articulo/modelo-articulo.model.js
import { DataTypes } from 'sequelize';

// La tabla física ahora es "ModeloProducto" (antes "ModeloArticulo").
export default (sequelize) => {
  return sequelize.define('ModeloArticulo', {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'Id'
    },
    Nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'Nombre'
    },
    IdMarcaArticulo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'IdMarcaProducto'
    },
    IdCategoriaArticulo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'IdCategoriaProducto'
    }
  }, {
    tableName: 'ModeloProducto',
    schema: 'dbo',
    timestamps: false,
    freezeTableName: true
  });
};

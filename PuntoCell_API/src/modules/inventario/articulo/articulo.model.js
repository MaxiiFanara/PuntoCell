import { DataTypes } from 'sequelize';

// La tabla física ahora es "Producto" (antes "Articulo"). Se mantiene el nombre
// de modelo/atributos "Articulo"/"IdModeloArticulo" para no romper controllers,
// services, dto y asociaciones existentes; solo se remapea via `field`.
export default (sequelize) => {
  return sequelize.define('Articulo', {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'Id'
    },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    EsSerializado: { type: DataTypes.BOOLEAN, allowNull: false },
    EsVendible: { type: DataTypes.BOOLEAN, allowNull: false },
    EsRepuesto: { type: DataTypes.BOOLEAN, allowNull: false },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false },
    CreatedAt: { type: DataTypes.DATE, allowNull: true },
    IdModeloArticulo: { type: DataTypes.INTEGER, allowNull: false, field: 'IdModeloProducto' }
  }, {
    tableName: 'Producto', schema: 'dbo', timestamps: false
  });
};

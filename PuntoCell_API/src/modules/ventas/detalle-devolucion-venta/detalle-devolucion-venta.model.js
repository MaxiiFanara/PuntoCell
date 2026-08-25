import { DataTypes } from 'sequelize';

// FK apunta ahora a Inventario (antes a Articulo). Se mantiene el nombre de
// atributo "IdArticulo" para no romper dto/service/controller existentes.
export default (sequelize) => {
  return sequelize.define('DetalleDevolucionVenta', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Cantidad: { type: DataTypes.INTEGER, allowNull: false },
    IdDevolucionVenta: { type: DataTypes.INTEGER, allowNull: false },
    IdArticulo: { type: DataTypes.INTEGER, allowNull: false, field: 'IdInventario' },
    IdMovimientoStock: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'DetalleDevolucionVenta', timestamps: false
  });
};

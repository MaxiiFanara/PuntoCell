import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Inventario', {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'Id'
    },
    IMEI: { type: DataTypes.STRING(50), allowNull: true, unique: true },
    Stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    CreatedAt: { type: DataTypes.DATE, allowNull: true },
    MesesGarantiaMarca: { type: DataTypes.DATE, allowNull: true },
    MesesGarantiaLocal: { type: DataTypes.DATE, allowNull: false },
    Observaciones: { type: DataTypes.STRING(500), allowNull: true },
    IdSucursal: { type: DataTypes.INTEGER, allowNull: false },
    IdArticulo: { type: DataTypes.INTEGER, allowNull: false, field: 'IdProducto' },
    IdEstadoInventario: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    IdProveedor: { type: DataTypes.INTEGER, allowNull: false },
    IdColor: { type: DataTypes.INTEGER, allowNull: true },
    IdMemoria: { type: DataTypes.INTEGER, allowNull: true },
    IdBateria: { type: DataTypes.INTEGER, allowNull: true },
    BateriaPorcentaje: { type: DataTypes.INTEGER, allowNull: true },
    IdAlmacenamiento: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'Inventario', schema: 'dbo', timestamps: false
  });
};

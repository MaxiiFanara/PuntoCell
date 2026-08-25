import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('DispositivoCliente', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IMEI: { type: DataTypes.STRING(50), allowNull: true },
    Desbloqueo: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Sin clave' },
    Observaciones: { type: DataTypes.STRING(500), allowNull: false },
    CreatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    IdCliente: { type: DataTypes.INTEGER, allowNull: false },
    IdModeloArticulo: { type: DataTypes.INTEGER, allowNull: false, field: 'IdModeloProducto' },
    IdColor: { type: DataTypes.INTEGER, allowNull: true },
    IdMemoria: { type: DataTypes.INTEGER, allowNull: true },
    IdBateria: { type: DataTypes.INTEGER, allowNull: true },
    IdAlmacenamiento: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'DispositivoCliente',
    timestamps: false
  });
};

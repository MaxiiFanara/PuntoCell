import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Compra', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    TotalCosto: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    IdProveedor: { type: DataTypes.INTEGER, allowNull: false },
    IdSucursalDestino: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false } // Asumo NOT NULL por la lógica de negocio
  }, {
    tableName: 'Compra',
    timestamps: false
  });
};
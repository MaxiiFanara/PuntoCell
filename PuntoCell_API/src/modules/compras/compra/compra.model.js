import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Compra', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    TotalCosto: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    // 1=Pendiente, 2=Parcial, 3=Pagado. Lo calcula el backend a partir de los PagoCompra; nunca llega del frontend.
    EstadoPago: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1 },
    // TotalCosto - TotalPagado, nunca negativo. Lo calcula el backend.
    SaldoPendiente: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    IdProveedor: { type: DataTypes.INTEGER, allowNull: false },
    IdSucursalDestino: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false } // Asumo NOT NULL por la lógica de negocio
  }, {
    tableName: 'Compra',
    timestamps: false
  });
};
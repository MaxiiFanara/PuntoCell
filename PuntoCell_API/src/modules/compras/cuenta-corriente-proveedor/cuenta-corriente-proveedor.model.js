import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('CuentaCorrienteProveedor', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdProveedor: { type: DataTypes.INTEGER, allowNull: false },
    FechaMovimiento: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    // Valores fijos que arma el backend (ver CONCEPTOS en el service), nunca texto libre del frontend.
    Concepto: { type: DataTypes.STRING(100), allowNull: false },
    Debe: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    Haber: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    // Saldo del proveedor tras aplicar este movimiento. Lo calcula el backend, nunca llega del frontend.
    SaldoAcumulado: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    IdCompra: { type: DataTypes.INTEGER, allowNull: true },
    IdPagoCompra: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'CuentaCorrienteProveedor',
    schema: 'dbo',
    timestamps: false
  });
};

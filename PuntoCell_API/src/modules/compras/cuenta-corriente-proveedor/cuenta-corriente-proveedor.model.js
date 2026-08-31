import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('CuentaCorrienteProveedor', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdProveedor: { type: DataTypes.INTEGER, allowNull: false },
    FechaMovimiento: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    Concepto: { type: DataTypes.STRING(100), allowNull: false },
    Debe: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    Haber: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    SaldoAcumulado: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    IdCompra: { type: DataTypes.INTEGER, allowNull: true },
    IdPagoCompra: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'CuentaCorrienteProveedor',
    timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Venta', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: false },
    TotalVenta: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    TotalVentaARS: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    TotalCosto: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    Observaciones: { type: DataTypes.STRING, allowNull: true },
    EstadoPago: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false },
    IdCliente: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false },
    IdCotizacionDolar: { type: DataTypes.INTEGER, allowNull: false },
    IdDescuento: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'Venta', timestamps: false
  });
};

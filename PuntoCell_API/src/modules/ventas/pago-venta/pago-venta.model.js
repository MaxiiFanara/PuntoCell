import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('PagoVenta', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Monto: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    FechaPago: { type: DataTypes.DATE, allowNull: false },
    Observacion: { type: DataTypes.STRING(200), allowNull: true },
    Pagado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    IdVenta: { type: DataTypes.INTEGER, allowNull: false },
    IdMetodoPago: { type: DataTypes.INTEGER, allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'PagoVenta', timestamps: false
  });
};

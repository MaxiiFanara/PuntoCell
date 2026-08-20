import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Cuota', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    NumeroCuota: { type: DataTypes.INTEGER, allowNull: false },
    MontoCuota: { type: DataTypes.DECIMAL(18,2), allowNull: false },
    FechaVencimiento: { type: DataTypes.DATE, allowNull: false },
    FechaPago: { type: DataTypes.DATE, allowNull: true },
    Recargo: { type: DataTypes.DECIMAL(18,2), allowNull: true },
    IdVenta: { type: DataTypes.INTEGER, allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'Cuota', timestamps: false
  });
};

import { DataTypes } from 'sequelize';

// Modelo opcional para mapear una vista/tabla de resúmenes de ventas usada por el dashboard.
// Si no existe la vista en la DB no rompe: el service usa consultas directas a `Venta`.
export default function dashboardModel(sequelize) {
  if (!sequelize) return null;

  return sequelize.define('VistaVentasResumen', {
    Period: { type: DataTypes.STRING, allowNull: true },
    Total: { type: DataTypes.DECIMAL(18,2), allowNull: true }
  }, {
    tableName: 'VistaVentasResumen',
    timestamps: false,
    freezeTableName: true
  });
}

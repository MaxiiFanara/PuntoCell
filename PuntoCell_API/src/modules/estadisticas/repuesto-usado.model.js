import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MetricaRepuestoUsado', {
    IdArticulo: { type: DataTypes.INTEGER, primaryKey: true },
    Repuesto: { type: DataTypes.STRING(150), allowNull: false },
    CantidadUsada: { type: DataTypes.INTEGER, allowNull: false },
    EnOrdenes: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'vw_Metricas_RepuestoUsado',
    timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('FinanzasResumen', {
    TotalIngresos: { type: DataTypes.DECIMAL(18, 2), primaryKey: true },
    TotalCostos: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    Ganancia: { type: DataTypes.DECIMAL(18, 2), allowNull: false }
  }, {
    tableName: 'vw_Finanzas_Resumen',
    timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MetricaFallaRepetida', {
    IdFalla: { type: DataTypes.INTEGER, primaryKey: true },
    Falla: { type: DataTypes.STRING(100), allowNull: false },
    Categoria: { type: DataTypes.STRING(100), allowNull: false },
    CantidadReportada: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'vw_Metricas_FallaRepetida',
    timestamps: false
  });
};

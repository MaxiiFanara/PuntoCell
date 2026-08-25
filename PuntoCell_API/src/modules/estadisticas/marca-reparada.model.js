import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MetricaMarcaReparada', {
    IdMarca: { type: DataTypes.INTEGER, primaryKey: true },
    Marca: { type: DataTypes.STRING(100), allowNull: false },
    CantidadReparaciones: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'vw_Metricas_MarcaReparada',
    timestamps: false
  });
};

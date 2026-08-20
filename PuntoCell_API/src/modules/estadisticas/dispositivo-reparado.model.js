import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MetricaDispositivoReparado', {
    IdModelo: { type: DataTypes.INTEGER, primaryKey: true },
    Categoria: { type: DataTypes.STRING(100), allowNull: false },
    Marca: { type: DataTypes.STRING(100), allowNull: false },
    Modelo: { type: DataTypes.STRING(100), allowNull: false },
    Dispositivo: { type: DataTypes.STRING(201), allowNull: false },
    CantidadReparaciones: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'vw_Metricas_DispositivoReparado',
    timestamps: false
  });
};

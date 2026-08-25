import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('TurnoCaja', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    FechaApertura: { type: DataTypes.DATE, allowNull: true },
    FechaCierre: { type: DataTypes.DATE, allowNull: true },
    MontoInicial: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    TotalIngresos: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    TotalEgresos: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    MontoCierreFisico: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    Observaciones: { type: DataTypes.TEXT, allowNull: false },
    IdSucursal: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleadoApertura: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleadoCierre: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'TurnoCaja',
    timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('SeguimientoOrden', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    FechaModificacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ObservacionTecnico: { type: DataTypes.TEXT, allowNull: true },
    IdOrdenReparacion: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false },
    IdEstadoOrden: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'SeguimientoOrden',
    timestamps: false
  });
};
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MovimientoCaja', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Fecha: { type: DataTypes.DATE, allowNull: true },
    Monto: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    TipoMovimiento: { type: DataTypes.BOOLEAN, allowNull: false },
    Descripcion: { type: DataTypes.STRING(200), allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false },
    IdEmpleado: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'MovimientoCaja',
    timestamps: false
  });
};

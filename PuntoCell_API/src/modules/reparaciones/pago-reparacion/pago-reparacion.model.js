import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('PagoReparacion', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Monto: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    Senia: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    FechaPago: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    Observacion: { type: DataTypes.STRING(200), allowNull: true },
    IdOrdenReparacion: { type: DataTypes.INTEGER, allowNull: false },
    IdMetodoPago: { type: DataTypes.INTEGER, allowNull: false },
    IdTurnoCaja: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'PagoReparacion',
    timestamps: false
  });
};

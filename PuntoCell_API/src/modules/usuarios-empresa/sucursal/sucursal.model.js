import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Sucursal', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    Calle: { type: DataTypes.STRING(100), allowNull: false },
    Numero: { type: DataTypes.STRING(6), allowNull: false },
    Telefono: { type: DataTypes.STRING(20), allowNull: true },
    Activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    CreatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    IdLocalidad: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'Sucursal',
    timestamps: false
  });
};
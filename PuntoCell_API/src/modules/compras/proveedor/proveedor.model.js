import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Proveedor', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    Email: { type: DataTypes.STRING(100), allowNull: true },
    Celular: { type: DataTypes.STRING(20), allowNull: true },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    IdLocalidad: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'Proveedor',
    timestamps: false
  });
};
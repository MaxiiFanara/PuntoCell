import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Rol', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING, allowNull: false },
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, {
    tableName: 'Rol',
    timestamps: false
  });
};

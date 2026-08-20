import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Accion', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    CreatedAt: { type: DataTypes.DATE, allowNull: true },
    IdPermiso: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'Accion',
    timestamps: false
  });
};

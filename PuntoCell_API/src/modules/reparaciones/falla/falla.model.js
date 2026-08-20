import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Falla', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    Activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    IdCategoriaArticulo: { type: DataTypes.INTEGER, allowNull: false, field: 'IdCategoriaProducto' }
  }, {
    tableName: 'Falla',
    timestamps: false
  });
};

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('ImagenProducto', {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'Id'
    },
    URLRelativa: { type: DataTypes.STRING(500), allowNull: true },
    EsPortada: { type: DataTypes.BOOLEAN, allowNull: true },
    OrdenVisual: { type: DataTypes.INTEGER, allowNull: true },
    IdProducto: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'ImagenProducto', 
    schema: 'dbo', 
    timestamps: false
  });
};

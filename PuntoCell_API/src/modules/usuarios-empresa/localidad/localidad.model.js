import { DataTypes } from 'sequelize';

export default (sequelize) => {
    return sequelize.define('Localidad', {
        Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        Nombre: { type: DataTypes.STRING, allowNull: false }
    },
    {
        tableName: 'Localidad', timestamps: false
    });
};
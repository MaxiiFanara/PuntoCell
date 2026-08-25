import { DataTypes } from 'sequelize';

export default (sequelize) => {
	return sequelize.define('MetodoPago', {
		Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		Nombre: { type: DataTypes.STRING(100), allowNull: false },
		Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
	}, {
		tableName: 'MetodoPago', timestamps: false
	});
};



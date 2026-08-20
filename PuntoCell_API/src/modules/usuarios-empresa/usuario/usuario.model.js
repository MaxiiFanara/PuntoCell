import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Usuario', {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    DNI: { type: DataTypes.STRING(20), allowNull: false }, // Corregido: Obligatorio
    Apellido: { type: DataTypes.STRING(100), allowNull: false },
    Nombre: { type: DataTypes.STRING(100), allowNull: false },
    Email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    Celular: { type: DataTypes.STRING(20), allowNull: false }, // Corregido: Obligatorio
    Calle: { type: DataTypes.STRING(100), allowNull: true },
    Numero: { type: DataTypes.STRING(6), allowNull: true }, // Corregido a 6
    Piso: { type: DataTypes.STRING(6), allowNull: true },   // Corregido a 6
    Depto: { type: DataTypes.STRING(6), allowNull: true },  // Corregido a 6
    EsCliente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    Pwd: { type: DataTypes.STRING(255), allowNull: true }, // Corregido: Nullable para clientes
    Activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // CreadoCreatedAt no lo ponemos porque lo maneja SQL Server con DEFAULT SYSDATETIME()
    IdLocalidad: { type: DataTypes.INTEGER, allowNull: true },
    IdRol: { type: DataTypes.INTEGER, allowNull: true }, // Corregido: Nullable para clientes
    IdSucursal: { type: DataTypes.INTEGER, allowNull: true },
    UsuarioEmpleado: { type: DataTypes.STRING(50), allowNull: true } // La columna que vas a agregar
  }, {
    tableName: 'Usuario',
    timestamps: false
  });
};
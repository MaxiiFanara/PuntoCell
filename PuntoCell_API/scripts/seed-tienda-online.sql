-- Identidad de las ventas online. Son filas de datos, no cambios de esquema.
-- Venta exige IdEmpleado e IdTurnoCaja NOT NULL con FK, y una compra del
-- catálogo no tiene ni empleado que la facture ni turno de caja abierto.

-- Empleado ficticio al que se imputan las ventas del catálogo.
-- Usuario tiene tres CHECK para los empleados (EsCliente = 0): exigen IdRol,
-- IdSucursal y Pwd no nulos.
--   IdRol 3 = vendedor, el de menor privilegio que corresponde a una venta.
--   Pwd lleva un texto que NO es un hash de bcrypt válido: satisface el NOT NULL
--   y a la vez garantiza que ninguna contraseña pueda autenticar esta cuenta.
--   Es una cuenta de sistema, no una persona: nunca inicia sesión.
IF NOT EXISTS (SELECT 1 FROM Usuario WHERE Email = 'tienda.online@puntocell.local')
INSERT INTO Usuario (DNI, Apellido, Nombre, Email, Celular, EsCliente, Activo, IdRol, IdSucursal, Pwd)
VALUES ('00000000', 'Online', 'Tienda', 'tienda.online@puntocell.local', '-', 0, 1, 3, 1, 'CUENTA-DE-SISTEMA-SIN-LOGIN');

-- Caja virtual permanentemente abierta (FechaCierre NULL) para no mezclar las
-- ventas online con el arqueo del turno real del local.
IF NOT EXISTS (SELECT 1 FROM TurnoCaja WHERE Observaciones = 'Caja Online')
INSERT INTO TurnoCaja (FechaApertura, FechaCierre, MontoInicial, TotalIngresos, TotalEgresos, MontoCierreFisico, Observaciones, IdSucursal, IdEmpleadoApertura, IdEmpleadoCierre)
SELECT SYSDATETIME(), NULL, 0, 0, 0, 0, 'Caja Online', 1, u.Id, u.Id
FROM Usuario u WHERE u.Email = 'tienda.online@puntocell.local';

-- Los Id resultantes van al .env
SELECT 'MP_ID_EMPLEADO' AS Variable, CAST(Id AS VARCHAR) AS Valor FROM Usuario WHERE Email = 'tienda.online@puntocell.local'
UNION ALL
SELECT 'MP_ID_TURNO_CAJA', CAST(Id AS VARCHAR) FROM TurnoCaja WHERE Observaciones = 'Caja Online'
UNION ALL
SELECT 'MP_ID_METODO_PAGO', CAST(Id AS VARCHAR) FROM MetodoPago WHERE Nombre = 'billetera virtual (qr/alias)';

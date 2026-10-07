-- ==============================================================================
-- PUNTO CELL - MOTOR DE GENERACION DE DATOS (TIME-SERIES)
-- ==============================================================================

USE PuntoCellDesarrollo;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- A. PROCEDIMIENTOS DE APOYO (ALCANCE DE LA SESIÓN)
CREATE OR ALTER PROCEDURE dbo.usp_SeedEngine_IngresoStock
    @IdProducto INT, @IdSucursal INT, @IdProveedor INT, @IdEstadoInventario INT,
    @Cantidad INT, @Fecha DATETIME2, @IdEmpleado INT, 
    @IdColor INT = NULL, @IdMemoria INT = NULL, @IdBateria INT = NULL, @IdAlmacenamiento INT = NULL,
    @IdInventario INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @IdInventario = NULL;
    DECLARE @EsSerializado BIT;
    SELECT @EsSerializado = EsSerializado FROM Producto WHERE Id = @IdProducto;

    IF @EsSerializado = 1
    BEGIN
        DECLARE @Imei VARCHAR(50) = '35' + RIGHT('000000000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000000000 AS VARCHAR(20)), 12) + CAST(ABS(CHECKSUM(NEWID())) % 10 AS VARCHAR(1));
        INSERT INTO Inventario (IMEI, Stock, MesesGarantiaLocal, CreatedAt, IdSucursal, IdProducto, IdEstadoInventario, IdProveedor, IdColor, IdMemoria, IdBateria, IdAlmacenamiento)
        VALUES (@Imei, 1, DATEADD(MONTH, 12, @Fecha), @Fecha, @IdSucursal, @IdProducto, @IdEstadoInventario, @IdProveedor, @IdColor, @IdMemoria, @IdBateria, @IdAlmacenamiento);
        SET @IdInventario = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        SELECT @IdInventario = Id FROM Inventario 
        WHERE IdProducto = @IdProducto AND IdSucursal = @IdSucursal AND IdEstadoInventario = @IdEstadoInventario AND IMEI IS NULL
        ;
          

        IF @IdInventario IS NULL
        BEGIN
            INSERT INTO Inventario (IMEI, Stock, MesesGarantiaLocal, CreatedAt, IdSucursal, IdProducto, IdEstadoInventario, IdProveedor, IdColor, IdMemoria, IdBateria, IdAlmacenamiento)
            VALUES (NULL, @Cantidad, DATEADD(MONTH, 12, @Fecha), @Fecha, @IdSucursal, @IdProducto, @IdEstadoInventario, @IdProveedor, @IdColor, @IdMemoria, @IdBateria, @IdAlmacenamiento);
            SET @IdInventario = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE Inventario SET Stock = Stock + @Cantidad, CreatedAt = CASE WHEN @Fecha < CreatedAt THEN @Fecha ELSE CreatedAt END WHERE Id = @IdInventario;
        END
    END
    INSERT INTO MovimientoStock (Fecha, TipoMovimiento, Cantidad, Observaciones, IdInventario, IdEmpleado)
    VALUES (@Fecha, 'Ingreso por Compra', @Cantidad, 'Ingreso de stock', @IdInventario, @IdEmpleado);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_SeedEngine_ConsumoStock
    @IdInventario INT, @Cantidad INT, @Fecha DATETIME2, @IdEmpleado INT, @Motivo NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF (SELECT Stock FROM Inventario WHERE Id = @IdInventario) < @Cantidad BEGIN ;THROW 50001, 'Stock insuficiente.', 1; END
    UPDATE Inventario SET Stock = Stock - @Cantidad WHERE Id = @IdInventario;
    INSERT INTO MovimientoStock (Fecha, TipoMovimiento, Cantidad, Observaciones, IdInventario, IdEmpleado) VALUES (@Fecha, @Motivo, -@Cantidad, @Motivo, @IdInventario, @IdEmpleado);
END
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION SeedEngine;

    PRINT 'Purgando datos transaccionales previos para un estado inmaculado...';
    DELETE FROM Cuota; DBCC CHECKIDENT ('Cuota', RESEED, 0);
    DELETE FROM PagoVenta; DBCC CHECKIDENT ('PagoVenta', RESEED, 0);
    DELETE FROM DetalleDevolucionVenta; DBCC CHECKIDENT ('DetalleDevolucionVenta', RESEED, 0);
    DELETE FROM DevolucionVenta; DBCC CHECKIDENT ('DevolucionVenta', RESEED, 0);
    DELETE FROM DetalleVenta; DBCC CHECKIDENT ('DetalleVenta', RESEED, 0);
    DELETE FROM Venta; DBCC CHECKIDENT ('Venta', RESEED, 0);

    DELETE FROM SeguimientoOrden; DBCC CHECKIDENT ('SeguimientoOrden', RESEED, 0);
    DELETE FROM RepuestoOrden; DBCC CHECKIDENT ('RepuestoOrden', RESEED, 0);
    DELETE FROM OrdenFalla; DBCC CHECKIDENT ('OrdenFalla', RESEED, 0);
    DELETE FROM PagoReparacion; DBCC CHECKIDENT ('PagoReparacion', RESEED, 0);
    DELETE FROM OrdenReparacion; DBCC CHECKIDENT ('OrdenReparacion', RESEED, 0);
    DELETE FROM DispositivoCliente; DBCC CHECKIDENT ('DispositivoCliente', RESEED, 0);

    DELETE FROM CuentaCorrienteProveedor; DBCC CHECKIDENT ('CuentaCorrienteProveedor', RESEED, 0);
    DELETE FROM PagoCompra; DBCC CHECKIDENT ('PagoCompra', RESEED, 0);
    DELETE FROM DetalleDevolucionCompra; DBCC CHECKIDENT ('DetalleDevolucionCompra', RESEED, 0);
    DELETE FROM DevolucionCompra; DBCC CHECKIDENT ('DevolucionCompra', RESEED, 0);
    DELETE FROM DetalleCompra; DBCC CHECKIDENT ('DetalleCompra', RESEED, 0);
    DELETE FROM Compra; DBCC CHECKIDENT ('Compra', RESEED, 0);

    DELETE FROM MovimientoCaja; DBCC CHECKIDENT ('MovimientoCaja', RESEED, 0);
    DELETE FROM TurnoCaja; DBCC CHECKIDENT ('TurnoCaja', RESEED, 0);

    DELETE FROM PrecioArticulo; DBCC CHECKIDENT ('PrecioArticulo', RESEED, 0);
    DELETE FROM Transferencia; DBCC CHECKIDENT ('Transferencia', RESEED, 0);
    DELETE FROM MovimientoStock; DBCC CHECKIDENT ('MovimientoStock', RESEED, 0);
    DELETE FROM Inventario; DBCC CHECKIDENT ('Inventario', RESEED, 0);
    
    DELETE FROM Cotizacion; DBCC CHECKIDENT ('Cotizacion', RESEED, 0);

    PRINT 'Iniciando Motor de Generación de Datos (Versión 2 - Extendido)...';

    -- 1. CONFIGURACIÓN CENTRALIZADA
    DECLARE @Seed INT = 1337;
    DECLARE @Dummy FLOAT = RAND(@Seed); -- Fuerza semilla determinística

    DECLARE @FechaInicio DATETIME2 = '2022-01-01 09:00:00';
    DECLARE @FechaFin DATETIME2 = '2026-10-06 18:00:00';
    DECLARE @FechaActual DATETIME2 = @FechaInicio;

    DECLARE @MaxSucursales INT = (SELECT COUNT(*) FROM Sucursal);
    DECLARE @TotalVentasGeneradas INT = 0;
    DECLARE @TotalReparacionesGeneradas INT = 0;
    
    -- Variables (HOISTED)
    DECLARE @s INT, @IdEmpleadoCaja INT, @IdCotizDia INT, @ValorCotizDia DECIMAL(18,2);
    DECLARE @CantCompras INT, @c INT, @SucDestino INT, @IdProv INT, @IdEmpCompra INT, @IdCompra INT, @CostoTotalCompra DECIMAL(18,2), @ItemsAComprar INT, @i INT;
    DECLARE @IdProd INT, @EsSerial BIT, @Cant INT, @PrecioCostoUnit DECIMAL(18,2), @IdInvNuevo INT, @IdLista INT, @PctGanancia DECIMAL(5,2), @CostoReal DECIMAL(18,2), @ValorFinal DECIMAL(18,2);
    DECLARE @CantVentas INT, @v INT, @SucVenta INT, @TurnoVenta INT, @EmpVenta INT, @CliVenta INT, @InvVender INT, @EsSerialVenta BIT, @CantVender INT, @PrecioUSD DECIMAL(18,2), @CostoUSD DECIMAL(18,2), @IdVenta INT;
    DECLARE @OrdenId INT, @OrdenEstado INT, @OrdenProb INT, @EmpTaller INT, @MontoCobrar DECIMAL(18,2), @TurnoRep INT, @SucTaller INT, @TurnoTaller INT, @Tecnico INT, @CliTaller INT, @ModTaller INT, @IdDisp INT, @IdOrdNueva INT;
    DECLARE @IdColor INT, @IdMemoria INT, @IdBateria INT, @IdAlmacenamiento INT;
    DECLARE @MetodoPagoRandom INT;
    DECLARE @EsFinanciado BIT, @CantCuotas INT, @MontoCuota DECIMAL(18,2), @c_cuota INT, @VencCuota DATETIME2;
    DECLARE @IdCuotaCobrar INT, @TurnoCobro INT;

    -- Variables de estado temporal
    IF OBJECT_ID('tempdb..#CajasActivas') IS NOT NULL DROP TABLE #CajasActivas;
    CREATE TABLE #CajasActivas (IdSucursal INT, IdTurnoCaja INT, Fecha DATE);

    IF OBJECT_ID('tempdb..#EquiposTaller') IS NOT NULL DROP TABLE #EquiposTaller;
    CREATE TABLE #EquiposTaller (IdOrden INT, IdSucursal INT, FechaEstimada DATETIME2, IdEstado INT, ProbabilidadExito INT);

    -- 2. GENERADOR HISTÓRICO DE DÓLAR
    PRINT 'Generando curva de cotizaciones históricas...';
    DECLARE @ValorDolar DECIMAL(18,2) = 200.00;
    DECLARE @FechaDolar DATETIME2 = @FechaInicio;
    WHILE @FechaDolar <= @FechaFin
    BEGIN
        INSERT INTO Cotizacion (Clave, Valor, CreatedAt) VALUES ('DolarBlue', @ValorDolar, @FechaDolar);
        SET @ValorDolar = @ValorDolar * (1.0 + (0.001 * (ABS(CHECKSUM(NEWID())) % 5)));
        SET @FechaDolar = DATEADD(DAY, 1, @FechaDolar);
    END

    -- 3. BUCLE PRINCIPAL (TIME-SERIES)
    PRINT 'Ejecutando bucle cronológico diario...';
    WHILE CAST(@FechaActual AS DATE) <= CAST(@FechaFin AS DATE)
    BEGIN
        DECLARE @DiasParaFin INT = DATEDIFF(DAY, @FechaActual, @FechaFin);

        -- A. Salto de Domingos
        IF DATEPART(dw, @FechaActual) = 1 
        BEGIN
            SET @FechaActual = DATEADD(DAY, 1, @FechaActual);
            CONTINUE;
        END

        -- B. APERTURA DE CAJAS POR SUCURSAL
        SET @s = 1;
        WHILE @s <= @MaxSucursales
        BEGIN
            SET @IdEmpleadoCaja = (SELECT TOP 1 Id FROM Usuario WHERE IdSucursal = @s AND IdRol IN (1,2,3));
            IF @IdEmpleadoCaja IS NULL SET @IdEmpleadoCaja = (SELECT TOP 1 Id FROM Usuario WHERE IdRol = 1);
            
            INSERT INTO TurnoCaja (FechaApertura, MontoInicial, TotalIngresos, TotalEgresos, MontoCierreFisico, Observaciones, IdSucursal, IdEmpleadoApertura, IdEmpleadoCierre)
            VALUES (@FechaActual, 50000.00, 0, 0, 50000.00, 'Apertura automatica Seed', @s, @IdEmpleadoCaja, @IdEmpleadoCaja);
            
            INSERT INTO #CajasActivas (IdSucursal, IdTurnoCaja, Fecha) VALUES (@s, SCOPE_IDENTITY(), CAST(@FechaActual AS DATE));
            SET @s = @s + 1;
        END

        -- C. COTIZACION DEL DIA
        SELECT TOP 1 @IdCotizDia = Id, @ValorCotizDia = Valor FROM Cotizacion 
        WHERE Clave = 'DolarBlue' AND CAST(CreatedAt AS DATE) = CAST(@FechaActual AS DATE);

        -- D. ABASTECIMIENTO (COMPRAS Y PRECIOS)
        IF (ABS(CHECKSUM(NEWID())) % 7) IN (2, 5)
        BEGIN
            SET @CantCompras = 1 + (ABS(CHECKSUM(NEWID())) % 3);
            SET @c = 1;
            WHILE @c <= @CantCompras
            BEGIN
                SET @SucDestino = 1 + (ABS(CHECKSUM(NEWID())) % @MaxSucursales);
                SET @IdProv = (SELECT TOP 1 Id FROM Proveedor ORDER BY NEWID());
                SET @IdEmpCompra = (SELECT TOP 1 Id FROM Usuario WHERE IdRol IN (1,2));
                
                INSERT INTO Compra (Fecha, TotalCosto, EstadoPago, SaldoPendiente, IdProveedor, IdSucursalDestino, IdEmpleado)
                VALUES (@FechaActual, 0, 1, 0, @IdProv, @SucDestino, @IdEmpCompra);
                SET @IdCompra = SCOPE_IDENTITY();
                
                SET @CostoTotalCompra = 0;
                SET @ItemsAComprar = 3 + (ABS(CHECKSUM(NEWID())) % 5);
                SET @i = 1;
                
                WHILE @i <= @ItemsAComprar
                BEGIN
                    SET @IdProd = (SELECT TOP 1 Id FROM Producto WHERE Activo = 1 ORDER BY NEWID());
                    SELECT @EsSerial = EsSerializado FROM Producto WHERE Id = @IdProd;
                    
                    SET @Cant = CASE WHEN @EsSerial = 1 THEN 1 ELSE 10 + (ABS(CHECKSUM(NEWID())) % 20) END;
                    
                    IF @EsSerial = 1
                    BEGIN
                        SET @PrecioCostoUnit = 150.00 + (ABS(CHECKSUM(NEWID())) % 1050); -- $150 to $1200
                    END
                    ELSE
                    BEGIN
                        SET @PrecioCostoUnit = 2.00 + (ABS(CHECKSUM(NEWID())) % 78); -- $2 to $80
                    END
 
                    
                    -- Asignar Características de Inventario
                    SET @IdColor = (SELECT TOP 1 Id FROM Color ORDER BY NEWID());
                    IF @EsSerial = 1
                    BEGIN
                        SET @IdMemoria = (SELECT TOP 1 Id FROM Memoria ORDER BY NEWID());
                        SET @IdBateria = (SELECT TOP 1 Id FROM Bateria ORDER BY NEWID());
                        SET @IdAlmacenamiento = (SELECT TOP 1 Id FROM Almacenamiento ORDER BY NEWID());
                    END
                    ELSE
                    BEGIN
                        SET @IdMemoria = NULL; SET @IdBateria = NULL; SET @IdAlmacenamiento = NULL;
                        IF (ABS(CHECKSUM(NEWID())) % 2) = 0 SET @IdColor = NULL;
                    END
                    
                    EXEC dbo.usp_SeedEngine_IngresoStock 
                        @IdProducto=@IdProd, @IdSucursal=@SucDestino, @IdProveedor=@IdProv, @IdEstadoInventario=1, 
                        @Cantidad=@Cant, @Fecha=@FechaActual, @IdEmpleado=@IdEmpCompra, 
                        @IdColor=@IdColor, @IdMemoria=@IdMemoria, @IdBateria=@IdBateria, @IdAlmacenamiento=@IdAlmacenamiento,
                        @IdInventario=@IdInvNuevo OUTPUT;
                    
                    IF @IdInvNuevo IS NOT NULL
                    BEGIN
                        IF EXISTS (SELECT 1 FROM DetalleCompra WHERE IdCompra = @IdCompra AND IdInventario = @IdInvNuevo)
                        BEGIN
                            UPDATE DetalleCompra SET Cantidad = Cantidad + @Cant WHERE IdCompra = @IdCompra AND IdInventario = @IdInvNuevo;
                        END
                        ELSE
                        BEGIN
                            INSERT INTO DetalleCompra (Cantidad, PrecioCostoUnitario, IdCompra, IdInventario)
                            VALUES (@Cant, @PrecioCostoUnit, @IdCompra, @IdInvNuevo);
                        END
                        
                        SET @CostoTotalCompra = @CostoTotalCompra + (@PrecioCostoUnit * @Cant);
                        
                        UPDATE PrecioArticulo SET FechaHasta = @FechaActual WHERE IdInventario = @IdInvNuevo AND FechaHasta IS NULL;
                        
                        SET @IdLista = (SELECT TOP 1 Id FROM ListaPrecio WHERE IdCategoriaProducto = (SELECT TOP 1 mo.IdCategoriaProducto FROM Producto p JOIN ModeloProducto mo ON p.IdModeloProducto = mo.Id WHERE p.Id = @IdProd) AND Activo = 1);
                        IF @IdLista IS NULL SET @IdLista = 1;
                        
                        SET @PctGanancia = ISNULL((SELECT PorcentajeRentabilidad FROM ListaPrecio WHERE Id = @IdLista), 30);
                        SET @CostoReal = @PrecioCostoUnit * 1.05;
                        SET @ValorFinal = @CostoReal * (1 + (@PctGanancia/100));
                        
                        INSERT INTO PrecioArticulo (FechaDesde, FechaHasta, ValorFinal, CostoBase, CostoVariables, CostoReal, PorcentajeGanancia, IdListaPrecio, IdInventario)
                        VALUES (@FechaActual, NULL, @ValorFinal, @PrecioCostoUnit, @CostoReal - @PrecioCostoUnit, @CostoReal, @PctGanancia, @IdLista, @IdInvNuevo);
                    END
                    SET @i = @i + 1;
                END
                
                UPDATE Compra SET TotalCosto = @CostoTotalCompra, SaldoPendiente = 0, EstadoPago = 3 WHERE Id = @IdCompra;
                
                DECLARE @IdTurnoCompraActivo INT = (SELECT TOP 1 IdTurnoCaja FROM #CajasActivas WHERE IdSucursal = @SucDestino);
                INSERT INTO PagoCompra (Monto, FechaPago, IdCompra, IdMetodoPago, IdTurnoCaja)
                VALUES (@CostoTotalCompra * @ValorCotizDia, @FechaActual, @IdCompra, 3, @IdTurnoCompraActivo);
                
                INSERT INTO CuentaCorrienteProveedor (FechaMovimiento, Concepto, Debe, Haber, SaldoAcumulado, IdCompra, IdProveedor, IdPagoCompra)
                VALUES (@FechaActual, 'Compra Inicial', @CostoTotalCompra, @CostoTotalCompra, 0, @IdCompra, @IdProv, SCOPE_IDENTITY());
                
                SET @c = @c + 1;
            END
        END

        -- E. COBRO DE CUOTAS
        DECLARE cur_cuotas CURSOR LOCAL FAST_FORWARD FOR 
        SELECT Id FROM Cuota WHERE FechaPago IS NULL AND FechaVencimiento <= DATEADD(DAY, 5, @FechaActual);
        
        OPEN cur_cuotas;
        FETCH NEXT FROM cur_cuotas INTO @IdCuotaCobrar;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- 80% de probabilidad de que el cliente pase a pagar su cuota a tiempo
            IF (ABS(CHECKSUM(NEWID())) % 100) < 80
            BEGIN
                SET @TurnoCobro = (SELECT TOP 1 IdTurnoCaja FROM #CajasActivas ORDER BY NEWID());
                IF @TurnoCobro IS NOT NULL
                BEGIN
                    UPDATE Cuota SET FechaPago = @FechaActual, IdTurnoCaja = @TurnoCobro WHERE Id = @IdCuotaCobrar;
                END
            END
            FETCH NEXT FROM cur_cuotas INTO @IdCuotaCobrar;
        END
        CLOSE cur_cuotas;
        DEALLOCATE cur_cuotas;

        -- F. VENTAS DIARIAS
        SET @CantVentas = (ABS(CHECKSUM(NEWID())) % 5);
        SET @v = 1;
        WHILE @v <= @CantVentas
        BEGIN
            SET @SucVenta = 1 + (ABS(CHECKSUM(NEWID())) % @MaxSucursales);
            SET @TurnoVenta = (SELECT TOP 1 IdTurnoCaja FROM #CajasActivas WHERE IdSucursal = @SucVenta);
            SET @EmpVenta = (SELECT TOP 1 Id FROM Usuario WHERE IdSucursal = @SucVenta AND IdRol IN (1,2,3));
            IF @EmpVenta IS NULL SET @EmpVenta = 1;
            SET @CliVenta = (SELECT TOP 1 Id FROM Usuario WHERE EsCliente = 1 ORDER BY NEWID());

            SET @InvVender = (SELECT TOP 1 i.Id FROM Inventario i JOIN Producto p ON i.IdProducto = p.Id WHERE i.IdSucursal = @SucVenta AND i.Stock > 0 AND i.CreatedAt <= @FechaActual AND p.EsVendible = 1 ORDER BY NEWID());
            IF @InvVender IS NOT NULL
            BEGIN
                SET @EsSerialVenta = (SELECT EsSerializado FROM Producto p JOIN Inventario i ON p.Id = i.IdProducto WHERE i.Id = @InvVender);
                SET @CantVender = 1;
                IF @EsSerialVenta = 0 AND (ABS(CHECKSUM(NEWID())) % 100) > 80 SET @CantVender = 2;
                
                SET @PrecioUSD = (SELECT TOP 1 ValorFinal FROM PrecioArticulo WHERE IdInventario = @InvVender AND FechaHasta IS NULL ORDER BY FechaDesde DESC);
                SET @CostoUSD = (SELECT TOP 1 CostoReal FROM PrecioArticulo WHERE IdInventario = @InvVender AND FechaHasta IS NULL ORDER BY FechaDesde DESC);
                
                IF @PrecioUSD IS NOT NULL
                BEGIN
                    -- 20% Probabilidad de Financiación (Cuotas)
                    SET @EsFinanciado = CASE WHEN (ABS(CHECKSUM(NEWID())) % 100) < 20 THEN 1 ELSE 0 END;

                    -- Cabecera
                    INSERT INTO Venta (Fecha, TotalVenta, TotalVentaARS, TotalCosto, Observaciones, EstadoPago, IdTurnoCaja, IdCliente, IdEmpleado, IdCotizacionDolar, IdDescuento)
                    VALUES (@FechaActual, @PrecioUSD * @CantVender, (@PrecioUSD * @CantVender) * @ValorCotizDia, @CostoUSD * @CantVender, 
                            CASE WHEN @EsFinanciado = 1 THEN 'Venta Financiada en Cuotas' ELSE 'Venta autogenerada' END, 
                            CASE WHEN @EsFinanciado = 1 THEN 0 ELSE 1 END, @TurnoVenta, @CliVenta, @EmpVenta, @IdCotizDia, NULL);
                    SET @IdVenta = SCOPE_IDENTITY();
                    
                    -- Detalle
                    INSERT INTO DetalleVenta (Cantidad, PrecioUnitario, IdVenta, IdInventario)
                    VALUES (@CantVender, @PrecioUSD, @IdVenta, @InvVender);
                    
                    -- Descontar Stock
                    EXEC dbo.usp_SeedEngine_ConsumoStock @IdInventario=@InvVender, @Cantidad=@CantVender, @Fecha=@FechaActual, @IdEmpleado=@EmpVenta, @Motivo='Venta Local';
                    
                    -- Pago
                    IF @EsFinanciado = 0
                    BEGIN
                        SET @MetodoPagoRandom = 1 + (ABS(CHECKSUM(NEWID())) % 5);
                        INSERT INTO PagoVenta (Monto, FechaPago, Observacion, Pagado, IdVenta, IdMetodoPago, IdTurnoCaja)
                        VALUES ((@PrecioUSD * @CantVender) * @ValorCotizDia, @FechaActual, 'Pago simulado', 1, @IdVenta, @MetodoPagoRandom, @TurnoVenta);
                    END
                    ELSE
                    BEGIN
                        -- Generar 3 Cuotas con un 15% de recargo sobre el total en Pesos
                        SET @CantCuotas = 3;
                        SET @MontoCuota = (((@PrecioUSD * @CantVender) * @ValorCotizDia) * 1.15) / @CantCuotas;
                        SET @c_cuota = 1;
                        WHILE @c_cuota <= @CantCuotas
                        BEGIN
                            SET @VencCuota = DATEADD(DAY, 30 * @c_cuota, @FechaActual);
                            INSERT INTO Cuota (NumeroCuota, MontoCuota, FechaVencimiento, FechaPago, Recargo, IdVenta, IdTurnoCaja)
                            VALUES (@c_cuota, @MontoCuota, @VencCuota, NULL, 0, @IdVenta, @TurnoVenta);
                            SET @c_cuota = @c_cuota + 1;
                        END
                    END

                    SET @TotalVentasGeneradas = @TotalVentasGeneradas + 1;
                END
            END
            SET @v = @v + 1;
        END

        -- G. ESTADO DE REPARACIONES EN CURSO
        DECLARE cur_taller CURSOR LOCAL FAST_FORWARD FOR 
        SELECT IdOrden, IdEstado, ProbabilidadExito FROM #EquiposTaller WHERE FechaEstimada <= @FechaActual AND IdEstado < 4;
        
        OPEN cur_taller;
        FETCH NEXT FROM cur_taller INTO @OrdenId, @OrdenEstado, @OrdenProb;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @EmpTaller = (SELECT TOP 1 IdEmpleado FROM OrdenReparacion WHERE Id = @OrdenId);
            
            IF @OrdenEstado = 1 -- En Espera
            BEGIN
                -- Si faltan <= 3 días para hoy, forzamos que se quede en espera para probar el sistema
                IF @DiasParaFin > 3
                BEGIN
                    IF (ABS(CHECKSUM(NEWID())) % 100) > 10 
                    BEGIN
                        UPDATE OrdenReparacion SET IdEstadoOrden = 2 WHERE Id = @OrdenId;
                        UPDATE #EquiposTaller SET IdEstado = 2, FechaEstimada = DATEADD(DAY, 2 + (ABS(CHECKSUM(NEWID()))%3), @FechaActual) WHERE IdOrden = @OrdenId;
                        INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) VALUES (@FechaActual, 'En revisión', @OrdenId, @EmpTaller, 2);
                    END
                    ELSE
                    BEGIN
                        UPDATE OrdenReparacion SET IdEstadoOrden = 5 WHERE Id = @OrdenId;
                        UPDATE #EquiposTaller SET IdEstado = 5 WHERE IdOrden = @OrdenId;
                        INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) VALUES (@FechaActual, 'Anulado por cliente', @OrdenId, @EmpTaller, 5);
                    END
                END
            END
            ELSE IF @OrdenEstado = 2 -- En Reparación
            BEGIN
                -- Si faltan <= 10 días, lo dejamos en reparación
                IF @DiasParaFin > 10
                BEGIN
                    UPDATE OrdenReparacion SET IdEstadoOrden = 3 WHERE Id = @OrdenId;
                    UPDATE #EquiposTaller SET IdEstado = 3, FechaEstimada = DATEADD(DAY, 1 + (ABS(CHECKSUM(NEWID()))%5), @FechaActual) WHERE IdOrden = @OrdenId;
                    INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) VALUES (@FechaActual, 'Listo para retirar', @OrdenId, @EmpTaller, 3);
                END
            END
            ELSE IF @OrdenEstado = 3 -- Terminado -> Entregado o Abandonado
            BEGIN
                IF DATEDIFF(DAY, (SELECT TOP 1 FechaModificacion FROM SeguimientoOrden WHERE IdOrdenReparacion = @OrdenId AND IdEstadoOrden = 3 ORDER BY FechaModificacion DESC), @FechaActual) > 30
                BEGIN
                    UPDATE OrdenReparacion SET IdEstadoOrden = 6 WHERE Id = @OrdenId;
                    UPDATE #EquiposTaller SET IdEstado = 6 WHERE IdOrden = @OrdenId;
                    INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) VALUES (@FechaActual, 'Equipo abandonado (forzado +30 días)', @OrdenId, @EmpTaller, 6);
                END
                ELSE IF (ABS(CHECKSUM(NEWID())) % 100) > 30 -- Se retira
                BEGIN
                    SET @MontoCobrar = (SELECT (TotalReparacion - ISNULL((SELECT SUM(Monto) FROM PagoReparacion WHERE IdOrdenReparacion = @OrdenId),0)) FROM OrdenReparacion WHERE Id = @OrdenId);
                    
                    UPDATE OrdenReparacion SET IdEstadoOrden = 4, FechaEntrega = @FechaActual WHERE Id = @OrdenId;
                    UPDATE #EquiposTaller SET IdEstado = 4 WHERE IdOrden = @OrdenId;
                    INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) VALUES (@FechaActual, 'Entregado al cliente', @OrdenId, @EmpTaller, 4);
                    
                    IF @MontoCobrar > 0
                    BEGIN
                        SET @TurnoRep = (SELECT TOP 1 IdTurnoCaja FROM #CajasActivas WHERE IdSucursal = (SELECT TOP 1 IdSucursal FROM Usuario WHERE Id = @EmpTaller));
                        IF @TurnoRep IS NOT NULL
                        BEGIN
                            SET @MetodoPagoRandom = 1 + (ABS(CHECKSUM(NEWID())) % 5);
                            INSERT INTO PagoReparacion (Monto, Senia, FechaPago, Observacion, IdOrdenReparacion, IdMetodoPago, IdTurnoCaja)
                            VALUES (@MontoCobrar, 0, @FechaActual, 'Pago final', @OrdenId, @MetodoPagoRandom, @TurnoRep);
                        END
                    END
                END
            END
            
            FETCH NEXT FROM cur_taller INTO @OrdenId, @OrdenEstado, @OrdenProb;
        END
        CLOSE cur_taller;
        DEALLOCATE cur_taller;

        -- H. NUEVAS REPARACIONES
        IF (ABS(CHECKSUM(NEWID())) % 10) > 7
        BEGIN
            SET @SucTaller = 1 + (ABS(CHECKSUM(NEWID())) % @MaxSucursales);
            SET @TurnoTaller = (SELECT TOP 1 IdTurnoCaja FROM #CajasActivas WHERE IdSucursal = @SucTaller);
            SET @Tecnico = (SELECT TOP 1 Id FROM Usuario WHERE IdRol = 4 AND IdSucursal = @SucTaller);
            IF @Tecnico IS NULL SET @Tecnico = 1;
            SET @CliTaller = (SELECT TOP 1 Id FROM Usuario WHERE EsCliente = 1 ORDER BY NEWID());
            SET @ModTaller = (SELECT TOP 1 Id FROM ModeloProducto WHERE IdCategoriaProducto = 1 ORDER BY NEWID());

            INSERT INTO DispositivoCliente (Desbloqueo, Observaciones, Activo, IdCliente, IdModeloProducto, CreatedAt)
            VALUES ('1234', 'Pantalla astillada', 1, @CliTaller, @ModTaller, @FechaActual);
            SET @IdDisp = SCOPE_IDENTITY();

            INSERT INTO OrdenReparacion (FechaEmision, CostoRepuestos, PrecioManoObra, TotalReparacion, IdEmpleado, IdDispositivoCliente, IdEstadoOrden)
            VALUES (@FechaActual, 0, 30000, 30000, @Tecnico, @IdDisp, 1);
            SET @IdOrdNueva = SCOPE_IDENTITY();
            
            INSERT INTO OrdenFalla (IdOrdenReparacion, IdFalla) VALUES (@IdOrdNueva, 1);
            
            INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden)
            VALUES (@FechaActual, 'Ingreso al local', @IdOrdNueva, @Tecnico, 1);

            SET @MetodoPagoRandom = 1 + (ABS(CHECKSUM(NEWID())) % 5);
            INSERT INTO PagoReparacion (Monto, Senia, FechaPago, Observacion, IdOrdenReparacion, IdMetodoPago, IdTurnoCaja)
            VALUES (10000, 10000, @FechaActual, 'Seña', @IdOrdNueva, @MetodoPagoRandom, @TurnoTaller);

            INSERT INTO #EquiposTaller (IdOrden, IdSucursal, FechaEstimada, IdEstado, ProbabilidadExito)
            VALUES (@IdOrdNueva, @SucTaller, DATEADD(DAY, 1, @FechaActual), 1, 90);

            SET @TotalReparacionesGeneradas = @TotalReparacionesGeneradas + 1;
        END

        -- I. CIERRE DE CAJAS
        -- Ahora el arqueo incluye: PagoVenta (contado) + PagoReparacion + Cuotas Cobradas en ese turno
        UPDATE tc
        SET TotalIngresos = ISNULL((SELECT SUM(Monto) FROM PagoVenta WHERE IdTurnoCaja = tc.Id), 0) 
                          + ISNULL((SELECT SUM(Monto) FROM PagoReparacion WHERE IdTurnoCaja = tc.Id), 0)
                          + ISNULL((SELECT SUM(MontoCuota + ISNULL(Recargo,0)) FROM Cuota WHERE IdTurnoCaja = tc.Id AND FechaPago IS NOT NULL), 0),
            TotalEgresos = ISNULL((SELECT SUM(Monto) FROM MovimientoCaja WHERE IdTurnoCaja = tc.Id AND TipoMovimiento = 0), 0)
        FROM TurnoCaja tc
        INNER JOIN #CajasActivas ca ON tc.Id = ca.IdTurnoCaja;

        UPDATE tc
        SET MontoCierreFisico = MontoInicial + TotalIngresos - TotalEgresos, FechaCierre = DATEADD(HOUR, 9, @FechaActual)
        FROM TurnoCaja tc
        INNER JOIN #CajasActivas ca ON tc.Id = ca.IdTurnoCaja;

        DELETE FROM #CajasActivas;

        -- J. AVANCE DEL RELOJ
        SET @FechaActual = DATEADD(DAY, 1, @FechaActual);
    END
    PRINT 'Bucle cronológico finalizado exitosamente.';

    -- 4. VALIDACIONES DE INTEGRIDAD
    PRINT 'Verificando invariantes críticas...';

    IF EXISTS (SELECT 1 FROM Inventario i JOIN Producto p ON i.IdProducto = p.Id WHERE p.EsSerializado = 1 AND i.Stock > 1)
    BEGIN
        ;THROW 50002, 'Violación de Invariante: Producto Serializado con Stock > 1', 1;
    END

    IF EXISTS (SELECT 1 FROM Inventario i JOIN Producto p ON i.IdProducto = p.Id WHERE p.EsSerializado = 1 AND i.IMEI IS NULL)
    BEGIN
        ;THROW 50003, 'Violación de Invariante: Producto Serializado sin IMEI', 1;
    END

    IF EXISTS (SELECT IMEI FROM Inventario WHERE IMEI IS NOT NULL GROUP BY IMEI HAVING COUNT(*) > 1)
    BEGIN
        ;THROW 50004, 'Violación de Invariante: IMEI Duplicado en la Base de Datos', 1;
    END

    IF EXISTS (SELECT 1 FROM TurnoCaja WHERE MontoCierreFisico <> (MontoInicial + TotalIngresos - TotalEgresos))
    BEGIN
        ;THROW 50005, 'Violación de Invariante: Arqueo de Caja inconsistente', 1;
    END

    PRINT 'Todas las validaciones pasaron exitosamente.';
    
    COMMIT TRANSACTION SeedEngine;
    PRINT '¡Generación de Datos completada correctamente! Ventas: ' + CAST(@TotalVentasGeneradas AS VARCHAR) + ' - Reparaciones: ' + CAST(@TotalReparacionesGeneradas AS VARCHAR);
    
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
    BEGIN
        ROLLBACK TRANSACTION SeedEngine;
    END
    PRINT 'Error durante la generación de datos:';
    PRINT ERROR_MESSAGE();
    ;THROW;
END CATCH
GO

-- C. LIMPIEZA AUXILIAR
DROP PROCEDURE IF EXISTS dbo.usp_SeedEngine_IngresoStock;
DROP PROCEDURE IF EXISTS dbo.usp_SeedEngine_ConsumoStock;
GO

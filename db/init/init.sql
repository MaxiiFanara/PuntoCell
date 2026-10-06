USE master; -- Nos posicionamos en la base de datos maestra del sistema para poder crear una nueva.
GO -- Ejecuta el lote de instrucciones anterior antes de continuar.

-- Guarda de idempotencia: permite reejecutar el script contra un servidor donde la base
-- ya exista (redeploy, contenedor reiniciado) sin abortar por "database already exists".
-- Sintaxis soportada tanto en SQL Server on-prem/Docker como en AWS RDS for SQL Server.
IF DB_ID(N'PuntoCellDesarrollo') IS NULL
BEGIN
    CREATE DATABASE PuntoCellDesarrollo; -- Crea la estructura física y lógica de la base de datos del proyecto.
END
GO -- Asegura que la BD esté completamente creada antes de intentar usarla.

USE PuntoCellDesarrollo; -- Cambiamos el contexto a nuestra nueva base de datos para empezar a crear tablas.
GO -- Confirma el cambio de contexto.

-- XACT_ABORT ON es session-level y persiste a través de todos los batches (GO) que siga
-- ejecutando esta misma conexión/sesión de sqlcmd: cualquier error de tiempo de ejecución
-- aborta y revierte automáticamente la transacción explícita abierta más abajo, en lugar
-- de dejar la base a medio cargar. No afecta al DDL que sigue (se ejecuta en autocommit).
SET XACT_ABORT ON;
GO

-----------------------
--- TABLAS GLOBALES ---
-----------------------

CREATE TABLE Localidad ( -- Centraliza las ciudades para evitar errores de tipeo al repetir nombres.
    Id        INT           PRIMARY KEY IDENTITY, 
    Nombre    NVARCHAR(100) NOT NULL
);
GO

CREATE TABLE MetodoPago ( -- Opciones de cobro que ofrece el local.
    Id     INT           PRIMARY KEY IDENTITY, 
    Nombre NVARCHAR(100) NOT NULL UNIQUE, 
    Activo BIT           NOT NULL DEFAULT 1 -- Permite apagar un método si se cae el posnet, por ejemplo.
);
GO


--------------------------------------
--- TABLAS MÓDULO GESTIÓN USUARIOS ---
--------------------------------------

CREATE TABLE Sucursal ( -- Separa físicamente el origen de las ventas y el stock.
    Id          INT           PRIMARY KEY IDENTITY, 
    Nombre      NVARCHAR(100) NOT NULL, 
    Calle       NVARCHAR(100) NOT NULL, 
    Numero      NVARCHAR(6)   NOT NULL, 
    Telefono    NVARCHAR(20)  NULL, 
    Activa      BIT           NOT NULL DEFAULT 1, 
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    IdLocalidad INT           NOT NULL, 
    CONSTRAINT FK_Sucursal_Localidad FOREIGN KEY (IdLocalidad) REFERENCES Localidad (Id) 
);
GO

CREATE TABLE Rol ( -- Define los niveles de acceso al sistema para seguridad.
    Id     INT           PRIMARY KEY IDENTITY, 
    Nombre NVARCHAR(100) NOT NULL UNIQUE, 
    Activo BIT           NOT NULL DEFAULT 1
);
GO

CREATE TABLE Permiso ( -- Define las acciones granulares que se pueden hacer en la API (Endpoints).
    Id       INT           PRIMARY KEY IDENTITY, 
    Nombre   NVARCHAR(150) NOT NULL UNIQUE -- Descripción legible para el panel del dueño.
);
GO

CREATE TABLE RolPermiso ( -- Tabla intermedia para la relación Muchos a Muchos entre Roles y Permisos.
    IdRol     INT NOT NULL, 
    IdPermiso INT NOT NULL, 
    PRIMARY KEY (IdRol, IdPermiso), -- Clave primaria compuesta para evitar asignar el mismo permiso dos veces al mismo rol.
    CONSTRAINT FK_RolPermiso_Rol     FOREIGN KEY (IdRol)     REFERENCES Rol (Id), 
    CONSTRAINT FK_RolPermiso_Permiso FOREIGN KEY (IdPermiso) REFERENCES Permiso (Id) 
);
GO

CREATE TABLE Usuario ( -- Centraliza a empleados y clientes para simplificar autenticación y relaciones.
    Id                   INT           PRIMARY KEY IDENTITY, 
    DNI                  VARCHAR(20)   NOT NULL UNIQUE, 
    Apellido             NVARCHAR(100) NOT NULL, 
    Nombre               NVARCHAR(100) NOT NULL, 
    Email                NVARCHAR(100) NOT NULL UNIQUE, -- Único para usarlo como login en el backend.
    Celular              NVARCHAR(20)  NOT NULL, 
    Calle                NVARCHAR(100) NULL, 
    Numero               NVARCHAR(6)   NULL, 
    Piso                 NVARCHAR(6)   NULL, 
    Depto                NVARCHAR(6)   NULL,
    EsCliente            BIT           NOT NULL,
    UsuarioEmpleado      NVARCHAR(100) NULL,
    Pwd                  NVARCHAR(255) NULL, -- Contraseña hasheada.
    Activo               BIT           NOT NULL DEFAULT 1, 
    CreatedAt            DATETIME2     NOT NULL DEFAULT SYSDATETIME(), 
    IdLocalidad          INT           NULL, 
    IdRol                INT           NULL,
    IdSucursal           INT           NULL, 
    CONSTRAINT FK_Usuario_Localidad FOREIGN KEY (IdLocalidad) REFERENCES Localidad (Id), 
    CONSTRAINT FK_Usuario_Rol       FOREIGN KEY (IdRol)       REFERENCES Rol (Id), 
    CONSTRAINT FK_Usuario_Sucursal  FOREIGN KEY (IdSucursal)  REFERENCES Sucursal (Id),
    
    -- Si es empleado (EsCliente = 0), obligatoriamente tiene que tener asignado un Rol, una Sucursal y una Contraseña.
    CONSTRAINT CHK_Usuario_Empleado_Rol      CHECK (EsCliente = 1 OR IdRol IS NOT NULL),
    CONSTRAINT CHK_Usuario_Empleado_Sucursal CHECK (EsCliente = 1 OR IdSucursal IS NOT NULL),
    CONSTRAINT CHK_Usuario_Empleado_Pwd      CHECK (EsCliente = 1 OR Pwd IS NOT NULL)
);
GO


-------------------------------------
--- TABLAS MÓDULO BITÁCORA Y CAJA ---
-------------------------------------

CREATE TABLE Bitacora ( -- El "Gran Hermano". Registra todas las operaciones críticas del personal.
    Id         INT           PRIMARY KEY IDENTITY,
    Accion     NVARCHAR(150) NOT NULL, -- logueo exitoso, registrar compra, etc.
    Detalle    NVARCHAR(MAX) NULL, -- Información adicional (Ej: JSON con los datos borrados).
    IpAddress  NVARCHAR(50)  NULL, -- Desde qué computadora se hizo, por seguridad.
    Fecha      DATETIME2     NOT NULL DEFAULT SYSDATETIME(), -- Momento exacto.
    IdEmpleado INT           NULL, -- Quién fue.
    IdSucursal INT           NULL, -- Dónde estaba logueado.
    CONSTRAINT FK_Bitacora_Empleado FOREIGN KEY (IdEmpleado) REFERENCES Usuario (Id), 
    CONSTRAINT FK_Bitacora_Sucursal FOREIGN KEY (IdSucursal) REFERENCES Sucursal (Id)
);
GO

CREATE TABLE TurnoCaja ( -- Controla el ciclo de vida del dinero diario en una caja física.
    Id                 INT            PRIMARY KEY IDENTITY,
    FechaApertura      DATETIME2      NOT NULL DEFAULT SYSDATETIME(), -- Cuándo arranca el turno.
    FechaCierre        DATETIME2      NULL, -- Cuándo termina.
    MontoInicial       DECIMAL(18, 2) NOT NULL CHECK (MontoInicial >= 0),
    TotalIngresos      DECIMAL(18, 2) NOT NULL, -- Dinero que entró.
    TotalEgresos       DECIMAL(18, 2) NOT NULL, -- Dinero que salió.
    MontoCierreFisico  DECIMAL(18, 2) NOT NULL, -- Plata real que el cajero contó con la mano al irse.
    Observaciones      NVARCHAR(MAX)  NOT NULL, 
    IdSucursal         INT            NOT NULL, 
    IdEmpleadoApertura INT            NOT NULL, 
    IdEmpleadoCierre   INT            NOT NULL, 
    CONSTRAINT FK_Turno_Sucursal  FOREIGN KEY (IdSucursal)         REFERENCES Sucursal (Id),
    CONSTRAINT FK_Turno_EmpAbre   FOREIGN KEY (IdEmpleadoApertura) REFERENCES Usuario (Id),
    CONSTRAINT FK_Turno_EmpCierra FOREIGN KEY (IdEmpleadoCierre)   REFERENCES Usuario (Id)
);
GO

CREATE TABLE MovimientoCaja ( -- Registra cada billete que entra o sale del cajón físico del mostrador.
    Id                 INT            PRIMARY KEY IDENTITY, 
    Fecha              DATETIME2      NOT NULL DEFAULT SYSDATETIME(), -- Momento de la operación.
    Monto              DECIMAL(18, 2) NOT NULL CHECK (Monto > 0), -- Cantidad de dinero.
    TipoMovimiento     BIT            NOT NULL, -- 0 Egreso y 1 Ingreso
    Descripcion        NVARCHAR(200)  NOT NULL, -- Justificación ("Retiro para comprar artículos de limpieza").
    IdTurnoCaja        INT            NOT NULL, -- Caja de qué sucursal se afectó.
    IdEmpleado         INT            NOT NULL, -- Quién sacó o puso la plata.
    IdMetodoPago       INT            NOT NULL,
    CONSTRAINT FK_MovCaja_Turno    FOREIGN KEY (IdTurnoCaja)   REFERENCES TurnoCaja (Id), 
    CONSTRAINT FK_MovCaja_Empleado FOREIGN KEY (IdEmpleado)    REFERENCES Usuario (Id),
    CONSTRAINT FK_MovCaja_MetPago  FOREIGN KEY (IdMetodoPago)  REFERENCES MetodoPago (Id)
);
GO


--------------------------------
--- TABLAS MÓDULO INVENTARIO ---
--------------------------------

CREATE TABLE CategoriaProducto ( -- Agrupa los artículos para reportes (Ej: Smartphones vs Fundas).
    Id            INT           PRIMARY KEY IDENTITY, 
    Nombre        NVARCHAR(100) NOT NULL UNIQUE, 
    EsDispositivo BIT           NOT NULL DEFAULT 1 -- Bandera lógica para saber si requiere IMEI o es genérico.
);
GO

CREATE TABLE MarcaProducto ( -- Normaliza marcas (Apple, Samsung) para evitar filtros erróneos por mala ortografía.
    Id           INT           PRIMARY KEY IDENTITY, 
    Nombre       NVARCHAR(100) NOT NULL UNIQUE
);
GO

CREATE TABLE ModeloProducto ( -- Normaliza modelos asociados a una marca (Ej: iPhone 13 pertenece a Apple).
    Id                  INT           PRIMARY KEY IDENTITY, 
    Nombre              NVARCHAR(100) NOT NULL, --Ej: iPhone 13, iPhone 13 Pro, iPhone 13 Pro Max.
    IdMarcaProducto     INT           NOT NULL,
    IdCategoriaProducto INT           NOT NULL,
    CONSTRAINT FK_Modelo_Marca     FOREIGN KEY (IdMarcaProducto)     REFERENCES MarcaProducto (Id),
    CONSTRAINT FK_Modelo_Categoria FOREIGN KEY (IdCategoriaProducto) REFERENCES CategoriaProducto (Id),
    CONSTRAINT UQ_ModeloMarca      UNIQUE (Nombre, IdMarcaProducto) -- Evita cargar dos veces el mismo modelo en la misma marca.
);
GO

CREATE TABLE Producto (
    Id                   INT           PRIMARY KEY IDENTITY, 
    Nombre               NVARCHAR(100) NOT NULL, --Ej: iPhone 13, iPhone 13 Pro, iPhone 13 Pro Max.
    EsSerializado        BIT           NOT NULL,
    EsVendible           BIT           NOT NULL,
    EsRepuesto           BIT           NOT NULL,
    Activo               BIT           NOT NULL,
    CreatedAt            DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    IdModeloProducto     INT           NOT NULL,
    CONSTRAINT FK_Producto_Modelo     FOREIGN KEY (IdModeloProducto)     REFERENCES ModeloProducto (Id)
);
GO

CREATE TABLE ImagenProducto (
    Id                   INT           PRIMARY KEY IDENTITY, 
    URLRelativa          VARCHAR(500)  NULL, 
    EsPortada            BIT           NULL,
    OrdenVisual          INT           NULL,
    IdProducto           INT           NULL,
    CONSTRAINT FK_ImagenProducto_Modelo     FOREIGN KEY (IdProducto)     REFERENCES Producto (Id)
);
GO

CREATE TABLE Proveedor ( -- Quienes nos suministran el stock de artículos o repuestos.
    Id          INT           PRIMARY KEY IDENTITY, 
    Nombre      NVARCHAR(100) NOT NULL UNIQUE, 
    Email       NVARCHAR(100) NULL, 
    Celular     NVARCHAR(20)  NULL, 
    Activo      BIT           NOT NULL DEFAULT 1, 
    IdLocalidad INT           NULL,
    CONSTRAINT FK_Proveedor_Localidad FOREIGN KEY (IdLocalidad) REFERENCES Localidad (Id) 
);
GO

-- Índices únicos FILTRADOS sobre Email/Celular: mismo motivo que UQ_Inventario_IMEI —
-- un UNIQUE de columna estándar en SQL Server solo permite UN NULL en toda la tabla,
-- así que un segundo proveedor sin email (o sin celular) rompería como si fuera un
-- duplicado. Filtrando a "IS NOT NULL" solo se exige unicidad entre los valores reales.
SET QUOTED_IDENTIFIER ON;
CREATE UNIQUE INDEX UQ_Proveedor_Email ON Proveedor(Email) WHERE Email IS NOT NULL;
CREATE UNIQUE INDEX UQ_Proveedor_Celular ON Proveedor(Celular) WHERE Celular IS NOT NULL;
GO

CREATE TABLE Color ( -- Catálogo de colores para las variantes de los productos.
    Id     INT           PRIMARY KEY IDENTITY, 
    Nombre NVARCHAR(100) NOT NULL UNIQUE -- Evita tener "Azul" y "azul" duplicados.
);
GO

CREATE TABLE Bateria ( -- Capacidades de RAM (Ej: 8GB, 16GB).
    Id          INT          PRIMARY KEY IDENTITY, 
    Capacidad   NVARCHAR(50) NOT NULL UNIQUE,
    Porcentaje  DECIMAL(18, 2) NOT NULL,
    CiclosCarga INT NOT NULL
);
GO

CREATE TABLE Memoria ( -- Capacidades o estado de la batería, muy útil para los reacondicionados.
    Id        INT          PRIMARY KEY IDENTITY, 
    Capacidad NVARCHAR(50) NOT NULL UNIQUE 
);
GO

CREATE TABLE Almacenamiento ( -- Capacidades del Disco de los dispositivos.
    Id        INT          PRIMARY KEY IDENTITY, 
    Capacidad NVARCHAR(50) NOT NULL UNIQUE 
);
GO

CREATE TABLE EstadoInventario ( -- Define si el stock es Nuevo, Usado (Reacondicionado), o Defectuoso.
    Id     INT           PRIMARY KEY IDENTITY,
    Nombre NVARCHAR(50)  NOT NULL UNIQUE
);
GO

CREATE TABLE Inventario ( -- Representa la cantidad FÍSICA actual de un producto en una sucursal específica.
    Id                 INT            PRIMARY KEY IDENTITY,
    IMEI               VARCHAR(50)    NULL, -- Único entre equipos serializados; ver índice único filtrado más abajo.
    Stock              INT            NOT NULL DEFAULT 0 CHECK (Stock >= 0), -- Unidades disponibles actualmente en esta sucursal.
    CreatedAt          DATETIME2      NOT NULL DEFAULT SYSDATETIME(), -- Cuándo ingresó este lote.
    MesesGarantiaMarca DATETIME2      NULL,
    MesesGarantiaLocal DATETIME2      NOT NULL,
    Observaciones      NVARCHAR(500)  NULL, -- Notas (ej: "Lote con cajas abolladas").
    IdSucursal         INT            NOT NULL, -- Dónde está físicamente la mercadería.
    IdProducto         INT            NOT NULL, -- Qué producto es.
    IdEstadoInventario INT            NOT NULL DEFAULT 1, -- Por defecto todo ingresa como Nuevo (1).
    IdProveedor        INT            NOT NULL,
    IdColor            INT            NULL, -- Opcional.
    IdMemoria          INT            NULL, -- Opcional.
    IdBateria          INT            NULL, -- Opcional.
    IdAlmacenamiento   INT            NULL, -- Opcional. 
    CONSTRAINT FK_Inventario_Color              FOREIGN KEY (IdColor)            REFERENCES Color (Id), 
    CONSTRAINT FK_Inventario_Memoria            FOREIGN KEY (IdMemoria)          REFERENCES Memoria (Id), 
    CONSTRAINT FK_Inventario_Bateria            FOREIGN KEY (IdBateria)          REFERENCES Bateria (Id),
    CONSTRAINT FK_Inventario_Almacenamiento     FOREIGN KEY (IdAlmacenamiento)   REFERENCES Almacenamiento (Id),
    CONSTRAINT FK_Inventario_Sucursal           FOREIGN KEY (IdSucursal)         REFERENCES Sucursal (Id), 
    CONSTRAINT FK_Inventario_Producto           FOREIGN KEY (IdProducto)         REFERENCES Producto (Id),
    CONSTRAINT FK_Inventario_Estado             FOREIGN KEY (IdEstadoInventario) REFERENCES EstadoInventario (Id),
    CONSTRAINT FK_Inventario_Proveedor          FOREIGN KEY (IdProveedor)        REFERENCES Proveedor (Id)
);
GO

-- Índice único FILTRADO sobre IMEI: no puede haber dos filas con el mismo IMEI, pero sí
-- múltiples filas con IMEI NULL (accesorios/repuestos no serializados). Un UNIQUE de columna
-- estándar no sirve acá: SQL Server trata todos los NULL como iguales entre sí en un índice
-- único, así que solo dejaría cargar UN producto sin IMEI en todo el inventario.
CREATE UNIQUE INDEX UQ_Inventario_IMEI ON Inventario(IMEI) WHERE IMEI IS NOT NULL;
GO

-- Índice único FILTRADO sobre Sucursal+Producto+Estado: un producto NO serializado
-- (IMEI NULL) tiene una sola fila de stock por sucursal/estado (se incrementa, no se
-- duplica). Filtrado a IMEI IS NULL para no chocar con productos serializados, donde
-- cada unidad es su propia fila (identificada por IMEI, ver índice de arriba) y puede
-- haber varias filas para el mismo Sucursal+Producto+Estado.
SET QUOTED_IDENTIFIER ON;
CREATE UNIQUE INDEX UQ_Inventario_SucursalProducto ON Inventario(IdSucursal, IdProducto, IdEstadoInventario) WHERE IMEI IS NULL;
GO

CREATE TABLE ListaPrecio ( -- Regla de formación de precio por categoría de producto (Ej: "Mayorista Smartphones"). La lista Id=1 es el fallback default cuando un producto no tiene lista activa para su categoría.
    Id                     INT           PRIMARY KEY IDENTITY,
    Nombre                 NVARCHAR(100) NOT NULL,
    PorcentajeRentabilidad DECIMAL(5, 2) NOT NULL CHECK (PorcentajeRentabilidad >= 0), -- % de ganancia que se aplica sobre el CostoReal.
    FactorCostosVariables   DECIMAL(5, 2) NOT NULL CHECK (FactorCostosVariables >= 0) DEFAULT 26.00,
    Activo                 BIT           NOT NULL DEFAULT 1,
    IdCategoriaProducto    INT           NULL, -- NULL = lista genérica, no atada a una categoría (ej. la lista Id=1 default).
    CONSTRAINT FK_ListaPrecio_Categoria FOREIGN KEY (IdCategoriaProducto) REFERENCES CategoriaProducto (Id)
);
GO

CREATE TABLE PrecioArticulo ( -- Precio concreto vigente de un renglón de Inventario, aplicando una ListaPrecio. Con historial: nunca se pisa un registro, se cierra su vigencia (FechaHasta) y se crea uno nuevo.
    Id                  INT           PRIMARY KEY IDENTITY,
    FechaDesde          DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    FechaHasta          DATETIME2     NULL DEFAULT SYSDATETIME(), -- NULL = vigencia actual.
    ValorFinal          DECIMAL(18,2) NOT NULL CHECK (ValorFinal >= 0), -- Precio de venta resultante (lo que paga el cliente).
    CostoBase           DECIMAL(18,2) NOT NULL CHECK (CostoBase >= 0), -- Lo que costó comprarlo (viene de Compras).
    CostoVariables      DECIMAL(18,2) NOT NULL CHECK (CostoVariables >= 0), -- Costos indirectos calculados sobre el CostoBase.
    CostoReal           DECIMAL(18,2) NOT NULL CHECK (CostoReal >= 0), -- CostoBase + CostosVariables.
    PorcentajeGanancia  DECIMAL(5,2)  NOT NULL CHECK (PorcentajeGanancia >= 0), -- Copiado de ListaPrecio.PorcentajeRentabilidad al momento de calcular.
    IdListaPrecio       INT           NOT NULL,
    IdInventario        INT           NOT NULL,
    CONSTRAINT FK_PrecioArticulo_ListPrecio   FOREIGN KEY (IdListaPrecio)  REFERENCES ListaPrecio (Id),
    CONSTRAINT FK_PrecioArticulo_Invetario    FOREIGN KEY (IdInventario)   REFERENCES Inventario  (Id)
);
GO

-- Acelera la búsqueda del precio vigente de un renglón de inventario (WHERE IdInventario = ? AND FechaHasta IS NULL).
CREATE INDEX IX_PrecioArticulo_InventarioVigencia ON PrecioArticulo (IdInventario, FechaHasta);
GO

CREATE TABLE MovimientoStock ( -- Historial inmutable de todo lo que entra, sale o se transfiere. Auditoría pura.
    Id                INT           PRIMARY KEY IDENTITY, 
    Fecha             DATETIME2     NOT NULL DEFAULT SYSDATETIME(), 
    TipoMovimiento    NVARCHAR(50)  NOT NULL, -- Define por qué se movió (Ingreso, Venta, Traslado, Merma).
    Cantidad          INT           NOT NULL, -- Cuántos entraron (+) o salieron (-).
    Observaciones     NVARCHAR(MAX) NULL, -- Detalle si hubo un ajuste manual.
    IdInventario      INT           NOT NULL, -- Qué producto se movió.
    IdEmpleado        INT           NOT NULL, -- Quién hizo la operación física en el sistema.
    CONSTRAINT FK_MovStock_Invetario  FOREIGN KEY (IdInventario) REFERENCES Inventario (Id), 
    CONSTRAINT FK_MovStock_Empleado   FOREIGN KEY (IdEmpleado)   REFERENCES Usuario (Id) 
);
GO

CREATE TABLE Transferencia ( -- Historial inmutable de todo lo que entra, sale o se transfiere. Auditoría pura.
    Id                   INT           PRIMARY KEY IDENTITY, 
    IdSucursalOrigen     INT           NOT NULL,
    IdSucursalDestino    INT           NOT NULL, 
    IdMovimientoSalida   INT           NOT NULL, -- Vincula la salida de la Suc. Origen
    IdMovimientoIngreso  INT           NOT NULL, -- Vincula la entrada a la Suc. Destino
    CONSTRAINT FK_Transferencia_SucursalOrigen   FOREIGN KEY (IdSucursalOrigen)    REFERENCES Sucursal (Id), 
    CONSTRAINT FK_Transferencia_SucursalDestino  FOREIGN KEY (IdSucursalDestino)   REFERENCES Sucursal (Id), 
    CONSTRAINT FK_Transferencia_MovSalida        FOREIGN KEY (IdMovimientoSalida)  REFERENCES MovimientoStock (Id),
    CONSTRAINT FK_Transferencia_MovIngreso       FOREIGN KEY (IdMovimientoIngreso) REFERENCES MovimientoStock (Id)
);
GO


-----------------------------
--- TABLAS MÓDULO COMPRAS ---
-----------------------------

CREATE TABLE Compra ( -- Cabecera de la factura de compra
    Id                INT            PRIMARY KEY IDENTITY,
    Fecha             DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    TotalCosto        DECIMAL(18, 2) NOT NULL CHECK(TotalCosto >= 0), -- Cuánto costó en total el pedido
    EstadoPago        SMALLINT       NOT NULL DEFAULT 1 CHECK (EstadoPago IN (1, 2, 3)), -- 1=Pendiente, 2=Parcial, 3=Pagado (lo calcula el backend, ver compra.service.js)
    SaldoPendiente    DECIMAL(18, 2) NOT NULL DEFAULT 0 CHECK (SaldoPendiente >= 0), -- TotalCosto - TotalPagado, nunca negativo
    IdProveedor       INT            NOT NULL, -- A quién le compramos
    IdSucursalDestino INT            NOT NULL, -- Dónde entra la mercadería
    IdEmpleado        INT            NOT NULL, -- Quién cargó la compra
    CONSTRAINT FK_Compra_Proveedor FOREIGN KEY (IdProveedor)       REFERENCES Proveedor (Id),
    CONSTRAINT FK_Compra_Sucursal  FOREIGN KEY (IdSucursalDestino) REFERENCES Sucursal (Id),
    CONSTRAINT FK_Compra_Empleado  FOREIGN KEY (IdEmpleado)        REFERENCES Usuario (Id)
);
GO

CREATE TABLE DetalleCompra (-- El renglón de lo que compramos 
    Id                  INT            PRIMARY KEY IDENTITY,
    Cantidad            INT            NOT NULL CHECK(Cantidad > 0), 
    PrecioCostoUnitario DECIMAL(18, 2) NOT NULL CHECK(PrecioCostoUnitario >= 0), 
    IdCompra            INT            NOT NULL, 
    IdInventario        INT            NOT NULL, 
    CONSTRAINT FK_DetalleC_Compra          FOREIGN KEY (IdCompra)   REFERENCES Compra (Id), 
    CONSTRAINT FK_DetalleC_Inventario      FOREIGN KEY (IdInventario) REFERENCES Inventario (Id),
    CONSTRAINT UQ_DetalleCompra_Inventario UNIQUE (IdCompra, IdInventario)
);
GO

CREATE TABLE PagoCompra ( -- Pagos financieros por Compras a Proveedores (Salida de dinero)
    Id           INT            PRIMARY KEY IDENTITY,
    Monto        DECIMAL(18, 2) NOT NULL CHECK(Monto > 0), 
    FechaPago    DATETIME2      NOT NULL DEFAULT SYSDATETIME(), 
    IdCompra     INT            NOT NULL, 
    IdMetodoPago INT            NOT NULL, 
    IdTurnoCaja  INT            NOT NULL, -- Vincula el retiro de dinero al turno activo
    CONSTRAINT FK_PagoC_Compra  FOREIGN KEY (IdCompra)     REFERENCES Compra (Id), 
    CONSTRAINT FK_PagoC_Metodo  FOREIGN KEY (IdMetodoPago) REFERENCES MetodoPago (Id), 
    CONSTRAINT FK_PagoC_Turno   FOREIGN KEY (IdTurnoCaja)  REFERENCES TurnoCaja (Id)
);
GO

CREATE TABLE CuentaCorrienteProveedor ( -- Historial cronológico de deuda con cada proveedor (Debe = nueva deuda, Haber = pago que la cancela).
    Id               INT            PRIMARY KEY IDENTITY,
    FechaMovimiento  DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    Concepto         NVARCHAR(100)  NOT NULL, -- Valores fijos que arma el backend (ej. "Factura de Compra", "Pago a cuenta/total"), nunca texto libre del frontend.
    Debe             DECIMAL(18, 2) NOT NULL DEFAULT 0, -- Lo que compraste (Suma tu deuda)
    Haber            DECIMAL(18, 2) NOT NULL DEFAULT 0, -- Lo que pagaste (Resta tu deuda)
    SaldoAcumulado   DECIMAL(18, 2) NOT NULL, -- Saldo del proveedor después de aplicar este movimiento; lo calcula el backend, nunca se recibe del frontend.
    IdCompra         INT            NULL, -- Si el movimiento fue por una compra
    IdProveedor      INT            NOT NULL,
    IdPagoCompra     INT            NULL, -- Si el movimiento fue por un pago
    CONSTRAINT FK_CCProv_Compra     FOREIGN KEY (IdCompra)  REFERENCES Compra (Id),
    CONSTRAINT FK_CCProv_Proveedor  FOREIGN KEY (IdProveedor)  REFERENCES Proveedor (Id),
    CONSTRAINT FK_CCProv_PagoCompra FOREIGN KEY (IdPagoCompra)  REFERENCES PagoCompra (Id)
);
GO

CREATE TABLE DevolucionCompra ( -- Cabecera cuando devolvemos un lote defectuoso al distribuidor.
    Id                INT           PRIMARY KEY IDENTITY,
    Fecha             DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    MontoRecuperado   DECIMAL(18,2) NOT NULL CHECK (MontoRecuperado >= 0),
    Motivo            NVARCHAR(200) NOT NULL, -- Ej: "Pantallas llegaron astilladas"
    IdCompra          INT           NOT NULL, 
    IdTurnoCaja       INT           NOT NULL, -- Dónde entró la plata que nos devolvió el proveedor
    IdEmpleado        INT           NOT NULL,
    CONSTRAINT FK_DevCompra_Compra   FOREIGN KEY (IdCompra)    REFERENCES Compra (Id),
    CONSTRAINT FK_DevCompra_Turno    FOREIGN KEY (IdTurnoCaja) REFERENCES TurnoCaja (Id),
    CONSTRAINT FK_DevCompra_Empleado FOREIGN KEY (IdEmpleado)  REFERENCES Usuario (Id)
);
GO

CREATE TABLE DetalleDevolucionCompra ( -- Los artículos exactos que mandamos de vuelta.
    Id                  INT PRIMARY KEY IDENTITY,
    Cantidad            INT NOT NULL CHECK (Cantidad > 0),
    IdDevolucionCompra  INT NOT NULL,
    IdInventario        INT NOT NULL,
    IdMovimientoStock   INT NOT NULL, -- Fundamental: Registra la salida física de nuestra sucursal.
    CONSTRAINT FK_DetDevCompra_DevCompra      FOREIGN KEY (IdDevolucionCompra) REFERENCES DevolucionCompra (Id),
    CONSTRAINT FK_DetDevCompra_Inventario     FOREIGN KEY (IdInventario)       REFERENCES Inventario (Id),
    CONSTRAINT FK_DetDevCompra_MovStock       FOREIGN KEY (IdMovimientoStock)  REFERENCES MovimientoStock (Id),
    CONSTRAINT UQ_DetalleDevCompra_Inventario UNIQUE (IdDevolucionCompra, IdInventario)
);
GO


----------------------------
--- TABLAS MÓDULO VENTAS ---
----------------------------

CREATE TABLE Cotizacion ( -- Historial diario del valor de la moneda extranjera.
    Id        INT           PRIMARY KEY IDENTITY, 
    Clave     NVARCHAR(50)  NOT NULL, -- Ej: 'DolarBlue', 'DolarOficial'.
    Valor     DECIMAL(18,2) NOT NULL, -- Precio al momento de la captura.
    CreatedAt DATETIME2     NOT NULL DEFAULT SYSDATETIME() -- Fecha y hora para saber con qué dólar se operó.
);
GO

CREATE TABLE Descuento ( -- Promociones temporales que se pueden aplicar en el local.
    Id         INT           PRIMARY KEY IDENTITY, 
    Nombre     NVARCHAR(100) NOT NULL UNIQUE, -- Ej: "Hot Sale 2026", "Descuento Empleado".
    Porcentaje DECIMAL(5,2)  NOT NULL CHECK (Porcentaje >= 0 AND Porcentaje <= 100), -- Qué porcentaje se descuenta (Ej: 15.00).
    Activo     BIT           NOT NULL DEFAULT 1, -- Para habilitar/deshabilitar manualmente.
    FechaDesde DATETIME2     NULL, -- Inicio automático de la promo.
    FechaHasta DATETIME2     NULL -- Fin automático de la promo.
);
GO

CREATE TABLE Venta ( -- Cabecera de la factura/ticket. Datos generales de la transacción comercial.
    Id                INT            PRIMARY KEY IDENTITY, -- PK estándar. Número interno de venta.
    Fecha             DATETIME2      NOT NULL DEFAULT SYSDATETIME(), -- Cuándo se concretó.
    TotalVenta        DECIMAL(18, 2) NOT NULL CHECK(TotalVenta >= 0), -- Total en la moneda principal (ej: USD si está configurado así).
    TotalVentaARS     DECIMAL(18, 2) NOT NULL CHECK(TotalVentaARS >= 0), -- Total cobrado o equivalente en Pesos.
    TotalCosto        DECIMAL(18, 2) NOT NULL CHECK(TotalCosto >= 0), -- Suma de los precios de costo (vital para calcular ganancia por ticket).
    Observaciones     NVARCHAR(MAX)  NULL, -- Detalle para el remito o garantía.
    EstadoPago        BIT            NOT NULL DEFAULT 1, -- 1 si se canceló totalmente, 0 si debe dinero (fiado/cuotas).
    IdTurnoCaja       INT            NOT NULL, -- Dónde ocurrió.
    IdCliente         INT            NOT NULL, -- A quién se le vendió.
    IdEmpleado        INT            NOT NULL, -- Quién la facturó (para comisiones).
    IdCotizacionDolar INT            NOT NULL, -- Congela el precio del dólar al momento de esa venta específica.
    IdDescuento       INT            NULL, -- Qué promo se aplicó (opcional).
    CONSTRAINT FK_Venta_Turno      FOREIGN KEY (IdTurnoCaja)       REFERENCES TurnoCaja (Id), 
    CONSTRAINT FK_Venta_Cliente    FOREIGN KEY (IdCliente)         REFERENCES Usuario (Id), 
    CONSTRAINT FK_Venta_Empleado   FOREIGN KEY (IdEmpleado)        REFERENCES Usuario (Id), 
    CONSTRAINT FK_Venta_Cotizacion FOREIGN KEY (IdCotizacionDolar) REFERENCES Cotizacion (Id), 
    CONSTRAINT FK_Venta_Descuento  FOREIGN KEY (IdDescuento)       REFERENCES Descuento (Id) 
);
GO

CREATE TABLE DetalleVenta ( -- El renglón del ticket. Qué llevó y en qué cantidad.
    Id               INT            PRIMARY KEY IDENTITY,
    Cantidad         INT            NOT NULL CHECK(Cantidad > 0), 
    PrecioUnitario   DECIMAL(18, 2) NOT NULL CHECK(PrecioUnitario >= 0), -- Precio AL MOMENTO de la venta (el precio del catálogo puede cambiar mañana).
    IdVenta          INT            NOT NULL, 
    IdInventario     INT            NOT NULL, 
    CONSTRAINT FK_Detalle_Venta           FOREIGN KEY (IdVenta)      REFERENCES Venta (Id), 
    CONSTRAINT FK_Detalle_Inventario      FOREIGN KEY (IdInventario) REFERENCES Inventario (Id),
    CONSTRAINT UQ_DetalleVenta_Inventario UNIQUE (IdVenta, IdInventario)
);
GO

CREATE TABLE PagoVenta ( -- Relaciona cómo se pagó una venta (permite pagos mixtos: mitad efectivo, mitad tarjeta).
    Id           INT            PRIMARY KEY IDENTITY,
    Monto        DECIMAL(18, 2) NOT NULL CHECK(Monto > 0),
    FechaPago    DATETIME2      NOT NULL DEFAULT SYSDATETIME(), 
    Observacion  NVARCHAR(200)  NULL, -- Ej: "Cupon VISA N° 1234".
    Pagado       BIT            NOT NULL DEFAULT 1, -- Estado de acreditación (útil para transferencias diferidas).
    IdVenta      INT            NOT NULL, 
    IdMetodoPago INT            NOT NULL,
    IdTurnoCaja  INT            NOT NULL, -- SE AGREGA PARA VINCULAR EL COBRO A LA CAJA ACTUAL
    CONSTRAINT FK_Pago_Venta  FOREIGN KEY (IdVenta)      REFERENCES Venta (Id), 
    CONSTRAINT FK_Pago_Metodo FOREIGN KEY (IdMetodoPago) REFERENCES MetodoPago (Id),
    CONSTRAINT FK_Pago_Turno  FOREIGN KEY (IdTurnoCaja)  REFERENCES TurnoCaja (Id)  
);
GO

CREATE TABLE Cuota ( -- Módulo extra por si la empresa financia directamente al cliente (Cuenta Corriente).
    Id               INT            PRIMARY KEY IDENTITY, 
    NumeroCuota      INT            NOT NULL CHECK(NumeroCuota > 0), -- Orden de la cuota (1 de 3).
    MontoCuota       DECIMAL(18, 2) NOT NULL CHECK(MontoCuota > 0), -- Importe a abonar.
    FechaVencimiento DATETIME2      NOT NULL, -- Límite de pago.
    FechaPago        DATETIME2      NULL, -- Cuándo canceló la cuota realmente.
    Recargo          DECIMAL(18, 2) NULL CHECK(Recargo >= 0), -- Punitorios por mora.
    IdVenta          INT            NOT NULL, -- A qué deuda pertenece.
    IdTurnoCaja      INT            NOT NULL, -- SE AGREGA PARA VINCULAR EL COBRO A LA CAJA ACTUAL
    CONSTRAINT FK_Cuota_Venta       FOREIGN KEY (IdVenta)     REFERENCES Venta (Id),
    CONSTRAINT FK_Cuota_Turno       FOREIGN KEY (IdTurnoCaja) REFERENCES TurnoCaja (Id),
    CONSTRAINT UQ_Cuota_VentaNumero UNIQUE (IdVenta, NumeroCuota)
);
GO

CREATE TABLE EstadoReclamo ( -- Catálogo para los estados de garantías (En Revisión, Aprobada, Rechazada)
    Id     INT          PRIMARY KEY IDENTITY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE -- 'En Revisión', 'Aprobada', 'Rechazada'
);
GO

CREATE TABLE ReclamoGarantia ( -- Registro del cliente quejándose de una falla.
    Id               INT           PRIMARY KEY IDENTITY,
    FechaReclamo     DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    MotivoCliente    NVARCHAR(500) NOT NULL, -- "La batería dura 1 hora"
    Resolucion       NVARCHAR(500) NULL, -- "Se cambia por unidad nueva"
    IdDetalleVenta   INT           NOT NULL, -- Qué renglón del ticket original está reclamando
    IdEmpleado       INT           NOT NULL,
    IdEstadoReclamo  INT           NOT NULL DEFAULT 1, -- Por defecto entra como 'En Revisión' (Id 1)
    CONSTRAINT FK_Reclamo_DetalleVenta FOREIGN KEY (IdDetalleVenta)  REFERENCES DetalleVenta (Id),
    CONSTRAINT FK_Reclamo_Empleado     FOREIGN KEY (IdEmpleado)      REFERENCES Usuario (Id),
    CONSTRAINT FK_Reclamo_Estado       FOREIGN KEY (IdEstadoReclamo) REFERENCES EstadoReclamo (Id)
);
GO

CREATE TABLE DevolucionVenta ( -- Cabecera cuando le devolvemos la plata al cliente (RMA).
    Id                INT           PRIMARY KEY IDENTITY,
    Fecha             DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    MontoDevuelto     DECIMAL(18,2) NOT NULL CHECK (MontoDevuelto >= 0),
    Observaciones     NVARCHAR(MAX) NULL,
    IdVenta           INT           NOT NULL, -- A qué ticket original hace referencia
    IdTurnoCaja       INT           NOT NULL, -- De qué caja salió la plata para devolverle
    IdEmpleado        INT           NOT NULL,
    CONSTRAINT FK_DevVenta_Venta    FOREIGN KEY (IdVenta)     REFERENCES Venta (Id),
    CONSTRAINT FK_DevVenta_Turno    FOREIGN KEY (IdTurnoCaja) REFERENCES TurnoCaja (Id),
    CONSTRAINT FK_DevVenta_Empleado FOREIGN KEY (IdEmpleado)  REFERENCES Usuario (Id)
);
GO

CREATE TABLE DetalleDevolucionVenta ( -- Qué producto físico nos devolvió y vuelve a entrar al local.
    Id                    INT PRIMARY KEY IDENTITY,
    Cantidad              INT NOT NULL CHECK (Cantidad > 0),
    IdDevolucionVenta     INT NOT NULL,
    IdInventario          INT NOT NULL,
    IdMovimientoStock     INT NOT NULL, -- Fundamental: Registra que el stock vuelve a subir
    CONSTRAINT FK_DetDevVenta_DevVenta         FOREIGN KEY (IdDevolucionVenta)   REFERENCES DevolucionVenta (Id),
    CONSTRAINT FK_DetDevVenta_Inventario       FOREIGN KEY (IdInventario)        REFERENCES Inventario (Id),
    CONSTRAINT FK_DetDevVenta_MovStock         FOREIGN KEY (IdMovimientoStock)   REFERENCES MovimientoStock (Id),
    CONSTRAINT UQ_DetalleDevVenta_Inventario   UNIQUE (IdDevolucionVenta, IdInventario)
);
GO


----------------------------------
--- TABLAS MÓDULO REPARACIONES ---
----------------------------------

CREATE TABLE EstadoOrden ( -- Catálogo para los estados del taller (Ingresado, Diagnosticando, Listo, etc.)
    Id     INT          PRIMARY KEY IDENTITY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE -- Semáforo de flujo (Ingresado, Diagnosticando, Presupuestado, Listo)
);
GO
     
CREATE TABLE Falla ( -- Catálogo de problemas comunes para acelerar el ingreso al taller.
    Id                  INT           PRIMARY KEY IDENTITY, 
    Nombre              NVARCHAR(100) NOT NULL, -- Ej: "Pantalla Rota", "Pin de carga no funciona".
    Activa              BIT           NOT NULL DEFAULT 1, -- Habilitación.
    IdCategoriaProducto INT           NOT NULL, -- Filtra fallas por tipo (Ej: 'Pantalla Rota' aplica a Celular, no a Auriculares).
    CONSTRAINT FK_Falla_Categoria       FOREIGN KEY (IdCategoriaProducto) REFERENCES CategoriaProducto (Id),
    CONSTRAINT UQ_Falla_NombreCategoria UNIQUE (Nombre, IdCategoriaProducto)
);
GO

CREATE TABLE DispositivoCliente ( -- El aparato que trae el cliente (no es nuestro inventario, es de él).
    Id                  INT           PRIMARY KEY IDENTITY, 
    IMEI                NVARCHAR(50)  NULL, -- Identificador único del celular del cliente para garantías y no cambiar placas.
    Desbloqueo          NVARCHAR(100) NOT NULL, 
    Observaciones       NVARCHAR(500) NOT NULL, -- Ej: "Ingresa con rayón profundo en tapa trasera".
    CreatedAt           DATETIME2     NOT NULL DEFAULT SYSDATETIME(), 
    Activo              BIT           NOT NULL,
    IdCliente           INT           NOT NULL, 
    IdModeloProducto    INT           NOT NULL, 
    IdColor             INT           NULL, 
    IdMemoria           INT           NULL, 
    IdBateria           INT           NULL, 
    IdAlmacenamiento    INT           NULL,
    CONSTRAINT FK_DispCli_Cliente            FOREIGN KEY (IdCliente)        REFERENCES Usuario (Id), 
    CONSTRAINT FK_DispCli_Modelo             FOREIGN KEY (IdModeloProducto) REFERENCES ModeloProducto (Id), 
    CONSTRAINT FK_DispCli_Color              FOREIGN KEY (IdColor)          REFERENCES Color (Id),
    CONSTRAINT FK_DispCli_Memoria            FOREIGN KEY (IdMemoria)        REFERENCES Memoria (Id),
    CONSTRAINT FK_DispCli_Bateria            FOREIGN KEY (IdBateria)        REFERENCES Bateria (Id),
    CONSTRAINT FK_DispCli_Almacenamiento     FOREIGN KEY (IdAlmacenamiento) REFERENCES Almacenamiento (Id)
);
GO

CREATE TABLE OrdenReparacion ( -- El documento legal/remito de que aceptamos intervenir el equipo.
    Id                   INT            PRIMARY KEY IDENTITY, -- PK estándar. Número de OT.
    FechaEmision         DATETIME2      NOT NULL DEFAULT SYSDATETIME(), 
    FechaEntrega         DATETIME2      NULL, 
    CostoRepuestos       DECIMAL(18, 2) NOT NULL DEFAULT 0, -- Sumatoria de piezas usadas
    PrecioManoObra       DECIMAL(18, 2) NOT NULL DEFAULT 0, -- Lo que cobra el técnico
    TotalReparacion      DECIMAL(18, 2) NOT NULL DEFAULT 0, -- Precio final al cliente
    IdEmpleado           INT            NOT NULL, 
    IdDispositivoCliente INT            NOT NULL,
    IdEstadoOrden        INT            NOT NULL DEFAULT 1, -- Por defecto arranca en 'Ingresado' (Id 1)
    CONSTRAINT FK_Orden_Empleado  FOREIGN KEY (IdEmpleado)           REFERENCES Usuario (Id), 
    CONSTRAINT FK_Orden_DispoCli  FOREIGN KEY (IdDispositivoCliente) REFERENCES DispositivoCliente (Id),
    CONSTRAINT FK_Orden_Estado    FOREIGN KEY (IdEstadoOrden)        REFERENCES EstadoOrden (Id)
);
GO

CREATE TABLE OrdenFalla ( -- Relación muchos a muchos: Un ingreso puede tener múltiples problemas reportados.
    Id                INT PRIMARY KEY IDENTITY, 
    IdOrdenReparacion INT NOT NULL, 
    IdFalla           INT NOT NULL, -- Qué falla precargada del catálogo se asignó.
    CONSTRAINT FK_OrdenFalla_Orden FOREIGN KEY (IdOrdenReparacion) REFERENCES OrdenReparacion (Id), 
    CONSTRAINT FK_OrdenFalla_Falla FOREIGN KEY (IdFalla)           REFERENCES Falla (Id),
    CONSTRAINT UQ_OrdenFalla_Unica UNIQUE (IdOrdenReparacion, IdFalla)
);
GO

CREATE TABLE RepuestoOrden ( -- Repuestos usados en el taller
    Id                INT            PRIMARY KEY IDENTITY,
    Cantidad          INT            NOT NULL DEFAULT 1 CHECK(Cantidad > 0),
    PrecioCobrado     DECIMAL(18, 2) NOT NULL CHECK(PrecioCobrado >= 0), -- A cuánto se le cobra el repuesto al cliente
    IdOrdenReparacion INT            NOT NULL,
    IdInventario      INT            NOT NULL, -- El repuesto físico
    CONSTRAINT FK_Repuesto_Orden      FOREIGN KEY (IdOrdenReparacion) REFERENCES OrdenReparacion (Id),
    CONSTRAINT FK_Repuesto_Inventario FOREIGN KEY (IdInventario)      REFERENCES Inventario (Id),
    CONSTRAINT UQ_RepuestoOrden_Unico UNIQUE (IdOrdenReparacion, IdInventario)
);
GO

CREATE TABLE SeguimientoOrden ( -- Trazabilidad: Historial de estados por los que pasa el equipo.
    Id                 INT            PRIMARY KEY IDENTITY, 
    FechaModificacion  DATETIME2      NOT NULL DEFAULT SYSDATETIME(), -- Momento del cambio de estado.
    ObservacionTecnico NVARCHAR(MAX)  NULL, -- Notas del técnico: "Placa sulfatada, no tiene arreglo".
    IdOrdenReparacion  INT            NOT NULL, 
    IdEmpleado         INT            NOT NULL, 
    IdEstadoOrden      INT            NOT NULL, -- A qué estado cambió
    CONSTRAINT FK_Seguimiento_Orden    FOREIGN KEY (IdOrdenReparacion) REFERENCES OrdenReparacion (Id), 
    CONSTRAINT FK_Seguimiento_Empleado FOREIGN KEY (IdEmpleado)        REFERENCES Usuario (Id),
    CONSTRAINT FK_Seguimiento_Estado   FOREIGN KEY (IdEstadoOrden)     REFERENCES EstadoOrden (Id)
);
GO

CREATE TABLE PagoReparacion ( -- Pagos financieros de la reparación
    Id                 INT PRIMARY KEY IDENTITY,
    Monto              DECIMAL(18, 2) NOT NULL CHECK(Monto > 0),
    Senia                DECIMAL(18, 2) NOT NULL DEFAULT 0,
    FechaPago          DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Observacion        NVARCHAR(200) NULL, -- Ej: "Seña inicial" o "Saldo final"
    IdOrdenReparacion  INT NOT NULL,
    IdMetodoPago       INT NOT NULL,
    IdTurnoCaja        INT NOT NULL, -- Vincula el dinero directamente al turno activo
    CONSTRAINT FK_PagoRep_Orden  FOREIGN KEY (IdOrdenReparacion) REFERENCES OrdenReparacion (Id),
    CONSTRAINT FK_PagoRep_Metodo FOREIGN KEY (IdMetodoPago)      REFERENCES MetodoPago (Id),
    CONSTRAINT FK_PagoRep_Turno  FOREIGN KEY (IdTurnoCaja)       REFERENCES TurnoCaja (Id)
);
GO


------------------------------------------
--- VISTAS PARA MÓDULO DE ESTADÍSTICAS ---
------------------------------------------

-- 1. VISTA DE INVENTARIO COMPLETO (Ideal para el Catálogo y Control de Stock)
-- Resuelve todas las claves foráneas para devolver una tabla plana lista para consumir.
-- El precio y el costo salen del PrecioArticulo VIGENTE (FechaHasta IS NULL) de cada
-- renglón de Inventario, tras migrar el modelo de precios a ListaPrecio/PrecioArticulo.
-- Si el renglón todavía no tiene un precio cargado, las columnas de precio quedan NULL
-- (OUTER APPLY). Si hubiera más de una lista vigente, se toma la de FechaDesde más reciente.
-- IMPORTANTE: ValorFinal/CostoReal en PrecioArticulo son USD (moneda central del sistema,
-- ver catalogo.service.js) — las columnas de esta vista se nombran ...USD para no sugerir
-- lo contrario. Cualquier equivalente en ARS se calcula en el momento de mostrar, con la
-- cotización vigente, nunca acá.
GO
CREATE OR ALTER VIEW vw_Inventario_PuntoCell AS
SELECT
    i.Id                            AS IdInventario,
    s.Nombre                        AS Sucursal,
    cp.Nombre                       AS Categoria,
    ma.Nombre                       AS Marca,
    mo.Nombre                       AS Modelo,
    p.Nombre                        AS Producto,
    i.Stock,
    pa.IdListaPrecio,
    pa.ValorFinal                   AS PrecioVentaUSD,
    pa.CostoReal                    AS CostoRealUSD,
    (pa.ValorFinal - pa.CostoReal)  AS GananciaEstimadaUSD
FROM Inventario i
INNER JOIN Sucursal           s  ON i.IdSucursal = s.Id
INNER JOIN Producto           p  ON i.IdProducto = p.Id
INNER JOIN ModeloProducto     mo ON p.IdModeloProducto = mo.Id
INNER JOIN MarcaProducto      ma ON mo.IdMarcaProducto = ma.Id
INNER JOIN CategoriaProducto  cp ON mo.IdCategoriaProducto = cp.Id
OUTER APPLY (
    SELECT TOP 1 pa2.IdListaPrecio, pa2.ValorFinal, pa2.CostoReal
    FROM PrecioArticulo pa2
    WHERE pa2.IdInventario = i.Id AND pa2.FechaHasta IS NULL
    ORDER BY pa2.FechaDesde DESC
) pa
WHERE p.Activo = 1;
GO

-- 2. VISTA DE RESUMEN DE VENTAS (Ideal para el Dashboard del dueño)
-- Muestra el total recaudado y la ganancia neta por venta, cruzando datos de caja y empleados.
CREATE OR ALTER VIEW vw_Resumen_Ventas AS
SELECT 
    v.Id                              AS NroVenta,
    CAST(v.Fecha AS DATE)             AS FechaVenta,
    s.Nombre                          AS Sucursal,
    (emp.Nombre + ' ' + emp.Apellido) AS Vendedor,
    v.TotalVentaARS,
    v.TotalCosto,
    (v.TotalVentaARS - v.TotalCosto)  AS GananciaNetaARS,
    CASE 
        WHEN v.EstadoPago = 1 THEN 'Pagado'
        ELSE 'Con Deuda'
    END AS Estado
FROM Venta v
INNER JOIN TurnoCaja  tc  ON v.IdTurnoCaja = tc.Id
INNER JOIN Sucursal   s   ON tc.IdSucursal = s.Id
INNER JOIN Usuario    emp ON v.IdEmpleado = emp.Id;
GO

-- 3. VISTA DE ESTADO DEL TALLER (Ideal para medir tiempos y ganancias de reparaciones)
-- Permite ver rápidamente cuántos equipos hay, en qué estado y cuánto dinero representan.
CREATE OR ALTER VIEW vw_Estado_Taller AS
SELECT 
    o.Id                              AS NroOrden,
    CAST(o.FechaEmision AS DATE)      AS FechaIngreso,
    eo.Nombre                         AS EstadoOrden, 
    cp.Nombre                         AS TipoDispositivo,
    ma.Nombre                         AS Marca,
    mo.Nombre                         AS Modelo,
    (cli.Nombre + ' ' + cli.Apellido) AS Cliente,
    o.TotalReparacion,
    o.PrecioManoObra                  AS GananciaTaller
FROM OrdenReparacion o
INNER JOIN EstadoOrden         eo  ON o.IdEstadoOrden = eo.Id 
INNER JOIN DispositivoCliente  dc  ON o.IdDispositivoCliente = dc.Id
INNER JOIN Usuario             cli ON dc.IdCliente = cli.Id
INNER JOIN ModeloProducto      mo  ON dc.IdModeloProducto = mo.Id
INNER JOIN MarcaProducto       ma  ON mo.IdMarcaProducto = ma.Id
INNER JOIN CategoriaProducto   cp  ON mo.IdCategoriaProducto = cp.Id;
GO

-- =====================================================================
--  VISTAS DE MÉTRICAS / ESTADÍSTICAS - Yona
--  Pensadas para alimentar un endpoint de dashboard.
--  Las "más X" devuelven el ranking completo: el endpoint hace TOP 1
--  para la tarjeta KPI, o TOP N para un gráfico de barras.
--
--  IMPORTANTE: las 4 métricas de reparación (marca, dispositivo,
--  repuesto y falla) cuentan SOLO órdenes en estado 'Entregado', es
--  decir trabajo efectivamente terminado y entregado al cliente. Así no
--  se inflan con órdenes en proceso ni anuladas.
--  El filtro está centralizado en cada vista como  eo.Nombre = 'Entregado'.
--  Si en tu tabla EstadoOrden el texto exacto difiere, cambiá esa
--  constante en las 4 vistas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) MARCA MÁS REPARADA
--    Una orden = un dispositivo = una marca, así que contar órdenes
--    agrupando por marca es directo (no hay doble conteo).
--    Solo cuenta órdenes Entregadas.
-- ---------------------------------------------------------------------
CREATE OR ALTER VIEW vw_Metricas_MarcaReparada AS
SELECT
    ma.Id                AS IdMarca,
    ma.Nombre            AS Marca,
    COUNT(o.Id)          AS CantidadReparaciones
FROM OrdenReparacion o
INNER JOIN EstadoOrden        eo ON o.IdEstadoOrden        = eo.Id
INNER JOIN DispositivoCliente dc ON o.IdDispositivoCliente = dc.Id
INNER JOIN ModeloProducto     mo ON dc.IdModeloProducto    = mo.Id
INNER JOIN MarcaProducto      ma ON mo.IdMarcaProducto     = ma.Id
WHERE eo.Nombre = 'Entregado'
GROUP BY ma.Id, ma.Nombre;
GO

-- ---------------------------------------------------------------------
-- 2) DISPOSITIVO MÁS REPARADO (a nivel modelo)
--    Incluye Categoria + Marca para que la etiqueta sea legible.
--    Solo cuenta órdenes Entregadas.
-- ---------------------------------------------------------------------
CREATE OR ALTER VIEW vw_Metricas_DispositivoReparado AS
SELECT
    mo.Id                          AS IdModelo,
    cp.Nombre                      AS Categoria,
    ma.Nombre                      AS Marca,
    mo.Nombre                      AS Modelo,
    (ma.Nombre + ' ' + mo.Nombre)  AS Dispositivo,
    COUNT(o.Id)                    AS CantidadReparaciones
FROM OrdenReparacion o
INNER JOIN EstadoOrden        eo  ON o.IdEstadoOrden        = eo.Id
INNER JOIN DispositivoCliente dc  ON o.IdDispositivoCliente = dc.Id
INNER JOIN ModeloProducto     mo  ON dc.IdModeloProducto    = mo.Id
INNER JOIN MarcaProducto      ma  ON mo.IdMarcaProducto     = ma.Id
INNER JOIN CategoriaProducto  cp  ON mo.IdCategoriaProducto = cp.Id
WHERE eo.Nombre = 'Entregado'
GROUP BY mo.Id, cp.Nombre, ma.Nombre, mo.Nombre;
GO

-- ---------------------------------------------------------------------
-- 3) REPUESTO MÁS USADO
--    RepuestoOrden.Cantidad es cuántas unidades del repuesto se usaron.
--    Se agrupa por Articulo (la identidad del repuesto), NO por fila de
--    Inventario, porque un mismo artículo puede estar en varios
--    inventarios (distinta sucursal / estado).
--    Solo cuenta repuestos de órdenes Entregadas.
-- ---------------------------------------------------------------------
CREATE OR ALTER VIEW vw_Metricas_RepuestoUsado AS
SELECT
    p.Id                                 AS IdArticulo,
    p.Nombre                             AS Repuesto,
    SUM(ro.Cantidad)                     AS CantidadUsada,
    COUNT(DISTINCT ro.IdOrdenReparacion) AS EnOrdenes
FROM RepuestoOrden ro
INNER JOIN OrdenReparacion o  ON ro.IdOrdenReparacion = o.Id
INNER JOIN EstadoOrden     eo ON o.IdEstadoOrden       = eo.Id
INNER JOIN Inventario      i  ON ro.IdInventario       = i.Id
INNER JOIN Producto        p  ON i.IdProducto          = p.Id
WHERE eo.Nombre = 'Entregado'
GROUP BY p.Id, p.Nombre;
GO

-- ---------------------------------------------------------------------
-- 4) FALLA QUE MÁS SE REPITE
--    OrdenFalla relaciona N fallas por orden; se cuenta cada aparición.
--    Solo cuenta fallas de órdenes Entregadas. Si querés medir la
--    DEMANDA de ingreso (qué problema llega más, sin importar el
--    resultado), cambiá el filtro a  eo.Nombre <> 'Anulada'.
-- ---------------------------------------------------------------------
CREATE OR ALTER VIEW vw_Metricas_FallaRepetida AS
SELECT
    f.Id            AS IdFalla,
    f.Nombre        AS Falla,
    cp.Nombre       AS Categoria,
    COUNT(ofa.Id)   AS CantidadReportada
FROM OrdenFalla ofa
INNER JOIN OrdenReparacion   o   ON ofa.IdOrdenReparacion = o.Id
INNER JOIN EstadoOrden       eo  ON o.IdEstadoOrden        = eo.Id
INNER JOIN Falla             f   ON ofa.IdFalla            = f.Id
INNER JOIN CategoriaProducto cp  ON f.IdCategoriaProducto  = cp.Id
WHERE eo.Nombre = 'Entregado'
GROUP BY f.Id, f.Nombre, cp.Nombre;
GO

-- ---------------------------------------------------------------------
-- 5) FINANZAS - reparaciones (detalle, una fila por orden ENTREGADA)
--    Modelo de MARGEN (rentabilidad), solo módulo taller:
--      Ingreso  = TotalReparacion (mano de obra + repuestos cobrados)
--      Costo    = SUM(PrecioArticulo.CostoReal * RepuestoOrden.Cantidad)
--                 -> el costo REAL de los repuestos usados, tomado del precio VIGENTE
--                    (FechaHasta IS NULL) de cada renglón de Inventario.
--      Ganancia = Ingreso - Costo
--    Lleva FechaEntrega e IdSucursal (del empleado) para que el endpoint
--    filtre por período o sucursal con un WHERE.
--    El LEFT JOIN contempla órdenes sin repuestos (solo mano de obra):
--    en ese caso Costo = 0. Un repuesto sin PrecioArticulo vigente aporta costo 0.
-- ---------------------------------------------------------------------
CREATE OR ALTER VIEW vw_Finanzas_Reparaciones AS
SELECT
    o.Id                                               AS NroOrden,
    CAST(o.FechaEmision AS DATE)                       AS FechaIngreso,
    CAST(o.FechaEntrega AS DATE)                       AS FechaEntrega,
    emp.IdSucursal                                     AS IdSucursal,
    o.PrecioManoObra                                   AS ManoObra,
    o.TotalReparacion                                  AS Ingreso,
    ISNULL(cr.CostoRepuestos, 0)                       AS Costo,
    (o.TotalReparacion - ISNULL(cr.CostoRepuestos, 0)) AS Ganancia
FROM OrdenReparacion o
INNER JOIN EstadoOrden eo  ON o.IdEstadoOrden = eo.Id
INNER JOIN Usuario     emp ON o.IdEmpleado    = emp.Id
LEFT JOIN (
    SELECT ro.IdOrdenReparacion,
           SUM(ISNULL(pa.CostoReal, 0) * ro.Cantidad) AS CostoRepuestos
    FROM RepuestoOrden ro
    INNER JOIN Inventario i ON ro.IdInventario = i.Id
    OUTER APPLY (
        SELECT TOP 1 pa2.CostoReal
        FROM PrecioArticulo pa2
        WHERE pa2.IdInventario = i.Id AND pa2.FechaHasta IS NULL
        ORDER BY pa2.FechaDesde DESC
    ) pa
    GROUP BY ro.IdOrdenReparacion
) cr ON cr.IdOrdenReparacion = o.Id
WHERE eo.Nombre = 'Entregado';
GO

-- 5b) FINANZAS - resumen (una sola fila: ingreso, costo, ganancia)
CREATE OR ALTER VIEW vw_Finanzas_Resumen AS
SELECT
    ISNULL(SUM(Ingreso),  0) AS TotalIngresos,
    ISNULL(SUM(Costo),    0) AS TotalCostos,
    ISNULL(SUM(Ganancia), 0) AS Ganancia
FROM vw_Finanzas_Reparaciones;
GO

-- ---------------------------------------------------------------------
-- 6) DASHBOARD - una sola fila con todos los KPIs (all-time)
--    Ideal para las "tarjetas" del panel: un solo SELECT.
-- ---------------------------------------------------------------------
CREATE OR ALTER VIEW vw_Dashboard_Metricas AS
SELECT
    (SELECT TOP 1 Marca               FROM vw_Metricas_MarcaReparada      ORDER BY CantidadReparaciones DESC) AS MarcaMasReparada,
    (SELECT TOP 1 CantidadReparaciones FROM vw_Metricas_MarcaReparada     ORDER BY CantidadReparaciones DESC) AS MarcaCantidad,
    (SELECT TOP 1 Dispositivo         FROM vw_Metricas_DispositivoReparado ORDER BY CantidadReparaciones DESC) AS DispositivoMasReparado,
    (SELECT TOP 1 CantidadReparaciones FROM vw_Metricas_DispositivoReparado ORDER BY CantidadReparaciones DESC) AS DispositivoCantidad,
    (SELECT TOP 1 Repuesto            FROM vw_Metricas_RepuestoUsado      ORDER BY CantidadUsada DESC)         AS RepuestoMasUsado,
    (SELECT TOP 1 CantidadUsada       FROM vw_Metricas_RepuestoUsado      ORDER BY CantidadUsada DESC)         AS RepuestoCantidad,
    (SELECT TOP 1 Falla               FROM vw_Metricas_FallaRepetida      ORDER BY CantidadReportada DESC)     AS FallaMasRepetida,
    (SELECT TOP 1 CantidadReportada   FROM vw_Metricas_FallaRepetida      ORDER BY CantidadReportada DESC)     AS FallaCantidad,
    (SELECT TotalIngresos FROM vw_Finanzas_Resumen) AS TotalIngresos,
    (SELECT TotalCostos   FROM vw_Finanzas_Resumen) AS TotalCostos,
    (SELECT Ganancia      FROM vw_Finanzas_Resumen) AS Ganancia;
GO


--------------------
--- INSERTS BASE ---
--------------------

-- Toda la carga de datos (catálogos + operaciones de negocio) corre dentro de UNA sola
-- transacción explícita. Los GO que siguen solo separan batches (necesario para que las
-- DECLARE @variable más abajo tengan alcance de batch); no cierran la transacción, que
-- sigue abierta en la misma sesión de sqlcmd hasta el COMMIT al final del archivo. Con
-- XACT_ABORT ON (seteado arriba), cualquier error revierte TODO lo cargado hasta ese punto.
BEGIN TRANSACTION SeedData;
GO

-- 1. Localidades (Id 1 = La Calera DEFAULT)
-- Guardado con IF NOT EXISTS: ver comentario en el INSERT de Sucursal más abajo sobre por qué
-- init.sql no es idempotente si corre más de una vez contra el mismo volumen.
IF NOT EXISTS (SELECT 1 FROM Localidad)
INSERT INTO Localidad (Nombre) VALUES
('la calera'),
('cordoba capital'),
('villa carlos paz'),
('alta gracia'),
('villa allende'),
('rio ceballos'),
('unquillo');
GO

-- 2. Métodos de Pago
IF NOT EXISTS (SELECT 1 FROM MetodoPago)
INSERT INTO MetodoPago (Nombre) VALUES
('efectivo'),
('billetera virtual (qr/alias)'),
('transferencia bancaria'),
('tarjeta de debito'),
('tarjeta de credito'),
('cuotas'), -- El frontend detecta este método por el nombre (ModalCobro.jsx) para armar el cronograma de cuotas.
('canje'); -- Ídem, para el flujo de alta de equipo recibido en canje/permuta.
GO


--- MÓDULO GESTIÓN DE USUARIOS ---

-- 3. Sucursales
-- Guardado con IF NOT EXISTS: init.sql no es transaccional por lote (CREATE DATABASE /
-- CREATE TABLE no tienen guarda propia y sqlcmd sigue ejecutando el resto del script aunque
-- esas sentencias fallen por "ya existe"), así que si este script corre más de una vez contra
-- el mismo volumen (p. ej. se reinicia el contenedor db-init), este INSERT se ejecutaba de
-- nuevo y duplicaba las sucursales (no hay UNIQUE en Sucursal.Nombre).
IF NOT EXISTS (SELECT 1 FROM Sucursal)
INSERT INTO Sucursal (Nombre, Calle, Numero, Telefono, Activa, IdLocalidad) VALUES 
('La Calera Centro', 'C. Manuel Belgrano', '425', '03513873973', 1, 1),
('La Calera Stoecklin', 'Antinio Sucre', '700', '03518647115', 1, 1);
GO

-- 4. Roles
IF NOT EXISTS (SELECT 1 FROM Rol)
INSERT INTO Rol (Nombre) VALUES 
('administrador'),
('owner'),
('vendedor'),
('tecnico');
GO

-- 5. Permisos
IF NOT EXISTS (SELECT 1 FROM Permiso)
INSERT INTO Permiso (Nombre) VALUES
-- Vendedor (IDs 1 al 10)
('ver estado actual del stock'),
('hacer transferencias de productos entre sucursales'),
('registrar ventas'),
('crear orden de reparacion'),
('editar estado de orden de reparacion a "entregado"'),
('editar estado de orden de reparacion a "anulado"'),
('registrar pago de venta'),
('registrar pago de reparacion'),
('registrar movimientos de caja'),
('realizar apertura y cierre de caja'),
-- Técnico (IDs 11 al 15)
('ver listado de ordenes de reparacion'),
('editar estado de orden de reparacion a "en reparacion"'),
('habilitado a usar el campo "observacion tecnico"'),
('habilitado a usar el campo "repuestos"'),
('editar estado de orden de reparacion a "terminado"'),
-- Dueño (IDs 16 al 19)
('ver lista de usuarios'),
('ver datos personales de usuarios'),
('modificar permisos de usuario'),
('registrar el ingreso de productos'),
-- Administrador (ID 20)
('habilita al usuario a cambiar la pasword');
GO

-- 6. Rol Permiso
INSERT INTO RolPermiso (IdRol, IdPermiso) VALUES
-- Administrador (Tiene todos)
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
(1, 7), (1, 8), (1, 9), (1, 10), (1, 11),
(1, 12), (1, 13), (1, 14), (1, 15), (1, 16),
(1, 17), (1, 18), (1, 19), (1, 20),

-- Dueño (No puede cambiar contraseñas)
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
(2, 6), (2, 7), (2, 8), (2, 9), (2, 10),
(2, 11), (2, 12), (2, 13), (2, 14), (2, 15),
(2, 16), (2, 17), (2, 18), (2, 19),

-- Vendedor (IDs 1 al 10)
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5),
(3, 6), (3, 7), (3, 8), (3, 9), (3, 10),

-- Técnico
(4, 1), (4, 11), (4, 12), (4, 13), (4, 14), (4, 15);
GO

-- 7. Usuarios Base
-- admin / owner / vendedor / tecnico, todos con clave "talleres123456"
-- (Pwd es el hash bcrypt (10 salt rounds) de esa clave, generado con core/utils/bcrypt.js).
-- Credenciales completas al final de este archivo, en el resumen del seed.
IF NOT EXISTS (SELECT 1 FROM Usuario)
BEGIN
    INSERT INTO Usuario (DNI, Apellido, Nombre, Email, Celular, EsCliente, UsuarioEmpleado, Pwd, IdRol, IdSucursal, IdLocalidad) VALUES 
    ('46222805', 'Fanara',      'Maximiliano',   'estudiosfanara@gmail.com',      '3515559506', 0, 'mfanara',      '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 1, 1, 2),
    ('42476297', 'Sclarandi',   'Leandro Simón', 'simonsclarandi.lp@gmail.com',   '3517661740', 0, 'lssclarandi',  '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 1, 1, 2),
    ('43142737', 'Imoberdorf',  'Juan Pablo',    'jpuntocell@gmail.com',          '3513258499', 0, 'jpimoberdorf', '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 1, 1, 2),
    ('44970115', 'Guerrini',    'Juan Pablo',    'juanpiguerrini477@gmail.com',   '3513072911', 0, 'jpguerrini',   '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 1, 1, 2),
    ('44348062', 'Yona',        'Natán',         'natanyona1337@gmail.com',       '3517633173', 0, 'nyona',        '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 1, 1, 2),
    ('10000001', 'Atti',        'Ignacio',       'iatti@puntocell.com.ar',        '3510000001', 0, 'iatti',        '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 2, 1, 1),
    ('10000002', 'Atti',        'Juan Pablo',    'jpatti@puntocell.com.ar',       '3510000002', 0, 'jpatti',       '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 2, 2, 1),
    ('10000003', 'Barrionuevo', 'Augusto',       'abarrionuevo@puntocell.com.ar', '3510000003', 0, 'abarrionuevo', '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 3, 1, 1),
    ('10000004', 'Avila',       'Florencia',     'favila@puntocell.com.ar',       '3510000004', 0, 'favila',       '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 3, 1, 1),
    ('10000005', 'Atti',        'Sofi',          'satti@puntocell.com.ar',        '3510000005', 0, 'satti',        '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 3, 2, 1),
    ('10000006', 'Ramírez',     'Diego',         'tecnico2@puntocell.com.ar',     '3510000006', 0, 'tecnico2',     '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 4, 1, 1),
    ('10000007', 'Atti',        'Guillermo',     'gatti@puntocell.com.ar',        '3510000007', 0, 'gatti',        '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 4, 2, 1);

    -- Clientes
    INSERT INTO Usuario (DNI, Apellido, Nombre, Email, Celular, EsCliente, IdLocalidad) VALUES 
    ('38222333', 'Gómez',  'Martín',  'martin.gomez@cliente.com.ar',  '3512222222', 1, 1),
    ('39111222', 'Pérez',  'Laura',   'laura.perez@email.com',        '3513334444', 1, 2),
    ('40555666', 'López',  'Carlos',  'carlos.lopez@email.com',       '3515556666', 1, 1),
    ('30111222', 'López',  'María',   'maria.lopez@cliente.com.ar',   '3513334444', 1, 2),
    ('28555666', 'Sosa',   'Carlos',  'carlos.sosa@cliente.com.ar',   '3515556666', 1, 1),
    ('33777888', 'Torres', 'Ana',     'ana.torres@cliente.com.ar',    '3517778888', 1, 3),
    ('35999000', 'Medina', 'Julián',  'julian.medina@cliente.com.ar', '3519990000', 1, 1),
    ('40123456', 'Ibáñez', 'Sofía',   'sofia.ibanez@cliente.com.ar',  '3514561230', 1, 5);
END
GO

--- MÓDULO INVENTARIO ---

-- 8. Estados de Inventario
IF NOT EXISTS (SELECT 1 FROM EstadoInventario)
INSERT INTO EstadoInventario (Nombre) VALUES 
('nuevo'), ('usado'), ('reacondicionado'), ('defectuoso');
GO

-- 9. Categorías
IF NOT EXISTS (SELECT 1 FROM CategoriaProducto)
INSERT INTO CategoriaProducto (Nombre, EsDispositivo) VALUES 
('smartphone', 1), ('tablet', 1), ('notebook', 1), ('accesorio', 0), ('repuesto', 0);
GO

-- 10. Marcas
IF NOT EXISTS (SELECT 1 FROM MarcaProducto)
INSERT INTO MarcaProducto (Nombre) VALUES
('apple'),
('samsung'),
('motorola'),
('xiaomi'),
('huawei'),
('google'),
('oneplus'),
('realme'),
('nokia'),
('lg'),
('tcl'),
('generica'); -- para accesorios y repuestos sin marca original
GO

-- 11. Modelos
IF NOT EXISTS (SELECT 1 FROM ModeloProducto)
INSERT INTO ModeloProducto (Nombre, IdMarcaProducto, IdCategoriaProducto) VALUES 
('iPhone 11', 1, 1), ('iPhone 11 Pro', 1, 1), ('iPhone 11 Pro Max', 1, 1), 
('iPhone 12', 1, 1), ('iPhone 12 Pro', 1, 1), ('iPhone 12 Pro Max', 1, 1), 
('iPhone 13', 1, 1), ('iPhone 13 Pro', 1, 1), ('iPhone 13 Pro Max', 1, 1), 
('iPhone 14', 1, 1), ('iPhone 14 Pro', 1, 1), ('iPhone 14 Pro Max', 1, 1), 
('iPhone 15', 1, 1), ('iPhone 15 Pro', 1, 1), ('iPhone 15 Pro Max', 1, 1), 
('iPhone 16', 1, 1), ('iPhone 16 Pro', 1, 1), ('iPhone 16 Pro Max', 1, 1), 
('iPhone 17', 1, 1), ('iPhone 17 Pro', 1, 1), ('iPhone 17 Pro Max', 1, 1),
('Galaxy S24', 2, 1), ('Galaxy S24 Ultra', 2, 1), 
('Galaxy A55', 2, 1), 
('Redmi Note 13', 4, 1), ('Redmi Note 13 Pro', 4, 1), 
('Moto G84', 3, 1), 
('Moto G54', 3, 1), 
('Pixel 8', 6, 1),
('iPad (10ma Gen)', 1, 2), 
('iPad Air M2', 1, 2), 
('Galaxy Tab S9', 2, 2),
('MacBook Air M2', 1, 3), 
('MacBook Pro 14 M3', 1, 3), 
('Galaxy Book4', 2, 3),
('Funda Silicona', 12, 4), 
('Vidrio Templado 9H', 12, 4), 
('Cargador 20W USB-C', 12, 4), 
('Cable USB-C a Lightning', 12, 4), 
('Auriculares Bluetooth', 12, 4), 
('Power Bank 10000mAh', 12, 4), 
('Soporte de Auto Magnético', 12, 4),
('Pantalla iPhone 11', 12, 5), ('Batería iPhone 11', 12, 5), ('Pin de Carga iPhone 11', 12, 5), ('Tapa Trasera iPhone 11', 12, 5), 
('Pantalla iPhone 12', 12, 5), ('Batería iPhone 12', 12, 5), ('Pin de Carga iPhone 12', 12, 5), ('Tapa Trasera iPhone 12', 12, 5), 
('Pantalla iPhone 13', 12, 5), ('Batería iPhone 13', 12, 5), ('Pin de Carga iPhone 13', 12, 5), ('Tapa Trasera iPhone 13', 12, 5), 
('Pantalla iPhone 14', 12, 5), ('Batería iPhone 14', 12, 5), ('Pin de Carga iPhone 14', 12, 5), ('Tapa Trasera iPhone 14', 12, 5), 
('Pantalla iPhone 15', 12, 5), ('Batería iPhone 15', 12, 5), ('Pin de Carga iPhone 15', 12, 5), ('Tapa Trasera iPhone 15', 12, 5), 
('Pantalla iPhone 16', 12, 5), ('Batería iPhone 16', 12, 5), ('Pin de Carga iPhone 16', 12, 5), ('Tapa Trasera iPhone 16', 12, 5), 
('Pantalla Galaxy S24', 12, 5), ('Batería Galaxy S24', 12, 5), 
('Batería Universal 4000mAh', 12, 5), 
('Flex de Carga Universal', 12, 5),
-- Nuevos modelos agregados:
('Cargador Magsafe', 1, 4), 
('MacBook Air 13 M4', 1, 3), 
('iPad Mini A17 Pro', 1, 2), 
('iPhone 16e', 1, 1), ('iPhone 16-plus', 1, 1), 
('iPhone Air', 1, 1), 
('Edge 60', 3, 1), 
('Moto G75', 3, 1), 
('Moto G85', 3, 1), 
('Razr 60', 3, 1), 
('Galaxy S24fe', 2, 1), 
('Galaxy S25', 2, 1), ('Galaxy S25fe', 2, 1), ('Galaxy S25 Edge', 2, 1), ('Galaxy S25 ultra', 2, 1), 
('Galaxy S26', 2, 1), ('Galaxy S26 ultra', 2, 1);
GO

-- 12. Catálogos de Especificaciones
IF NOT EXISTS (SELECT 1 FROM Color)
INSERT INTO Color (Nombre) VALUES 
('negro'), ('blanco'), ('azul'), ('plata'), 
('rojo'), ('verde'), ('dorado'), ('gris espacial'), 
('morado'), ('rosa'), ('titanio natural'), ('titanio azul'), 
('titanio negro'), ('titanio blanco'), ('medianoche'), ('blanco estrella'), 
('amarillo'), ('coral'), ('grafito'), ('lavanda');

IF NOT EXISTS (SELECT 1 FROM Memoria)
INSERT INTO Memoria (Capacidad) VALUES ('2gb'), ('3gb'), ('4gb'), ('6gb'), ('8gb'), ('12gb'), ('16gb'), ('18gb');

IF NOT EXISTS (SELECT 1 FROM Almacenamiento)
INSERT INTO Almacenamiento (Capacidad) VALUES ('32gb'), ('64gb'), ('128gb'), ('256gb'), ('512gb'), ('1tb');

IF NOT EXISTS (SELECT 1 FROM Bateria)
INSERT INTO Bateria (Capacidad, Porcentaje, CiclosCarga) VALUES 
('100% (nueva)', 100.00, 0), ('nueva original', 100.00, 0), 
('95%', 95.00, 120), ('90%', 90.00, 250), 
('85%', 85.00, 400), ('80%', 80.00, 600), 
('75%', 75.00, 850);
GO

-- 13. Productos
IF NOT EXISTS (SELECT 1 FROM Producto)
INSERT INTO Producto (Nombre, EsSerializado, EsVendible, EsRepuesto, Activo, IdModeloProducto) VALUES
('Apple iPhone 11', 1, 1, 0, 1, 1), ('Apple iPhone 11 Pro', 1, 1, 0, 1, 2), ('Apple iPhone 11 Pro Max', 1, 1, 0, 1, 3), 
('Apple iPhone 12', 1, 1, 0, 1, 4), ('Apple iPhone 12 Pro', 1, 1, 0, 1, 5), ('Apple iPhone 12 Pro Max', 1, 1, 0, 1, 6), 
('Apple iPhone 13', 1, 1, 0, 1, 7), ('Apple iPhone 13 Pro', 1, 1, 0, 1, 8), ('Apple iPhone 13 Pro Max', 1, 1, 0, 1, 9), 
('Apple iPhone 14', 1, 1, 0, 1, 10), ('Apple iPhone 14 Pro', 1, 1, 0, 1, 11), ('Apple iPhone 14 Pro Max', 1, 1, 0, 1, 12), 
('Apple iPhone 15', 1, 1, 0, 1, 13), ('Apple iPhone 15 Pro', 1, 1, 0, 1, 14), ('Apple iPhone 15 Pro Max', 1, 1, 0, 1, 15), 
('Apple iPhone 16', 1, 1, 0, 1, 16), ('Apple iPhone 16 Pro', 1, 1, 0, 1, 17), ('Apple iPhone 16 Pro Max', 1, 1, 0, 1, 18), 
('Apple iPhone 17', 1, 1, 0, 1, 19), ('Apple iPhone 17 Pro', 1, 1, 0, 1, 20), ('Apple iPhone 17 Pro Max', 1, 1, 0, 1, 21),
('Samsung Galaxy S24', 1, 1, 0, 1, 22), ('Samsung Galaxy S24 Ultra', 1, 1, 0, 1, 23), 
('Samsung Galaxy A55', 1, 1, 0, 1, 24), 
('Xiaomi Redmi Note 13', 1, 1, 0, 1, 25), ('Xiaomi Redmi Note 13 Pro', 1, 1, 0, 1, 26), 
('Motorola Moto G84', 1, 1, 0, 1, 27), 
('Motorola Moto G54', 1, 1, 0, 1, 28), 
('Google Pixel 8', 1, 1, 0, 1, 29),
('Apple iPad (10ma Gen)', 1, 1, 0, 1, 30), 
('Apple iPad Air M2', 1, 1, 0, 1, 31), 
('Samsung Galaxy Tab S9', 1, 1, 0, 1, 32),
('Apple MacBook Air M2', 1, 1, 0, 1, 33), 
('Apple MacBook Pro 14 M3', 1, 1, 0, 1, 34), 
('Samsung Galaxy Book4', 1, 1, 0, 1, 35),
('Funda Silicona', 0, 1, 0, 1, 36), 
('Vidrio Templado 9H', 0, 1, 0, 1, 37), 
('Cargador 20W USB-C', 0, 1, 0, 1, 38), 
('Cable USB-C a Lightning', 0, 1, 0, 1, 39), 
('Auriculares Bluetooth', 0, 1, 0, 1, 40), 
('Power Bank 10000mAh', 0, 1, 0, 1, 41), 
('Soporte de Auto Magnético', 0, 1, 0, 1, 42),
('Pantalla iPhone 11 (repuesto)', 0, 0, 1, 1, 43), ('Batería iPhone 11 (repuesto)', 0, 0, 1, 1, 44), ('Pin de Carga iPhone 11 (repuesto)', 0, 0, 1, 1, 45), ('Tapa Trasera iPhone 11 (repuesto)', 0, 0, 1, 1, 46), 
('Pantalla iPhone 12 (repuesto)', 0, 0, 1, 1, 47), ('Batería iPhone 12 (repuesto)', 0, 0, 1, 1, 48), ('Pin de Carga iPhone 12 (repuesto)', 0, 0, 1, 1, 49), ('Tapa Trasera iPhone 12 (repuesto)', 0, 0, 1, 1, 50), 
('Pantalla iPhone 13 (repuesto)', 0, 0, 1, 1, 51), ('Batería iPhone 13 (repuesto)', 0, 0, 1, 1, 52), ('Pin de Carga iPhone 13 (repuesto)', 0, 0, 1, 1, 53), ('Tapa Trasera iPhone 13 (repuesto)', 0, 0, 1, 1, 54), 
('Pantalla iPhone 14 (repuesto)', 0, 0, 1, 1, 55), ('Batería iPhone 14 (repuesto)', 0, 0, 1, 1, 56), ('Pin de Carga iPhone 14 (repuesto)', 0, 0, 1, 1, 57), ('Tapa Trasera iPhone 14 (repuesto)', 0, 0, 1, 1, 58), 
('Pantalla iPhone 15 (repuesto)', 0, 0, 1, 1, 59), ('Batería iPhone 15 (repuesto)', 0, 0, 1, 1, 60), ('Pin de Carga iPhone 15 (repuesto)', 0, 0, 1, 1, 61), ('Tapa Trasera iPhone 15 (repuesto)', 0, 0, 1, 1, 62), 
('Pantalla iPhone 16 (repuesto)', 0, 0, 1, 1, 63), ('Batería iPhone 16 (repuesto)', 0, 0, 1, 1, 64), ('Pin de Carga iPhone 16 (repuesto)', 0, 0, 1, 1, 65), ('Tapa Trasera iPhone 16 (repuesto)', 0, 0, 1, 1, 66), 
('Pantalla Galaxy S24 (repuesto)', 0, 0, 1, 1, 67), ('Batería Galaxy S24 (repuesto)', 0, 0, 1, 1, 68), 
('Batería Universal 4000mAh (repuesto)', 0, 0, 1, 1, 69), 
('Flex de Carga Universal (repuesto)', 0, 0, 1, 1, 70),
-- Nuevos productos agregados:
('Apple Cargador Magsafe', 0, 1, 0, 1, 71), 
('Apple MacBook Air 13 M4', 1, 1, 0, 1, 72), 
('Apple iPad Mini A17 Pro', 1, 1, 0, 1, 73), 
('Apple iPhone 16e', 1, 1, 0, 1, 74), ('Apple iPhone 16-plus', 1, 1, 0, 1, 75), 
('Apple iPhone Air', 1, 1, 0, 1, 76), 
('Motorola Edge 60', 1, 1, 0, 1, 77), 
('Motorola Moto G75', 1, 1, 0, 1, 78), 
('Motorola Moto G85', 1, 1, 0, 1, 79), 
('Motorola Razr 60', 1, 1, 0, 1, 80), 
('Samsung Galaxy S24fe', 1, 1, 0, 1, 81), 
('Samsung Galaxy S25', 1, 1, 0, 1, 82), ('Samsung Galaxy S25fe', 1, 1, 0, 1, 83), ('Samsung Galaxy S25 Edge', 1, 1, 0, 1, 84), ('Samsung Galaxy S25 ultra', 1, 1, 0, 1, 85), 
('Samsung Galaxy S26', 1, 1, 0, 1, 86), ('Samsung Galaxy S26 ultra', 1, 1, 0, 1, 87);
GO

-- Imagenes de Productos
IF NOT EXISTS (SELECT 1 FROM Proveedor)
INSERT INTO ImagenProducto (URLRelativa, EsPortada, OrdenVisual, IdProducto) VALUES
('smartphones/apple-iphone-11.webp', 1, 1, 1), ('smartphones/apple-iphone-11-2.webp', 0, 2, 1), ('smartphones/apple-iphone-11-3.webp', 0, 3, 1), ('smartphones/apple-iphone-11-4.webp', 0, 4, 1),
('smartphones/apple-iphone-11-pro.webp', 1, 1, 2), ('smartphones/apple-iphone-11-pro-2.webp', 0, 2, 2), ('smartphones/apple-iphone-11-pro-3.webp', 0, 3, 2), ('smartphones/apple-iphone-11-pro-4.webp', 0, 4, 2),
('smartphones/apple-iphone-11-pro-max.webp', 1, 1, 3), ('smartphones/apple-iphone-11-pro-max-2.webp', 0, 2, 3), ('smartphones/apple-iphone-11-pro-max-3.webp', 0, 3, 3), ('smartphones/apple-iphone-11-pro-max-4.webp', 0, 4, 3),
('smartphones/apple-iphone-12.webp', 1, 1, 4), ('smartphones/apple-iphone-12-2.webp', 0, 2, 4), ('smartphones/apple-iphone-12-3.webp', 0, 3, 4), ('smartphones/apple-iphone-12-4.webp', 0, 4, 4),
('smartphones/apple-iphone-12-pro.webp', 1, 1, 5), ('smartphones/apple-iphone-12-pro-2.webp', 0, 2, 5), ('smartphones/apple-iphone-12-pro-3.webp', 0, 3, 5), ('smartphones/apple-iphone-12-pro-4.webp', 0, 4, 5),
('smartphones/apple-iphone-12-pro-max.webp', 1, 1, 6), ('smartphones/apple-iphone-12-pro-max-2.webp', 1, 2, 6), ('smartphones/apple-iphone-12-pro-max-3.webp', 0, 3, 6), ('smartphones/apple-iphone-12-pro-max-4.webp', 0, 4, 6),
('smartphones/apple-iphone-13.webp', 1, 1, 7), ('smartphones/apple-iphone-13-2.webp', 0, 2, 7), ('smartphones/apple-iphone-13-3.webp', 0, 3, 7), ('smartphones/apple-iphone-13-4.webp', 0, 4, 7),
('smartphones/apple-iphone-13-pro.webp', 1, 1, 8), ('smartphones/apple-iphone-13-pro-2.webp', 0, 2, 8), ('smartphones/apple-iphone-13-pro-3.webp', 0, 3, 8), ('smartphones/apple-iphone-13-pro-4.webp', 0, 4, 8),
('smartphones/apple-iphone-13-pro-max.webp', 1, 1, 9), ('smartphones/apple-iphone-13-pro-max-2.webp', 0, 2, 9), ('smartphones/apple-iphone-13-pro-max-3.webp', 0, 3, 9), ('smartphones/apple-iphone-13-pro-max-4.webp', 0, 4, 9),
('smartphones/apple-iphone-14.webp', 1, 1, 10), ('smartphones/apple-iphone-14-2.webp', 0, 2, 10), ('smartphones/apple-iphone-14-3.webp', 0, 3, 10), ('smartphones/apple-iphone-14-4.webp', 0, 4, 10),
('smartphones/apple-iphone-14-pro.webp', 1, 1, 11), ('smartphones/apple-iphone-14-pro-2.webp', 0, 2, 11), ('smartphones/apple-iphone-14-pro-3.webp', 0, 3, 11), ('smartphones/apple-iphone-14-pro-4.webp', 0, 4, 11),
('smartphones/apple-iphone-14-pro-max.webp', 1, 1, 12), ('smartphones/apple-iphone-14-pro-max-2.webp', 0, 2, 12), ('smartphones/apple-iphone-14-pro-max-3.webp', 0, 3, 12), ('smartphones/apple-iphone-14-pro-max-4.webp', 0, 4, 12),
('smartphones/apple-iphone-15.webp', 1, 1, 13), ('smartphones/apple-iphone-15-2.webp', 0, 2, 13), ('smartphones/apple-iphone-15-3.webp', 0, 3, 13), ('smartphones/apple-iphone-15-4.webp', 0, 4, 13),
('smartphones/apple-iphone-15-pro.webp', 1, 1, 14), ('smartphones/apple-iphone-15-pro-2.webp', 0, 2, 14), ('smartphones/apple-iphone-15-pro-3.webp', 0, 3, 14), ('smartphones/apple-iphone-15-pro-4.webp', 0, 4, 14),
('smartphones/apple-iphone-15-pro-max.webp', 1, 1, 15), ('smartphones/apple-iphone-15-pro-max-2.webp', 0, 2, 15), ('smartphones/apple-iphone-15-pro-max-3.webp', 0, 3, 15), ('smartphones/apple-iphone-15-pro-max-4.webp', 0, 4, 15),
('smartphones/apple-iphone-16.webp', 1, 1, 16), ('smartphones/apple-iphone-16-2.webp', 0, 2, 16), ('smartphones/apple-iphone-16-3.webp', 0, 3, 16), ('smartphones/apple-iphone-16-4.webp', 0, 4, 16),
('smartphones/apple-iphone-16-pro.webp', 1, 1, 17), ('smartphones/apple-iphone-16-pro-2.webp', 0, 2, 17), ('smartphones/apple-iphone-16-pro-3.webp', 0, 3, 17), ('smartphones/apple-iphone-16-pro-4.webp', 0, 4, 17),
('smartphones/apple-iphone-16-pro-max.webp', 1, 1, 18), ('smartphones/apple-iphone-16-pro-max-2.webp', 0, 2, 18), ('smartphones/apple-iphone-16-pro-max-3.webp', 0, 3, 18), ('smartphones/apple-iphone-16-pro-max-4.webp', 0, 4, 18),
('smartphones/apple-iphone-17.webp', 1, 1, 19), ('smartphones/apple-iphone-17-2.webp', 0, 2, 19), ('smartphones/apple-iphone-17-3.webp', 0, 3, 19), ('smartphones/apple-iphone-17-4.webp', 0, 4, 19),
('smartphones/apple-iphone-17-pro.webp', 1, 1, 20), ('smartphones/apple-iphone-17-pro-2.webp', 0, 2, 20), ('smartphones/apple-iphone-17-pro-3.webp', 0, 3, 20), ('smartphones/apple-iphone-17-pro-4.webp', 0, 4, 20),
('smartphones/apple-iphone-17-pro-max.webp', 1, 1, 21), ('smartphones/apple-iphone-17-pro-max-2.webp', 0, 2, 21), ('smartphones/apple-iphone-17-pro-max-3.webp', 0, 3, 21), ('smartphones/apple-iphone-17-pro-max-4.webp', 0, 4, 21),
('smartphones/samsung-galaxy-s24.webp', 1, 1, 22), ('smartphones/samsung-galaxy-s24-2.webp', 0, 2, 22), ('smartphones/samsung-galaxy-s24-3.webp', 0, 3, 22), ('smartphones/samsung-galaxy-s24-4.webp', 0, 4, 22),
('smartphones/samsung-galaxy-s24-ultra.webp', 1, 1, 23), ('smartphones/samsung-galaxy-s24-ultra-2.webp', 0, 2, 23), ('smartphones/samsung-galaxy-s24-ultra-3.webp', 0, 3, 23), ('smartphones/samsung-galaxy-s24-ultra-4.webp', 0, 4, 23),
('smartphones/samsung-galaxy-a55.webp', 1, 1, 24),
('smartphones/xiaomi-redmi-note-13.webp', 1, 1, 25),
('smartphones/xiaomi-redmi-note-13-pro.webp', 1, 1, 26),
('smartphones/motorola-moto-g84.webp', 1, 1, 27), ('smartphones/motorola-moto-g84-2.webp', 0, 2, 27), ('smartphones/motorola-moto-g84-3.webp', 0, 3, 27), ('smartphones/motorola-moto-g84-4.webp', 0, 4, 27),
('smartphones/motorola-moto-g54.webp', 1, 1, 28), ('smartphones/motorola-moto-g54-2.webp', 0, 2, 28), ('smartphones/motorola-moto-g54-3.webp', 0, 3, 28), ('smartphones/motorola-moto-g54-4.webp', 0, 4, 28),
('smartphones/google-pixel-8.webp', 1, 1, 29),
('tablets/apple-ipad-10ma-gen.webp', 1, 1, 30), ('tablets/apple-ipad-10ma-gen-2.webp', 0, 2, 30), ('tablets/apple-ipad-10ma-gen-3.webp', 0, 3, 30), ('tablets/apple-ipad-10ma-gen-4.webp', 0, 4, 30),
('tablets/apple-ipad-air-m2.webp', 1, 1, 31), ('tablets/apple-ipad-air-m2-2.webp', 0, 2, 31), ('tablets/apple-ipad-air-m2-3.webp', 0, 3, 31), ('tablets/apple-ipad-air-m2-4.webp', 0, 4, 31),
('tablets/samsung-galaxy-tab-s9.webp', 1, 1, 32), ('tablets/samsung-galaxy-tab-s9-2.webp', 0, 2, 32), ('tablets/samsung-galaxy-tab-s9-3.webp', 0, 3, 32), ('tablets/samsung-galaxy-tab-s9-4.webp', 0, 4, 32),
('notebooks/apple-macbook-air-m2.webp', 1, 1, 33), ('notebooks/apple-macbook-air-m2-2.webp', 0, 2, 33), ('notebooks/apple-macbook-air-m2-3.webp', 0, 3, 33), ('notebooks/apple-macbook-air-m2-4.webp', 0, 4, 33),
('notebooks/apple-macbook-pro-14-m3.webp', 1, 1, 34), ('notebooks/apple-macbook-pro-14-m3-2.webp', 0, 2, 34), ('notebooks/apple-macbook-pro-14-m3-3.webp', 0, 3, 34), ('notebooks/apple-macbook-pro-14-m3-4.webp', 0, 4, 34),
('notebooks/samsung-galaxy-book4.webp', 1, 1, 35),
('accesorios/funda-silicona.webp', 1, 1, 36),
('accesorios/vidrio-templado-9h.webp', 1, 1, 37),
('accesorios/cargador-20w-usb-c.webp', 1, 1, 38), ('accesorios/cargador-20w-usb-c-2.webp', 0, 2, 38), ('accesorios/cargador-20w-usb-c-3.webp', 0, 3, 38),
('accesorios/cable-usb-c-a-lightning.webp', 1, 1, 39), ('accesorios/cable-usb-c-a-lightning-2.webp', 0, 2, 39), ('accesorios/cable-usb-c-a-lightning-3.webp', 0, 3, 39),
('accesorios/auriculares-bluetooth.webp', 1, 1, 40), ('accesorios/auriculares-bluetooth-2.webp', 0, 2, 40), ('accesorios/auriculares-bluetooth-3.webp', 0, 3, 40), ('accesorios/auriculares-bluetooth-4.webp', 0, 4, 40),
('accesorios/power-bank-10000mah.webp', 1, 1, 41), ('accesorios/power-bank-10000mah-2.webp', 0, 2, 41), ('accesorios/power-bank-10000mah-3.webp', 0, 3, 41), ('accesorios/power-bank-10000mah-4.webp', 0, 4, 41),
('accesorios/soporte-de-auto-magnetico.webp', 1, 1, 42), ('accesorios/soporte-de-auto-magnetico-2.webp', 0, 2, 42), ('accesorios/soporte-de-auto-magnetico-3.webp', 0, 3, 42), ('accesorios/soporte-de-auto-magnetico-4.webp', 0, 4, 42),
('accesorios/apple-cargador-magsafe-1.webp', 1, 1, 71), ('accesorios/apple-cargador-magsafe-2.webp', 0, 2, 71), ('accesorios/apple-cargador-magsafe-3.webp', 0, 3, 71), ('accesorios/apple-cargador-magsafe-4.webp', 0, 4, 71),
('notebooks/apple-macbook-air-13-m4-1.webp', 1, 1, 72), ('notebooks/apple-macbook-air-13-m4-2.webp', 0, 2, 72), ('notebooks/apple-macbook-air-13-m4-3.webp', 0, 3, 72), ('notebooks/apple-macbook-air-13-m4-4.webp', 0, 4, 72),
('tablets/apple-ipad-mini-a17-pro-1.webp', 1, 1, 73), ('tablets/apple-ipad-mini-a17-pro-2.webp', 0, 2, 73), ('tablets/apple-ipad-mini-a17-pro-3.webp', 0, 3, 73), ('tablets/apple-ipad-mini-a17-pro-4.webp', 0, 4, 73),
('smartphones/apple-iphone-16e-1.webp', 1, 1, 74), ('smartphones/apple-iphone-16e-2.webp', 0, 2, 74), ('smartphones/apple-iphone-16e-3.webp', 0, 3, 74), ('smartphones/apple-iphone-16e-4.webp', 0, 4, 74),
('smartphones/apple-iphone-16-plus-1.webp', 1, 1, 75), ('smartphones/apple-iphone-16-plus-2.webp', 0, 2, 75), ('smartphones/apple-iphone-16-plus-3.webp', 0, 3, 75), ('smartphones/apple-iphone-16-plus-4.webp', 0, 4, 75),
('smartphones/apple-iphone-air-1.webp', 1, 1, 76), ('smartphones/apple-iphone-air-2.webp', 0, 2, 76), ('smartphones/apple-iphone-air-3.webp', 0, 3, 76), ('smartphones/apple-iphone-air-4.webp', 0, 4, 76),
('smartphones/motorola-edge-60-1.webp', 1, 1, 77), ('smartphones/motorola-edge-60-2.webp', 0, 2, 77), ('smartphones/motorola-edge-60-3.webp', 0, 3, 77), ('smartphones/motorola-edge-60-4.webp', 0, 4, 77),
('smartphones/motorola-moto-g75-1.webp', 1, 1, 78), ('smartphones/motorola-moto-g75-2.webp', 0, 2, 78), ('smartphones/motorola-moto-g75-3.webp', 0, 3, 78), ('smartphones/motorola-moto-g75-4.webp', 0, 4, 78),
('smartphones/motorola-moto-g85-1.webp', 1, 1, 79), ('smartphones/motorola-moto-g85-2.webp', 0, 2, 79), ('smartphones/motorola-moto-g85-3.webp', 0, 3, 79), ('smartphones/motorola-moto-g85-4.webp', 0, 4, 79),
('smartphones/motorola-razr-60-1.webp', 1, 1, 80), ('smartphones/motorola-razr-60-2.webp', 0, 2, 80), ('smartphones/motorola-razr-60-3.webp', 0, 3, 80), ('smartphones/motorola-razr-60-4.webp', 0, 4, 80),
('smartphones/samsung-galaxy-s24-fe-1.webp', 1, 1, 81), ('smartphones/samsung-galaxy-s24-fe-2.webp', 0, 2, 81), ('smartphones/samsung-galaxy-s24-fe-3.webp', 0, 3, 81), ('smartphones/samsung-galaxy-s24-fe-4.webp', 0, 4, 81),
('smartphones/samsung-galaxy-s25-1.webp', 1, 1, 82), ('smartphones/samsung-galaxy-s25-2.webp', 0, 2, 82), ('smartphones/samsung-galaxy-s25-3.webp', 0, 3, 82), ('smartphones/samsung-galaxy-s25-4.webp', 0, 4, 82),
('smartphones/samsung-galaxy-s25-fe-1.webp', 1, 1, 83), ('smartphones/samsung-galaxy-s25-fe-2.webp', 0, 2, 83), ('smartphones/samsung-galaxy-s25-fe-3.webp', 0, 3, 83), ('smartphones/samsung-galaxy-s25-fe-4.webp', 0, 4, 83),
('smartphones/samsung-galaxy-s25-edge-1.webp', 1, 1, 84), ('smartphones/samsung-galaxy-s25-edge-2.webp', 0, 2, 84), ('smartphones/samsung-galaxy-s25-edge-3.webp', 0, 3, 84), ('smartphones/samsung-galaxy-s25-edge-4.webp', 0, 4, 84),
('smartphones/samsung-galaxy-s25-ultra-1.webp', 1, 1, 85), ('smartphones/samsung-galaxy-s25-ultra-2.webp', 0, 2, 85), ('smartphones/samsung-galaxy-s25-ultra-3.webp', 0, 3, 85), ('smartphones/samsung-galaxy-s25-ultra-4.webp', 0, 4, 85),
('smartphones/samsung-galaxy-s26-1.webp', 1, 1, 86), ('smartphones/samsung-galaxy-s26-2.webp', 0, 2, 86), ('smartphones/samsung-galaxy-s26-3.webp', 0, 3, 86), ('smartphones/samsung-galaxy-s26-4.webp', 0, 4, 86),
('smartphones/samsung-galaxy-s26-ultra-1.webp', 1, 1, 87), ('smartphones/samsung-galaxy-s26-ultra-2.webp', 0, 2, 87), ('smartphones/samsung-galaxy-s26-ultra-3.webp', 0, 3, 87), ('smartphones/samsung-galaxy-s26-ultra-4.webp', 0, 4, 87);
GO

-- 14. Proveedores
IF NOT EXISTS (SELECT 1 FROM Proveedor)
INSERT INTO Proveedor (Nombre, Email, Celular, IdLocalidad) VALUES
('Distribuidora CBA', 'ventas@distribuidoracba.com', '3514445555', 2),
('Apple Importaciones S.A.', 'import@apple.com', '3519998888', 2),
('Repuestos Mayoristas SRL', 'ventas@repuestosmayoristas.com.ar', '3513332222', 1),
('Canje de Clientes', 'canje@puntocell.com.ar', NULL, 1); -- placeholder que usa el front (ver inventarioServices.js) para altas por canje
GO

-- 15. Listas de precios: Id 1 = fallback default (sin categoría) + Minorista/Mayorista
-- por cada categoría de producto. El front detecta "mayorista" por /mayor/i en el Nombre
-- (ver preciosServices.js::idsListasMayoristas).
IF NOT EXISTS (SELECT 1 FROM ListaPrecio)
INSERT INTO ListaPrecio (Nombre, PorcentajeRentabilidad, Activo, IdCategoriaProducto) VALUES
('Lista General (Default)', 30.00, 1, NULL),          -- 1
('Minorista Smartphone', 35.00, 1, 1),                -- 2
('Mayorista Smartphone', 18.00, 1, 1),                -- 3
('Minorista Tablet', 32.00, 1, 2),                    -- 4
('Mayorista Tablet', 16.00, 1, 2),                    -- 5
('Minorista Notebook', 25.00, 1, 3),                  -- 6
('Mayorista Notebook', 12.00, 1, 3),                  -- 7
('Minorista Accesorio', 60.00, 1, 4),                 -- 8
('Mayorista Accesorio', 30.00, 1, 4),                 -- 9
('Minorista Repuesto', 55.00, 1, 5),                  -- 10
('Mayorista Repuesto', 28.00, 1, 5);                  -- 11
GO

-- MÓDULO REPARACIONES CATÁLOGOS BASE
IF NOT EXISTS (SELECT 1 FROM EstadoOrden)
INSERT INTO EstadoOrden (Nombre) VALUES 
('en espera'), ('en reparación'), ('terminado'), 
('entregado'), ('anulado'), ('abandonado');

IF NOT EXISTS (SELECT 1 FROM Falla)
INSERT INTO Falla (Nombre, IdCategoriaProducto) VALUES 
('Cambio de Módulo / Pantalla Rota', 1), ('Pin de carga dañado / No carga', 1), 
('Batería inflada / Se apaga rápido', 1), ('Placa en corto / No enciende', 1), 
('Micrófono / Altavoz dañado', 1), ('Software / Queda en el logo', 1), 
('No toma señal / Sin servicio', 1), ('Cámara con manchas / No enfoca', 1);

IF NOT EXISTS (SELECT 1 FROM EstadoReclamo)
INSERT INTO EstadoReclamo (Nombre) VALUES ('En Revisión'), ('Aprobada'), ('Rechazada');
GO


------------------------------------------------------------------------------
--- CARGA DE DATOS DE NEGOCIO (2025-2026): compras, ventas y reparaciones ---
------------------------------------------------------------------------------
-- Reemplaza al generador anterior (100 filas por tabla vía WHILE + RAND(), montos sin
-- relación con ningún catálogo real, sin PrecioArticulo ni MovimientoStock para lo
-- generado, y un literal IdEstadoOrden=6 que violaba la FK contra el catálogo real de
-- 5 estados). Este bloque:
--   * Distribuye las operaciones en 10 turnos de caja reales entre 2025-02 y 2026-08
--     (siempre antes de hoy), con empleados y sucursales rotando.
--   * Compra stock real (Inventario + PrecioArticulo + MovimientoStock) a partir de un
--     catálogo curado de costos de mercado en USD.
--   * Vende y consume en reparaciones ÚNICAMENTE inventario que ya existe y ya llegó a
--     esa fecha (CreatedAt <= fecha de la operación), y nunca la misma unidad
--     serializada dos veces.
--   * Todos los totales (Compra.TotalCosto, Venta.TotalVenta/TotalVentaARS/TotalCosto,
--     OrdenReparacion.TotalReparacion, CuentaCorrienteProveedor.SaldoAcumulado) se
--     calculan con SQL a partir de sus detalles reales, no son literales tipeados a mano.
--   * Se evita MERGE deliberadamente (ambigüedades conocidas de SQL Server con filas de
--     origen duplicadas); se usa IF EXISTS/ELSE explícito.
-- Sigue dentro de la transacción SeedData abierta más arriba. Usa tablas temporales
-- (#tabla) en vez de variables de tabla (@tabla) para los "planes" de datos que deben
-- sobrevivir a los GO entre fases (una variable @tabla no sobrevive a un GO; una tabla
-- temporal sí, mientras dure la sesión). Se eliminan al final (sección L).

-- A. PROCEDIMIENTOS DE APOYO
CREATE OR ALTER PROCEDURE dbo.usp_Seed_IngresoStock
    @IdProducto INT, @IdSucursal INT, @IdProveedor INT, @IdEstadoInventario INT,
    @Cantidad INT, @Fecha DATETIME2, @IdEmpleado INT, @IdInventario INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @IdInventario = NULL;
    DECLARE @EsSerializado BIT;
    SELECT @EsSerializado = EsSerializado FROM Producto WHERE Id = @IdProducto;

    IF @EsSerializado = 1
    BEGIN
        DECLARE @Imei VARCHAR(50) = '35' + RIGHT('000000000000' + CAST(ABS(CHECKSUM(NEWID())) % 1000000000000 AS VARCHAR(20)), 12) + CAST(ABS(CHECKSUM(NEWID())) % 10 AS VARCHAR(1));
        INSERT INTO Inventario (IMEI, Stock, MesesGarantiaLocal, CreatedAt, IdSucursal, IdProducto, IdEstadoInventario, IdProveedor)
        VALUES (@Imei, 1, DATEADD(MONTH, 12, @Fecha), @Fecha, @IdSucursal, @IdProducto, @IdEstadoInventario, @IdProveedor);
        SET @IdInventario = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        SELECT @IdInventario = Id FROM Inventario WHERE IdProducto = @IdProducto AND IdSucursal = @IdSucursal AND IdEstadoInventario = @IdEstadoInventario AND IMEI IS NULL;
        IF @IdInventario IS NULL
        BEGIN
            INSERT INTO Inventario (IMEI, Stock, MesesGarantiaLocal, CreatedAt, IdSucursal, IdProducto, IdEstadoInventario, IdProveedor)
            VALUES (NULL, @Cantidad, DATEADD(MONTH, 12, @Fecha), @Fecha, @IdSucursal, @IdProducto, @IdEstadoInventario, @IdProveedor);
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

CREATE OR ALTER PROCEDURE dbo.usp_Seed_ConsumoStock
    @IdInventario INT, @Cantidad INT, @Fecha DATETIME2, @IdEmpleado INT, @Motivo NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    IF (SELECT Stock FROM Inventario WHERE Id = @IdInventario) < @Cantidad THROW 50001, 'Stock insuficiente.', 1;
    UPDATE Inventario SET Stock = Stock - @Cantidad WHERE Id = @IdInventario;
    INSERT INTO MovimientoStock (Fecha, TipoMovimiento, Cantidad, Observaciones, IdInventario, IdEmpleado) VALUES (@Fecha, @Motivo, -@Cantidad, @Motivo, @IdInventario, @IdEmpleado);
END
GO

-- B. HISTORIAL DE COTIZACIÓN
DECLARE @m INT = 0;
WHILE @m <= 70
BEGIN
    -- Curva simulada que arranca en ~$150 y escala hasta ~$1450 en 5 años
    INSERT INTO Cotizacion (Clave, Valor, CreatedAt) VALUES ('DolarBlue', 150.00 + (@m * 18.5), DATEADD(MONTH, @m, CAST('2021-01-05' AS DATETIME2)));
    SET @m = @m + 1;
END
GO

-- C. CATÁLOGO DE COSTOS
IF OBJECT_ID('tempdb..#Catalogo') IS NOT NULL DROP TABLE #Catalogo;
CREATE TABLE #Catalogo (IdProducto INT PRIMARY KEY, CostoUSD DECIMAL(18,2));
INSERT INTO #Catalogo (IdProducto, CostoUSD) VALUES
(1, 300), (2, 350), (3, 400), (4, 450), (5, 500), (6, 550), (7, 600), (8, 650), (9, 700), (10, 750), (11, 800), (12, 850), (13, 900), (14, 950), (15, 1000), (16, 1050), (17, 1100), (18, 1200), (19, 1300), (20, 1400), (21, 1500),
(22, 900), (23, 1100), (24, 400), (25, 250), (26, 300), (27, 280), (28, 220), (29, 650),
(30, 450), (31, 600), (32, 800), (33, 1000), (34, 1500), (35, 1200),
(36, 5), (37, 3), (38, 10), (39, 8), (40, 25), (41, 20), (42, 12),
(43, 60), (44, 25), (45, 15), (46, 20), (47, 70), (48, 30), (49, 15), (50, 25), (51, 80), (52, 35), (53, 20), (54, 30), (55, 100), (56, 40), (57, 25), (58, 35), (59, 120), (60, 45), (61, 30), (62, 40), (63, 150), (64, 50), (65, 35), (66, 45), (67, 110), (68, 40), (69, 15), (70, 10),
-- Precios base de los nuevos productos:
(71, 35), (72, 1200), (73, 500), (74, 800), (75, 900), (76, 1000), (77, 450), (78, 350), (79, 400), (80, 850), (81, 650), (82, 1000), (83, 750), (84, 1100), (85, 1300), (86, 1100), (87, 1400);
GO

-- D. TURNOS DE CAJA MASIVOS (2021-2026, 150 turnos generados de a 12 días)
IF OBJECT_ID('tempdb..#Turnos') IS NOT NULL DROP TABLE #Turnos;
-- Se quita el IDENTITY para evitar saltos de caché en SQL Server. Se numera explícitamente.
CREATE TABLE #Turnos (NroPlan INT PRIMARY KEY, Fecha DATE, IdSucursal INT, IdEmpleadoApertura INT, IdEmpleadoCierre INT, MontoInicial DECIMAL(18,2), IdTurnoCaja INT NULL);

DECLARE @t INT = 1;
DECLARE @FechaBase DATE = '2021-01-05';
WHILE @t <= 150
BEGIN
    INSERT INTO #Turnos (NroPlan, Fecha, IdSucursal, IdEmpleadoApertura, IdEmpleadoCierre, MontoInicial)
    VALUES (
        @t,
        DATEADD(DAY, (@t - 1) * 12, @FechaBase), 
        CASE WHEN @t % 2 = 0 THEN 1 ELSE 2 END,
        CASE WHEN @t % 2 = 0 THEN 8 ELSE 10 END,
        CASE WHEN @t % 2 = 0 THEN 9 ELSE 10 END,
        15000.00 + (@t * 100)
    );
    SET @t = @t + 1;
END
GO

DECLARE @ti INT = 1;
DECLARE @FechaT DATE, @SucT INT, @EmpAT INT, @EmpCT INT, @MontoInicT DECIMAL(18,2), @IdTurnoNuevo INT;
WHILE @ti <= 150
BEGIN
    SELECT @FechaT=Fecha, @SucT=IdSucursal, @EmpAT=IdEmpleadoApertura, @EmpCT=IdEmpleadoCierre, @MontoInicT=MontoInicial FROM #Turnos WHERE NroPlan = @ti;
    INSERT INTO TurnoCaja (FechaApertura, FechaCierre, MontoInicial, TotalIngresos, TotalEgresos, MontoCierreFisico, Observaciones, IdSucursal, IdEmpleadoApertura, IdEmpleadoCierre)
    VALUES (DATEADD(HOUR, 9, CAST(@FechaT AS DATETIME2)), DATEADD(HOUR, 20, CAST(@FechaT AS DATETIME2)), @MontoInicT, 0, 0, @MontoInicT, 'Turno masivo 21-26', @SucT, @EmpAT, @EmpCT);
    SET @IdTurnoNuevo = SCOPE_IDENTITY();
    UPDATE #Turnos SET IdTurnoCaja = @IdTurnoNuevo WHERE NroPlan = @ti;
    INSERT INTO Bitacora (Detalle, IdEmpleado, IdSucursal, Accion, Fecha) VALUES ('Apertura de turno', @EmpAT, @SucT, 'Apertura de caja', DATEADD(HOUR, 9, CAST(@FechaT AS DATETIME2))), ('Cierre de turno', @EmpCT, @SucT, 'Cierre de caja', DATEADD(HOUR, 20, CAST(@FechaT AS DATETIME2)));
    SET @ti = @ti + 1;
END
GO

-- E. COMPRAS MASIVAS CON FLUCTUACIÓN DE PRECIOS
IF OBJECT_ID('tempdb..#ComprasPlan') IS NOT NULL DROP TABLE #ComprasPlan;
CREATE TABLE #ComprasPlan (NroPlan INT PRIMARY KEY, Fecha DATE, IdProveedor INT, IdSucursal INT, IdEmpleado INT, IdTurnoPlan INT, IdCompraGenerada INT NULL);

INSERT INTO #ComprasPlan (NroPlan, Fecha, IdProveedor, IdSucursal, IdEmpleado, IdTurnoPlan)
SELECT 1, Fecha, 1, IdSucursal, 1, NroPlan FROM #Turnos WHERE NroPlan = 1;
INSERT INTO #ComprasPlan (NroPlan, Fecha, IdProveedor, IdSucursal, IdEmpleado, IdTurnoPlan)
SELECT 2, Fecha, 2, IdSucursal, 7, NroPlan FROM #Turnos WHERE NroPlan = 2;

DECLARE @cp INT = 15;
DECLARE @c_id INT = 3;
WHILE @cp <= 150
BEGIN
    INSERT INTO #ComprasPlan (NroPlan, Fecha, IdProveedor, IdSucursal, IdEmpleado, IdTurnoPlan)
    SELECT @c_id, Fecha, (@cp % 3) + 1, IdSucursal, CASE WHEN IdSucursal=1 THEN 3 ELSE 5 END, NroPlan 
    FROM #Turnos WHERE NroPlan = @cp;
    SET @cp = @cp + 15;
    SET @c_id = @c_id + 1;
END

IF OBJECT_ID('tempdb..#ComprasDetallePlan') IS NOT NULL DROP TABLE #ComprasDetallePlan;
CREATE TABLE #ComprasDetallePlan (DetalleId INT IDENTITY(1,1) PRIMARY KEY, NroPlan INT, IdProducto INT, Cantidad INT, Procesado BIT NOT NULL DEFAULT 0);

-- Compra inicial enorme para soportar todos los años (incluye a los nuevos 17 productos)
DECLARE @prod INT = 1; WHILE @prod <= 87 BEGIN INSERT INTO #ComprasDetallePlan (NroPlan, IdProducto, Cantidad) VALUES (1, @prod, 35); SET @prod = @prod + 1; END
SET @prod = 1; WHILE @prod <= 60 BEGIN INSERT INTO #ComprasDetallePlan (NroPlan, IdProducto, Cantidad) VALUES (2, @prod, 25); SET @prod = @prod + 1; END

-- Compras de reposición cíclicas
DECLARE @cplan INT = 3;
DECLARE @MaxCPlan INT = (SELECT MAX(NroPlan) FROM #ComprasPlan);
WHILE @cplan <= @MaxCPlan
BEGIN
    INSERT INTO #ComprasDetallePlan (NroPlan, IdProducto, Cantidad) VALUES (@cplan, 45, 10), (@cplan, 52, 10), (@cplan, 10, 5), (@cplan, 38, 20), (@cplan, 36, 15), (@cplan, 69, 10), (@cplan, 72, 3), (@cplan, 85, 5);
    SET @cplan = @cplan + 1;
END

DECLARE @ci INT = 1, @nCompras INT = @MaxCPlan;
DECLARE @IdCompraNuevo INT, @FechaC DATE, @ProvC INT, @SucC INT, @EmpC INT, @TurnoPlanC INT, @TurnoC INT;
DECLARE @DetalleIdActual INT, @IdProductoD INT, @CantidadD INT, @CostoUnit DECIMAL(18,2), @IdInvNuevo INT, @IdCatProd INT;
DECLARE @ListaMin INT, @ListaMay INT, @PctMin DECIMAL(5,2), @PctMay DECIMAL(5,2), @CV DECIMAL(18,2), @CR DECIMAL(18,2);
DECLARE @su INT, @TotalC DECIMAL(18,2), @IdPagoNuevo INT;
DECLARE @FactorInflacion DECIMAL(18,4);

WHILE @ci <= @nCompras
BEGIN
    SELECT @FechaC=Fecha, @ProvC=IdProveedor, @SucC=IdSucursal, @EmpC=IdEmpleado, @TurnoPlanC=IdTurnoPlan FROM #ComprasPlan WHERE NroPlan = @ci;
    SELECT @TurnoC = IdTurnoCaja FROM #Turnos WHERE NroPlan = @TurnoPlanC;

    INSERT INTO Compra (Fecha, TotalCosto, EstadoPago, SaldoPendiente, IdProveedor, IdSucursalDestino, IdEmpleado) VALUES (CAST(@FechaC AS DATETIME2), 0, 1, 0, @ProvC, @SucC, @EmpC);
    SET @IdCompraNuevo = SCOPE_IDENTITY();
    UPDATE #ComprasPlan SET IdCompraGenerada = @IdCompraNuevo WHERE NroPlan = @ci;

    WHILE EXISTS (SELECT 1 FROM #ComprasDetallePlan WHERE NroPlan = @ci AND Procesado = 0)
    BEGIN
        SELECT TOP 1 @DetalleIdActual = DetalleId, @IdProductoD = IdProducto, @CantidadD = Cantidad FROM #ComprasDetallePlan WHERE NroPlan = @ci AND Procesado = 0 ORDER BY DetalleId;
        SET @CostoUnit = NULL; SET @IdCatProd = NULL;
        
        -- Simulamos una fluctuación de precios de mercado (entre -5% y +15% del costo base)
        SET @FactorInflacion = 1.0 + (ABS(CHECKSUM(NEWID())) % 20 - 5) / 100.0;
        SELECT @CostoUnit = CostoUSD * @FactorInflacion FROM #Catalogo WHERE IdProducto = @IdProductoD;
        
        SELECT @IdCatProd = mo.IdCategoriaProducto FROM Producto p JOIN ModeloProducto mo ON p.IdModeloProducto = mo.Id WHERE p.Id = @IdProductoD;

        SELECT @ListaMin = CASE @IdCatProd WHEN 1 THEN 2 WHEN 2 THEN 4 WHEN 3 THEN 6 WHEN 4 THEN 8 WHEN 5 THEN 10 END, @ListaMay = CASE @IdCatProd WHEN 1 THEN 3 WHEN 2 THEN 5 WHEN 3 THEN 7 WHEN 4 THEN 9 WHEN 5 THEN 11 END;
        SELECT @PctMin = PorcentajeRentabilidad FROM ListaPrecio WHERE Id = @ListaMin;
        SELECT @PctMay = PorcentajeRentabilidad FROM ListaPrecio WHERE Id = @ListaMay;
        SET @CV = ROUND(@CostoUnit * 0.26, 2); SET @CR = @CostoUnit + @CV;

        IF (SELECT EsSerializado FROM Producto WHERE Id = @IdProductoD) = 1
        BEGIN
            SET @su = 1;
            WHILE @su <= @CantidadD
            BEGIN
                EXEC dbo.usp_Seed_IngresoStock @IdProducto=@IdProductoD, @IdSucursal=@SucC, @IdProveedor=@ProvC, @IdEstadoInventario=1, @Cantidad=1, @Fecha=@FechaC, @IdEmpleado=@EmpC, @IdInventario=@IdInvNuevo OUTPUT;
                INSERT INTO DetalleCompra (Cantidad, PrecioCostoUnitario, IdCompra, IdInventario) VALUES (1, @CostoUnit, @IdCompraNuevo, @IdInvNuevo);
                INSERT INTO PrecioArticulo (IdInventario, IdListaPrecio, ValorFinal, CostoBase, CostoVariables, CostoReal, PorcentajeGanancia, FechaDesde, FechaHasta) VALUES (@IdInvNuevo, @ListaMin, ROUND(@CR * (1 + @PctMin/100), 2), @CostoUnit, @CV, @CR, @PctMin, CAST(@FechaC AS DATETIME2), NULL), (@IdInvNuevo, @ListaMay, ROUND(@CR * (1 + @PctMay/100), 2), @CostoUnit, @CV, @CR, @PctMay, CAST(@FechaC AS DATETIME2), NULL);
                SET @su = @su + 1;
            END
        END
        ELSE
        BEGIN
            EXEC dbo.usp_Seed_IngresoStock @IdProducto=@IdProductoD, @IdSucursal=@SucC, @IdProveedor=@ProvC, @IdEstadoInventario=1, @Cantidad=@CantidadD, @Fecha=@FechaC, @IdEmpleado=@EmpC, @IdInventario=@IdInvNuevo OUTPUT;
            INSERT INTO DetalleCompra (Cantidad, PrecioCostoUnitario, IdCompra, IdInventario) VALUES (@CantidadD, @CostoUnit, @IdCompraNuevo, @IdInvNuevo);
            IF NOT EXISTS (SELECT 1 FROM PrecioArticulo WHERE IdInventario = @IdInvNuevo)
            BEGIN
                INSERT INTO PrecioArticulo (IdInventario, IdListaPrecio, ValorFinal, CostoBase, CostoVariables, CostoReal, PorcentajeGanancia, FechaDesde, FechaHasta) VALUES (@IdInvNuevo, @ListaMin, ROUND(@CR * (1 + @PctMin/100), 2), @CostoUnit, @CV, @CR, @PctMin, CAST(@FechaC AS DATETIME2), NULL), (@IdInvNuevo, @ListaMay, ROUND(@CR * (1 + @PctMay/100), 2), @CostoUnit, @CV, @CR, @PctMay, CAST(@FechaC AS DATETIME2), NULL);
            END
        END
        UPDATE #ComprasDetallePlan SET Procesado = 1 WHERE DetalleId = @DetalleIdActual;
    END

    UPDATE Compra SET TotalCosto = ISNULL((SELECT SUM(Cantidad * PrecioCostoUnitario) FROM DetalleCompra WHERE IdCompra = @IdCompraNuevo), 0) WHERE Id = @IdCompraNuevo;
    SET @TotalC = (SELECT TotalCosto FROM Compra WHERE Id = @IdCompraNuevo);
    UPDATE Compra SET EstadoPago = 3, SaldoPendiente = 0 WHERE Id = @IdCompraNuevo;
    
    IF @TotalC > 0
    BEGIN
        INSERT INTO PagoCompra (Monto, FechaPago, IdCompra, IdMetodoPago, IdTurnoCaja) VALUES (@TotalC, CAST(@FechaC AS DATETIME2), @IdCompraNuevo, 3, @TurnoC);
        SET @IdPagoNuevo = SCOPE_IDENTITY();
        INSERT INTO CuentaCorrienteProveedor (IdProveedor, FechaMovimiento, Concepto, Debe, Haber, SaldoAcumulado, IdCompra, IdPagoCompra) VALUES (@ProvC, CAST(@FechaC AS DATETIME2), 'Factura de Compra', @TotalC, 0, 0, @IdCompraNuevo, NULL), (@ProvC, DATEADD(MINUTE, 1, CAST(@FechaC AS DATETIME2)), 'Pago a cuenta/total', 0, @TotalC, 0, @IdCompraNuevo, @IdPagoNuevo);
    END
    SET @ci = @ci + 1;
END
GO

-- F. VENTAS MASIVAS 2021-2026 (Consumiendo el stock y turnos iterativamente)
IF OBJECT_ID('tempdb..#VentasPlan') IS NOT NULL DROP TABLE #VentasPlan;
CREATE TABLE #VentasPlan (NroPlan INT PRIMARY KEY, Fecha DATE, IdSucursal INT, IdCliente INT, IdEmpleado INT, IdTurnoPlan INT, NumLineas INT, IdMetodoPago INT, EsCuotas BIT, NumCuotas INT NULL, IdVentaGenerada INT NULL);

DECLARE @v INT = 3; 
DECLARE @v_id INT = 1;
WHILE @v <= 150
BEGIN
    DECLARE @Suc_V INT = (SELECT IdSucursal FROM #Turnos WHERE NroPlan = @v);
    DECLARE @Fch_V DATE = (SELECT Fecha FROM #Turnos WHERE NroPlan = @v);
    DECLARE @Emp_V INT = CASE WHEN @Suc_V = 1 THEN 8 ELSE 10 END;
    
    INSERT INTO #VentasPlan (NroPlan, Fecha, IdSucursal, IdCliente, IdEmpleado, IdTurnoPlan, NumLineas, IdMetodoPago, EsCuotas, NumCuotas) 
    VALUES (@v_id, @Fch_V, @Suc_V, 13 + (@v % 8), @Emp_V, @v, 1 + (@v % 3), 1 + (@v % 5), 0, NULL);
    SET @v_id = @v_id + 1;
    
    IF @v % 3 = 0 
    BEGIN
        INSERT INTO #VentasPlan (NroPlan, Fecha, IdSucursal, IdCliente, IdEmpleado, IdTurnoPlan, NumLineas, IdMetodoPago, EsCuotas, NumCuotas) 
        VALUES (@v_id, @Fch_V, @Suc_V, 13 + ((@v+3) % 8), @Emp_V, @v, 2, 6, 1, 3);
        SET @v_id = @v_id + 1;
    END
    SET @v = @v + 1;
END

DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
DECLARE @vi INT = 1, @nVentas INT = (SELECT MAX(NroPlan) FROM #VentasPlan);
DECLARE @IdVentaNuevo INT, @FechaV DATE, @SucV INT, @CliV INT, @EmpV INT, @TurnoPlanV INT, @TurnoV INT, @LineasV INT, @MetodoV INT, @CuotasV BIT, @NumCuotasV INT;
DECLARE @IdCotiz INT, @ValorCotiz DECIMAL(18,2), @li INT, @IdInvVenta INT, @PrecioUnitUSD DECIMAL(18,2), @SubtotalUSD DECIMAL(18,2), @CostoTotalUSD DECIMAL(18,2), @TotalVentaARS DECIMAL(18,2);
DECLARE @NumCuota INT, @MontoCuota DECIMAL(18,2), @VencCuota DATE, @PagadaCuota BIT, @RecargoCuota DECIMAL(18,2);
DECLARE @candidatos TABLE (IdInventario INT);

WHILE @vi <= @nVentas
BEGIN
    SELECT @FechaV=Fecha, @SucV=IdSucursal, @CliV=IdCliente, @EmpV=IdEmpleado, @TurnoPlanV=IdTurnoPlan, @LineasV=NumLineas, @MetodoV=IdMetodoPago, @CuotasV=EsCuotas, @NumCuotasV=NumCuotas FROM #VentasPlan WHERE NroPlan = @vi;
    SELECT @TurnoV = IdTurnoCaja FROM #Turnos WHERE NroPlan = @TurnoPlanV;
    SELECT TOP 1 @IdCotiz = Id, @ValorCotiz = Valor FROM Cotizacion WHERE Clave = 'DolarBlue' AND CreatedAt <= CAST(@FechaV AS DATETIME2) ORDER BY CreatedAt DESC;

    INSERT INTO Venta (Fecha, TotalVenta, TotalVentaARS, TotalCosto, Observaciones, EstadoPago, IdTurnoCaja, IdCliente, IdEmpleado, IdCotizacionDolar, IdDescuento) VALUES (CAST(@FechaV AS DATETIME2), 0, 0, 0, 'Venta generada 21-26', CASE WHEN @CuotasV = 1 THEN 0 ELSE 1 END, @TurnoV, @CliV, @EmpV, @IdCotiz, NULL);
    SET @IdVentaNuevo = SCOPE_IDENTITY();

    SET @li = 1;
    WHILE @li <= @LineasV
    BEGIN
        SET @IdInvVenta = NULL; DELETE FROM @candidatos;
        INSERT INTO @candidatos (IdInventario) SELECT TOP 1 i.Id FROM Inventario i JOIN Producto p ON i.IdProducto = p.Id WHERE i.IdSucursal = @SucV AND i.Stock > 0 AND i.CreatedAt <= CAST(@FechaV AS DATETIME2) AND p.EsVendible = 1 AND NOT EXISTS (SELECT 1 FROM DetalleVenta dv WHERE dv.IdVenta = @IdVentaNuevo AND dv.IdInventario = i.Id) ORDER BY NEWID();
        SELECT @IdInvVenta = IdInventario FROM @candidatos;

        IF @IdInvVenta IS NOT NULL
        BEGIN
            SET @PrecioUnitUSD = NULL; SELECT TOP 1 @PrecioUnitUSD = pa.ValorFinal FROM PrecioArticulo pa WHERE pa.IdInventario = @IdInvVenta AND pa.FechaHasta IS NULL ORDER BY pa.FechaDesde DESC;
            IF @PrecioUnitUSD IS NOT NULL
            BEGIN
                INSERT INTO DetalleVenta (Cantidad, PrecioUnitario, IdVenta, IdInventario) VALUES (1, @PrecioUnitUSD, @IdVentaNuevo, @IdInvVenta);
                EXEC dbo.usp_Seed_ConsumoStock @IdInventario=@IdInvVenta, @Cantidad=1, @Fecha=@FechaV, @IdEmpleado=@EmpV, @Motivo='Venta';
            END
        END
        SET @li = @li + 1;
    END

    SET @SubtotalUSD = ISNULL((SELECT SUM(Cantidad * PrecioUnitario) FROM DetalleVenta WHERE IdVenta = @IdVentaNuevo), 0);
    SET @CostoTotalUSD = ISNULL((SELECT SUM(dv.Cantidad * pa.CostoReal) FROM DetalleVenta dv JOIN PrecioArticulo pa ON pa.IdInventario = dv.IdInventario AND pa.FechaHasta IS NULL WHERE dv.IdVenta = @IdVentaNuevo), 0);
    SET @TotalVentaARS = ROUND(@SubtotalUSD * @ValorCotiz, 2);

    IF @SubtotalUSD = 0 DELETE FROM Venta WHERE Id = @IdVentaNuevo;
    ELSE
    BEGIN
        UPDATE Venta SET TotalVenta = @SubtotalUSD, TotalVentaARS = @TotalVentaARS, TotalCosto = @CostoTotalUSD WHERE Id = @IdVentaNuevo;
        UPDATE #VentasPlan SET IdVentaGenerada = @IdVentaNuevo WHERE NroPlan = @vi;

        IF @CuotasV = 1
        BEGIN
            SET @NumCuota = 1; SET @MontoCuota = ROUND(@TotalVentaARS / @NumCuotasV, 2);
            WHILE @NumCuota <= @NumCuotasV
            BEGIN
                SET @VencCuota = DATEADD(MONTH, @NumCuota, @FechaV); SET @PagadaCuota = CASE WHEN @VencCuota <= @Hoy THEN 1 ELSE 0 END; SET @RecargoCuota = CASE WHEN @PagadaCuota = 0 AND @VencCuota < @Hoy THEN ROUND(@MontoCuota * 0.05, 2) ELSE 0 END;
                INSERT INTO Cuota (NumeroCuota, MontoCuota, FechaVencimiento, FechaPago, Recargo, IdVenta, IdTurnoCaja) VALUES (@NumCuota, @MontoCuota, CAST(@VencCuota AS DATETIME2), CASE WHEN @PagadaCuota = 1 THEN CAST(@VencCuota AS DATETIME2) ELSE NULL END, @RecargoCuota, @IdVentaNuevo, @TurnoV);
                SET @NumCuota = @NumCuota + 1;
            END
        END
        ELSE
        BEGIN
            INSERT INTO PagoVenta (Monto, FechaPago, Observacion, IdVenta, IdMetodoPago, IdTurnoCaja) VALUES (@TotalVentaARS, CAST(@FechaV AS DATETIME2), 'Pago', @IdVentaNuevo, @MetodoV, @TurnoV);
        END
    END
    SET @vi = @vi + 1;
END
GO

-- G. ÓRDENES DE REPARACIÓN MASIVAS CON TRAZABILIDAD DINÁMICA (2021-2026) 
IF OBJECT_ID('tempdb..#ReparacionesPlan') IS NOT NULL DROP TABLE #ReparacionesPlan;
CREATE TABLE #ReparacionesPlan (NroPlan INT PRIMARY KEY, FechaIngreso DATE, IdCliente INT, IdModeloProducto INT, IdFalla INT, IdTecnico INT, IdEstadoOrdenFinal INT, IdProductoRepuesto INT NULL, CantidadRepuesto INT NULL, PrecioManoObra DECIMAL(18,2));

DECLARE @r INT = 3;
DECLARE @r_id INT = 1;
DECLARE @FchR_Plan DATE, @SucR_Plan INT, @TecR_Plan INT;
WHILE @r <= 150
BEGIN
    SET @FchR_Plan = (SELECT Fecha FROM #Turnos WHERE NroPlan = @r);
    SET @SucR_Plan = (SELECT IdSucursal FROM #Turnos WHERE NroPlan = @r);
    SET @TecR_Plan = CASE WHEN @SucR_Plan = 1 THEN 11 ELSE 12 END;
    
    INSERT INTO #ReparacionesPlan (NroPlan, FechaIngreso, IdCliente, IdModeloProducto, IdFalla, IdTecnico, IdEstadoOrdenFinal, IdProductoRepuesto, CantidadRepuesto, PrecioManoObra) VALUES 
    (@r_id, @FchR_Plan, 13 + (@r % 8), 1 + (@r % 28), 1 + (@r % 8), @TecR_Plan, CASE WHEN @r % 5 = 0 THEN 5 ELSE 4 END, CASE WHEN @r % 2 = 0 THEN 43 + (@r % 15) ELSE NULL END, 1, 15000.00 + (@r * 150));
    SET @r_id = @r_id + 1;
    SET @r = @r + 1;
END

DECLARE @ri INT = 1, @nRep INT = (SELECT MAX(NroPlan) FROM #ReparacionesPlan);
DECLARE @FechaR DATE, @CliR INT, @ModeloR INT, @FallaR INT, @TecR INT, @EstadoFinalR INT, @ProdRepR INT, @CantRepR INT, @ManoObraR DECIMAL(18,2);
DECLARE @IdDispR INT, @IdOrdenR INT, @CostoRepuestosARS DECIMAL(18,2), @PrecioCobradoR DECIMAL(18,2), @IdCotizR INT, @ValorCotizR DECIMAL(18,2);
DECLARE @IdInvRepuesto INT, @FechaEntregaR DATETIME2, @TurnoIngresoR INT, @TurnoEntregaR INT, @SeniaR DECIMAL(18,2);

-- Variables para tiempos dinámicos de seguimiento
DECLARE @DiasParaReparar INT, @DiasParaTerminar INT, @DiasParaEntregar INT, @DiasParaAnular INT;
DECLARE @FechaEstado2 DATETIME2, @FechaEstado3 DATETIME2, @FechaEstado5 DATETIME2;

WHILE @ri <= @nRep
BEGIN
    SELECT @FechaR=FechaIngreso, @CliR=IdCliente, @ModeloR=IdModeloProducto, @FallaR=IdFalla, @TecR=IdTecnico, @EstadoFinalR=IdEstadoOrdenFinal, @ProdRepR=IdProductoRepuesto, @CantRepR=CantidadRepuesto, @ManoObraR=PrecioManoObra FROM #ReparacionesPlan WHERE NroPlan = @ri;
    INSERT INTO DispositivoCliente (Desbloqueo, Observaciones, Activo, IdCliente, IdModeloProducto) VALUES ('Patrón en L', 'Ingresado por técnico', 1, @CliR, @ModeloR);
    SET @IdDispR = SCOPE_IDENTITY();

    SET @CostoRepuestosARS = 0; SET @PrecioCobradoR = 0; SET @IdInvRepuesto = NULL;
    IF @ProdRepR IS NOT NULL
    BEGIN
        SELECT TOP 1 @IdInvRepuesto = Id FROM Inventario WHERE IdProducto = @ProdRepR AND IMEI IS NULL AND Stock > 0 AND CreatedAt <= CAST(@FechaR AS DATETIME2) ORDER BY Id;
        IF @IdInvRepuesto IS NOT NULL
        BEGIN
            SELECT TOP 1 @IdCotizR = Id, @ValorCotizR = Valor FROM Cotizacion WHERE Clave = 'DolarBlue' AND CreatedAt <= CAST(@FechaR AS DATETIME2) ORDER BY CreatedAt DESC;
            SELECT TOP 1 @CostoRepuestosARS = pa.CostoReal * @ValorCotizR FROM PrecioArticulo pa WHERE pa.IdInventario = @IdInvRepuesto AND pa.FechaHasta IS NULL ORDER BY pa.FechaDesde DESC;
            SET @CostoRepuestosARS = ROUND(ISNULL(@CostoRepuestosARS, 0) * @CantRepR, 2);
            SET @PrecioCobradoR = ROUND(@CostoRepuestosARS * 1.6, 2);
        END
    END

    -- Generación de demoras aleatorias para trazabilidad realista
    SET @DiasParaReparar = 1 + (ABS(CHECKSUM(NEWID())) % 3); -- Demora 1 a 3 días en diagnosticar
    SET @DiasParaTerminar = @DiasParaReparar + 1 + (ABS(CHECKSUM(NEWID())) % 5); -- Tarda 1 a 5 días extra en arreglar
    SET @DiasParaEntregar = @DiasParaTerminar + 1 + (ABS(CHECKSUM(NEWID())) % 7); -- El cliente tarda 1 a 7 días en buscarlo
    SET @DiasParaAnular = 1 + (ABS(CHECKSUM(NEWID())) % 4); -- Si se rechaza, pasa en 1 a 4 días

    SET @FechaEstado2 = DATEADD(DAY, @DiasParaReparar, CAST(@FechaR AS DATETIME2));
    SET @FechaEstado3 = DATEADD(DAY, @DiasParaTerminar, CAST(@FechaR AS DATETIME2));
    
    IF @EstadoFinalR = 4 
        SET @FechaEntregaR = DATEADD(DAY, @DiasParaEntregar, CAST(@FechaR AS DATETIME2));
    ELSE 
        SET @FechaEntregaR = NULL;

    SET @FechaEstado5 = DATEADD(DAY, @DiasParaAnular, CAST(@FechaR AS DATETIME2));

    INSERT INTO OrdenReparacion (FechaEmision, FechaEntrega, CostoRepuestos, PrecioManoObra, TotalReparacion, IdEmpleado, IdDispositivoCliente, IdEstadoOrden) VALUES (CAST(@FechaR AS DATETIME2), @FechaEntregaR, @CostoRepuestosARS, @ManoObraR, @PrecioCobradoR + @ManoObraR, @TecR, @IdDispR, @EstadoFinalR);
    SET @IdOrdenR = SCOPE_IDENTITY();

    INSERT INTO OrdenFalla (IdOrdenReparacion, IdFalla) VALUES (@IdOrdenR, @FallaR);

    IF @IdInvRepuesto IS NOT NULL
    BEGIN
        INSERT INTO RepuestoOrden (Cantidad, PrecioCobrado, IdOrdenReparacion, IdInventario) VALUES (@CantRepR, @PrecioCobradoR, @IdOrdenR, @IdInvRepuesto);
        EXEC dbo.usp_Seed_ConsumoStock @IdInventario=@IdInvRepuesto, @Cantidad=@CantRepR, @Fecha=@FechaR, @IdEmpleado=@TecR, @Motivo='Consumo en Reparación';
    END

    -- Trazabilidad de estados en escala de tiempo
    INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) 
    VALUES (CAST(@FechaR AS DATETIME2), 'Equipo recibido en el mostrador', @IdOrdenR, @TecR, 1);

    IF @EstadoFinalR IN (2, 3, 4)
    BEGIN
        INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) 
        VALUES (@FechaEstado2, 'Comienza el proceso de reparación por parte del técnico', @IdOrdenR, @TecR, 2);
    END
    
    IF @EstadoFinalR IN (3, 4)
    BEGIN
        INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) 
        VALUES (@FechaEstado3, 'Reparación finalizada, el equipo se encuentra listo para retirar', @IdOrdenR, @TecR, 3);
    END

    IF @EstadoFinalR = 4
    BEGIN
        INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) 
        VALUES (@FechaEntregaR, 'El cliente retira el equipo reparado', @IdOrdenR, @TecR, 4);
    END

    IF @EstadoFinalR = 5
    BEGIN
        INSERT INTO SeguimientoOrden (FechaModificacion, ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) 
        VALUES (@FechaEstado5, 'El cliente no aceptó el presupuesto, se anula la orden y se devuelve', @IdOrdenR, @TecR, 5);
    END

    SET @TurnoIngresoR = (SELECT TOP 1 IdTurnoCaja FROM #Turnos WHERE Fecha <= @FechaR ORDER BY Fecha DESC);
    SET @SeniaR = ROUND((@PrecioCobradoR + @ManoObraR) * 0.3, 2);
    IF @SeniaR > 0 INSERT INTO PagoReparacion (Monto, Senia, FechaPago, Observacion, IdOrdenReparacion, IdMetodoPago, IdTurnoCaja) VALUES (@SeniaR, @SeniaR, CAST(@FechaR AS DATETIME2), 'Seña inicial', @IdOrdenR, 1, @TurnoIngresoR);
    
    IF @EstadoFinalR = 4
    BEGIN
        SET @TurnoEntregaR = (SELECT TOP 1 IdTurnoCaja FROM #Turnos WHERE Fecha <= CAST(@FechaEntregaR AS DATE) ORDER BY Fecha DESC);
        -- Fallback de seguridad si la suma aleatoria empuja la entrega más allá de la fecha del último turno generado
        IF @TurnoEntregaR IS NULL SET @TurnoEntregaR = @TurnoIngresoR;

        INSERT INTO PagoReparacion (Monto, Senia, FechaPago, Observacion, IdOrdenReparacion, IdMetodoPago, IdTurnoCaja) VALUES (((@PrecioCobradoR + @ManoObraR) - @SeniaR), 0, @FechaEntregaR, 'Saldo final', @IdOrdenR, 1, @TurnoEntregaR);
    END
    SET @ri = @ri + 1;
END
GO

-- H. BACKFILL DE TOTALES DE CADA TURNO
UPDATE tc
SET TotalIngresos = ISNULL(pv.Total, 0) + ISNULL(pr.Total, 0), TotalEgresos = ISNULL(mc.Total, 0), MontoCierreFisico = tc.MontoInicial + ISNULL(pv.Total, 0) + ISNULL(pr.Total, 0) - ISNULL(mc.Total, 0)
FROM TurnoCaja tc
OUTER APPLY (SELECT SUM(Monto) AS Total FROM PagoVenta WHERE IdTurnoCaja = tc.Id) pv
OUTER APPLY (SELECT SUM(Monto) AS Total FROM PagoReparacion WHERE IdTurnoCaja = tc.Id) pr
OUTER APPLY (SELECT SUM(Monto) AS Total FROM MovimientoCaja WHERE IdTurnoCaja = tc.Id AND TipoMovimiento = 0) mc
WHERE tc.Id IN (SELECT IdTurnoCaja FROM #Turnos);
GO

-- I. LIMPIEZA AUXILIAR
IF OBJECT_ID('tempdb..#Turnos') IS NOT NULL DROP TABLE #Turnos;
IF OBJECT_ID('tempdb..#Catalogo') IS NOT NULL DROP TABLE #Catalogo;
IF OBJECT_ID('tempdb..#ComprasPlan') IS NOT NULL DROP TABLE #ComprasPlan;
IF OBJECT_ID('tempdb..#ComprasDetallePlan') IS NOT NULL DROP TABLE #ComprasDetallePlan;
IF OBJECT_ID('tempdb..#VentasPlan') IS NOT NULL DROP TABLE #VentasPlan;
IF OBJECT_ID('tempdb..#ReparacionesPlan') IS NOT NULL DROP TABLE #ReparacionesPlan;
DROP PROCEDURE IF EXISTS dbo.usp_Seed_IngresoStock;
DROP PROCEDURE IF EXISTS dbo.usp_Seed_ConsumoStock;
GO

PRINT 'Carga masiva de datos de negocio finalizada correctamente.';
COMMIT TRANSACTION SeedData;
GO
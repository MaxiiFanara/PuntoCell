USE master; -- Nos posicionamos en la base de datos maestra del sistema para poder crear una nueva.
GO -- Ejecuta el lote de instrucciones anterior antes de continuar.

CREATE DATABASE PuntoCellDesarrollo; -- Crea la estructura física y lógica de la base de datos del proyecto.
GO -- Asegura que la BD esté completamente creada antes de intentar usarla.

USE PuntoCellDesarrollo; -- Cambiamos el contexto a nuestra nueva base de datos para empezar a crear tablas.
GO -- Confirma el cambio de contexto.

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

CREATE TABLE Accion ( -- Catálogo de acciones sensibles para el log de auditoría.
    Id          INT           PRIMARY KEY IDENTITY, 
    Nombre      NVARCHAR(100) NOT NULL, -- Ej: 'Login fallido', 'Anulación de venta'.
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    IdPermiso   INT           NULL, 
    CONSTRAINT FK_Accion_Permiso FOREIGN KEY (IdPermiso) REFERENCES Permiso (Id)
);
GO

CREATE TABLE Bitacora ( -- El "Gran Hermano". Registra todas las operaciones críticas del personal.
    Id         INT           PRIMARY KEY IDENTITY, 
    Detalle    NVARCHAR(MAX) NULL, -- Información adicional (Ej: JSON con los datos borrados).
    IpAddress  NVARCHAR(50)  NULL, -- Desde qué computadora se hizo, por seguridad.
    Fecha      DATETIME2     NOT NULL DEFAULT SYSDATETIME(), -- Momento exacto.
    IdEmpleado INT           NOT NULL, -- Quién fue.
    IdSucursal INT           NOT NULL, -- Dónde estaba logueado.
    IdAccion   INT           NOT NULL, -- Qué hizo.
    CONSTRAINT FK_Bitacora_Empleado FOREIGN KEY (IdEmpleado) REFERENCES Usuario (Id), 
    CONSTRAINT FK_Bitacora_Sucursal FOREIGN KEY (IdSucursal) REFERENCES Sucursal (Id), 
    CONSTRAINT FK_Bitacora_Accion   FOREIGN KEY (IdAccion)   REFERENCES Accion (Id) 
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
    CONSTRAINT FK_MovCaja_Turno    FOREIGN KEY (IdTurnoCaja) REFERENCES TurnoCaja (Id), 
    CONSTRAINT FK_MovCaja_Empleado FOREIGN KEY (IdEmpleado)  REFERENCES Usuario (Id)
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
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    IdModeloProducto     INT           NOT NULL,
    CONSTRAINT FK_Producto_Modelo     FOREIGN KEY (IdModeloProducto)     REFERENCES ModeloProducto (Id)
);
GO

CREATE TABLE Proveedor ( -- Quienes nos suministran el stock de artículos o repuestos.
    Id          INT           PRIMARY KEY IDENTITY, 
    Nombre      NVARCHAR(100) NOT NULL UNIQUE, 
    Email       NVARCHAR(100) NULL UNIQUE, 
    Celular     NVARCHAR(20)  NULL, 
    Activo      BIT           NOT NULL DEFAULT 1, 
    IdLocalidad INT           NULL,
    CONSTRAINT FK_Proveedor_Localidad FOREIGN KEY (IdLocalidad) REFERENCES Localidad (Id) 
);
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

CREATE TABLE Inventario ( -- Representa la cantidad FÍSICA actual de un producto en una sucursal específica. El costo/precio de venta vive en PrecioArticulo (ver más abajo), con historial.
    Id                 INT            PRIMARY KEY IDENTITY,
    IMEI                VARCHAR(50)    NULL, -- Único entre equipos serializados; ver índice único filtrado más abajo.
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
    CONSTRAINT FK_Inventario_Proveedor          FOREIGN KEY (IdProveedor)        REFERENCES Proveedor (Id),
    CONSTRAINT UQ_Inventario_SucursalProducto   UNIQUE (IdSucursal, IdProducto, IdEstadoInventario) -- Ahora la unicidad es por Sucursal + Artículo + ESTADO. Permite tener "5 iPhone 13 Nuevos" y "2 iPhone 13 Defectuosos" sin que la base tire error de duplicado.
);
GO

-- Índice único FILTRADO sobre IMEI: no puede haber dos filas con el mismo IMEI, pero sí
-- múltiples filas con IMEI NULL (accesorios/repuestos no serializados). Un UNIQUE de columna
-- estándar no sirve acá: SQL Server trata todos los NULL como iguales entre sí en un índice
-- único, así que solo dejaría cargar UN producto sin IMEI en todo el inventario.
CREATE UNIQUE INDEX UQ_Inventario_IMEI ON Inventario(IMEI) WHERE IMEI IS NOT NULL;
GO

CREATE TABLE ListaPrecio ( -- Regla de formación de precio por categoría de producto (Ej: "Mayorista Smartphones"). La lista Id=1 es el fallback default cuando un producto no tiene lista activa para su categoría.
    Id                     INT           PRIMARY KEY IDENTITY,
    Nombre                 NVARCHAR(100) NOT NULL,
    PorcentajeRentabilidad DECIMAL(5, 2) NOT NULL CHECK (PorcentajeRentabilidad >= 0), -- % de ganancia que se aplica sobre el CostoReal.
    Activo                 BIT           NOT NULL DEFAULT 1,
    IdCategoriaProducto    INT           NULL, -- NULL = lista genérica, no atada a una categoría (ej. la lista Id=1 default).
    CONSTRAINT FK_ListaPrecio_Categoria FOREIGN KEY (IdCategoriaProducto) REFERENCES CategoriaProducto (Id)
);
GO

CREATE TABLE PrecioArticulo ( -- Precio concreto vigente de un renglón de Inventario, aplicando una ListaPrecio. Con historial: nunca se pisa un registro, se cierra su vigencia (FechaHasta) y se crea uno nuevo.
    Id                 INT            PRIMARY KEY IDENTITY,
    IdInventario       INT            NOT NULL,
    IdListaPrecio      INT            NOT NULL,
    ValorFinal         DECIMAL(18, 2) NOT NULL CHECK (ValorFinal >= 0), -- Precio de venta resultante (lo que paga el cliente).
    CostoBase          DECIMAL(18, 2) NOT NULL CHECK (CostoBase >= 0), -- Lo que costó comprarlo (viene de Compras).
    CostosVariables    DECIMAL(18, 2) NOT NULL CHECK (CostosVariables >= 0), -- Costos indirectos calculados sobre el CostoBase.
    CostoReal          DECIMAL(18, 2) NOT NULL CHECK (CostoReal >= 0), -- CostoBase + CostosVariables.
    PorcentajeGanancia DECIMAL(5, 2)  NOT NULL CHECK (PorcentajeGanancia >= 0), -- Copiado de ListaPrecio.PorcentajeRentabilidad al momento de calcular.
    FechaDesde         DATETIME2      NOT NULL DEFAULT SYSDATETIME(),
    FechaHasta         DATETIME2      NULL, -- NULL = vigencia actual.
    CONSTRAINT FK_PrecioArticulo_Inventario  FOREIGN KEY (IdInventario)  REFERENCES Inventario (Id),
    CONSTRAINT FK_PrecioArticulo_ListaPrecio FOREIGN KEY (IdListaPrecio) REFERENCES ListaPrecio (Id)
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
    CONSTRAINT FK_DetalleC_Compra        FOREIGN KEY (IdCompra)   REFERENCES Compra (Id), 
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
    Id                INT PRIMARY KEY IDENTITY,
    Cantidad          INT NOT NULL DEFAULT 1 CHECK(Cantidad > 0),
    PrecioCobrado     DECIMAL(18, 2) NOT NULL CHECK(PrecioCobrado >= 0), -- A cuánto se le cobra el repuesto al cliente
    IdOrdenReparacion INT NOT NULL,
    IdInventario      INT NOT NULL, -- El repuesto físico
    CONSTRAINT FK_Repuesto_Orden      FOREIGN KEY (IdOrdenReparacion) REFERENCES OrdenReparacion (Id),
    CONSTRAINT FK_Repuesto_Inventario FOREIGN KEY (IdInventario)      REFERENCES Inventario (Id),
    CONSTRAINT UQ_RepuestoOrden_Unico UNIQUE (IdOrdenReparacion, IdInventario)
);
GO

CREATE TABLE SeguimientoOrden ( -- Trazabilidad: Historial de estados por los que pasa el equipo.
    Id                INT            PRIMARY KEY IDENTITY, 
    FechaModificacion DATETIME2      NOT NULL DEFAULT SYSDATETIME(), -- Momento del cambio de estado.
    ObservacionTecnico NVARCHAR(MAX) NULL, -- Notas del técnico: "Placa sulfatada, no tiene arreglo".
    IdOrdenReparacion INT            NOT NULL, 
    IdEmpleado        INT            NOT NULL, 
    IdEstadoOrden     INT            NOT NULL, -- A qué estado cambió
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
-- ROTA (deuda conocida, no se migra en esta tarea): referencia Inventario.PrecioMayor/PrecioMenor/PrecioCosto,
-- columnas eliminadas al migrar el modelo de precios a ListaPrecio/PrecioArticulo. Ningún endpoint de la API
-- la consume hoy, pero SQL Server SÍ valida las columnas al crear la vista (a diferencia de un stored procedure):
-- este CREATE VIEW va a fallar al correr este script contra una base nueva, y la vista directamente no va a
-- existir. Migrar a un JOIN con PrecioArticulo antes de volver a usarla.
GO
CREATE VIEW vw_Inventario_PuntoCell AS
SELECT 
    i.Id                            AS IdInventario,
    s.Nombre                        AS Sucursal,
    cp.Nombre                       AS Categoria,
    ma.Nombre                       AS Marca,
    mo.Nombre                       AS Modelo,
    p.Nombre                        AS Producto,
    i.Stock,
    i.PrecioMayor                   AS PrecioMayorista,
    i.PrecioMenor                   AS PrecioMinorista,
    i.PrecioCosto,
    (i.PrecioMenor - i.PrecioCosto) AS GananciaEstimadaARS
FROM Inventario i
INNER JOIN Sucursal           s  ON i.IdSucursal = s.Id
INNER JOIN Producto           p  ON i.IdProducto = p.Id
INNER JOIN ModeloProducto     mo ON p.IdModeloProducto = mo.Id
INNER JOIN MarcaProducto      ma ON mo.IdMarcaProducto = ma.Id
INNER JOIN CategoriaProducto  cp ON mo.IdCategoriaProducto = cp.Id
WHERE p.Activo = 1;
GO

-- 2. VISTA DE RESUMEN DE VENTAS (Ideal para el Dashboard del dueño)
-- Muestra el total recaudado y la ganancia neta por venta, cruzando datos de caja y empleados.
CREATE VIEW vw_Resumen_Ventas AS
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
CREATE VIEW vw_Estado_Taller AS
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
IF OBJECT_ID('vw_Metricas_MarcaReparada', 'V') IS NOT NULL DROP VIEW vw_Metricas_MarcaReparada;
GO
CREATE VIEW vw_Metricas_MarcaReparada AS
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
IF OBJECT_ID('vw_Metricas_DispositivoReparado', 'V') IS NOT NULL DROP VIEW vw_Metricas_DispositivoReparado;
GO
CREATE VIEW vw_Metricas_DispositivoReparado AS
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
IF OBJECT_ID('vw_Metricas_RepuestoUsado', 'V') IS NOT NULL DROP VIEW vw_Metricas_RepuestoUsado;
GO
CREATE VIEW vw_Metricas_RepuestoUsado AS
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
IF OBJECT_ID('vw_Metricas_FallaRepetida', 'V') IS NOT NULL DROP VIEW vw_Metricas_FallaRepetida;
GO
CREATE VIEW vw_Metricas_FallaRepetida AS
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
--      Costo    = SUM(Inventario.PrecioCosto * RepuestoOrden.Cantidad)
--                 -> el costo REAL de los repuestos usados
--      Ganancia = Ingreso - Costo
--    ROTA (deuda conocida, no se migra en esta tarea): Inventario.PrecioCosto ya no existe (migrado a
--    PrecioArticulo.CostoReal). Este CREATE VIEW va a fallar al correr el script, y en cascada
--    vw_Finanzas_Resumen y vw_Dashboard_Metricas (que dependen de esta) tampoco van a poder crearse.
--    GET /api/estadisticas/finanzas y /dashboard van a devolver error hasta que se migren estas 3 vistas
--    para calcular el costo desde PrecioArticulo en vez de Inventario.PrecioCosto.
--    Lleva FechaEntrega e IdSucursal (del empleado) para que el endpoint
--    filtre por período o sucursal con un WHERE.
--    El LEFT JOIN contempla órdenes sin repuestos (solo mano de obra):
--    en ese caso Costo = 0.
-- ---------------------------------------------------------------------
IF OBJECT_ID('vw_Finanzas_Reparaciones', 'V') IS NOT NULL DROP VIEW vw_Finanzas_Reparaciones;
GO
CREATE VIEW vw_Finanzas_Reparaciones AS
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
           SUM(i.PrecioCosto * ro.Cantidad) AS CostoRepuestos
    FROM RepuestoOrden ro
    INNER JOIN Inventario i ON ro.IdInventario = i.Id
    GROUP BY ro.IdOrdenReparacion
) cr ON cr.IdOrdenReparacion = o.Id
WHERE eo.Nombre = 'Entregado';
GO

-- 5b) FINANZAS - resumen (una sola fila: ingreso, costo, ganancia)
IF OBJECT_ID('vw_Finanzas_Resumen', 'V') IS NOT NULL DROP VIEW vw_Finanzas_Resumen;
GO
CREATE VIEW vw_Finanzas_Resumen AS
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
IF OBJECT_ID('vw_Dashboard_Metricas', 'V') IS NOT NULL DROP VIEW vw_Dashboard_Metricas;
GO
CREATE VIEW vw_Dashboard_Metricas AS
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

-- 1. Localidades (Id 1 = La Calera DEFAULT)
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
INSERT INTO Sucursal (Nombre, Calle, Numero, Telefono, Activa, IdLocalidad) VALUES 
('centro', '', '', '', 1, 1),
('barrio', '', '', '', 1, 1);
GO

-- 5. Roles
INSERT INTO Rol (Nombre) VALUES 
('administrador'),
('owner'),
('vendedor'),
('tecnico');
GO

-- 6. Permisos (Corregido: Sin duplicados)
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

-- 7. Rol Permiso (Corregido a 20 IDs)
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

-- 8. Usuarios Base — login de prueba: admin / owner / vendedor / tecnico, todos con clave "talleres123456"
-- Pwd es el hash bcrypt (10 salt rounds) de "talleres123456", generado con core/utils/bcrypt.js
INSERT INTO Usuario (DNI, Apellido, Nombre, Email, Celular, EsCliente, UsuarioEmpleado, Pwd, IdRol, IdSucursal, IdLocalidad) VALUES 
('10000001', 'Demo', 'Admin', 'admin@puntocell.com.ar', '3510000001', 0, 'admin', '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 1, 1, 1),
('10000002', 'Demo', 'Owner', 'owner@puntocell.com.ar', '3510000002', 0, 'owner', '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 2, 1, 1),
('10000003', 'Demo', 'Vendedor', 'vendedor@puntocell.com.ar', '3510000003', 0, 'vendedor', '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 3, 1, 1),
('10000004', 'Demo', 'Tecnico', 'tecnico@puntocell.com.ar', '3510000004', 0, 'tecnico', '$2b$10$uZxeyOTD8PQQsYSZDpnNC.nDiMrB.niW00XAb90hkkO/Wb0kWZrVy', 4, 1, 1);

-- Cliente genérico (Id resultante: 5)
INSERT INTO Usuario (DNI, Apellido, Nombre, Email, Celular, EsCliente, IdLocalidad) VALUES 
('38222333', 'Gómez', 'Martín', 'martin.gomez@cliente.com.ar', '3512222222', 1, 1);
GO


--- MÓDULO INVENTARIO ---

-- 8. Estados de Inventario (Vital para el catálogo que definimos)
INSERT INTO EstadoInventario (Nombre) VALUES 
('nuevo'),
('usado'),
('reacondicionado'),
('defectuoso');
GO

-- 9. Categorías
INSERT INTO CategoriaProducto(Nombre, EsDispositivo) VALUES 
('smartphone', 1),
('tablet', 1),
('notebook', 1),
('funda / Carcasa', 0),
('cargador / Cable', 0),
('repuesto taller', 0);
GO

-- 10. Marcas
INSERT INTO MarcaProducto(Nombre) VALUES 
('apple'),
('samsung'),
('motorola'),
('xiaomi'),
('genérica');
GO

-- 11. Modelos (Se asocian a Marca y Categoría)
-- Apple (IdMarca 1), Smartphone (IdCat 1)
INSERT INTO ModeloProducto(Nombre, IdMarcaProducto, IdCategoriaProducto) VALUES 
('iPhone 11', 1, 1),
('iPhone 13', 1, 1),
('galaxy a54', 2, 1),
('moto g84', 3, 1),
('pantalla iphone 11', 5, 6),
('funda', 5, 4),
('redmi note 13', 4, 1);
GO

-- 12. Catálogos de Especificaciones
INSERT INTO Color (Nombre) VALUES ('negro'), ('blanco'), ('azul'), ('plata'), ('rojo');

INSERT INTO Memoria (Capacidad) VALUES ('4gb'), ('6gb'), ('8gb'), ('12gb');

INSERT INTO Almacenamiento (Capacidad) VALUES ('64gb'), ('128gb'), ('256gb');

-- Catálogos de Especificaciones (Corregido para Batería)
INSERT INTO Bateria (Capacidad, Porcentaje, CiclosCarga) VALUES ('100% (nueva)', 100.00, 0), ('90%', 90.00, 250), ('85%', 85.00, 400);
GO

-- 13. Productos
-- iPhone 13 256GB (Modelo 2)
INSERT INTO Producto(Nombre, EsSerializado, EsVendible, EsRepuesto, Activo, IdModeloProducto) VALUES 
('apple iPhone 13 256GB', 1, 1, 0, 1, 3);

-- Repuesto: Módulo Pantalla iPhone 11 (Modelo 1)
INSERT INTO Producto (Nombre, EsSerializado, EsVendible, EsRepuesto, Activo, IdModeloProducto) VALUES 
('modulo display pantalla iPhone 11', 0, 0, 1, 1, 5);

-- Accesorio: Funda genérica Samsung A54
INSERT INTO Producto(Nombre, EsSerializado, EsVendible, EsRepuesto, Activo, IdModeloProducto) VALUES 
('funda silicona transparente galaxy a54', 0, 1, 0, 1, 6);
GO

-- 14. Proveedor
INSERT INTO Proveedor (Nombre, Email, Celular, IdLocalidad) VALUES 
('Distribuidora CBA', 'ventas@distribuidoracba.com', '3514445555', 2),
('Apple Importaciones S.A.', 'import@apple.com', '3519998888', 2);
GO

-- 14b. Lista de precios (Id 1 = fallback default, sin categoría específica)
INSERT INTO ListaPrecio (Nombre, PorcentajeRentabilidad, Activo, IdCategoriaProducto) VALUES
('Lista General (Default)', 30.00, 1, NULL);
GO

-- 15. Inventario (Stock físico ingresado en Sucursal 1)
-- Lote de 5 iPhones 13 (IdProducto 1), Estado Nuevo (Id 1), Prov (2), Color Negro (1), 8GB (3), 100% Bat (1), 256GB (3)
INSERT INTO Inventario (Stock, MesesGarantiaMarca, MesesGarantiaLocal, Observaciones, IdSucursal, IdProducto, IdEstadoInventario, IdProveedor, IdColor, IdMemoria, IdBateria, IdAlmacenamiento) VALUES
(5, '2027-01-01', '2026-12-01', 'Lote nuevo sellado en perfectas condiciones', 1, 1, 1, 2, 1, 3, 1, 3);

-- Lote de 20 Fundas (IdProducto 3), Estado Nuevo (Id 1), Prov (1)
INSERT INTO Inventario (Stock, MesesGarantiaMarca, MesesGarantiaLocal, Observaciones, IdSucursal, IdProducto, IdEstadoInventario, IdProveedor) VALUES
(20, NULL, '2026-08-01', 'Fundas genéricas transparentes', 1, 3, 1, 1);
GO

-- 15b. PrecioArticulo (precio vigente de cada renglón de Inventario, usando la Lista General Id=1: CostosVariables = 26% del CostoBase, ValorFinal = CostoReal * (1 + %Ganancia/100), ver precios-articulos.service.js::computeFields)
INSERT INTO PrecioArticulo (IdInventario, IdListaPrecio, ValorFinal, CostoBase, CostosVariables, CostoReal, PorcentajeGanancia, FechaDesde, FechaHasta) VALUES
(1, 1, 1310400.00, 800000.00, 208000.00, 1008000.00, 30.00, SYSDATETIME(), NULL),
(2, 1, 2457.00, 1500.00, 390.00, 1890.00, 30.00, SYSDATETIME(), NULL);
GO

-- 16. MovimientoStock (Registro de auditoría inmutable del ingreso)
INSERT INTO MovimientoStock (TipoMovimiento, Cantidad, Observaciones, IdInventario, IdEmpleado) VALUES
('Ingreso por Compra', 5, 'Lote de celulares recibido correctamente', 1, 3),
('Ingreso por Compra', 20, 'Fundas para exhibición', 2, 3);
GO


--- MÓDULO BITÁCORA Y CAJA ---

-- 17. Acciones (Catálogo de auditoría)
INSERT INTO Accion (Nombre, IdPermiso) VALUES 
('Login exitoso', NULL),
('Login fallido', NULL),
('Apertura de caja', 10),
('Cierre de caja', 10),
('Venta registrada', 3);
GO

-- 18. Turno Caja (Simulamos una caja abierta por el usuario vendedor, Id 3, en Sucursal 1)
INSERT INTO TurnoCaja (MontoInicial, TotalIngresos, TotalEgresos, MontoCierreFisico, Observaciones, IdSucursal, IdEmpleadoApertura, IdEmpleadoCierre) VALUES 
(15000.00, 50000.00, 5000.00, 60000.00, 'Caja del turno mañana, todo en orden', 1, 3, 3);
GO

-- 19. Movimiento Caja (Egreso de dinero de la caja física)
INSERT INTO MovimientoCaja (Monto, TipoMovimiento, Descripcion, IdTurnoCaja, IdEmpleado) VALUES 
(5000.00, 0, 'Retiro para comprar artículos de limpieza', 1, 3);
GO

-- 20. Bitácora (El "Gran Hermano")
INSERT INTO Bitacora (Detalle, IpAddress, IdEmpleado, IdSucursal, IdAccion) VALUES 
('El usuario inició turno en caja correctamente', '192.168.1.15', 3, 1, 3);
GO


--- MÓDULO REPARACIONES ---

-- 21. Estados de las Órdenes del Taller
INSERT INTO EstadoOrden (Nombre) VALUES 
('en espera'),
('en reparación'),
('terminado'),
('entregado'),
('anulado');
GO

-- 22. Fallas 
INSERT INTO Falla (Nombre, IdCategoriaProducto) VALUES 
('Cambio de Módulo / Pantalla Rota', 1),
('Pin de carga dañado / No carga', 1),
('Batería inflada / Se apaga rápido', 1),
('Placa en corto / No enciende', 1),
('Micrófono / Altavoz dañado', 1),
('Software / Queda en el logo', 1);
GO

-- 23. Dispositivo Cliente (El cliente Id 5 trae un equipo propio, Moto G84 - IdModelo 4)
INSERT INTO DispositivoCliente (IMEI, Desbloqueo, Observaciones, Activo, IdCliente, IdModeloProducto, IdColor) VALUES 
('358741258963214', 'Patron L', 'Pantalla astillada, marco golpeado', 1, 5, 4, 1);
GO

-- 24. Orden de Reparación (Ingresa al taller del usuario tecnico, Id 4)
INSERT INTO OrdenReparacion (CostoRepuestos, PrecioManoObra, TotalReparacion, IdEmpleado, IdDispositivoCliente, IdEstadoOrden) VALUES 
(25000.00, 15000.00, 40000.00, 4, 1, 1); -- Estado 1: En espera
GO

-- 25. Orden Falla (Falla Id 1 = Cambio de Módulo / Pantalla)
INSERT INTO OrdenFalla (IdOrdenReparacion, IdFalla) VALUES 
(1, 1);
GO

-- 26. Seguimiento Orden (Trazabilidad del estado)
INSERT INTO SeguimientoOrden (ObservacionTecnico, IdOrdenReparacion, IdEmpleado, IdEstadoOrden) VALUES 
('Equipo ingresado en mostrador, a la espera de desarme por el técnico', 1, 4, 1);
GO

-- 27. Pago Reparacion (El cliente deja una seña para pedir repuesto)
INSERT INTO PagoReparacion (Monto, Senia, Observacion, IdOrdenReparacion, IdMetodoPago, IdTurnoCaja) VALUES 
(10000.00, 10000.00, 'Seña inicial para solicitar módulo', 1, 1, 1);
GO


--- MÓDULO COMPRAS ---

-- 28. Compra (Cabecera de la factura al proveedor)
INSERT INTO Compra (TotalCosto, IdProveedor, IdSucursalDestino, IdEmpleado) VALUES 
(4000000.00, 2, 1, 3);
GO

-- 29. Detalle Compra
INSERT INTO DetalleCompra (Cantidad, PrecioCostoUnitario, IdCompra, IdInventario) VALUES 
(5, 800000.00, 1, 1);
GO

-- 30. Pago Compra (Pagamos al proveedor por Transferencia - MetodoPago 3)
INSERT INTO PagoCompra (Monto, IdCompra, IdMetodoPago, IdTurnoCaja) VALUES 
(4000000.00, 1, 3, 1);
GO


--- MÓDULO VENTAS ---

-- 31. Cotización Dólar (Historial congelado)
INSERT INTO Cotizacion (Clave, Valor) VALUES 
('DolarBlue', 1450.00),
('DolarOficial', 1000.00);
GO

-- 32. Descuento
INSERT INTO Descuento (Nombre, Porcentaje, FechaDesde, FechaHasta) VALUES 
('Hot Sale 2026', 15.00, '2026-05-10', '2026-05-20'),
('Efectivo 10%', 10.00, NULL, NULL);
GO

-- 33. Venta (Cabecera del ticket: Cliente Id 5, Empleado Id 3)
INSERT INTO Venta (TotalVenta, TotalVentaARS, TotalCosto, Observaciones, IdTurnoCaja, IdCliente, IdEmpleado, IdCotizacionDolar, IdDescuento) VALUES 
(620.68, 900000.00, 800000.00, 'Venta de iPhone 13 a consumidor final', 1, 5, 3, 1, 2);
GO

-- 34. Detalle Venta (El cliente se lleva 1 iPhone - IdInventario 1)
INSERT INTO DetalleVenta (Cantidad, PrecioUnitario, IdVenta, IdInventario) VALUES 
(1, 900000.00, 1, 1);
GO

-- 35. Pago Venta (Se cobró en Efectivo - IdMetodoPago 1)
INSERT INTO PagoVenta (Monto, Observacion, IdVenta, IdMetodoPago, IdTurnoCaja) VALUES 
(900000.00, 'Abona completo en efectivo con descuento aplicado', 1, 1, 1);
GO

-- 36. Estado Reclamo (Catálogo de Garantías)
INSERT INTO EstadoReclamo (Nombre) VALUES 
('En Revisión'),
('Aprobada'),
('Rechazada');
GO
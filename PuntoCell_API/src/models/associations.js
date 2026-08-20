export const setupAssociations = (models) => {
  const {
    Usuario, Localidad, Rol, Sucursal, Permiso, RolPermiso,
    EstadoOrden,

     Falla, DispositivoCliente, OrdenReparacion,
    OrdenFalla, SeguimientoOrden, PagoReparacion, RepuestoOrden ,

    Proveedor,Compra, DetalleCompra,
    DevolucionCompra, DetalleDevolucionCompra, PagoCompra
    ,
    Bateria, Color, EstadoInventario, CategoriaArticulo, MarcaArticulo, Memoria, ModeloArticulo, Almacenamiento, Articulo, Inventario,
    MetodoPago,
    TurnoCaja, MovimientoCaja,
    Accion, Bitacora
  } = models;

  // Usuario
  if (Rol && Usuario) {
    Rol.hasMany(Usuario, { foreignKey: 'IdRol', as: 'usuarios' });
    Usuario.belongsTo(Rol, { foreignKey: 'IdRol', as: 'rol' });
  }

  if (Localidad && Usuario) {
    Localidad.hasMany(Usuario, { foreignKey: 'IdLocalidad', as: 'usuarios' });
    Usuario.belongsTo(Localidad, { foreignKey: 'IdLocalidad', as: 'localidad' });
  }

  if (Sucursal && Usuario) {
    Sucursal.hasMany(Usuario, { foreignKey: 'IdSucursal', as: 'usuarios' });
    Usuario.belongsTo(Sucursal, { foreignKey: 'IdSucursal', as: 'sucursal' });
  }

  // Permisos
  if (Rol && RolPermiso) {
    Rol.hasMany(RolPermiso, { foreignKey: 'IdRol', as: 'rolPermisos' });
    RolPermiso.belongsTo(Rol, { foreignKey: 'IdRol', as: 'rol' });
  }

  if (Permiso && RolPermiso) {
    Permiso.hasMany(RolPermiso, { foreignKey: 'IdPermiso', as: 'rolPermisos' });
    RolPermiso.belongsTo(Permiso, { foreignKey: 'IdPermiso', as: 'permiso' });
  }

  // Atajo muchos a muchos Rol <-> Permiso, sin pasar por la tabla intermedia
  if (Rol && Permiso && RolPermiso) {
    Rol.belongsToMany(Permiso, {
      through: RolPermiso,
      foreignKey: 'IdRol',
      otherKey: 'IdPermiso',
      as: 'permisosAsociados'
    });

    Permiso.belongsToMany(Rol, {
      through: RolPermiso,
      foreignKey: 'IdPermiso',
      otherKey: 'IdRol',
      as: 'rolesAsociados'
    });
  }

  if (Permiso && Accion) {
    Permiso.hasMany(Accion, { foreignKey: 'IdPermiso', as: 'acciones' });
    Accion.belongsTo(Permiso, { foreignKey: 'IdPermiso', as: 'permiso' });
  }

  // Reparaciones
  if (Usuario && DispositivoCliente) {
    Usuario.hasMany(DispositivoCliente, { foreignKey: 'IdCliente', as: 'dispositivos' });
    DispositivoCliente.belongsTo(Usuario, { foreignKey: 'IdCliente', as: 'cliente' });
  }

  if (DispositivoCliente && typeof ModeloArticulo !== 'undefined' && ModeloArticulo) {
    ModeloArticulo.hasMany(DispositivoCliente, { foreignKey: 'IdModeloArticulo', as: 'dispositivos' });
    DispositivoCliente.belongsTo(ModeloArticulo, { foreignKey: 'IdModeloArticulo', as: 'modelo' });
  }

  if (DispositivoCliente && OrdenReparacion) {
    DispositivoCliente.hasMany(OrdenReparacion, { foreignKey: 'IdDispositivoCliente', as: 'ordenes' });
    OrdenReparacion.belongsTo(DispositivoCliente, { foreignKey: 'IdDispositivoCliente', as: 'dispositivo' });
  }

  if (EstadoOrden && OrdenReparacion) {
    EstadoOrden.hasMany(OrdenReparacion, { foreignKey: 'IdEstadoOrden', as: 'ordenes' });
    OrdenReparacion.belongsTo(EstadoOrden, { foreignKey: 'IdEstadoOrden', as: 'estado' });
  }

  if (Usuario && OrdenReparacion) {
    Usuario.hasMany(OrdenReparacion, { foreignKey: 'IdEmpleado', as: 'ordenesAsignadas' });
    OrdenReparacion.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  if (OrdenReparacion && Falla && OrdenFalla) {
    OrdenReparacion.belongsToMany(Falla, {
      through: OrdenFalla,
      foreignKey: 'IdOrdenReparacion',
      otherKey: 'IdFalla',
      as: 'fallas'
    });
    Falla.belongsToMany(OrdenReparacion, {
      through: OrdenFalla,
      foreignKey: 'IdFalla',
      otherKey: 'IdOrdenReparacion',
      as: 'ordenes'
    });
  }

  if (Falla && typeof CategoriaArticulo !== 'undefined' && CategoriaArticulo) {
    CategoriaArticulo.hasMany(Falla, { foreignKey: 'IdCategoriaArticulo', as: 'fallas' });
    Falla.belongsTo(CategoriaArticulo, { foreignKey: 'IdCategoriaArticulo', as: 'categoria' });
  }

  if (SeguimientoOrden) {
    if (OrdenReparacion) {
      OrdenReparacion.hasMany(SeguimientoOrden, { foreignKey: 'IdOrdenReparacion', as: 'seguimientos' });
      SeguimientoOrden.belongsTo(OrdenReparacion, { foreignKey: 'IdOrdenReparacion', as: 'orden' });
    }
    if (Usuario) {
      Usuario.hasMany(SeguimientoOrden, { foreignKey: 'IdEmpleado', as: 'seguimientosRealizados' });
      SeguimientoOrden.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
    }
    if (EstadoOrden) {
      EstadoOrden.hasMany(SeguimientoOrden, { foreignKey: 'IdEstadoOrden', as: 'seguimientos' });
      SeguimientoOrden.belongsTo(EstadoOrden, { foreignKey: 'IdEstadoOrden', as: 'estado' });
    }
  }

  if (PagoReparacion) {
    if (OrdenReparacion) {
      OrdenReparacion.hasMany(PagoReparacion, { foreignKey: 'IdOrdenReparacion', as: 'pagos' });
      PagoReparacion.belongsTo(OrdenReparacion, { foreignKey: 'IdOrdenReparacion', as: 'orden' });
    }
    if (typeof MetodoPago !== 'undefined' && MetodoPago) {
      MetodoPago.hasMany(PagoReparacion, { foreignKey: 'IdMetodoPago', as: 'pagosReparacion' });
      PagoReparacion.belongsTo(MetodoPago, { foreignKey: 'IdMetodoPago', as: 'metodo' });
    }
    if (typeof TurnoCaja !== 'undefined' && TurnoCaja) {
      TurnoCaja.hasMany(PagoReparacion, { foreignKey: 'IdTurnoCaja', as: 'pagosReparacion' });
      PagoReparacion.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
    }
  }

  if (RepuestoOrden) {
    if (OrdenReparacion) {
      OrdenReparacion.hasMany(RepuestoOrden, { foreignKey: 'IdOrdenReparacion', as: 'repuestos' });
      RepuestoOrden.belongsTo(OrdenReparacion, { foreignKey: 'IdOrdenReparacion', as: 'orden' });
    }
    if (typeof Inventario !== 'undefined' && Inventario) {
      Inventario.hasMany(RepuestoOrden, { foreignKey: 'IdInventario', as: 'repuestosUsados' });
      RepuestoOrden.belongsTo(Inventario, { foreignKey: 'IdInventario', as: 'inventario' });
    }
  }

  // Compras
  if (Localidad && Proveedor) {
    Localidad.hasMany(Proveedor, { foreignKey: 'IdLocalidad', as: 'proveedores' });
    Proveedor.belongsTo(Localidad, { foreignKey: 'IdLocalidad', as: 'localidad' });
  }

  if (Proveedor && Compra) {
    Proveedor.hasMany(Compra, { foreignKey: 'IdProveedor', as: 'compras' });
    Compra.belongsTo(Proveedor, { foreignKey: 'IdProveedor', as: 'proveedor' });
  }

  if (Sucursal && Compra) {
    Sucursal.hasMany(Compra, { foreignKey: 'IdSucursalDestino', as: 'comprasRecibidas' });
    Compra.belongsTo(Sucursal, { foreignKey: 'IdSucursalDestino', as: 'sucursalDestino' });
  }

  if (Usuario && Compra) {
    Usuario.hasMany(Compra, { foreignKey: 'IdEmpleado', as: 'comprasRealizadas' });
    Compra.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  if (Compra && DetalleCompra) {
    Compra.hasMany(DetalleCompra, { foreignKey: 'IdCompra', as: 'detalles' });
    DetalleCompra.belongsTo(Compra, { foreignKey: 'IdCompra', as: 'compra' });
  }

  // La BD referencia el renglón de Inventario, no el Producto
  if (DetalleCompra && Inventario) {
    Inventario.hasMany(DetalleCompra, { foreignKey: 'IdArticulo', as: 'detallesCompra' });
    DetalleCompra.belongsTo(Inventario, { foreignKey: 'IdArticulo', as: 'inventario' });
  }

  if (Compra && PagoCompra) {
    Compra.hasMany(PagoCompra, { foreignKey: 'IdCompra', as: 'pagos' });
    PagoCompra.belongsTo(Compra, { foreignKey: 'IdCompra', as: 'compra' });
  }

  if (PagoCompra && MetodoPago) {
    MetodoPago.hasMany(PagoCompra, { foreignKey: 'IdMetodoPago', as: 'pagosCompra' });
    PagoCompra.belongsTo(MetodoPago, { foreignKey: 'IdMetodoPago', as: 'metodo' });
  }
  if (PagoCompra && TurnoCaja) {
    TurnoCaja.hasMany(PagoCompra, { foreignKey: 'IdTurnoCaja', as: 'pagosCompra' });
    PagoCompra.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }

  if (Compra && DevolucionCompra) {
    Compra.hasMany(DevolucionCompra, { foreignKey: 'IdCompra', as: 'devoluciones' });
    DevolucionCompra.belongsTo(Compra, { foreignKey: 'IdCompra', as: 'compra' });
  }

  if (DevolucionCompra && TurnoCaja) {
    TurnoCaja.hasMany(DevolucionCompra, { foreignKey: 'IdTurnoCaja', as: 'devolucionesCompra' });
    DevolucionCompra.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }

  if (DevolucionCompra && DetalleDevolucionCompra) {
    DevolucionCompra.hasMany(DetalleDevolucionCompra, { foreignKey: 'IdDevolucionCompra', as: 'detalles' });
    DetalleDevolucionCompra.belongsTo(DevolucionCompra, { foreignKey: 'IdDevolucionCompra', as: 'devolucion' });
  }

  if (DetalleDevolucionCompra && Inventario) {
    Inventario.hasMany(DetalleDevolucionCompra, { foreignKey: 'IdArticulo', as: 'detallesDevolucionCompra' });
    DetalleDevolucionCompra.belongsTo(Inventario, { foreignKey: 'IdArticulo', as: 'inventario' });
  }
  if (DetalleDevolucionCompra && models.MovimientoStock) {
    models.MovimientoStock.hasOne(DetalleDevolucionCompra, { foreignKey: 'IdMovimientoStock', as: 'detalleDevolucionCompra' });
    DetalleDevolucionCompra.belongsTo(models.MovimientoStock, { foreignKey: 'IdMovimientoStock', as: 'movimientoStock' });
  }

  if (Usuario && DevolucionCompra) {
    Usuario.hasMany(DevolucionCompra, { foreignKey: 'IdEmpleado', as: 'devolucionesGestionadas' });
    DevolucionCompra.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  // Inventario
  if (MarcaArticulo && ModeloArticulo) {
    MarcaArticulo.hasMany(ModeloArticulo, { foreignKey: 'IdMarcaArticulo', as: 'modelos' });
    ModeloArticulo.belongsTo(MarcaArticulo, { foreignKey: 'IdMarcaArticulo', as: 'marca' });
  }

  if (CategoriaArticulo && ModeloArticulo) {
    CategoriaArticulo.hasMany(ModeloArticulo, { foreignKey: 'IdCategoriaArticulo', as: 'modelos' });
    ModeloArticulo.belongsTo(CategoriaArticulo, { foreignKey: 'IdCategoriaArticulo', as: 'categoria' });
  }

  if (ModeloArticulo && Articulo) {
    ModeloArticulo.hasMany(Articulo, { foreignKey: 'IdModeloArticulo', as: 'articulos' });
    Articulo.belongsTo(ModeloArticulo, { foreignKey: 'IdModeloArticulo', as: 'modelo' });
  }

  if (Inventario && Articulo) {
    Articulo.hasMany(Inventario, { foreignKey: 'IdArticulo', as: 'inventarios' });
    Inventario.belongsTo(Articulo, { foreignKey: 'IdArticulo', as: 'articulo' });
  }
  if (Inventario && Sucursal) {
    Sucursal.hasMany(Inventario, { foreignKey: 'IdSucursal', as: 'inventarios' });
    Inventario.belongsTo(Sucursal, { foreignKey: 'IdSucursal', as: 'sucursal' });
  }
  if (Inventario && EstadoInventario) {
    EstadoInventario.hasMany(Inventario, { foreignKey: 'IdEstadoInventario', as: 'inventarios' });
    Inventario.belongsTo(EstadoInventario, { foreignKey: 'IdEstadoInventario', as: 'estado' });
  }
  if (Inventario && Proveedor) {
    Proveedor.hasMany(Inventario, { foreignKey: 'IdProveedor', as: 'inventarios' });
    Inventario.belongsTo(Proveedor, { foreignKey: 'IdProveedor', as: 'proveedor' });
  }
  if (Inventario && Color) {
    Color.hasMany(Inventario, { foreignKey: 'IdColor', as: 'inventarios' });
    Inventario.belongsTo(Color, { foreignKey: 'IdColor', as: 'color' });
  }
  if (Inventario && Memoria) {
    Memoria.hasMany(Inventario, { foreignKey: 'IdMemoria', as: 'inventarios' });
    Inventario.belongsTo(Memoria, { foreignKey: 'IdMemoria', as: 'memoria' });
  }
  if (Inventario && Bateria) {
    Bateria.hasMany(Inventario, { foreignKey: 'IdBateria', as: 'inventarios' });
    Inventario.belongsTo(Bateria, { foreignKey: 'IdBateria', as: 'bateria' });
  }
  if (Inventario && Almacenamiento) {
    Almacenamiento.hasMany(Inventario, { foreignKey: 'IdAlmacenamiento', as: 'inventarios' });
    Inventario.belongsTo(Almacenamiento, { foreignKey: 'IdAlmacenamiento', as: 'almacenamiento' });
  }

  if (DispositivoCliente && Color) {
    Color.hasMany(DispositivoCliente, { foreignKey: 'IdColor', as: 'dispositivosCliente' });
    DispositivoCliente.belongsTo(Color, { foreignKey: 'IdColor', as: 'color' });
  }
  if (DispositivoCliente && Memoria) {
    Memoria.hasMany(DispositivoCliente, { foreignKey: 'IdMemoria', as: 'dispositivosCliente' });
    DispositivoCliente.belongsTo(Memoria, { foreignKey: 'IdMemoria', as: 'memoria' });
  }
  if (DispositivoCliente && Bateria) {
    Bateria.hasMany(DispositivoCliente, { foreignKey: 'IdBateria', as: 'dispositivosCliente' });
    DispositivoCliente.belongsTo(Bateria, { foreignKey: 'IdBateria', as: 'bateria' });
  }
  if (DispositivoCliente && Almacenamiento) {
    Almacenamiento.hasMany(DispositivoCliente, { foreignKey: 'IdAlmacenamiento', as: 'dispositivosCliente' });
    DispositivoCliente.belongsTo(Almacenamiento, { foreignKey: 'IdAlmacenamiento', as: 'almacenamiento' });
  }

  if (models.MovimientoStock && Inventario) {
    Inventario.hasMany(models.MovimientoStock, { foreignKey: 'IdInventario', as: 'movimientos' });
    models.MovimientoStock.belongsTo(Inventario, { foreignKey: 'IdInventario', as: 'inventario' });
  }
  if (models.MovimientoStock && Usuario) {
    Usuario.hasMany(models.MovimientoStock, { foreignKey: 'IdEmpleado', as: 'movimientosRealizados' });
    models.MovimientoStock.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  if (models.Transferencia && Sucursal) {
    Sucursal.hasMany(models.Transferencia, { foreignKey: 'IdSucursalOrigen', as: 'transferenciasOrigen' });
    models.Transferencia.belongsTo(Sucursal, { foreignKey: 'IdSucursalOrigen', as: 'sucursalOrigen' });
    Sucursal.hasMany(models.Transferencia, { foreignKey: 'IdSucursalDestino', as: 'transferenciasDestino' });
    models.Transferencia.belongsTo(Sucursal, { foreignKey: 'IdSucursalDestino', as: 'sucursalDestino' });
  }
  if (models.Transferencia && models.MovimientoStock) {
    models.MovimientoStock.hasOne(models.Transferencia, { foreignKey: 'IdMovimientoSalida', as: 'transferenciaSalida' });
    models.Transferencia.belongsTo(models.MovimientoStock, { foreignKey: 'IdMovimientoSalida', as: 'movimientoSalida' });
    models.MovimientoStock.hasOne(models.Transferencia, { foreignKey: 'IdMovimientoIngreso', as: 'transferenciaIngreso' });
    models.Transferencia.belongsTo(models.MovimientoStock, { foreignKey: 'IdMovimientoIngreso', as: 'movimientoIngreso' });
  }

  // Caja
  if (TurnoCaja && Sucursal) {
    Sucursal.hasMany(TurnoCaja, { foreignKey: 'IdSucursal', as: 'turnosCaja' });
    TurnoCaja.belongsTo(Sucursal, { foreignKey: 'IdSucursal', as: 'sucursal' });
  }
  if (TurnoCaja && Usuario) {
    Usuario.hasMany(TurnoCaja, { foreignKey: 'IdEmpleadoApertura', as: 'turnosAbiertos' });
    TurnoCaja.belongsTo(Usuario, { foreignKey: 'IdEmpleadoApertura', as: 'empleadoApertura' });

    Usuario.hasMany(TurnoCaja, { foreignKey: 'IdEmpleadoCierre', as: 'turnosCerrados' });
    TurnoCaja.belongsTo(Usuario, { foreignKey: 'IdEmpleadoCierre', as: 'empleadoCierre' });
  }

  if (MovimientoCaja && TurnoCaja) {
    TurnoCaja.hasMany(MovimientoCaja, { foreignKey: 'IdTurnoCaja', as: 'movimientos' });
    MovimientoCaja.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }
  if (MovimientoCaja && Usuario) {
    Usuario.hasMany(MovimientoCaja, { foreignKey: 'IdEmpleado', as: 'movimientosCaja' });
    MovimientoCaja.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  // Auditoría
  if (Bitacora && Usuario) {
    Usuario.hasMany(Bitacora, { foreignKey: 'IdEmpleado', as: 'bitacoras' });
    Bitacora.belongsTo(Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }
  if (Bitacora && Sucursal) {
    Sucursal.hasMany(Bitacora, { foreignKey: 'IdSucursal', as: 'bitacoras' });
    Bitacora.belongsTo(Sucursal, { foreignKey: 'IdSucursal', as: 'sucursal' });
  }
  if (Bitacora && Accion) {
    Accion.hasMany(Bitacora, { foreignKey: 'IdAccion', as: 'bitacoras' });
    Bitacora.belongsTo(Accion, { foreignKey: 'IdAccion', as: 'accion' });
  }

  // Ventas
  if (models.Venta && models.DetalleVenta) {
    models.Venta.hasMany(models.DetalleVenta, { foreignKey: 'IdVenta', as: 'detalles' });
    models.DetalleVenta.belongsTo(models.Venta, { foreignKey: 'IdVenta', as: 'venta' });
  }

  if (models.Venta && models.Usuario) {
    models.Usuario.hasMany(models.Venta, { foreignKey: 'IdCliente', as: 'ventasComoCliente' });
    models.Venta.belongsTo(models.Usuario, { foreignKey: 'IdCliente', as: 'cliente' });

    models.Usuario.hasMany(models.Venta, { foreignKey: 'IdEmpleado', as: 'ventasComoEmpleado' });
    models.Venta.belongsTo(models.Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  if (models.Venta && models.Cotizacion) {
    models.Cotizacion.hasMany(models.Venta, { foreignKey: 'IdCotizacionDolar', as: 'ventas' });
    models.Venta.belongsTo(models.Cotizacion, { foreignKey: 'IdCotizacionDolar', as: 'cotizacion' });
  }
  if (models.Venta && models.Descuento) {
    models.Descuento.hasMany(models.Venta, { foreignKey: 'IdDescuento', as: 'ventas' });
    models.Venta.belongsTo(models.Descuento, { foreignKey: 'IdDescuento', as: 'descuento' });
  }
  if (models.Venta && TurnoCaja) {
    TurnoCaja.hasMany(models.Venta, { foreignKey: 'IdTurnoCaja', as: 'ventas' });
    models.Venta.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }

  // La BD referencia el renglón de Inventario, no el Producto
  if (models.DetalleVenta && Inventario) {
    Inventario.hasMany(models.DetalleVenta, { foreignKey: 'IdArticulo', as: 'detalleVentas' });
    models.DetalleVenta.belongsTo(Inventario, { foreignKey: 'IdArticulo', as: 'inventario' });
  }

  if (models.DevolucionVenta && models.Venta) {
    models.Venta.hasMany(models.DevolucionVenta, { foreignKey: 'IdVenta', as: 'devoluciones' });
    models.DevolucionVenta.belongsTo(models.Venta, { foreignKey: 'IdVenta', as: 'venta' });
  }
  if (models.DevolucionVenta && TurnoCaja) {
    TurnoCaja.hasMany(models.DevolucionVenta, { foreignKey: 'IdTurnoCaja', as: 'devolucionesVenta' });
    models.DevolucionVenta.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }
  if (models.DevolucionVenta && models.Usuario) {
    models.Usuario.hasMany(models.DevolucionVenta, { foreignKey: 'IdEmpleado', as: 'devolucionesVentaGestionadas' });
    models.DevolucionVenta.belongsTo(models.Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }

  if (models.DevolucionVenta && models.DetalleDevolucionVenta) {
    models.DevolucionVenta.hasMany(models.DetalleDevolucionVenta, { foreignKey: 'IdDevolucionVenta', as: 'detalles' });
    models.DetalleDevolucionVenta.belongsTo(models.DevolucionVenta, { foreignKey: 'IdDevolucionVenta', as: 'devolucion' });
  }

  if (models.DetalleDevolucionVenta && Inventario) {
    Inventario.hasMany(models.DetalleDevolucionVenta, { foreignKey: 'IdArticulo', as: 'detallesDevolucionVenta' });
    models.DetalleDevolucionVenta.belongsTo(Inventario, { foreignKey: 'IdArticulo', as: 'inventario' });
  }
  if (models.DetalleDevolucionVenta && models.MovimientoStock) {
    models.MovimientoStock.hasOne(models.DetalleDevolucionVenta, { foreignKey: 'IdMovimientoStock', as: 'detalleDevolucionVenta' });
    models.DetalleDevolucionVenta.belongsTo(models.MovimientoStock, { foreignKey: 'IdMovimientoStock', as: 'movimientoStock' });
  }

  if (models.PagoVenta && models.Venta) {
    models.Venta.hasMany(models.PagoVenta, { foreignKey: 'IdVenta', as: 'pagos' });
    models.PagoVenta.belongsTo(models.Venta, { foreignKey: 'IdVenta', as: 'venta' });
  }
  if (models.PagoVenta && models.MetodoPago) {
    models.MetodoPago.hasMany(models.PagoVenta, { foreignKey: 'IdMetodoPago', as: 'pagosVenta' });
    models.PagoVenta.belongsTo(models.MetodoPago, { foreignKey: 'IdMetodoPago', as: 'metodoPago' });
  }
  if (models.PagoVenta && TurnoCaja) {
    TurnoCaja.hasMany(models.PagoVenta, { foreignKey: 'IdTurnoCaja', as: 'pagosVenta' });
    models.PagoVenta.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }

  if (models.Venta && models.Cuota) {
    models.Venta.hasMany(models.Cuota, { foreignKey: 'IdVenta', as: 'cuotas' });
    models.Cuota.belongsTo(models.Venta, { foreignKey: 'IdVenta', as: 'venta' });
  }
  if (models.Cuota && TurnoCaja) {
    TurnoCaja.hasMany(models.Cuota, { foreignKey: 'IdTurnoCaja', as: 'cuotas' });
    models.Cuota.belongsTo(TurnoCaja, { foreignKey: 'IdTurnoCaja', as: 'turnoCaja' });
  }

  if (models.ReclamoGarantia && models.DetalleVenta) {
    models.DetalleVenta.hasMany(models.ReclamoGarantia, { foreignKey: 'IdDetalleVenta', as: 'reclamos' });
    models.ReclamoGarantia.belongsTo(models.DetalleVenta, { foreignKey: 'IdDetalleVenta', as: 'detalle' });
  }
  if (models.ReclamoGarantia && models.Usuario) {
    models.Usuario.hasMany(models.ReclamoGarantia, { foreignKey: 'IdEmpleado', as: 'reclamosGestionados' });
    models.ReclamoGarantia.belongsTo(models.Usuario, { foreignKey: 'IdEmpleado', as: 'empleado' });
  }
  if (models.ReclamoGarantia && models.EstadoReclamo) {
    models.EstadoReclamo.hasMany(models.ReclamoGarantia, { foreignKey: 'IdEstadoReclamo', as: 'reclamos' });
    models.ReclamoGarantia.belongsTo(models.EstadoReclamo, { foreignKey: 'IdEstadoReclamo', as: 'estado' });
  }

};

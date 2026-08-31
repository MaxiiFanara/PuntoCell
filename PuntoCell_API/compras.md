# 1. Objetivo

Adaptar el módulo `compras` del backend de **PuntoCell** para soportar:

* Compras pagadas totalmente al momento.
* Compras totalmente a crédito.
* Compras con pago parcial.
* Registro de deuda por proveedor.
* Pagos posteriores de deudas existentes.
* Trazabilidad de compras y pagos mediante cuenta corriente.

La mercadería debe ingresar al **100 % del stock** independientemente de cómo se pague la compra.

La operación completa debe ejecutarse dentro de una única transacción de Sequelize/SQL Server.

Si una operación falla, se debe realizar `ROLLBACK` de todos los cambios realizados durante la compra.

---

# 2. Regla fundamental de arquitectura

La implementación debe respetar la arquitectura existente de PuntoCell:

```text
Controller
    ↓
Service
    ↓
DAO / Repository
    ↓
Sequelize
    ↓
SQL Server
```

No se deben modificar los nombres de endpoints existentes ni las firmas de funciones públicas que actualmente utiliza el frontend, salvo que sea estrictamente necesario y se analicen previamente sus consumidores.

Los cambios deben integrarse en los módulos existentes de:

```text
src/modules/compras/
src/modules/inventario/
src/modules/usuarios-empresa/
src/modules/...
```

utilizando los modelos, asociaciones, DAOs y servicios existentes.

No se debe crear una segunda arquitectura paralela.

---

# 3. Cambios en la entidad Compra

Agregar a `Compra`:

## `EstadoPago`

Tipo:

```text
SmallInt
```

Valores:

```text
1 = Pendiente
2 = Parcial
3 = Pagado
```

## `SaldoPendiente`

Tipo:

```text
DECIMAL(18,2)
```

Representa el monto que todavía se le debe al proveedor por esa compra.

La fórmula es:

```text
SaldoPendiente = TotalCosto - TotalPagado
```

---

# 4. Cálculo financiero en CompraService

El cálculo debe realizarse en el `CompraService` antes de persistir la compra.

Para cada detalle:

```text
Subtotal = Cantidad × PrecioCostoUnitario
```

Luego:

```text
TotalCosto = SUM(Subtotal)
```

Los pagos recibidos:

```text
TotalPagado = SUM(pagos.monto)
```

Finalmente:

```text
SaldoPendiente = TotalCosto - TotalPagado
```

El backend debe ser la fuente de verdad para estos valores.

No se debe confiar en un `TotalCosto`, `TotalPagado`, `SaldoPendiente` o `EstadoPago` enviados por el frontend.

---

# 5. Determinación de EstadoPago

El `CompraService` debe determinar el estado automáticamente:

```text
TotalPagado = 0
    → EstadoPago = 1 Pendiente

TotalPagado > 0 && TotalPagado < TotalCosto
    → EstadoPago = 2 Parcial

TotalPagado = TotalCosto
    → EstadoPago = 3 Pagado
```

Nunca debe permitirse:

```text
TotalPagado > TotalCosto
```

En ese caso la operación debe rechazarse antes de persistir cambios.

---

# 6. CuentaCorrienteProveedor

Agregar el modelo correspondiente a:

```text
CuentaCorrienteProveedor
```

La tabla debe permitir registrar todos los movimientos financieros del proveedor.

Estructura conceptual:

```text
Id
IdProveedor
FechaMovimiento
Concepto
Debe
Haber
SaldoAcumulado
IdCompra
IdPagoCompra
```

Relaciones:

```text
Proveedor
   1
   │
   └────── N CuentaCorrienteProveedor

Compra
   1
   │
   └────── N CuentaCorrienteProveedor

PagoCompra
   1
   │
   └────── N CuentaCorrienteProveedor
```

---

# 7. Significado de Debe y Haber

## Compra

Cuando se registra una compra:

```text
Debe = TotalCosto
Haber = 0
```

La deuda del proveedor aumenta.

## Pago

Cuando se registra un pago:

```text
Debe = 0
Haber = MontoPago
```

La deuda disminuye.

La fórmula conceptual del saldo es:

```text
Saldo = SUM(Debe) - SUM(Haber)
```

---

# 8. Regla de SaldoAcumulado

Cada movimiento debe registrar el saldo resultante después de aplicar ese movimiento.

Ejemplo:

```text
Compra $75.000

Debe: 75.000
Haber: 0
SaldoAcumulado: 75.000
```

Luego:

```text
Pago $20.000

Debe: 0
Haber: 20.000
SaldoAcumulado: 55.000
```

---

# 9. Nuevo Service: CuentaCorrienteProveedorService

Crear o adaptar el service correspondiente dentro de la arquitectura existente.

Responsabilidades:

```text
RegistrarDeuda()
RegistrarPago()
ObtenerSaldoProveedor()
ObtenerMovimientosProveedor()
```

El service debe utilizar el DAO/Repository correspondiente.

No debe acceder directamente a Sequelize desde el Controller.

---

# 10. Flujo principal de CompraService

El flujo de `CompraService` debe ser:

```text
1. Validar request
2. Iniciar transacción Sequelize
3. Calcular TotalCosto
4. Calcular TotalPagado
5. Validar que TotalPagado <= TotalCosto
6. Calcular SaldoPendiente
7. Determinar EstadoPago
8. Crear Compra
9. Procesar detalles
10. Actualizar/crear Inventario
11. Crear DetalleCompra
12. Obtener categoría del producto
13. Resolver correctamente la ListaPrecio
14. Crear PrecioArticulo
15. Registrar deuda en CuentaCorrienteProveedor
16. Registrar pagos iniciales
17. Actualizar cuenta corriente
18. Commit
19. Retornar resultado
```

---

# 11. Procesamiento del detalle

Para cada detalle de compra:

```text
foreach detalle
```

se debe resolver primero el inventario.

---

# 12. Inventario existente

Si:

```text
IdInventario != null
```

validar que exista.

Luego:

```text
InventarioService.IncrementarStock(
    IdInventario,
    Cantidad
)
```

Resultado:

```text
Stock = Stock + Cantidad
```

No se debe crear un nuevo inventario.

---

# 13. Nuevo inventario

Si:

```text
IdInventario == null
```

crear un nuevo registro mediante el `InventarioService`/DAO existente.

Debe utilizar:

```text
IdSucursalDestino
IdProveedor
IdProducto
IdColor
IdMemoria
IdAlmacenamiento
IMEI
Cantidad
```

El `IdInventario` generado debe reutilizarse posteriormente para:

```text
DetalleCompra
PrecioArticulo
```

---

# 14. Crear DetalleCompra

Una vez resuelto el inventario:

```text
DetalleCompraService.Crear(...)
```

Debe guardar:

```text
IdCompra
IdInventario
Cantidad
PrecioCostoUnitario
```

---

# 15. Resolución de categoría del producto

Para determinar la categoría:

```text
ProductoService.ObtenerPorId(IdProducto)
```

Obtener:

```text
IdModeloProducto
```

Luego:

```text
ModeloProductoService.ObtenerPorId(IdModeloProducto)
```

Obtener:

```text
IdCategoriaProducto
```

---

# 16. REGLA CRÍTICA — Resolución de ListaPrecio

Esta regla debe quedar explícita en la implementación.

**No se debe utilizar `IdCategoriaProducto` directamente como `IdListaPrecio`.**

Ejemplo incorrecto:

```text
IdCategoriaProducto = 5

IdListaPrecio = 5
```

Esto **NO debe hacerse**.

La categoría y la lista de precios son conceptos diferentes.

La categoría únicamente sirve como criterio para buscar la lista correspondiente.

---

# 17. Flujo correcto de ListaPrecio

Si tenemos:

```text
IdCategoriaProducto = 5
```

el backend debe ejecutar una consulta para encontrar la lista de precios correspondiente a esa categoría.

Conceptualmente:

```text
ListaPrecioService.ObtenerPorCategoria(
    IdCategoriaProducto
)
```

La consulta debe devolver la entidad `ListaPrecio`.

Ejemplo:

```text
Categoría:
IdCategoriaProducto = 5

Lista encontrada:
IdListaPrecio = 12
IdCategoriaProducto = 5
```

Entonces:

```text
IdListaPrecioTarget = 12
```

**No:**

```text
IdListaPrecioTarget = 5
```

---

# 18. Ejemplo de resolución correcta

```text
Producto
    ↓
ModeloProducto
    ↓
CategoriaProducto
    ↓
Buscar ListaPrecio correspondiente
    ↓
ListaPrecio encontrada
    ↓
Obtener IdListaPrecio real
```

Ejemplo:

```text
Producto:
    IdProducto = 45

Modelo:
    IdModeloProducto = 8

Categoría:
    IdCategoriaProducto = 5

Consulta ListaPrecio:
    categoría = 5

Resultado:
    IdListaPrecio = 12
```

Por lo tanto:

```text
IdListaPrecioTarget = 12
```

---

# 19. Si no existe una lista para la categoría

Si no existe una lista de precios asociada a la categoría:

```text
IdCategoriaProducto = 5
```

se debe utilizar la lista predeterminada definida por el negocio.

Por ejemplo:

```text
IdListaPrecioTarget = 1
```

Pero esto debe representar explícitamente:

```text
"Lista de precios por defecto"
```

y **no significa que la categoría tenga ID 1**.

Se debe agregar una advertencia:

```text
No existe una lista de precio registrada para la categoría 5.
Se utilizará la lista de precios por defecto.
```

---

# 20. Validación de rentabilidad

Una vez obtenida la lista real:

```text
ListaPrecioService.ValidarRentabilidadActiva(listaPrecio)
```

Si corresponde generar una advertencia, agregarla al array de advertencias de la respuesta.

La advertencia no debe provocar rollback.

---

# 21. Crear PrecioArticulo

Una vez obtenida la lista correcta:

```text
PrecioArticuloService.CrearPrecioArticulo(...)
```

Debe utilizar:

```text
IdInventario
IdListaPrecioTarget
CostoBase = PrecioCostoUnitario
FechaDesde
...
```

`IdListaPrecioTarget` debe ser siempre el **ID real de la lista de precios encontrada**, nunca el ID de la categoría.

---

# 22. Registrar deuda

Después de crear la compra:

```text
CuentaCorrienteProveedorService.RegistrarDeuda(...)
```

Debe registrar:

```text
IdProveedor
Concepto = "Factura de Compra"
Debe = TotalCosto
Haber = 0
IdCompra = IdCompra
```

Esto se realiza incluso si la compra se paga completamente al contado.

---

# 23. Registrar pagos iniciales

Por cada elemento de:

```text
request.pagos
```

ejecutar:

```text
PagoCompraService.Crear(...)
```

utilizando la transacción actual.

Debe guardar:

```text
IdProveedor
Monto
IdMetodoPago
IdTurnoCaja
IdCompra
```

Obtener:

```text
IdPagoCompra
```

---

# 24. Registrar el pago en cuenta corriente

Después de crear `PagoCompra`:

```text
CuentaCorrienteProveedorService.RegistrarPago(...)
```

Registrar:

```text
IdProveedor
Concepto = "Pago a cuenta/total"
Debe = 0
Haber = Monto
IdCompra = IdCompra
IdPagoCompra = IdPagoCompra
```

---

# 25. Pagos posteriores

Los pagos realizados después de la compra deben tener su propio flujo.

No deben crear una nueva compra.

Flujo:

```text
Pago posterior
    ↓
Validar proveedor
    ↓
Validar deuda
    ↓
Crear PagoCompra
    ↓
Registrar Haber en CuentaCorrienteProveedor
    ↓
Actualizar SaldoPendiente
    ↓
Actualizar EstadoPago
    ↓
Commit
```

---

# 26. Actualización de Compra por pago posterior

Si el pago está asociado a una compra:

```text
NuevoSaldo = SaldoPendienteActual - MontoPago
```

Si:

```text
NuevoSaldo = 0
```

entonces:

```text
EstadoPago = 3
```

Si:

```text
NuevoSaldo > 0
```

entonces:

```text
EstadoPago = 2
```

Nunca se debe permitir:

```text
NuevoSaldo < 0
```

---

# 27. Transacción Sequelize

El `CompraService` debe iniciar una única transacción.

Conceptualmente:

```text
sequelize.transaction(...)
```

La misma instancia de `transaction` debe ser enviada a todas las operaciones que participan de la compra:

```text
CompraDAO
InventarioDAO
DetalleCompraDAO
PrecioArticuloDAO
PagoCompraDAO
CuentaCorrienteProveedorDAO
```

Esto es importante porque no alcanza con iniciar una transacción solamente en `CompraDAO`.

Todos los DAO involucrados deben utilizar la misma transacción Sequelize.

---

# 28. Rollback

Si cualquier operación lanza una excepción:

```text
ROLLBACK
```

Debe revertirse todo:

```text
Compra
Inventario
DetalleCompra
PrecioArticulo
PagoCompra
CuentaCorrienteProveedor
```

Ejemplo:

```text
Compra creada
↓
Inventario actualizado
↓
Detalle creado
↓
Precio creado
↓
PagoCompra falla
↓
ROLLBACK
```

Resultado:

```text
No existe la compra
No se modificó el stock
No existe el detalle
No existe el precio
No existe el pago
No existe el movimiento de cuenta corriente
```

---

# 29. Commit

Solo después de completar todas las operaciones:

```text
COMMIT
```

La respuesta debe mantener el contrato actual utilizado por el frontend.

Como mínimo, debe permitir conocer:

```text
IdCompra
TotalCosto
TotalPagado
SaldoPendiente
EstadoPago
Advertencias
```

---

# 30. Arquitectura final del flujo

El flujo completo en PuntoCell debe quedar conceptualmente:

```text
CompraController
       ↓
CompraService
       ↓
┌─────────────────────────────────────┐
│      Sequelize Transaction          │
│                                     │
│  CompraDAO                           │
│      ↓                              │
│  InventarioService / DAO             │
│      ↓                              │
│  DetalleCompraDAO                    │
│      ↓                              │
│  Producto / Modelo / Categoría       │
│      ↓                              │
│  ListaPrecioService / DAO            │
│      ↓                              │
│  PrecioArticuloDAO                   │
│      ↓                              │
│  CuentaCorrienteProveedorService     │
│      ↓                              │
│  PagoCompraService / DAO             │
│      ↓                              │
│  CuentaCorrienteProveedorDAO         │
│                                     │
└─────────────────────────────────────┘
       ↓
     COMMIT
       ↓
   Response 201
```

Si falla cualquier operación:

```text
                 ERROR
                   ↓
               ROLLBACK
                   ↓
            No quedan cambios
```

---

# 31. Criterios de aceptación específicos para PuntoCell

* [ ] No se modifican los endpoints existentes sin necesidad.
* [ ] No se rompen los contratos actuales del frontend.
* [ ] La compra y sus operaciones asociadas utilizan una única transacción Sequelize.
* [ ] El stock se actualiza independientemente de si la compra fue pagada.
* [ ] El backend calcula `TotalCosto`.
* [ ] El backend calcula `TotalPagado`.
* [ ] El backend calcula `SaldoPendiente`.
* [ ] El backend determina `EstadoPago`.
* [ ] No se permiten pagos superiores al total.
* [ ] Toda compra genera un `Debe` en cuenta corriente.
* [ ] Todo pago genera un `Haber`.
* [ ] Los pagos posteriores reducen la deuda.
* [ ] Se puede consultar el saldo global de un proveedor.
* [ ] `IdCategoriaProducto` **nunca se utiliza directamente como `IdListaPrecio`**.
* [ ] La categoría se utiliza para buscar la lista de precios correspondiente.
* [ ] `IdListaPrecio` corresponde al ID real de la entidad `ListaPrecio` encontrada.
* [ ] Si no existe una lista para la categoría, se utiliza la lista por defecto definida por negocio.
* [ ] La creación de `PrecioArticulo` utiliza el `IdListaPrecio` real.
* [ ] Los errores provocan rollback completo.
* [ ] Las advertencias de negocio no provocan rollback.
* [ ] Los cambios respetan los modelos y asociaciones existentes de PuntoCell.
* [ ] Los cambios respetan la prioridad funcional definida para el backend unificado.

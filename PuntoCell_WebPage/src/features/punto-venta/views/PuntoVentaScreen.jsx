import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { useVenta } from '../context/VentaContext';
import { useAuth } from '../../../context/AuthContext';
import { ClienteSection } from '../components/ClienteSection';
import { CarritoSection } from '../components/CarritoSection';
import { TotalSection } from '../components/TotalSection';
import ModalRegistroCliente from '../../../components/modals/ModalRegistroCliente';
import { ModalCobro } from '../modals/ModalCobro';
import PageHeader from '../../../components/ui/PageHeader';

import { inventarioService } from '../../../services/inventarioServices';
import { ventasService } from '../../../services/ventasServices';
import { getLocalidades } from '../../../services/api';
import { toast } from 'sonner';

// Consume el VentaProvider único de App.jsx; envolver de nuevo acá creaba una
// segunda instancia desincronizada del dólar del navbar.
const PuntoVentaContent = () => {
  const { usuario } = useAuth();

  const {
    carrito,
    setCliente,
    datosConfig,
    idSucursal,
    nombreSucursal,
    totalCosto,
    vaciarTodo
  } = useVenta();

  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [modalCobroOpen, setModalCobroOpen] = useState(false);
  const [dniInicial, setDniInicial] = useState('');
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    getLocalidades().then(setLocalidades).catch(() => setLocalidades([]));
  }, []);

  const handleOpenNuevoCliente = (dni) => {
    setDniInicial(dni);
    setModalClienteOpen(true);
  };

  const handleCloseNuevoCliente = () => {
    setModalClienteOpen(false);
    setDniInicial('');
  };

  const handleClienteGuardado = (clienteCreado) => {
    setCliente({
      id: clienteCreado.Id,
      nombre: `${clienteCreado.Nombre ?? ''} ${clienteCreado.Apellido ?? ''}`.trim(),
      dni: clienteCreado.DNI,
    });
  };

  const handleCobrar = () => {
    if (carrito.length === 0) return toast.warning("El carrito está vacío");
    setModalCobroOpen(true);
  };

  const handleCloseCobro = () => {
    setModalCobroOpen(false);
  };

  const buscarProductoReal = async (termino) => {
    try {
      // idSucursal viene del empleado logueado (antes quedaba hardcodeado en 1)
      const resultados = await inventarioService.getAll({ search: termino, IdSucursal: idSucursal });
      return resultados;
    } catch {
      return [];
    }
  };

  const ejecutarVentaFinal = async (payloadVenta) => {
    try {
      // La bonificación (monto + motivo) no tiene columna propia en Venta: se guarda como
      // una línea con formato fijo al inicio de Observaciones y el ticket la parsea.
      const bonif = Number(payloadVenta.Bonificacion) || 0;
      const obsUsuario = payloadVenta.ObservacionesVenta || "";
      const observaciones = (bonif > 0
        ? `[BONIF] ${bonif.toFixed(2)}|${(payloadVenta.MotivoBonificacion || '').replace(/\|/g, ' ').slice(0, 100)}\n${obsUsuario}`.trim()
        : obsUsuario
      ).slice(0, 255);

      const ventaLimpia = {
        Fecha: payloadVenta.Fecha,
        TotalVenta: payloadVenta.TotalVenta,
        TotalVentaARS: payloadVenta.TotalVenta * (datosConfig?.valorDolar || 1),
        TotalCosto: Number((totalCosto || 0).toFixed(2)),
        Observaciones: observaciones,
        EstadoPago: true,
        IdTurnoCaja: datosConfig?.idTurnoCaja,
        IdCliente: payloadVenta.IdCliente,
        IdEmpleado: usuario?.userID, // antes hardcodeado en 1
        IdCotizacionDolar: payloadVenta.IdCotizacionDolar,
        Detalles: payloadVenta.Detalles.map(d => ({
          Cantidad: d.Cantidad,
          PrecioUnitario: d.PrecioUnitario,
          // La BD referencia el renglón de Inventario, no el Producto
          IdArticulo: d.IdInventario
        })),
        Pagos: payloadVenta.Pagos,
        Cuotas: payloadVenta.Cuotas || []
      };

      // El backend descuenta stock dentro de la misma transacción (ver VentaService.create);
      // antes se actualizaba a mano acá y quedaba duplicado y no atómico con la venta.
      await ventasService.create(ventaLimpia);

      toast.success("🚀 ¡Venta realizada con éxito!");
      vaciarTodo();
      handleCloseCobro();

    } catch (error) {
      console.error("❌ Error en el proceso de cobro:", error);
      // Condición de carrera con otra caja: el backend ya deja el mensaje en error.message
      toast.error(`No se pudo procesar la venta: ${error.message || 'Error desconocido, revisá la consola.'}`);
    }
  };

  const unidades = carrito.reduce((a, i) => a + (Number(i.Cantidad) || 0), 0);

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Ventas"
        title="Registrar una venta"
        meta={`Sucursal ${nombreSucursal || 'Centro'} · ${
          carrito.length === 0 ? 'carrito vacío' : `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} en el carrito`
        }`}
      />

      {/* El carrito es el área de trabajo, así que se lleva el ancho; cliente y
          total quedan en el panel fijo de la derecha, como en el resto del sistema. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 320px' }, gap: 2, alignItems: 'start' }}>

        <CarritoSection onBuscar={buscarProductoReal} />

        <Box sx={{
          display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0,
          position: { lg: 'sticky' }, top: 68,
        }}>
          <ClienteSection onOpenNuevoCliente={handleOpenNuevoCliente} />
          <TotalSection onCobrar={handleCobrar} />
        </Box>
      </Box>

      {/* MODALES CON DATOS REALES */}
      <ModalRegistroCliente
        open={modalClienteOpen}
        onClose={handleCloseNuevoCliente}
        dniInicial={dniInicial}
        localidades={localidades}
        onClienteGuardado={handleClienteGuardado}
      />

      <ModalCobro
        open={modalCobroOpen}
        onClose={handleCloseCobro}
        onConfirmar={ejecutarVentaFinal}
        metodosPago={datosConfig.metodosPago}
        valorDolar={datosConfig.valorDolar}
      />
    </Box>
  );
};

export const PuntoVentaScreen = () => <PuntoVentaContent />;

export default PuntoVentaScreen;
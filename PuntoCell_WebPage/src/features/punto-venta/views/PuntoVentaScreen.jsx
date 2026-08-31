import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useVenta } from '../context/VentaContext';
import { useAuth } from '../../../context/AuthContext';
import { ClienteSection } from '../components/ClienteSection';
import { CarritoSection } from '../components/CarritoSection';
import { TotalSection } from '../components/TotalSection';
import ModalRegistroCliente from '../../../components/modals/ModalRegistroCliente';
import { ModalCobro } from '../modals/ModalCobro';

import { inventarioService } from '../../../services/inventarioServices';
import { ventasService } from '../../../services/ventasServices';
import { getLocalidades } from '../../../services/api';

// Consume el VentaProvider único de App.jsx; envolver de nuevo acá creaba una
// segunda instancia desincronizada del dólar del navbar.
const PuntoVentaContent = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const {
    carrito,
    cliente,
    setCliente,
    datosConfig,
    idSucursal,
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
    if (carrito.length === 0) return alert("El carrito está vacío");
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
    } catch (error) {
      return [];
    }
  };

  const ejecutarVentaFinal = async (payloadVenta) => {
    try {
      const ventaLimpia = {
        Fecha: payloadVenta.Fecha,
        TotalVenta: payloadVenta.TotalVenta,
        TotalVentaARS: payloadVenta.TotalVenta * (datosConfig?.valorDolar || 1),
        TotalCosto: Number((totalCosto || 0).toFixed(2)),
        Observaciones: payloadVenta.ObservacionesVenta || "",
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

      alert("🚀 ¡Venta realizada con éxito!");
      vaciarTodo();
      handleCloseCobro();

    } catch (error) {
      console.error("❌ Error en el proceso de cobro:", error);
      // Condición de carrera con otra caja: el backend ya deja el mensaje en error.message
      alert(`No se pudo procesar la venta: ${error.message || 'Error desconocido, revisá la consola.'}`);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '95%', p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', bgcolor: 'grey.50'}}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3, flex: 1}}>
        
        {/* PANEL IZQUIERDO: CLIENTE Y TOTAL */}
        <Box sx={{ width: { xs: '100%', lg: '33.333%' }, display: 'flex', flexDirection: 'column', gap: 3, order: { xs: 2, lg: 1 } }}>
          <ClienteSection onOpenNuevoCliente={handleOpenNuevoCliente} />
          <TotalSection onCobrar={handleCobrar} />
        </Box>

        {/* PANEL DERECHO: CARRITO / BUSCADOR */}
        <Box sx={{ width: '100%', flex: { lg: 1 }, display: 'flex', flexDirection: 'column', order: { xs: 1, lg: 2 } }}>
          <CarritoSection onBuscar={buscarProductoReal} />
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
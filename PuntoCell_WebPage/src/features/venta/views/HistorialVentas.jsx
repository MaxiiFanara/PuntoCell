import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ventasService } from '../../../services/ventasServices';
import { getEmpleados } from '../../../services/api';
import { useVenta } from '../../punto-venta/context/VentaContext';
import {
  Button, TextField, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Chip, Tooltip,
  MenuItem, Select, FormControl, InputLabel, Box, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination
} from '@mui/material';
import { 
  FilterList, 
  DeleteSweep as Eraser,
  Add,
  Description as FileText,
  History as Clock,
  PriceCheck, 
  Paid as Payments,
  Visibility
} from '@mui/icons-material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const FILAS_POR_PAGINA = 10;

const HistorialVentas = () => {
  const navigate = useNavigate();

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);

  // Cotización vigente del dólar, compartida globalmente: se recalcula sola si
  // se edita desde la navbar (ver VentaContext.actualizarCotizacion).
  const { dolarGlobal: cotizacionActual } = useVenta();

  const [deudas, setDeudas] = useState([]);
  const [deudasLoading, setDeudasLoading] = useState(false);
  const [deudasError, setDeudasError] = useState('');
  const [metodosPago, setMetodosPago] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  const [filtros, setFiltros] = useState({
    cliente: '', producto: '', idEmpleado: '', desde: null, hasta: null, montoMin: ''
  });

  const [openDeudas, setOpenDeudas] = useState(false);
  const [openCobro, setOpenCobro] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [cobroData, setCobroData] = useState({
    idCuota: null,
    idVenta: null,
    cliente: '',
    montoDeuda: 0,
    montoAAbonar: 0,
    idMetodoPago: '',
  });

  // Cuentas a Cobrar: cuotas de venta sin pagar (Cuota.FechaPago == null), con días
  // restantes/vencidos calculados contra hoy.
  const cargarDeudas = useCallback(async () => {
    setDeudasLoading(true);
    setDeudasError('');
    try {
      const cuotas = await ventasService.getCuotas();
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const pendientes = (Array.isArray(cuotas) ? cuotas : [])
        .filter((c) => !c.FechaPago)
        .map((c) => {
          const vencimiento = new Date(c.FechaVencimiento);
          const diasRestantes = Math.round((vencimiento.setHours(0, 0, 0, 0) - hoy) / 86400000);
          const clienteNombre = c.venta?.cliente
            ? `${c.venta.cliente.Nombre ?? ''} ${c.venta.cliente.Apellido ?? ''}`.trim()
            : `Cliente de venta #${c.IdVenta}`;
          return {
            idCuota: c.Id,
            idVenta: c.IdVenta,
            cliente: clienteNombre || `Venta #${c.IdVenta}`,
            monto: Number(c.MontoCuota) || 0,
            numeroCuota: c.NumeroCuota,
            vencimiento: new Date(c.FechaVencimiento).toLocaleDateString('es-AR'),
            diasRestantes,
          };
        })
        .sort((a, b) => a.diasRestantes - b.diasRestantes);
      setDeudas(pendientes);
    } catch (err) {
      setDeudasError(err.message || 'No se pudieron cargar las cuentas a cobrar.');
    } finally {
      setDeudasLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDeudas();
    ventasService.getMetodosPago()
      .then((lista) => setMetodosPago(Array.isArray(lista) ? lista : []))
      .catch(() => setMetodosPago([]));
    getEmpleados()
      .then((lista) => setEmpleados(Array.isArray(lista) ? lista : []))
      .catch(() => setEmpleados([]));
  }, [cargarDeudas]);

  const handleInputChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const limpiarFiltros = () => {
    const vacios = { cliente: '', producto: '', idEmpleado: '', desde: null, hasta: null, montoMin: '' };
    setFiltros(vacios);
    cargarVentas(vacios);
  };

  const cargarVentas = useCallback(async (filtrosActuales) => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (filtrosActuales.cliente)  query.cliente = filtrosActuales.cliente;
      if (filtrosActuales.producto) query.producto = filtrosActuales.producto;
      if (filtrosActuales.idEmpleado) query.idEmpleado = filtrosActuales.idEmpleado;
      if (filtrosActuales.montoMin) query.montoMin = filtrosActuales.montoMin;
      if (filtrosActuales.desde)    query.desde = filtrosActuales.desde.format('YYYY-MM-DD');
      if (filtrosActuales.hasta)    query.hasta = filtrosActuales.hasta.format('YYYY-MM-DD');

      const data = await ventasService.getHistorico(query);
      const lista = Array.isArray(data) ? data : [];
      // Más reciente primero (el backend ya ordena así; lo reforzamos acá por las dudas).
      lista.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha) || b.Id - a.Id);
      setVentas(lista);
      setPagina(1);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial de ventas.');
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarVentas(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(ventas.length / FILAS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const ventasPaginadas = ventas.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA);

  const aplicarFiltros = () => cargarVentas(filtros);

  const abrirModalCobro = (deuda) => {
    setCobroData({
      idCuota: deuda.idCuota,
      idVenta: deuda.idVenta,
      cliente: deuda.cliente,
      montoDeuda: deuda.monto,
      montoAAbonar: deuda.monto,
      idMetodoPago: metodosPago[0]?.Id ?? '',
    });
    setOpenCobro(true);
  };

  const confirmarCobro = async () => {
    if (!cobroData.idMetodoPago) return alert('Seleccioná el método de pago.');
    const monto = Number(cobroData.montoAAbonar);
    if (isNaN(monto) || monto <= 0) return alert('Ingresá un monto válido.');

    setCobrando(true);
    try {
      const ahora = new Date().toISOString();
      // 1. Marcamos la cuota como pagada
      await ventasService.pagarCuota(cobroData.idCuota, { FechaPago: ahora });
      // 2. Registramos el ingreso de dinero contra la venta (mismo mecanismo que cualquier otro cobro)
      await ventasService.crearPago({
        Monto: monto,
        FechaPago: ahora,
        Observacion: `Cobro de cuota`,
        IdVenta: cobroData.idVenta,
        IdMetodoPago: Number(cobroData.idMetodoPago),
        IdTurnoCaja: 1,
      });
      setOpenCobro(false);
      await cargarDeudas();
      alert(`✅ Pago de U$S ${monto.toFixed(2)} registrado para ${cobroData.cliente}`);
    } catch (err) {
      alert('❌ No se pudo registrar el cobro: ' + (err.message || ''));
    } finally {
      setCobrando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3 }}>
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 1 }}>
            <FileText sx={{ color: 'text.secondary' }} /> Historial de Ventas
          </Typography>
          <Box sx={{ height: 4, width: 64, bgcolor: 'primary.main', borderRadius: 2, mt: 0.5, mx: { xs: 'auto', sm: 0 } }} />
        </Box>
        <Button 
          variant="contained" color="success" startIcon={<Add />}
          sx={{ fontWeight: 'bold', px: 3, boxShadow: 2, textTransform: 'none', borderRadius: 2 }}
          onClick={() => navigate('/app/punto-venta')}
        >
          Registrar Venta
        </Button>
      </Box>

      {/* Barra de Filtros */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', mb: 3 }}>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <TextField label="Cliente o DNI" name="cliente" size="small" fullWidth value={filtros.cliente} onChange={handleInputChange} />
            <TextField label="Producto" name="producto" size="small" fullWidth value={filtros.producto} onChange={handleInputChange} />
            <FormControl size="small" fullWidth>
              <InputLabel>Vendedor</InputLabel>
              <Select
                name="idEmpleado"
                value={filtros.idEmpleado}
                label="Vendedor"
                onChange={(e) => setFiltros({ ...filtros, idEmpleado: e.target.value })}
              >
                <MenuItem value="">Todos los empleados</MenuItem>
                {empleados.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Desde" value={filtros.desde}
                onChange={(val) => setFiltros({...filtros, desde: val})}
                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
              />
              <DatePicker
                label="Hasta" value={filtros.hasta}
                onChange={(val) => setFiltros({...filtros, hasta: val})}
                slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
              />
            </LocalizationProvider>
            
            <TextField 
              label="Monto Mín" name="montoMin" type="number" size="small" sx={{ width: 130 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              value={filtros.montoMin} onChange={handleInputChange}
            />

            <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'flex-end', gap: 1, mt: { xs: 1, sm: 0 } }}>
              <Button 
                variant="outlined" color="error" startIcon={<Clock />}
                onClick={() => setOpenDeudas(true)}
                sx={{ fontWeight: 'bold', bgcolor: '#fef2f2', borderColor: '#fee2e2', '&:hover': { bgcolor: '#fee2e2' } }}
              >
                Cobrar Cuotas
              </Button>
              <Tooltip title="Limpiar Filtros">
                <IconButton onClick={limpiarFiltros} sx={{ bgcolor: 'grey.100', borderRadius: 1.5 }}>
                  <Eraser />
                </IconButton>
              </Tooltip>
              <Button variant="contained" startIcon={<FilterList />} onClick={aplicarFiltros} disabled={loading}
                sx={{ bgcolor: 'grey.900', color: 'white', px: 4, '&:hover': { bgcolor: 'grey.800' } }}>
                Buscar
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tabla Principal */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>Número de Orden</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Total</TableCell>
              <TableCell align="center">Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  Cargando ventas…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>
                  {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && ventas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  No hay ventas para mostrar.
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && ventasPaginadas.map((item) => {
              const clienteNombre = item.cliente
                ? `${item.cliente.Nombre ?? ''} ${item.cliente.Apellido ?? ''}`.trim()
                : `Cliente #${item.IdCliente ?? '?'}`;
              const fecha = item.Fecha ? new Date(item.Fecha).toLocaleString('es-AR') : '-';
              const totalUsd = Number(item.TotalVenta ?? 0);
              // El valor en pesos de una venta pasada es el que se guardó al cobrarla,
              // no se recalcula con el dólar de hoy.
              const totalArs = Number(item.TotalVentaARS) || (totalUsd * cotizacionActual);
              return (
                <TableRow key={item.Id} hover>
                  <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>#{item.Id}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{fecha}</TableCell>
                  <TableCell sx={{ fontWeight: 500, color: 'text.primary', fontSize: '0.875rem' }}>{clienteNombre || '-'}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 'bold', color: 'success.main', fontSize: '0.9rem', lineHeight: 1.2 }}>
                      U$S {totalUsd.toLocaleString('en-US')}
                    </Typography>
                    {totalArs > 0 && (
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        $ {totalArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={item.EstadoPago ? 'Pagada' : 'Pendiente'} size="small"
                      color={item.EstadoPago ? 'success' : 'warning'}
                      sx={{ fontWeight: 'bold', fontSize: '0.625rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" color="primary" onClick={() => navigate(`/app/ventas/detalle/${item.Id}`)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!loading && !error && ventas.length > FILAS_POR_PAGINA && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              count={totalPaginas}
              page={paginaSegura}
              onChange={(_, p) => setPagina(p)}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </TableContainer>

      {/* MODAL 1: Lista de Deudas */}
      <Dialog open={openDeudas} onClose={() => setOpenDeudas(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Payments /> Cobrar Cuotas
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <TableContainer>
            <Table sx={{ minWidth: 600 }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente / Venta</TableCell>
                  <TableCell align="right">Deuda</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deudasLoading && (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>Cargando cuentas a cobrar…</TableCell></TableRow>
                )}
                {!deudasLoading && deudasError && (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'error.main' }}>{deudasError}</TableCell></TableRow>
                )}
                {!deudasLoading && !deudasError && deudas.length === 0 && (
                  <TableRow><TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No hay cuotas pendientes de cobro.</TableCell></TableRow>
                )}
                {!deudasLoading && !deudasError && deudas.map((deuda) => (
                  <TableRow key={deuda.idCuota} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{deuda.cliente}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        Venta #{deuda.idVenta} • Cuota {deuda.numeroCuota} • Vence: {deuda.vencimiento}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>U$S {deuda.monto.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={deuda.diasRestantes < 0 ? `Venció hace ${Math.abs(deuda.diasRestantes)} días` : deuda.diasRestantes === 0 ? 'Vence hoy' : `Faltan ${deuda.diasRestantes} días`}
                        color={deuda.diasRestantes < 0 ? 'error' : 'warning'}
                        size="small" sx={{ fontSize: '0.625rem', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ver Ticket">
                        <IconButton size="small" color="primary" onClick={() => navigate(`/app/ventas/detalle/${deuda.idVenta}`)} sx={{ mr: 1 }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="contained" color="success" size="small"
                        startIcon={<PriceCheck />}
                        onClick={() => abrirModalCobro(deuda)}
                        sx={{ fontWeight: 'bold', textTransform: 'none', boxShadow: 1 }}
                      >
                        Cobrar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeudas(false)} color="inherit">Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 2: Registrar Cobro */}
      <Dialog open={openCobro} onClose={() => setOpenCobro(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'success.main', color: 'white', textAlign: 'center', fontSize: '0.875rem', fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>
           Registrar Cobro
        </DialogTitle>
        <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', fontWeight: 'bold' }}>Cobrando a</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>{cobroData.cliente}</Typography>
            <Box component="span" sx={{ mt: 1, display: 'inline-block', px: 2, py: 0.5, bgcolor: '#fef2f2', color: 'error.main', borderRadius: 5, border: '1px solid #fee2e2', fontSize: '0.875rem', fontWeight: 'bold' }}>
              Debe: U$S {cobroData.montoDeuda.toFixed(2)}
            </Box>
          </Box>

          <TextField 
            label="Monto a Abonar (U$S)" 
            fullWidth type="number"
            value={cobroData.montoAAbonar}
            onChange={(e) => setCobroData({...cobroData, montoAAbonar: e.target.value})}
            sx={{ mb: 3 }}
            InputProps={{
              sx: { fontSize: '1.5rem', fontWeight: 'bold', color: 'success.main', textAlign: 'center' }
            }}
          />

          <FormControl fullWidth size="small" sx={{ textAlign: 'left' }}>
            <InputLabel>Método de Pago</InputLabel>
            <Select
              value={cobroData.idMetodoPago}
              label="Método de Pago"
              onChange={(e) => setCobroData({...cobroData, idMetodoPago: e.target.value})}
            >
              {metodosPago.map((m) => (
                <MenuItem key={m.Id} value={m.Id}>{m.Nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Button
            fullWidth variant="contained" color="success"
            sx={{ py: 1.5, fontWeight: 'bold', borderRadius: 2 }}
            onClick={confirmarCobro}
            disabled={cobrando}
          >
            {cobrando ? 'GUARDANDO…' : 'CONFIRMAR PAGO'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistorialVentas;
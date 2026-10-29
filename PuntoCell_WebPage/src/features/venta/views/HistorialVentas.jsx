import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ventasService } from '../../../services/ventasServices';
import { getEmpleados } from '../../../services/api';
import { useVenta } from '../../punto-venta/context/VentaContext';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, Close, Visibility } from '@mui/icons-material';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';
import NumberField from '../../../components/ui/NumberField';
import FilterBar, { FilterField } from '../../../components/ui/FilterBar';
import TablePager from '../../../components/ui/TablePager';
import { toast } from 'sonner';
import { esEfectivoNombre, redondearEfectivo } from '../../../utils/efectivo';

const FILAS_POR_PAGINA = 10;
const FILAS_POR_PAGINA_DEUDAS = 5;
const FILTROS_VACIOS = { cliente: '', producto: '', idEmpleado: '', desde: null, hasta: null, montoMin: '' };

const fechaCorta = (d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const horaCorta  = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const mediana = (nums) => {
  if (!nums.length) return 0;
  const orden = [...nums].sort((a, b) => a - b);
  const m = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[m] : (orden[m - 1] + orden[m]) / 2;
};

// Serie diaria real de las ventas cargadas. Si hay un solo día no hay línea que
// dibujar y el sparkline se omite solo.
const serieDiaria = (ventas) => {
  const porDia = new Map();
  for (const v of ventas) {
    if (!v.Fecha) continue;
    const dia = new Date(v.Fecha).toISOString().slice(0, 10);
    porDia.set(dia, (porDia.get(dia) || 0) + Number(v.TotalVenta ?? 0));
  }
  return [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, total]) => total);
};

const HistorialVentas = () => {
  const navigate = useNavigate();
  const { dolarGlobal: cotizacion } = useVenta();

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginaDeudas, setPaginaDeudas] = useState(1);

  const [deudas, setDeudas] = useState([]);
  const [deudasLoading, setDeudasLoading] = useState(false);
  const [deudasError, setDeudasError] = useState('');
  const [metodosPago, setMetodosPago] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  const [openCobro, setOpenCobro] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [cobroData, setCobroData] = useState({
    idCuota: null, idVenta: null, cliente: '', detalle: '',
    montoDeuda: 0, montoAAbonar: 0, idMetodoPago: '',
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
      setPaginaDeudas(1);
    } catch (err) {
      setDeudasError(err.message || 'No se pudieron cargar las cuotas por cobrar.');
    } finally {
      setDeudasLoading(false);
    }
  }, []);

  const cargarVentas = useCallback(async (filtrosActuales) => {
    setLoading(true);
    setError('');
    try {
      const query = {};
      if (filtrosActuales.cliente)    query.cliente = filtrosActuales.cliente;
      if (filtrosActuales.producto)   query.producto = filtrosActuales.producto;
      if (filtrosActuales.idEmpleado) query.idEmpleado = filtrosActuales.idEmpleado;
      if (filtrosActuales.montoMin)   query.montoMin = filtrosActuales.montoMin;
      if (filtrosActuales.desde)      query.desde = filtrosActuales.desde.format('YYYY-MM-DD');
      if (filtrosActuales.hasta)      query.hasta = filtrosActuales.hasta.format('YYYY-MM-DD');

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
    cargarDeudas();
    ventasService.getMetodosPago()
      .then((lista) => setMetodosPago(Array.isArray(lista) ? lista : []))
      .catch(() => setMetodosPago([]));
    getEmpleados()
      .then((lista) => setEmpleados(Array.isArray(lista) ? lista : []))
      .catch(() => setEmpleados([]));
  }, [cargarDeudas]);

  useEffect(() => {
    cargarVentas(FILTROS_VACIOS);
  }, [cargarVentas]);

  // ─── Derivados ────────────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const totales = ventas.map((v) => Number(v.TotalVenta ?? 0));
    const facturado = totales.reduce((a, b) => a + b, 0);
    const porCobrar = deudas.reduce((a, d) => a + d.monto, 0);
    const cobrado = Math.max(facturado - porCobrar, 0);
    return {
      facturado,
      porCobrar,
      cobrado,
      cobradoPct: facturado > 0 ? Math.round((cobrado / facturado) * 100) : 0,
      ticket: totales.length ? facturado / totales.length : 0,
      medianaTicket: mediana(totales),
      vencidas: deudas.filter((d) => d.diasRestantes < 0).length,
      serie: serieDiaria(ventas),
    };
  }, [ventas, deudas]);

  const periodo = useMemo(() => {
    if (filtros.desde || filtros.hasta) {
      const d = filtros.desde ? filtros.desde.format('DD/MM/YYYY') : 'inicio';
      const h = filtros.hasta ? filtros.hasta.format('DD/MM/YYYY') : 'hoy';
      return `${d} — ${h}`;
    }
    if (!ventas.length) return 'Sin operaciones registradas';
    const fechas = ventas.map((v) => new Date(v.Fecha)).filter((d) => !isNaN(d));
    if (!fechas.length) return `${ventas.length} operaciones`;
    const min = new Date(Math.min(...fechas));
    const max = new Date(Math.max(...fechas));
    return `${fechaCorta(min)} al ${fechaCorta(max)}`;
  }, [filtros.desde, filtros.hasta, ventas]);

  const ars = (usd) => (cotizacion > 0 ? usd * cotizacion : 0);

  const totalPaginas = Math.max(1, Math.ceil(ventas.length / FILAS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const desdeFila = ventas.length ? (paginaSegura - 1) * FILAS_POR_PAGINA + 1 : 0;
  const hastaFila = Math.min(paginaSegura * FILAS_POR_PAGINA, ventas.length);
  const ventasPaginadas = ventas.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA);

  const totalPaginasDeudas = Math.max(1, Math.ceil(deudas.length / FILAS_POR_PAGINA_DEUDAS));
  const paginaDeudasSegura = Math.min(paginaDeudas, totalPaginasDeudas);
  const desdeDeuda = deudas.length ? (paginaDeudasSegura - 1) * FILAS_POR_PAGINA_DEUDAS + 1 : 0;
  const hastaDeuda = Math.min(paginaDeudasSegura * FILAS_POR_PAGINA_DEUDAS, deudas.length);
  const deudasPaginadas = deudas.slice((paginaDeudasSegura - 1) * FILAS_POR_PAGINA_DEUDAS, paginaDeudasSegura * FILAS_POR_PAGINA_DEUDAS);

  // Chips de filtros activos: quitar uno vuelve a buscar sin él.
  const chipsActivos = useMemo(() => {
    const activos = [];
    if (filtros.cliente)  activos.push({ campo: 'cliente',  texto: filtros.cliente });
    if (filtros.producto) activos.push({ campo: 'producto', texto: filtros.producto });
    if (filtros.idEmpleado) {
      const emp = empleados.find((e) => String(e.id) === String(filtros.idEmpleado));
      activos.push({ campo: 'idEmpleado', texto: emp ? `${emp.nombre} ${emp.apellido}` : 'Vendedor' });
    }
    if (filtros.desde || filtros.hasta) {
      activos.push({
        campo: 'fechas',
        texto: `${filtros.desde ? filtros.desde.format('DD/MM') : '…'} — ${filtros.hasta ? filtros.hasta.format('DD/MM') : '…'}`,
      });
    }
    if (filtros.montoMin) activos.push({ campo: 'montoMin', texto: `desde $ ${filtros.montoMin}` });
    return activos;
  }, [filtros, empleados]);

  const quitarChip = (campo) => {
    const nuevos = campo === 'fechas'
      ? { ...filtros, desde: null, hasta: null }
      : { ...filtros, [campo]: '' };
    setFiltros(nuevos);
    cargarVentas(nuevos);
  };

  const handleInputChange = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });
  const aplicarFiltros = () => cargarVentas(filtros);
  const limpiarFiltros = () => { setFiltros(FILTROS_VACIOS); cargarVentas(FILTROS_VACIOS); };

  const esEfectivoId = (idMetodo) => esEfectivoNombre(metodosPago.find((m) => String(m.Id) === String(idMetodo))?.Nombre);

  const abrirModalCobro = (deuda) => {
    setCobroData({
      idCuota: deuda.idCuota,
      idVenta: deuda.idVenta,
      cliente: deuda.cliente,
      detalle: `cuota ${deuda.numeroCuota} · venta #${deuda.idVenta}`,
      montoDeuda: deuda.monto,
      // En efectivo el monto propuesto es la cuota redondeada al entero.
      montoAAbonar: esEfectivoId(metodosPago[0]?.Id) ? redondearEfectivo(deuda.monto) : deuda.monto,
      idMetodoPago: metodosPago[0]?.Id ?? '',
    });
    setOpenCobro(true);
  };

  const confirmarCobro = async () => {
    if (!cobroData.idMetodoPago) return toast.warning('Seleccioná el método de pago.');
    const efectivo = esEfectivoId(cobroData.idMetodoPago);
    // En efectivo el cobro es siempre un importe entero.
    const monto = efectivo ? redondearEfectivo(cobroData.montoAAbonar) : Number(cobroData.montoAAbonar);
    if (isNaN(monto) || monto <= 0) return toast.warning('Ingresá un monto válido.');

    setCobrando(true);
    try {
      const ahora = new Date().toISOString();
      // Cobrar en efectivo el importe redondeado de la cuota la saldea.
      const saldaPorRedondeo = efectivo && monto === Math.round(cobroData.montoDeuda);
      const montoRestante = saldaPorRedondeo ? 0 : cobroData.montoDeuda - monto;

      // 1. Si es pago total, marcamos pagada; si es parcial, restamos el monto a la cuota
      const payloadCuota = montoRestante <= 0.01 
        ? { FechaPago: ahora } 
        : { MontoCuota: montoRestante };
        
      await ventasService.pagarCuota(cobroData.idCuota, payloadCuota);

      const cuotasVenta = deudas.filter(d => d.idVenta === cobroData.idVenta);
      const esUltimaCuota = cuotasVenta.length === 1 && montoRestante <= 0.01;

      // 2. Registramos el ingreso de dinero contra la venta
      await ventasService.crearPago({
        Monto: monto,
        FechaPago: ahora,
        Observacion: montoRestante <= 0.01 ? 'Cobro de cuota' : 'Cobro parcial de cuota',
        IdVenta: cobroData.idVenta,
        IdMetodoPago: Number(cobroData.idMetodoPago),
        IdTurnoCaja: 1,
        Pagado: esUltimaCuota
      });
      setOpenCobro(false);
      await cargarDeudas();
      toast.success(`✅ Pago de U$S ${monto.toFixed(2)} registrado para ${cobroData.cliente}`);
    } catch (err) {
      toast.error('❌ No se pudo registrar el cobro: ' + (err.message || ''));
    } finally {
      setCobrando(false);
    }
  };

  const mensajeTabla = loading
    ? 'Cargando ventas…'
    : error || (ventas.length === 0 ? 'No hay ventas para mostrar.' : null);

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Ventas"
        title="Historial de ventas"
        meta={`${periodo} · ${ventas.length} ${ventas.length === 1 ? 'operación' : 'operaciones'}`}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/app/punto-venta')}>
            Registrar venta
          </Button>
        }
      />

      {/* ─── KPIs ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard
          eyebrow="Facturado"
          tone="accent"
          loading={loading}
          value={`U$S ${resumen.facturado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`$ ${Math.round(ars(resumen.facturado)).toLocaleString('es-AR')}`}
          spark={resumen.serie}
        />
        <KpiCard
          eyebrow="Cobrado"
          tone="ok"
          loading={loading}
          value={`U$S ${resumen.cobrado.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
          sub={`$ ${Math.round(ars(resumen.cobrado)).toLocaleString('es-AR')} · ${resumen.cobradoPct}%`}
        />
        <KpiCard
          eyebrow="Por cobrar"
          tone="warn"
          loading={deudasLoading}
          value={`U$S ${resumen.porCobrar.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
          sub={`$ ${Math.round(ars(resumen.porCobrar)).toLocaleString('es-AR')} · ${deudas.length} ${deudas.length === 1 ? 'cuota' : 'cuotas'}`}
          badge={resumen.vencidas > 0
            ? <StatusPill tone="late" label={`${resumen.vencidas} ${resumen.vencidas === 1 ? 'vencida' : 'vencidas'}`} />
            : null}
        />
        <KpiCard
          eyebrow="Ticket promedio"
          tone="mute"
          loading={loading}
          value={`U$S ${resumen.ticket.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
          sub={`$ ${Math.round(ars(resumen.ticket)).toLocaleString('es-AR')} · mediana U$S ${resumen.medianaTicket.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
        />
      </Box>

      {/* ─── Listado + panel ───────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0,1fr) 320px' }, gap: 2, alignItems: 'start' }}>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>

          <FilterBar
            columns="minmax(150px,1.3fr) minmax(130px,1fr) minmax(130px,1fr) minmax(230px,1.4fr) minmax(110px,.8fr)"
            chips={chipsActivos.map((c) => (
              <StatusPill
                key={c.campo}
                tone="flat"
                label={c.texto}
                sx={{ pr: '5px' }}
                meta={
                  <IconButton
                    size="small"
                    aria-label={`Quitar filtro ${c.campo}`}
                    onClick={() => quitarChip(c.campo)}
                    sx={{ width: 15, height: 15, p: 0, color: 'inherit', opacity: .7, '&:hover': { opacity: 1 } }}
                  >
                    <Close sx={{ fontSize: 11 }} />
                  </IconButton>
                }
              />
            ))}
            actions={
              <>
                <Button size="small" onClick={limpiarFiltros}>Limpiar</Button>
                <Button variant="contained" onClick={aplicarFiltros} disabled={loading}>Buscar</Button>
              </>
            }
          >
            <FilterField label="Cliente o DNI">
              <TextField name="cliente" placeholder="Nombre o documento" fullWidth
                value={filtros.cliente} onChange={handleInputChange} />
            </FilterField>

            <FilterField label="Producto">
              <TextField name="producto" placeholder="Modelo o descripción" fullWidth
                value={filtros.producto} onChange={handleInputChange} />
            </FilterField>

            <FilterField label="Vendedor">
              <Select
                name="idEmpleado" displayEmpty fullWidth size="small"
                value={filtros.idEmpleado}
                onChange={(e) => setFiltros({ ...filtros, idEmpleado: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {empleados.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</MenuItem>
                ))}
              </Select>
            </FilterField>

            <FilterField label="Período">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <DatePicker
                    value={filtros.desde}
                    onChange={(val) => setFiltros({ ...filtros, desde: val })}
                    slotProps={{ textField: { size: 'small', fullWidth: true, 'aria-label': 'Desde' } }}
                  />
                  <Box sx={{ color: 'text.disabled' }}>—</Box>
                  <DatePicker
                    value={filtros.hasta}
                    onChange={(val) => setFiltros({ ...filtros, hasta: val })}
                    slotProps={{ textField: { size: 'small', fullWidth: true, 'aria-label': 'Hasta' } }}
                  />
                </Box>
              </LocalizationProvider>
            </FilterField>

            {/* El backend filtra este campo contra TotalVentaARS, así que va en pesos. */}
            <FilterField label="Monto mínimo ($)">
              <NumberField name="montoMin" placeholder="0,00" fullWidth
                value={filtros.montoMin} onChange={handleInputChange} />
            </FilterField>
          </FilterBar>

          {/* Tabla */}
          <Paper sx={{ overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 82 }}>Orden</TableCell>
                    <TableCell sx={{ width: 140 }}>Fecha</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Vendedor</TableCell>
                    <TableCell align="right" sx={{ width: 150 }}>Total</TableCell>
                    <TableCell sx={{ width: 120 }}>Estado</TableCell>
                    <TableCell align="right" sx={{ width: 64 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mensajeTabla ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ height: 120, textAlign: 'center', color: error ? 'error.main' : 'text.disabled' }}>
                        {mensajeTabla}
                      </TableCell>
                    </TableRow>
                  ) : ventasPaginadas.map((item) => {
                    const clienteNombre = item.cliente
                      ? `${item.cliente.Nombre ?? ''} ${item.cliente.Apellido ?? ''}`.trim()
                      : 'Cliente';
                    const vendedorNombre = item.empleado
                      ? `${item.empleado.Nombre ?? ''} ${item.empleado.Apellido ?? ''}`.trim()
                      : '—';
                    const totalUsd = Number(item.TotalVenta ?? 0);
                    // El ARS guardado en la venta es el histórico (congelado a la cotización
                    // de ese día); solo si no está se recalcula con el dólar actual.
                    const totalArsRow = Number(item.TotalVentaARS) || ars(totalUsd);

                    return (
                      <TableRow key={item.Id} hover>
                        <TableCell className="mono" sx={{ fontWeight: 600 }}>#{item.Id}</TableCell>
                        <TableCell className="mono" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {item.Fecha ? fechaCorta(item.Fecha) : '—'}
                          {item.Fecha && (
                            <Box component="span" sx={{ color: 'text.disabled', ml: 0.75 }}>{horaCorta(item.Fecha)}</Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, letterSpacing: '-.01em' }}>
                          {clienteNombre || '—'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>
                          {vendedorNombre || '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Money ars={totalArsRow} usd={totalUsd} />
                        </TableCell>
                        <TableCell>
                          <StatusPill
                            tone={item.EstadoPago ? 'ok' : 'due'}
                            label={item.EstadoPago ? 'Pagada' : 'Pendiente'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Ver detalle">
                            <IconButton size="small" onClick={() => navigate(`/app/ventas/detalle/${item.Id}`)}>
                              <Visibility sx={{ fontSize: 17 }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {!loading && !error && ventas.length > 0 && (
              <TablePager
                page={paginaSegura}
                pageCount={totalPaginas}
                from={desdeFila}
                to={hastaFila}
                total={ventas.length}
                unidad={ventas.length === 1 ? 'venta' : 'ventas'}
                onChange={setPagina}
              />
            )}
          </Paper>
        </Box>

        {/* ─── Panel de cuentas a cobrar ───────────────────────── */}
        <Paper component="aside" aria-label="Cuotas por cobrar" sx={{ position: { xl: 'sticky' }, top: 68, overflow: 'hidden' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
            p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
          }}>
            <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>
              Cuotas por cobrar
            </Typography>
            {resumen.vencidas > 0 && (
              <StatusPill tone="late" label={`${resumen.vencidas} ${resumen.vencidas === 1 ? 'vencida' : 'vencidas'}`} />
            )}
          </Box>

          <Box sx={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.25,
            p: '13px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
          }}>
            <Box>
              <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Total pendiente</Box>
              <Money ars={ars(resumen.porCobrar)} usd={resumen.porCobrar} align="left" size="lg" />
            </Box>
          </Box>

          {deudasLoading && (
            <Box sx={{ p: '20px 15px', color: 'text.disabled', fontSize: '.78rem' }}>Cargando cuotas por cobrar…</Box>
          )}
          {!deudasLoading && deudasError && (
            <Box sx={{ p: '20px 15px', color: 'error.main', fontSize: '.78rem' }}>{deudasError}</Box>
          )}
          {!deudasLoading && !deudasError && deudas.length === 0 && (
            <Box sx={{ p: '20px 15px', color: 'text.disabled', fontSize: '.78rem' }}>No hay cuotas pendientes de cobro.</Box>
          )}

          {!deudasLoading && !deudasError && deudasPaginadas.map((deuda, i) => (
            <Box
              key={deuda.idCuota}
              sx={{
                display: 'flex', flexDirection: 'column', gap: 1, p: '12px 15px',
                borderTop: i === 0 ? 0 : 1, borderColor: 'pc.dividerSoft',
                '&:hover': { bgcolor: 'pc.surfaceMuted' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '.8rem' }}>{deuda.cliente}</Typography>
                  <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-2px' }}>
                    #{deuda.idVenta} · cuota {deuda.numeroCuota} · vence {deuda.vencimiento}
                  </Typography>
                </Box>
                <Money ars={ars(deuda.monto)} usd={deuda.monto} size="sm" />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                <StatusPill
                  tone={deuda.diasRestantes < 0 ? 'late' : deuda.diasRestantes <= 3 ? 'due' : 'flat'}
                  label={
                    deuda.diasRestantes < 0
                      ? `Venció hace ${Math.abs(deuda.diasRestantes)} ${Math.abs(deuda.diasRestantes) === 1 ? 'día' : 'días'}`
                      : deuda.diasRestantes === 0
                        ? 'Vence hoy'
                        : `Vence en ${deuda.diasRestantes} ${deuda.diasRestantes === 1 ? 'día' : 'días'}`
                  }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="Ver venta">
                    <IconButton size="small" onClick={() => navigate(`/app/ventas/detalle/${deuda.idVenta}`)}>
                      <Visibility sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant={deuda.diasRestantes < 0 ? 'contained' : 'outlined'}
                    onClick={() => abrirModalCobro(deuda)}
                  >
                    Cobrar
                  </Button>
                </Box>
              </Box>
            </Box>
          ))}

          {!deudasLoading && !deudasError && deudas.length > 0 && (
            <TablePager
              page={paginaDeudasSegura}
              pageCount={totalPaginasDeudas}
              from={desdeDeuda}
              to={hastaDeuda}
              total={deudas.length}
              unidad={deudas.length === 1 ? 'cuota' : 'cuotas'}
              onChange={setPaginaDeudas}
            />
          )}

          {!deudasLoading && !deudasError && deudas.length > 0 && (
            <Box sx={{ p: '11px 15px', borderTop: 1, borderColor: 'pc.dividerSoft', bgcolor: 'pc.surfaceMuted' }}>
              <Typography sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
                Ordenadas por vencimiento, primero las vencidas.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ─── Modal de cobro ────────────────────────────────────── */}
      <Dialog open={openCobro} onClose={() => setOpenCobro(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <Box>
            Registrar cobro
            <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
              {cobroData.detalle}
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setOpenCobro(false)} aria-label="Cerrar">
            <Close sx={{ fontSize: 17 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Box sx={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25,
            p: '11px 13px', borderRadius: '9px', bgcolor: 'pc.accentSoft', color: 'primary.main',
          }}>
            <Box sx={{ typography: 'eyebrow', color: 'inherit', opacity: .75 }}>
              Deuda de <b>{cobroData.cliente}</b>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Box className="num" sx={{ fontSize: '1.18rem', fontWeight: 600, letterSpacing: '-.03em' }}>
                U$S {cobroData.montoDeuda.toFixed(2)}
              </Box>
              <Box className="num" sx={{ fontSize: '.69rem', opacity: .75 }}>
                $ {Math.round(ars(cobroData.montoDeuda)).toLocaleString('es-AR')}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box component="label" htmlFor="monto-cobro" sx={{ typography: 'eyebrow', color: 'text.disabled' }}>
              Monto a abonar (U$S)
            </Box>
            <NumberField
              id="monto-cobro" fullWidth
              value={cobroData.montoAAbonar}
              onChange={(e) => setCobroData({ ...cobroData, montoAAbonar: e.target.value })}
            />
            <Typography sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
              Podés cobrar un monto parcial; el resto queda pendiente.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Método de pago</Box>
            <Select
              fullWidth size="small" displayEmpty
              value={cobroData.idMetodoPago}
              onChange={(e) => setCobroData({
                ...cobroData,
                idMetodoPago: e.target.value,
                montoAAbonar: esEfectivoId(e.target.value) && Number(cobroData.montoAAbonar) > 0
                  ? redondearEfectivo(cobroData.montoAAbonar)
                  : cobroData.montoAAbonar,
              })}
            >
              <MenuItem value="" disabled>Elegí un método</MenuItem>
              {metodosPago.map((m) => (
                <MenuItem key={m.Id} value={m.Id}>{m.Nombre}</MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setOpenCobro(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarCobro} disabled={cobrando}>
            {cobrando ? 'Guardando…' : 'Confirmar cobro'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistorialVentas;

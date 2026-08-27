import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
} from '@mui/material';

import FilterAlt from '@mui/icons-material/FilterAlt';
import Wallet from '@mui/icons-material/Wallet';
import Payments from '@mui/icons-material/Payments';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import CreditCard from '@mui/icons-material/CreditCard';
import Receipt from '@mui/icons-material/Receipt';
import Visibility from '@mui/icons-material/Visibility';

import { useVenta } from '../../punto-venta/context/VentaContext';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';
import FilterBar, { FilterField } from '../../../components/ui/FilterBar';

// --- MOCK DATA (en el futuro esto vendrá de la API) ---
const KPIS = {
  gananciaNeta: 4250.50,
  facturacionTotal: 12500.00,
  ticketPromedio: 125.00,
  margenGlobal: 34,
};

const METODOS_PAGO = [
  { key: 'efectivo', label: 'Efectivo', monto: 4500.00, icon: Payments },
  { key: 'transferencia', label: 'Transferencia', monto: 6000.00, icon: AccountBalanceWallet },
  { key: 'tarjeta', label: 'Tarjeta (créd./déb.)', monto: 2000.00, icon: CreditCard },
];

const BALANCE_DIARIO = [
  { id: 1, fecha: '15/05/2026', cantVentas: 12, totalIngreso: 1500, totalCosto: 950, gananciaNeta: 550, margen: 36, ticketPromedio: 125 },
  { id: 2, fecha: '14/05/2026', cantVentas: 8, totalIngreso: 900, totalCosto: 600, gananciaNeta: 300, margen: 33, ticketPromedio: 112 },
  { id: 3, fecha: '13/05/2026', cantVentas: 15, totalIngreso: 2100, totalCosto: 1400, gananciaNeta: 700, margen: 33, ticketPromedio: 140 },
  { id: 4, fecha: '12/05/2026', cantVentas: 4, totalIngreso: 400, totalCosto: 350, gananciaNeta: 50, margen: 12, ticketPromedio: 100 }, // margen bajo, a propósito
];

const BalanceList = () => {
  const navigate = useNavigate();
  const { dolarGlobal } = useVenta();
  const ars = (usd) => (dolarGlobal > 0 ? usd * dolarGlobal : 0);

  const [fechas, setFechas] = useState({ desde: '2026-05-01', hasta: '2026-05-15' });

  const [modalOpen, setModalOpen] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [cargandoModal, setCargandoModal] = useState(false);
  const [ventasDia, setVentasDia] = useState([]);

  const handleFiltro = (e) => {
    e.preventDefault();
    console.log('Filtrando con fechas:', fechas);
    // Aquí llamarías a: cargarBalance(fechas.desde, fechas.hasta);
  };

  const abrirDetalleVentas = (fecha) => {
    setFechaSeleccionada(fecha);
    setModalOpen(true);
    setCargandoModal(true);

    // Simulamos que pedimos el detalle al backend
    setTimeout(() => {
      setVentasDia([
        { id: 4582, hora: '10:15', comprobante: 'T-4582', cliente: 'Juan Pérez', empleado: 'Simón', total: 350 },
        { id: 4583, hora: '14:30', comprobante: 'T-4583', cliente: 'Ana Lopez', empleado: 'Carlos', total: 1150 },
      ]);
      setCargandoModal(false);
    }, 600);
  };

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Reportes"
        title="Balance diario"
        meta="Análisis de rentabilidad y flujo de caja."
        action={<StatusPill tone="due" label="Datos de ejemplo" />}
      />

      <FilterBar
        columns="minmax(140px,1fr) minmax(140px,1fr)"
        actions={<Button variant="contained" startIcon={<FilterAlt />} onClick={handleFiltro}>Buscar</Button>}
      >
        <FilterField label="Desde">
          <TextField type="date" fullWidth value={fechas.desde} onChange={(e) => setFechas({ ...fechas, desde: e.target.value })} />
        </FilterField>
        <FilterField label="Hasta">
          <TextField type="date" fullWidth value={fechas.hasta} onChange={(e) => setFechas({ ...fechas, hasta: e.target.value })} />
        </FilterField>
      </FilterBar>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard
          eyebrow="Ganancia neta (período)" tone="ok"
          value={`$ ${Math.round(ars(KPIS.gananciaNeta)).toLocaleString('es-AR')}`}
          sub={`U$S ${KPIS.gananciaNeta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
        />
        <KpiCard
          eyebrow="Facturación total" tone="accent"
          value={`$ ${Math.round(ars(KPIS.facturacionTotal)).toLocaleString('es-AR')}`}
          sub={`U$S ${KPIS.facturacionTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
        />
        <KpiCard
          eyebrow="Ticket promedio" tone="mute"
          value={`$ ${Math.round(ars(KPIS.ticketPromedio)).toLocaleString('es-AR')}`}
          sub={`U$S ${KPIS.ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
        />
        <KpiCard eyebrow="Margen global" tone="warn" value={`${KPIS.margenGlobal}%`} sub="sobre facturación" />
      </Box>

      {/* Ingresos por método de pago */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: '10px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft', bgcolor: 'pc.surfaceMuted' }}>
          <Wallet sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography sx={{ fontWeight: 600, fontSize: '.8rem' }}>Ingresos por método de pago (período)</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2, p: '16px 15px' }}>
          {METODOS_PAGO.map((m) => (
            <Box key={m.key} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, typography: 'eyebrow', color: 'text.disabled' }}>
                <m.icon sx={{ fontSize: 14 }} /> {m.label}
              </Box>
              <Money ars={ars(m.monto)} usd={m.monto} size="lg" align="center" />
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Tabla detallada por día */}
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 110 }}>Fecha</TableCell>
                <TableCell align="center" sx={{ width: 90 }}>Ventas</TableCell>
                <TableCell align="right">Ingresos</TableCell>
                <TableCell align="right">Costos</TableCell>
                <TableCell align="right">Ganancia neta</TableCell>
                <TableCell align="center" sx={{ width: 100 }}>Rentabilidad</TableCell>
                <TableCell align="right">Ticket prom.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {BALANCE_DIARIO.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ height: 120, textAlign: 'center', color: 'text.disabled' }}>
                    No hay movimientos en estas fechas.
                  </TableCell>
                </TableRow>
              ) : BALANCE_DIARIO.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell className="mono" sx={{ fontWeight: 600 }}>{row.fecha}</TableCell>
                  <TableCell align="center">
                    <Box
                      component="button"
                      onClick={() => abrirDetalleVentas(row.fecha)}
                      sx={{
                        border: 0, background: 'none', p: 0, cursor: 'pointer',
                        display: 'inline-flex',
                      }}
                    >
                      <StatusPill tone="flat" label={`${row.cantVentas} ops.`} meta={<Receipt sx={{ fontSize: 12 }} />} />
                    </Box>
                  </TableCell>
                  <TableCell align="right"><Money ars={ars(row.totalIngreso)} usd={row.totalIngreso} /></TableCell>
                  <TableCell align="right"><Money ars={-ars(row.totalCosto)} usd={-row.totalCosto} /></TableCell>
                  <TableCell align="right"><Money ars={ars(row.gananciaNeta)} usd={row.gananciaNeta} /></TableCell>
                  <TableCell align="center">
                    <StatusPill tone={row.margen > 20 ? 'ok' : 'due'} label={`${row.margen}%`} />
                  </TableCell>
                  <TableCell align="right"><Money ars={ars(row.ticketPromedio)} usd={row.ticketPromedio} size="sm" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal: detalle de tickets del día */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt sx={{ fontSize: 18 }} /> Detalle de operaciones
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, ml: 'auto' }}>
            {fechaSeleccionada}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {cargandoModal ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.disabled' }}>Cargando comprobantes…</Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 80 }}>Hora</TableCell>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Vendedor</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell align="right" sx={{ width: 64 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventasDia.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ height: 100, textAlign: 'center', color: 'text.disabled' }}>
                        Sin ventas.
                      </TableCell>
                    </TableRow>
                  ) : ventasDia.map((venta) => (
                    <TableRow key={venta.id} hover>
                      <TableCell className="mono" sx={{ color: 'text.secondary' }}>{venta.hora}</TableCell>
                      <TableCell className="mono" sx={{ fontWeight: 600 }}>{venta.comprobante}</TableCell>
                      <TableCell>{venta.cliente}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{venta.empleado}</TableCell>
                      <TableCell align="right"><Money ars={ars(venta.total)} usd={venta.total} size="sm" /></TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => navigate(`/app/ventas/detalle/${venta.id}`)}>
                          <Visibility sx={{ fontSize: 17 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default BalanceList;

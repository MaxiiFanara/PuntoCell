import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  MenuItem, FormControl, InputLabel, Select, CircularProgress, Grid
} from '@mui/material';
import { Add, Remove, LockOpen, Lock, Payments, AccountBalance, Savings, TrendingUp, TrendingDown, AccountBalanceWallet } from '@mui/icons-material';
import dayjs from 'dayjs';

import PageHeader from '../../../components/ui/PageHeader';
import { 
  getCajaMovimientos, 
  getTurnoActual, 
  abrirCaja, 
  cerrarCaja, 
  registrarMovimientoCaja 
} from '../../../services/api';

const currencyFormatter = (value) => `$ ${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

export default function CajaList() {
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [turnoActual, setTurnoActual] = useState(null);
  
  // Modales
  const [modalAbrir, setModalAbrir] = useState({ open: false, monto: '' });
  const [modalCerrar, setModalCerrar] = useState({ open: false, monto: '', observaciones: '' });
  const [formMovimiento, setFormMovimiento] = useState({
    open: false, tipo: 'ingreso', monto: '', metodoPago: 1, descripcion: ''
  });

  // Función unificada para cargar el estado de la caja y la grilla
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Verificamos si hay un turno abierto
      const turno = await getTurnoActual();
      setTurnoActual(turno);

      // 2. Traemos los movimientos de hoy para el extracto
      const params = {
        desde: dayjs().startOf('day').format('YYYY-MM-DD'),
        hasta: dayjs().endOf('day').format('YYYY-MM-DD'),
        limit: 200
      };
      const movs = await getCajaMovimientos(params);
      setMovimientos(movs?.rows || []);
    } catch (error) {
      console.error("Error al cargar datos de caja:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, [loadData]);

  const cajaAbierta = !!turnoActual;

  // ==========================================
  // CÁLCULOS PARA LOS KPIs
  // ==========================================
  const montoInicial = turnoActual?.MontoInicial || 0;
  const totalIngresos = movimientos
    .filter(m => m.TipoMovimiento === true)
    .reduce((acc, mov) => acc + Number(mov.Monto), 0);
  const totalEgresos = movimientos
    .filter(m => m.TipoMovimiento === false)
    .reduce((acc, mov) => acc + Number(mov.Monto), 0);
  const saldoActual = montoInicial + totalIngresos - totalEgresos;

  // ==========================================
  // HANDLERS REALES HACIA LA API
  // ==========================================
  const handleAbrirCaja = async (e) => {
    e.preventDefault();
    try {
      await abrirCaja({ MontoInicial: Number(modalAbrir.monto) });
      setModalAbrir({ open: false, monto: '' });
      loadData(); // Refresca la vista
    } catch (error) {
      alert(error.message || "Error al abrir la caja");
    }
  };

  const handleCerrarCaja = async (e) => {
    e.preventDefault();
    try {
      await cerrarCaja({ 
        MontoCierreFisico: Number(modalCerrar.monto),
        Observaciones: modalCerrar.observaciones
      });
      setModalCerrar({ open: false, monto: '', observaciones: '' });
      loadData(); // Refresca la vista
    } catch (error) {
      alert(error.message || "Error al cerrar la caja");
    }
  };

  const handleRegistrarMovimiento = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        Monto: Number(formMovimiento.monto),
        TipoMovimiento: formMovimiento.tipo === 'ingreso',
        Descripcion: formMovimiento.descripcion,
        IdMetodoPago: Number(formMovimiento.metodoPago)
      };
      
      await registrarMovimientoCaja(payload);
      setFormMovimiento({ open: false, tipo: 'ingreso', monto: '', metodoPago: 'efectivo', descripcion: '' });
      loadData(); // Recarga la grilla para mostrar el nuevo movimiento
    } catch (error) {
      alert(error.message || "Error al registrar el movimiento");
    }
  };

  if (loading && !turnoActual && movimientos.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', pb: 10, height: 'calc(100vh - 68px)' }}>
      
      {/* CABECERA OPERATIVA */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
        <PageHeader eyebrow="Operativa" title="Caja Diaria" meta="Gestión transaccional del turno actual." />
        
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Chip 
            icon={cajaAbierta ? <LockOpen /> : <Lock />} 
            label={cajaAbierta ? "CAJA ABIERTA" : "CAJA CERRADA"} 
            color={cajaAbierta ? "success" : "default"} 
            variant="filled"
            sx={{ fontWeight: 'bold', px: 1, height: 40 }}
          />
          
          {!cajaAbierta ? (
            <Button variant="contained" color="primary" onClick={() => setModalAbrir({ ...modalAbrir, open: true })}>Abrir Caja</Button>
          ) : (
            <>
              <Button variant="outlined" color="error" startIcon={<Remove />} onClick={() => setFormMovimiento({ ...formMovimiento, open: true, tipo: 'egreso' })}>Egreso</Button>
              <Button variant="outlined" color="success" startIcon={<Add />} onClick={() => setFormMovimiento({ ...formMovimiento, open: true, tipo: 'ingreso' })}>Ingreso</Button>
              <Button variant="contained" color="error" onClick={() => setModalCerrar({ ...modalCerrar, open: true })}>Cerrar Turno</Button>
            </>
          )}
        </Box>
      </Box>

      {/* ==========================================
          KPIs DE INFORMACIÓN RÁPIDA
          ========================================== */}
      {cajaAbierta && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, boxShadow: (t) => t.vars.palette.pc.lift }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.dark', display: 'flex' }}>
                <Savings />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">Fondo Inicial</Typography>
                <Typography variant="h6" fontWeight="bold">{currencyFormatter(montoInicial)}</Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, boxShadow: (t) => t.vars.palette.pc.lift }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.light', color: 'success.dark', display: 'flex' }}>
                <TrendingUp />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">Ingresos</Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">+{currencyFormatter(totalIngresos)}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, boxShadow: (t) => t.vars.palette.pc.lift }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'error.light', color: 'error.dark', display: 'flex' }}>
                <TrendingDown />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">Egresos</Typography>
                <Typography variant="h6" fontWeight="bold" color="error.main">-{currencyFormatter(totalEgresos)}</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, boxShadow: (t) => t.vars.palette.pc.lift, border: '1px solid', borderColor: 'primary.main' }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.main', color: 'white', display: 'flex' }}>
                <AccountBalanceWallet />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight="bold">Saldo Esperado</Typography>
                <Typography variant="h6" fontWeight="bold">{currencyFormatter(saldoActual)}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* GRILLA OPERATIVA DE MOVIMIENTOS */}
      <Paper sx={{ flex: 1, minHeight: 0, borderRadius: '12px', boxShadow: (t) => t.vars.palette.pc.lift, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'pc.surfaceMuted', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight="bold">Detalle de Movimientos del Turno</Typography>
          {cajaAbierta && turnoActual && (
            <Typography variant="body2" color="text.secondary">
              Apertura: {dayjs(turnoActual.FechaApertura).format('HH:mm')} hs | Fondo inicial: {currencyFormatter(turnoActual.MontoInicial)}
            </Typography>
          )}
        </Box>
        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Hora</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Operación</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Concepto / Detalle</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Medio de Pago</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Usuario</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto ($)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}>No hay movimientos registrados hoy.</TableCell></TableRow>
              ) : (
                movimientos.map((mov) => {
                  const idMetodo = Number(mov.IdMetodoPago || 1);
                  const isEfectivo = idMetodo === 1;

                  return (
                    <TableRow key={mov.Id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dayjs(mov.Fecha).format('HH:mm')}</TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={mov.TipoMovimiento ? 'INGRESO' : 'EGRESO'} 
                          size="small" 
                          color={mov.TipoMovimiento ? 'success' : 'error'} 
                          variant="outlined" 
                          sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} 
                        />
                      </TableCell>
                      
                      <TableCell sx={{ minWidth: 250, maxWidth: 400, whiteSpace: 'normal' }}>
                        {mov.Descripcion}
                      </TableCell>

                      <TableCell>
                        <Chip 
                          icon={isEfectivo ? <Payments fontSize="small" /> : <AccountBalance fontSize="small" />}
                          label={isEfectivo ? 'Efectivo' : 'Transferencia'} 
                          size="small" 
                          sx={{ 
                            bgcolor: isEfectivo ? 'rgba(18, 104, 78, 0.1)' : 'rgba(23, 118, 210, 0.1)', 
                            color: isEfectivo ? '#12684e' : '#1565c0',
                            fontWeight: 600
                          }} 
                        />
                      </TableCell>
                      
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {mov.empleado ? `${mov.empleado.Nombre} ${mov.empleado.Apellido}` : 'Sistema'}
                      </TableCell>
                      
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: mov.TipoMovimiento ? 'success.main' : 'error.main', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                        {mov.TipoMovimiento ? '+' : '-'}{currencyFormatter(mov.Monto)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ====================================================
          MODALES DE OPERACIÓN
          ==================================================== */}

      {/* Modal: Nuevo Movimiento */}
      <Dialog open={formMovimiento.open} onClose={() => setFormMovimiento({ ...formMovimiento, open: false })} maxWidth="sm" fullWidth>
        <form onSubmit={handleRegistrarMovimiento}>
          <DialogTitle fontWeight="bold">
            Registrar {formMovimiento.tipo === 'ingreso' ? 'Nuevo Ingreso' : 'Nuevo Egreso'} Manual
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                autoFocus fullWidth required label="Monto ($)" type="number" inputProps={{ step: "0.01", min: "0.01" }} 
                value={formMovimiento.monto} onChange={(e) => setFormMovimiento({ ...formMovimiento, monto: e.target.value })}
              />
              <FormControl fullWidth required>
                <InputLabel>Medio de Pago</InputLabel>
                <Select
                  value={formMovimiento.metodoPago} 
                  label="Medio de Pago"
                  onChange={(e) => setFormMovimiento({ ...formMovimiento, metodoPago: e.target.value })}
                >
                  {/* Coinciden con los IDs del SQL[cite: 10] */}
                  <MenuItem value={1}>Efectivo</MenuItem>
                  <MenuItem value={3}>Transferencia Bancaria</MenuItem>
                  <MenuItem value={4}>Tarjeta de Débito</MenuItem>
                  <MenuItem value={5}>Tarjeta de Crédito</MenuItem>
                  <MenuItem value={2}>Billetera Virtual (QR/Alias)</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField 
              fullWidth required label="Concepto / Detalle" 
              placeholder={formMovimiento.tipo === 'ingreso' ? "Ej: Venta de funda iPhone 13 (Manual)" : "Ej: Pago de artículos de limpieza a proveedor"} 
              value={formMovimiento.descripcion} onChange={(e) => setFormMovimiento({ ...formMovimiento, descripcion: e.target.value })}
              helperText="Escribí el nombre exacto del producto o el motivo de la operación."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setFormMovimiento({ ...formMovimiento, open: false })}>Cancelar</Button>
            <Button type="submit" variant="contained" color={formMovimiento.tipo === 'ingreso' ? 'success' : 'error'}>Guardar Movimiento</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal: Abrir Caja */}
      <Dialog open={modalAbrir.open} onClose={() => setModalAbrir({ ...modalAbrir, open: false })} maxWidth="xs" fullWidth>
        <form onSubmit={handleAbrirCaja}>
          <DialogTitle fontWeight="bold">Abrir Turno de Caja</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Ingresá el efectivo físico con el que inicia la jornada.</Typography>
            <TextField 
              autoFocus fullWidth required label="Monto Inicial en Caja ($)" type="number" inputProps={{ step: "0.01", min: "0" }} 
              value={modalAbrir.monto} onChange={(e) => setModalAbrir({ ...modalAbrir, monto: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setModalAbrir({ ...modalAbrir, open: false })}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Confirmar Apertura</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal: Cerrar Caja */}
      <Dialog open={modalCerrar.open} onClose={() => setModalCerrar({ ...modalCerrar, open: false })} maxWidth="xs" fullWidth>
        <form onSubmit={handleCerrarCaja}>
          <DialogTitle fontWeight="bold">Cerrar y Arquear Caja</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">Contá los billetes en el cajón e ingresá el monto real. El sistema calculará la diferencia.</Typography>
            <TextField 
              autoFocus fullWidth required label="Efectivo Físico Contado ($)" type="number" inputProps={{ step: "0.01", min: "0" }} 
              value={modalCerrar.monto} onChange={(e) => setModalCerrar({ ...modalCerrar, monto: e.target.value })}
            />
            <TextField 
              fullWidth multiline rows={2} label="Observaciones (Opcional)" placeholder="Ej: Faltan 100 pesos por vuelto mal dado." 
              value={modalCerrar.observaciones} onChange={(e) => setModalCerrar({ ...modalCerrar, observaciones: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={() => setModalCerrar({ ...modalCerrar, open: false })}>Cancelar</Button>
            <Button type="submit" variant="contained" color="error">Cerrar Definitivamente</Button>
          </DialogActions>
        </form>
      </Dialog>

    </Box>
  );
}
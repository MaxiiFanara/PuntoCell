import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Alert, Paper,
  List, ListItem, ListItemText, IconButton, Divider,
  Select, MenuItem, FormControl, InputLabel, Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import { useVenta } from '../context/VentaContext';
import InventarioForm from '../../inventario/components/InventarioForm';
import { inventarioService } from '../../../services/inventarioServices';
import { soloDecimalNoNegativo } from '../../../utils/validators';

const formatArs = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

// Suma N meses a una fecha "YYYY-MM-DD" y devuelve el mismo formato.
const sumarMeses = (fechaISO, meses) => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1 + meses, d);
  return fecha.toISOString().slice(0, 10);
};

export const ModalCobro = ({ open, onClose, metodosPago, onConfirmar }) => {
  const {
    carrito, totalVenta, pagos, setPagos, dolarGlobal,
    cliente, idSucursal, datosConfig
  } = useVenta();

  // String (no number) para no perder el punto decimal mientras se tipea (ej. "10.")
  const [bonificacionInput, setBonificacionInput] = useState('');
  const [motivoBonif, setMotivoBonif] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [metodoPago, setMetodoPago] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [subTransferencias, setSubTransferencias] = useState([]);
  const [banco, setBanco] = useState('');
  const [subMonto, setSubMonto] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [cantidadCuotas, setCantidadCuotas] = useState(1);

  // Canje: el equipo recibido se carga con el mismo formulario de "Nuevo Ingreso" de Inventario.
  const [modalIngresoCanjeOpen, setModalIngresoCanjeOpen] = useState(false);
  const [proveedorCanjeId, setProveedorCanjeId] = useState(null);
  const [equipoCanje, setEquipoCanje] = useState(null);

  const bonificacion = Math.min(parseFloat(bonificacionInput) || 0, totalVenta);
  const totalAjustado = totalVenta - bonificacion;
  const totalPagado = pagos.reduce((sum, p) => sum + p.Monto, 0);
  const restante = totalAjustado - totalPagado;

  useEffect(() => {
    if (open) {
      setPagos([]); setBonificacionInput(''); setMontoPago(totalVenta.toFixed(2));
      setSubTransferencias([]); setFechaVencimiento(''); setCantidadCuotas(1);
      setEquipoCanje(null);

      if (metodosPago && metodosPago.length > 0) {
        setMetodoPago(metodosPago[0].value);
      } else {
        setMetodoPago('');
      }
    }
  }, [open, totalVenta, metodosPago]);

  const metodoSeleccionado = metodosPago?.find(m => m.value === metodoPago);
  const esTransferencia = metodoSeleccionado?.label?.toLowerCase().includes('transferencia');
  const esPermuta = /permuta|canje/.test(metodoSeleccionado?.label?.toLowerCase() || '');
  const esCredito = metodoSeleccionado?.label?.toLowerCase().includes('cuotas');
  const esEfectivo = metodoSeleccionado?.label?.toLowerCase().includes('efectivo');
  // Solo en efectivo el vendedor puede cargar un monto distinto al que falta cobrar (vuelto);
  // en el resto de métodos el monto se autocompleta y queda de solo lectura.
  const montoEditable = esEfectivo;
  // Vuelto: solo aplica si lo que sobra vino de un pago en efectivo.
  const vuelto = esEfectivo ? Math.max(0, (parseFloat(montoPago) || 0) - restante) : 0;

  const agregarSubTransferencia = () => {
    if (!banco || !subMonto) return alert('Completá banco y monto');
    const monto = parseFloat(subMonto);
    if (isNaN(monto) || monto <= 0) return alert('Monto inválido');
    setSubTransferencias([...subTransferencias, { banco, monto }]);
    setBanco(''); setSubMonto('');
  };

  useEffect(() => {
    if (esTransferencia) setMontoPago(subTransferencias.reduce((sum, t) => sum + t.monto, 0).toFixed(2));
  }, [subTransferencias, esTransferencia]);

  const eliminarSubTransferencia = (index) => setSubTransferencias(subTransferencias.filter((_, i) => i !== index));

  const agregarPago = () => {
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) return alert('Ingresá un monto válido');

    let observacionPago = ''; let datosExtra = {};

    if (esTransferencia && subTransferencias.length === 0) return alert('Agregá al menos una cuenta de transferencia');

    if (esPermuta) {
      if (!equipoCanje) return alert('Cargá primero los datos del equipo recibido');
      // El equipo se da de alta en Inventario recién al confirmar la venta (ver procesarVenta)
      observacionPago = `Canje pendiente: ${equipoCanje.resumen} (se registra en inventario al confirmar la venta)`;
      datosExtra = { equipoCanjePendiente: equipoCanje };
    }

    if (esCredito) {
      const cuotas = parseInt(cantidadCuotas) || 1;
      if (!fechaVencimiento) return alert('Seleccioná la fecha de la primera cuota');
      if (cuotas < 1) return alert('La cantidad de cuotas debe ser al menos 1');
      const partes = fechaVencimiento.split('-');
      observacionPago = cuotas === 1
        ? `A Pagar antes del: ${partes[2]}/${partes[1]}/${partes[0]}`
        : `Financiado en ${cuotas} cuotas de U$S ${(monto / cuotas).toFixed(2)}, 1ª cuota ${partes[2]}/${partes[1]}/${partes[0]}`;
      datosExtra = {
        cuotas: Array.from({ length: cuotas }, (_, i) => ({
          NumeroCuota: i + 1,
          MontoCuota: Number((monto / cuotas).toFixed(2)),
          FechaVencimiento: sumarMeses(fechaVencimiento, i),
        })),
      };
    }

    if (esTransferencia) observacionPago = 'Destinos: ' + subTransferencias.map(t => `${t.banco} ($${t.monto.toFixed(2)})`).join(' + ');

    // En efectivo, solo lo que cubre la deuda cuenta como pago; el resto es vuelto.
    const montoAplicado = esEfectivo ? Math.min(monto, restante) : monto;
    if (esEfectivo && vuelto > 0.009) {
      observacionPago = observacionPago
        ? `${observacionPago} · Vuelto entregado: U$S ${vuelto.toFixed(2)}`
        : `Vuelto entregado: U$S ${vuelto.toFixed(2)}`;
    }

    setPagos([...pagos, { IdMetodoPago: parseInt(metodoPago), NombreMetodo: metodoSeleccionado?.label || 'Pago', Monto: montoAplicado, Cotizacion: dolarGlobal, Observacion: observacionPago, ...datosExtra }]);
    setMontoPago(''); setSubTransferencias([]); setFechaVencimiento(''); setCantidadCuotas(1);
    setEquipoCanje(null);
  };

  const eliminarPago = (index) => setPagos(pagos.filter((_, i) => i !== index));

  const procesarVenta = async () => {
    if (restante > 0.01) return alert(`⚠️ Aún falta cubrir U$S ${restante.toFixed(2)}`);
    if (pagos.length === 0) return alert('No hay pagos registrados');

    // Los equipos de canje se dan de alta en Inventario recién acá (si se cancela la venta
    // no queda ningún registro fantasma). El precio de toma es el monto cargado en el pago.
    let pagosFinales;
    try {
      pagosFinales = await Promise.all(pagos.map(async (p) => {
        if (!p.equipoCanjePendiente) return p;
        const creado = await inventarioService.crearIngresoCompleto({
          ...p.equipoCanjePendiente,
          precioCosto: p.Monto,
          modoCanje: true,
        });
        const idInventario = creado?.Id ?? creado?.id;
        return {
          ...p,
          Observacion: `Canje recibido: ${p.equipoCanjePendiente.resumen} (Inventario #${idInventario})`,
        };
      }));
    } catch (error) {
      alert('❌ No se pudo registrar el equipo de canje en inventario: ' + (error.message || ''));
      return;
    }

    const ventaRequest = {
      Fecha: new Date().toISOString(),
      IdCliente: parseInt(cliente?.id) || 1,
      IdSucursal: parseInt(idSucursal) || 1,
      IdTurnoCaja: 1,
      // Cotización activa en el navbar al momento del cobro (antes quedaba fija en Id=1)
      IdCotizacionDolar: datosConfig?.idCotizacionDolar || 1,
      TotalVenta: totalAjustado,
      ObservacionesVenta: observaciones,
      Bonificacion: bonificacion,
      MotivoBonificacion: motivoBonif,

      Detalles: carrito.map(item => ({
        IdInventario: parseInt(item.IdInventario),
        Cantidad: parseInt(item.Cantidad),
        PrecioUnitario: parseFloat(item.PrecioUnitario),
        Subtotal: parseFloat(item.Subtotal)
      })),

      Pagos: pagosFinales.map(p => ({
        IdMetodoPago: p.IdMetodoPago,
        Monto: p.Monto,
        Cotizacion: p.Cotizacion,
        Observacion: p.Observacion
      })),

      // Cuotas de pagos financiados, para que el backend las cree junto con la venta
      Cuotas: pagos.flatMap(p => p.cuotas || []),
    };

    onConfirmar(ventaRequest);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
        <Typography variant="h6" component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          💵 Finalizar Venta
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: '100%', minHeight: 600 }}>
          
          <Box sx={{ width: { xs: '100%', md: '33.333%' }, p: 3, bgcolor: 'grey.50', borderRight: { md: '1px solid #e0e0e0' }, borderBottom: { xs: '1px solid #e0e0e0', md: 'none' }, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 3 }}>
              🏷️ Ajustes
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <TextField
                label="Bonificación ($)" fullWidth size="small" value={bonificacionInput}
                inputProps={{ inputMode: 'decimal' }}
                // Filtra a mano: type="number" del HTML permite "-", "+" y notación científica
                onChange={(e) => setBonificacionInput(soloDecimalNoNegativo(e.target.value))}
                InputProps={{ startAdornment: <Typography sx={{ color: '#ed6c02', fontWeight: 'bold', mr: 1 }}>-</Typography> }} />
              <TextField label="Motivo del descuento" fullWidth size="small" value={motivoBonif} onChange={(e) => setMotivoBonif(e.target.value)} placeholder="Ej: Atención comercial..." />
              <TextField label="Observaciones" multiline rows={3} fullWidth size="small" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas internas..." />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">Total Venta</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>U$S {totalVenta.toFixed(2)}</Typography>
              {bonificacion > 0 && <Typography variant="caption" sx={{ color: '#d32f2f', display: 'block' }}>(Desc. - U$S {bonificacion.toFixed(2)})</Typography>}

              <Alert severity="success" sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>TOTAL A PAGAR</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.dark' }}>U$S {totalAjustado.toFixed(2)}</Typography>
              </Alert>
            </Box>
          </Box>

          <Box sx={{ width: { xs: '100%', md: '33.333%' }, p: 3, bgcolor: 'white', borderRight: { md: '1px solid #e0e0e0' }, borderBottom: { xs: '1px solid #e0e0e0', md: 'none' }, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 'bold', mb: 3 }}>
              Pagos Registrados
            </Typography>

            <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', minHeight: 300, mb: 3, bgcolor: '#fafafa' }}>
              {pagos.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'grey.400', opacity: 0.7 }}>
                  <Typography sx={{ fontSize: '2.25rem', mb: 1 }}>💸</Typography>
                  <Typography>Aún no hay pagos cargados</Typography>
                </Box>
              ) : (
                <List dense>
                  {pagos.map((pago, index) => (
                    <ListItem key={index} secondaryAction={<IconButton onClick={() => eliminarPago(index)} color="error" size="small"><DeleteIcon /></IconButton>} sx={{ borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none' } }}>
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                            <Typography sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: 'grey.800' }}>{pago.NombreMetodo}</Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                            {pago.Observacion && <Typography sx={{ fontSize: '0.75rem', color: 'grey.500' }}>{pago.Observacion}</Typography>}
                            <Box sx={{ mt: 0.5 }}>
                              <Typography component="span" sx={{ fontWeight: 'bold', color: 'grey.900' }}>U$S {pago.Monto.toFixed(2)}</Typography>
                              <Typography component="span" sx={{ fontSize: '0.75rem', color: 'grey.400', ml: 1 }}>≈ {formatArs.format(pago.Monto * pago.Cotizacion)}</Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 3, border: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', pb: 1, mb: 1, color: 'grey.700' }}>
                <Typography>Pagado:</Typography>
                <Typography sx={{ color: 'success.main' }}>U$S {totalPagado.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: restante <= 0 ? 'success.main' : 'error.main' }}>
                <Typography variant="h6">Resta:</Typography>
                <Typography variant="h6">{restante <= 0 ? `¡CUBIERTO! (${Math.abs(restante).toFixed(2)} a favor)` : `U$S ${restante.toFixed(2)}`}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: { xs: '100%', md: '33.333%' }, p: 3, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold', mb: 3 }}>
              Agregar Nuevo Pago
            </Typography>

            <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Forma de Pago</InputLabel>
                  <Select
                    value={metodoPago || ''}
                    onChange={(e) => {
                      setMetodoPago(e.target.value);
                      setSubTransferencias([]);
                      setEquipoCanje(null);
                      setFechaVencimiento('');
                      setCantidadCuotas(1);
                      // Arranca en lo que falta cubrir; en efectivo se puede editar después
                      setMontoPago(restante > 0 ? restante.toFixed(2) : '');
                    }}
                    label="Forma de Pago"
                  >
                    {metodosPago?.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </Select>
                </FormControl>

                <Box>
                  <TextField
                    label="Monto (U$S)" type="number" fullWidth size="small" value={montoPago}
                    onChange={(e) => montoEditable && setMontoPago(e.target.value)}
                    disabled={esTransferencia}
                    InputProps={{
                      readOnly: !montoEditable,
                      startAdornment: <Typography sx={{ bgcolor: '#2e7d32', color: 'white', px: 1.5, py: 0.5, borderRadius: 1, mr: 1, fontSize: '0.875rem' }}>U$S</Typography>,
                    }}
                    inputProps={{ min: 0 }}
                    helperText={montoEditable ? 'Monto recibido en efectivo (puede superar lo que falta cobrar)' : 'Cobro real — no editable para este medio de pago'}
                  />
                  <Typography variant="caption" sx={{ textAlign: 'right', display: 'block', color: 'text.secondary', mt: 0.5 }}>
                    ≈ {formatArs.format((parseFloat(montoPago) || 0) * dolarGlobal)}
                  </Typography>
                  {vuelto > 0.009 && (
                    <Alert severity="success" sx={{ mt: 1.5, p: 1.5 }}>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        💰 Vuelto: U$S {vuelto.toFixed(2)} ({formatArs.format(vuelto * dolarGlobal)})
                      </Typography>
                    </Alert>
                  )}
                </Box>

                {esTransferencia && (
                  <Alert severity="info" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}>Desglose de Transferencias</Typography>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, mb: 1.5 }}>
                      <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 5' } }}><TextField label="Banco" size="small" fullWidth value={banco} onChange={(e) => setBanco(e.target.value)} /></Box>
                      <Box sx={{ gridColumn: { xs: 'span 8', sm: 'span 4' } }}><TextField label="Monto" type="number" size="small" fullWidth value={subMonto} onChange={(e) => setSubMonto(e.target.value)} /></Box>
                      <Box sx={{ gridColumn: { xs: 'span 4', sm: 'span 3' } }}>
                        <Button variant="contained" color="info" size="small" fullWidth onClick={agregarSubTransferencia} sx={{ height: '100%', minWidth: 0 }}><AddIcon /></Button>
                      </Box>
                    </Box>

                    <List dense sx={{ maxHeight: 120, overflow: 'auto', bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      {subTransferencias.length === 0 ? (
                        <ListItem><ListItemText primary="Sin cuentas" sx={{ textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }} /></ListItem>
                      ) : (
                        subTransferencias.map((t, i) => (
                          <ListItem key={i} dense secondaryAction={<IconButton size="small" onClick={() => eliminarSubTransferencia(i)} color="error"><DeleteIcon fontSize="small" /></IconButton>}>
                            <ListItemText primary={`${t.banco}: U$S ${t.monto.toFixed(2)}`} primaryTypographyProps={{ variant: 'body2' }} />
                          </ListItem>
                        ))
                      )}
                    </List>
                    <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 'bold', mt: 1 }}>Total: U$S {subTransferencias.reduce((s, t) => s + t.monto, 0).toFixed(2)}</Typography>
                  </Alert>
                )}

                {esPermuta && (
                  <Alert severity="warning" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}>📱 Equipo recibido en canje</Typography>

                    {equipoCanje ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, bgcolor: 'white', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'success.light' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{equipoCanje.resumen}</Typography>
                          <Typography variant="caption" color="text.secondary">Se registra en inventario al confirmar la venta</Typography>
                        </Box>
                        <Button size="small" onClick={() => setEquipoCanje(null)}>Cambiar</Button>
                      </Box>
                    ) : (
                      <Button
                        variant="contained" color="warning" fullWidth
                        onClick={async () => {
                          if (!proveedorCanjeId) {
                            try {
                              setProveedorCanjeId(await inventarioService.obtenerOCrearProveedorCanje());
                            } catch {
                              return alert('No se pudo preparar el alta del equipo. Probá de nuevo.');
                            }
                          }
                          setModalIngresoCanjeOpen(true);
                        }}
                      >
                        Cargar equipo en el inventario
                      </Button>
                    )}
                  </Alert>
                )}

                {esCredito && (
                  <Alert severity="error" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}>Venta en cuotas</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                      <TextField label="Cantidad de cuotas *" type="number" size="small" fullWidth
                        value={cantidadCuotas} onChange={(e) => setCantidadCuotas(Math.max(1, parseInt(e.target.value) || 1))}
                        inputProps={{ min: 1 }} />
                      <TextField label="Fecha 1ª cuota *" type="date" size="small" fullWidth
                        value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Box>
                    {parseInt(cantidadCuotas) > 1 && montoPago && (
                      <Typography variant="caption" color="text.secondary">
                        {cantidadCuotas} cuotas mensuales de U$S {(parseFloat(montoPago) / cantidadCuotas).toFixed(2)} c/u
                      </Typography>
                    )}
                  </Alert>
                )}

                <Button variant="contained" color="success" fullWidth onClick={agregarPago} startIcon={<AddIcon />}
                  disabled={esPermuta && !equipoCanje}
                  sx={{ mt: 1, py: 1.5, fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}>
                  AGREGAR PAGO
                </Button>
              </Box>
            </Paper>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'grey.100' }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 500 }}>
          Cancelar
        </Button>
        <Button variant="contained" color="primary" onClick={procesarVenta} disabled={restante > 0.01} sx={{ px: 4, fontWeight: 'bold', textTransform: 'none', borderRadius: 2, boxShadow: 2 }}>
          ✅ CONFIRMAR VENTA
        </Button>
      </DialogActions>

      {/* Alta del equipo recibido en canje — mismo formulario que "Nuevo Ingreso" en Inventario */}
      <Dialog open={modalIngresoCanjeOpen} onClose={() => setModalIngresoCanjeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#ed6c02', color: 'white' }}>📱 Cargar equipo recibido en canje</DialogTitle>
        <DialogContent sx={{ pt: 3, bgcolor: 'grey.50' }}>
          <InventarioForm
            modoCanje
            initialData={{
              esSerializado: true,
              idSucursal: idSucursal || 1,
              idProveedor: proveedorCanjeId || '',
              idModeloArticulo: '', imei: '', idColor: '', idMemoria: '', idBateria: '',
              precioMayor: '', precioMenor: '',
              stock: 1,
              observaciones: `Equipo recibido en canje${cliente?.nombre ? ` — cliente ${cliente.nombre}` : ''}`,
              mesesGarantiaLocal: '',
            }}
            isEdit={false}
            onCancel={() => setModalIngresoCanjeOpen(false)}
            onSubmit={(formData) => {
              // Se guarda pendiente; recién se registra en Inventario al confirmar la venta
              setEquipoCanje({
                ...formData,
                resumen: `${formData.nombreModelo || 'Equipo'}${formData.imei ? ` · IMEI ${formData.imei}` : ''}`,
              });
              setModalIngresoCanjeOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
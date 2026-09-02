import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, IconButton,
  Select, MenuItem, Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { useVenta } from '../context/VentaContext';
import InventarioForm from '../../inventario/components/InventarioForm';
import { inventarioService } from '../../../services/inventarioServices';
import { fetchApi } from '../../../services/api';
import { soloDecimalNoNegativo } from '../../../utils/validators';
import StatusPill from '../../../components/ui/StatusPill';

const pesos = (n) => `$ ${Math.round(n || 0).toLocaleString('es-AR')}`;
const dolares = (n) => `U$S ${(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Suma N meses a una fecha "YYYY-MM-DD" y devuelve el mismo formato.
const sumarMeses = (fechaISO, meses) => {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1 + meses, d);
  return fecha.toISOString().slice(0, 10);
};

const Campo = ({ label, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, ...sx }}>
    {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>}
    {children}
  </Box>
);

// Los bloques condicionales (transferencia, canje, cuotas) son formularios, no
// avisos: van como sub-tarjetas y no como Alert, que gritaba de más.
const Bloque = ({ titulo, children }) => (
  <Box sx={{
    display: 'flex', flexDirection: 'column', gap: 1.25,
    p: '12px 13px', borderRadius: '9px',
    bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider',
  }}>
    <Box sx={{ typography: 'eyebrow', color: 'text.secondary' }}>{titulo}</Box>
    {children}
  </Box>
);

const Columna = ({ titulo, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...sx }}>
    <Box sx={{ p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
      <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>{titulo}</Typography>
    </Box>
    <Box sx={{ p: '13px 15px', display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minWidth: 0 }}>
      {children}
    </Box>
  </Box>
);

export const ModalCobro = ({ open, onClose, metodosPago, onConfirmar }) => {
  const {
    carrito, totalVenta, pagos, setPagos, dolarGlobal,
    cliente, setCliente, idSucursal, datosConfig
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
  const ars = (usd) => (usd || 0) * dolarGlobal;

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
  // Venta en varios pagos: el monto es editable para todos los medios (parcial mientras
  // sea menor al restante). Sólo transferencia queda de solo lectura porque su monto sale
  // del desglose por banco. En efectivo, además, se admite superar el restante (vuelto).
  const montoEditable = !esTransferencia;
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

    // El total de los pagos no puede superar el total de la venta. En efectivo se admite
    // exceso solo como vuelto (lo aplicado se topea con Math.min más abajo); en el resto
    // de los métodos un monto mayor al saldo restante es un error.
    if (!esEfectivo && monto > restante + 0.01) {
      return alert(`El pago (U$S ${monto.toFixed(2)}) supera lo que falta cobrar (U$S ${restante.toFixed(2)}).`);
    }

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
    if (!cliente?.id) return alert('⚠️ Seleccioná un cliente antes de cobrar.');
    if (restante > 0.01) return alert(`⚠️ Aún falta cubrir U$S ${restante.toFixed(2)}`);
    if (pagos.length === 0) return alert('No hay pagos registrados');

    // El cliente puede haber quedado cacheado (localStorage/estado del POS) apuntando a un
    // Id que ya no existe (ej. tras reinicializar la base). Antes revalidábamos solo al
    // montar el POS; ahora también acá, justo antes de facturar, para no mandar la venta
    // y comerse un error crudo de FK (FK_Venta_Cliente).
    try {
      const res = await fetchApi(`/usuarios/${cliente.id}`);
      const u = res?.data ?? res;
      if (!u || !(u.Id ?? u.id) || !(u.EsCliente ?? u.esCliente)) {
        setCliente(null);
        onClose();
        return alert('⚠️ El cliente seleccionado ya no existe en el sistema. Buscalo o registralo de nuevo.');
      }
    } catch (err) {
      if (err?.status === 404) {
        setCliente(null);
        onClose();
        return alert('⚠️ El cliente seleccionado ya no existe en el sistema. Buscalo o registralo de nuevo.');
      }
      return alert('❌ No se pudo verificar el cliente: ' + (err?.message || 'error de red'));
    }

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
      IdCliente: parseInt(cliente?.id),
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

  const cubierto = restante <= 0.01;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Finalizar venta
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            {cliente?.nombre ? `Cliente ${cliente.nombre}` : 'Sin cliente seleccionado'} · {carrito.length} {carrito.length === 1 ? 'ítem' : 'ítems'}
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0,1fr))' },
          '& > *:not(:first-of-type)': {
            borderTop: { xs: 1, md: 0 },
            borderLeft: { md: 1 },
            borderColor: { xs: 'pc.dividerSoft', md: 'pc.dividerSoft' },
          },
        }}>

          {/* ── Ajustes ────────────────────────────────────── */}
          <Columna titulo="Ajustes">
            <Campo label="Bonificación (U$S)">
              <TextField
                fullWidth value={bonificacionInput}
                placeholder="0,00"
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                // Filtra a mano: type="number" del HTML permite "-", "+" y notación científica.
                // No puede bonificar más que el total de la venta.
                onChange={(e) => {
                  const limpio = soloDecimalNoNegativo(e.target.value);
                  setBonificacionInput(Number(limpio) > totalVenta ? String(totalVenta) : limpio);
                }}
                helperText={Number(bonificacionInput) > 0 && Number(bonificacionInput) >= totalVenta ? 'Tope: total de la venta' : ''}
              />
            </Campo>

            <Campo label="Motivo del descuento">
              <TextField fullWidth value={motivoBonif}
                onChange={(e) => setMotivoBonif(e.target.value.slice(0, 150))}
                slotProps={{ htmlInput: { maxLength: 150 } }}
                placeholder="Ej: atención comercial" />
            </Campo>

            <Campo label="Observaciones">
              <TextField fullWidth multiline rows={3} value={observaciones}
                onChange={(e) => setObservaciones(e.target.value.slice(0, 150))}
                slotProps={{ htmlInput: { maxLength: 150 } }}
                placeholder="Notas internas" />
            </Campo>

            <Box sx={{ mt: 'auto', pt: 1.5, borderTop: 1, borderColor: 'pc.dividerSoft' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25, fontSize: '.78rem' }}>
                <Box sx={{ color: 'text.secondary' }}>Total venta</Box>
                <Box className="num" sx={{ fontWeight: 600 }}>{pesos(ars(totalVenta))}</Box>
              </Box>
              {bonificacion > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25, fontSize: '.78rem', mt: 0.5 }}>
                  <Box sx={{ color: 'text.secondary' }}>Bonificación</Box>
                  <Box className="num" sx={{ fontWeight: 600, color: 'error.main' }}>− {pesos(ars(bonificacion))}</Box>
                </Box>
              )}
              <Box sx={{ mt: 1.25, p: '11px 13px', borderRadius: '9px', bgcolor: 'pc.accentSoft', color: 'primary.main' }}>
                <Box sx={{ typography: 'eyebrow', color: 'inherit', opacity: .75 }}>Total a pagar</Box>
                <Box className="num" sx={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1.1 }}>
                  {pesos(ars(totalAjustado))}
                </Box>
                <Box className="num" sx={{ fontSize: '.72rem', opacity: .75 }}>{dolares(totalAjustado)}</Box>
              </Box>
            </Box>
          </Columna>

          {/* ── Pagos registrados ──────────────────────────── */}
          <Columna titulo="Pagos registrados">
            <Box sx={{
              flex: 1, minHeight: 200, borderRadius: '9px',
              border: 1, borderColor: 'divider', bgcolor: 'pc.surfaceMuted', overflow: 'auto',
            }}>
              {pagos.length === 0 ? (
                <Box sx={{
                  height: '100%', minHeight: 200, display: 'grid', placeItems: 'center',
                  color: 'text.disabled', fontSize: '.78rem', p: 2, textAlign: 'center',
                }}>
                  Todavía no cargaste ningún pago
                </Box>
              ) : pagos.map((pago, index) => (
                <Box key={index} sx={{
                  p: '11px 13px', borderTop: index === 0 ? 0 : 1, borderColor: 'pc.dividerSoft',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25,
                }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '.78rem' }}>{pago.NombreMetodo}</Typography>
                    {pago.Observacion && (
                      <Typography sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '1px' }}>
                        {pago.Observacion}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flex: 'none' }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Box className="num" sx={{ fontWeight: 600, fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                        {pesos(pago.Monto * pago.Cotizacion)}
                      </Box>
                      <Box className="num" sx={{ color: 'text.disabled', fontSize: '.65rem', whiteSpace: 'nowrap' }}>
                        {dolares(pago.Monto)}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => eliminarPago(index)} aria-label="Quitar pago"
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ p: '11px 13px', borderRadius: '9px', border: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25, fontSize: '.78rem' }}>
                <Box sx={{ color: 'text.secondary' }}>Pagado</Box>
                <Box className="num" sx={{ fontWeight: 600 }}>{pesos(ars(totalPagado))}</Box>
              </Box>
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25,
                mt: 1, pt: 1, borderTop: 1, borderColor: 'pc.dividerSoft',
              }}>
                <Box sx={{ fontWeight: 600, fontSize: '.8125rem' }}>Resta</Box>
                {cubierto ? (
                  <StatusPill
                    tone="ok"
                    label={Math.abs(restante) < 0.01 ? 'Cubierto' : `Cubierto · ${pesos(ars(Math.abs(restante)))} a favor`}
                  />
                ) : (
                  <Box className="num" sx={{ fontWeight: 600, fontSize: '.95rem', color: 'error.main' }}>
                    {pesos(ars(restante))}
                  </Box>
                )}
              </Box>
            </Box>
          </Columna>

          {/* ── Nuevo pago ─────────────────────────────────── */}
          <Columna titulo="Agregar un pago">
            <Campo label="Forma de pago">
              <Select
                fullWidth size="small" displayEmpty
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
              >
                {metodosPago?.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </Campo>

            <Campo label="Monto (U$S)">
              <TextField
                fullWidth value={montoPago}
                onChange={(e) => montoEditable && setMontoPago(soloDecimalNoNegativo(e.target.value))}
                disabled={esTransferencia}
                slotProps={{ input: { readOnly: !montoEditable }, htmlInput: { inputMode: 'decimal' } }}
              />
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ color: 'text.disabled', fontSize: '.69rem' }}>
                  {esTransferencia ? 'Sale del desglose por banco'
                    : esEfectivo ? 'Puede superar lo que falta cobrar → vuelto'
                    : `Podés cobrar un monto parcial (máx. U$S ${Math.max(0, restante).toFixed(2)})`}
                </Typography>
                <Typography className="num" sx={{ color: 'text.secondary', fontSize: '.72rem', fontWeight: 600 }}>
                  {pesos(ars(parseFloat(montoPago) || 0))}
                </Typography>
              </Box>
              {vuelto > 0.009 && (
                <Box sx={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1,
                  mt: 0.5, p: '9px 11px', borderRadius: '7px', bgcolor: 'warning.light', color: 'warning.main',
                }}>
                  <Box sx={{ typography: 'eyebrow', color: 'inherit' }}>Vuelto</Box>
                  <Box className="num" sx={{ fontWeight: 700, fontSize: '.84rem' }}>
                    {pesos(ars(vuelto))} <Box component="span" sx={{ opacity: .75, fontWeight: 500 }}>· {dolares(vuelto)}</Box>
                  </Box>
                </Box>
              )}
            </Campo>

            {esTransferencia && (
              <Bloque titulo="Desglose de transferencias">
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) auto', gap: 0.75 }}>
                  <TextField placeholder="Banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
                  <TextField placeholder="Monto" type="number" value={subMonto} onChange={(e) => setSubMonto(e.target.value)} />
                  <Button variant="contained" onClick={agregarSubTransferencia} aria-label="Agregar cuenta" sx={{ minWidth: 32, px: 1 }}>
                    <AddIcon sx={{ fontSize: 17 }} />
                  </Button>
                </Box>
                <Box sx={{ maxHeight: 120, overflow: 'auto', borderRadius: '7px', border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                  {subTransferencias.length === 0 ? (
                    <Box sx={{ p: '10px 11px', color: 'text.disabled', fontSize: '.72rem' }}>Sin cuentas cargadas</Box>
                  ) : subTransferencias.map((t, i) => (
                    <Box key={i} sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                      p: '7px 7px 7px 11px', borderTop: i === 0 ? 0 : 1, borderColor: 'pc.dividerSoft', fontSize: '.72rem',
                    }}>
                      <Box sx={{ fontWeight: 500 }}>{t.banco}</Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box className="num" sx={{ fontWeight: 600 }}>{dolares(t.monto)}</Box>
                        <IconButton size="small" onClick={() => eliminarSubTransferencia(i)} aria-label="Quitar cuenta"
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box className="num" sx={{ textAlign: 'right', fontWeight: 600, fontSize: '.75rem' }}>
                  Total {dolares(subTransferencias.reduce((s, t) => s + t.monto, 0))}
                </Box>
              </Bloque>
            )}

            {esPermuta && (
              <Bloque titulo="Equipo recibido en canje">
                {equipoCanje ? (
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                    p: '9px 11px', borderRadius: '7px', bgcolor: 'background.paper', border: 1, borderColor: 'divider',
                  }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '.75rem' }}>{equipoCanje.resumen}</Typography>
                      <Typography sx={{ color: 'text.disabled', fontSize: '.65rem' }}>
                        Se registra en inventario al confirmar la venta
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => setEquipoCanje(null)}>Cambiar</Button>
                  </Box>
                ) : (
                  <Button
                    variant="outlined" fullWidth
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
              </Bloque>
            )}

            {esCredito && (
              <Bloque titulo="Venta en cuotas">
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 0.75 }}>
                  <Campo label="Cuotas">
                    <TextField type="number" fullWidth value={cantidadCuotas}
                      onChange={(e) => setCantidadCuotas(Math.max(1, parseInt(e.target.value) || 1))}
                      slotProps={{ htmlInput: { min: 1 } }} />
                  </Campo>
                  <Campo label="Primera cuota">
                    <TextField type="date" fullWidth value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)} />
                  </Campo>
                </Box>
                {parseInt(cantidadCuotas) > 1 && montoPago && (
                  <Typography className="num" sx={{ color: 'text.secondary', fontSize: '.72rem' }}>
                    {cantidadCuotas} cuotas mensuales de {pesos(ars(parseFloat(montoPago) / cantidadCuotas))}
                    {' · '}{dolares(parseFloat(montoPago) / cantidadCuotas)}
                  </Typography>
                )}
              </Bloque>
            )}

            <Button
              variant="contained" fullWidth size="large" onClick={agregarPago}
              disabled={esPermuta && !equipoCanje}
              startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
              sx={{ mt: 'auto' }}
            >
              Agregar pago
            </Button>
          </Columna>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Typography sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
          {cubierto ? 'Los pagos cubren el total' : `Falta cubrir ${pesos(ars(restante))}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={procesarVenta} disabled={!cubierto}>
            Confirmar venta
          </Button>
        </Box>
      </DialogActions>

      {/* Alta del equipo recibido en canje — mismo formulario que "Nuevo Ingreso" en Inventario */}
      <Dialog open={modalIngresoCanjeOpen} onClose={() => setModalIngresoCanjeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
          Cargar equipo recibido en canje
          <IconButton size="small" onClick={() => setModalIngresoCanjeOpen(false)} aria-label="Cerrar">
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
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

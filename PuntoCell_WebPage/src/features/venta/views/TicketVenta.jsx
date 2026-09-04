import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Print, ArrowBack, VerifiedUser } from '@mui/icons-material';
import { ventasService } from '../../../services/ventasServices';

import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';

// Traduce la respuesta cruda del backend (Venta + asociaciones) a la forma plana
// que espera este componente de ticket.
const mapearVenta = (raw) => {
  const sucursalNombre = raw.turnoCaja?.sucursal?.Nombre || '-';
  const cotizacionDolar = Number(raw.cotizacion?.Valor) || 0;

  const pagos = (raw.pagos ?? []).map((p) => ({
    monto: Number(p.Monto) || 0,
    metodoNombre: p.metodoPago?.Nombre || 'Pago',
    fecha: p.FechaPago ? new Date(p.FechaPago).toLocaleString('es-AR') : '-',
    cotizacionDolar,
    esPermuta: /permuta|canje/i.test(p.metodoPago?.Nombre || ''),
    observacion: p.Observacion || '',
    imeiDispositivo: p.Observacion?.match(/IMEI\s*[:]?\s*([A-Za-z0-9]+)/)?.[1] || null,
  }));

  const detalleVenta = (raw.detalles ?? []).map((d) => {
    const inv = d.inventario;
    const articulo = inv?.articulo;
    const modelo = articulo?.modelo;
    const marca = modelo?.marca;
    return {
      productoNombre: articulo?.Nombre || 'Producto',
      modelo: modelo?.Nombre ? `${marca?.Nombre ?? ''} ${modelo.Nombre}`.trim() : (articulo?.Nombre || ''),
      cantidad: d.Cantidad,
      precioUnitario: Number(d.PrecioUnitario) || 0,
      subtotal: (Number(d.PrecioUnitario) || 0) * d.Cantidad,
      imei: inv?.IMEI || null,
      color: inv?.color?.Nombre || null,
      memoria: inv?.memoria?.Capacidad || null,
      bateria: inv?.bateria?.Porcentaje ?? null,
    };
  });

  // La bonificación viaja como primera línea de Observaciones: "[BONIF] monto|motivo"
  const obsRaw = raw.Observaciones || '';
  const bonifMatch = obsRaw.match(/^\[BONIF\]\s*([\d.]+)\|([^\n]*)\n?/);
  const bonificacion = bonifMatch ? Number(bonifMatch[1]) || 0 : 0;
  const motivoBonif = bonifMatch ? (bonifMatch[2] || '').trim() : '';
  const observacionesLimpias = bonifMatch ? obsRaw.slice(bonifMatch[0].length).trim() : obsRaw;

  return {
    id: raw.Id,
    fechaISO: raw.Fecha || null,
    fecha: raw.Fecha ? new Date(raw.Fecha).toLocaleString('es-AR') : '-',
    sucursalNombre,
    clienteNombre: raw.cliente?.Nombre || '',
    clienteApellido: raw.cliente?.Apellido || '',
    clienteDni: raw.cliente?.DNI || '-',
    vendedorNombre: `${raw.empleado?.Nombre ?? ''} ${raw.empleado?.Apellido ?? ''}`.trim() || 'Sistema',
    totalVenta: Number(raw.TotalVenta) || 0,
    bonificacion,
    motivoBonif,
    observaciones: observacionesLimpias,
    pagos,
    detalleVenta,
  };
};

const fechaLarga = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
const hora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';

const Spec = ({ children, mono }) => (
  <Box
    component="span"
    className={mono ? 'mono' : undefined}
    sx={{
      display: 'inline-flex', alignItems: 'center', height: 19, px: '7px',
      borderRadius: '5px', bgcolor: 'pc.surfaceMuted',
      border: 1, borderColor: 'pc.dividerSoft',
      color: mono ? 'text.disabled' : 'text.secondary',
      fontSize: '.65rem', fontWeight: 500, whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Box>
);

const Tarjeta = ({ titulo, extra, children, sx }) => (
  <Paper sx={{ overflow: 'hidden', ...sx }}>
    {titulo && (
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
        p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
      }}>
        <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>{titulo}</Typography>
        {extra}
      </Box>
    )}
    {children}
  </Paper>
);

const TicketDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venta, setVenta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setVenta(null);
    setError('');
    ventasService.getById(id)
      .then((raw) => setVenta(mapearVenta(raw)))
      .catch((err) => setError(err.message || 'No se pudo cargar la venta.'));
  }, [id]);

  if (error) return <Box sx={{ p: 5, textAlign: 'center', color: 'error.main' }}>{error}</Box>;
  if (!venta) return <Box sx={{ p: 5, textAlign: 'center', color: 'text.disabled' }}>Cargando datos del ticket…</Box>;

  // Cotización de la venta, no la del día: un comprobante histórico se lee al
  // valor con el que se emitió.
  const cotizacion = venta.pagos?.[0]?.cotizacionDolar || 0;
  const ars = (usd) => (cotizacion > 0 ? usd * cotizacion : 0);
  const totalPagado = venta.pagos?.reduce((acc, p) => acc + p.monto, 0) || 0;
  const saldada = totalPagado >= venta.totalVenta;
  const unidades = venta.detalleVenta.reduce((a, d) => a + (d.cantidad || 0), 0);

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <Button
        onClick={() => navigate('/app/ventas/historial')}
        startIcon={<ArrowBack sx={{ fontSize: '16px !important' }} />}
        sx={{ alignSelf: 'flex-start', px: 0, '@media print': { display: 'none' } }}
      >
        Historial de ventas
      </Button>

      <Box id="ticketImprimible" sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

        {/* ─── Encabezado ─────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2.25, flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Venta</Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.375, mt: '2px' }}>
              <Typography variant="h3" component="h1" className="mono">#{venta.id}</Typography>
              <StatusPill tone={saldada ? 'ok' : 'due'} label={saldada ? 'Pagada' : 'Pendiente'} />
            </Box>
            <Typography sx={{ mt: '1px', fontSize: '.78rem', color: 'text.secondary' }}>
              Registrada el {fechaLarga(venta.fechaISO)} a las {hora(venta.fechaISO)}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Print sx={{ fontSize: '16px !important' }} />}
            onClick={() => window.print()}
            sx={{ '@media print': { display: 'none' } }}
          >
            Imprimir
          </Button>
        </Box>

        {/* ─── Franja de datos ────────────────────────────────── */}
        <Paper sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' },
          overflow: 'hidden',
        }}>
          {[
            { label: 'Cliente',   val: `${venta.clienteNombre} ${venta.clienteApellido}`.trim() || '—', sub: `DNI ${venta.clienteDni}`, subMono: true },
            { label: 'Vendedor',  val: venta.vendedorNombre, sub: `Sucursal ${venta.sucursalNombre}` },
            { label: 'Cotización aplicada', val: cotizacion > 0 ? `$ ${cotizacion.toLocaleString('es-AR')}` : '—', sub: 'Al momento de la venta', valMono: true },
            { label: 'Comprobante', val: `#${venta.id}`, sub: venta.fecha, valMono: true },
          ].map((m, i) => (
            <Box key={m.label} sx={{
              p: '12px 15px',
              borderLeft: { xs: i % 2 === 0 ? 0 : 1, md: i === 0 ? 0 : 1 },
              borderColor: 'pc.dividerSoft',
            }}>
              <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{m.label}</Box>
              <Typography className={m.valMono ? 'mono' : undefined}
                sx={{ fontWeight: 600, fontSize: '.84rem', mt: '3px', letterSpacing: '-.01em' }}>
                {m.val}
              </Typography>
              <Typography className={m.subMono ? 'mono' : undefined}
                sx={{ color: 'text.disabled', fontSize: '.69rem' }}>
                {m.sub}
              </Typography>
            </Box>
          ))}
        </Paper>

        {/* ─── Cuerpo ─────────────────────────────────────────── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 320px' }, gap: 2, alignItems: 'start' }}>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>

            <Tarjeta
              titulo="Productos"
              extra={
                <Typography sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
                  {venta.detalleVenta.length} {venta.detalleVenta.length === 1 ? 'ítem' : 'ítems'} · {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                </Typography>
              }
            >
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right" sx={{ width: 70 }}>Cant.</TableCell>
                      <TableCell align="right" sx={{ width: 120 }}>P. unitario</TableCell>
                      <TableCell align="right" sx={{ width: 130 }}>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {venta.detalleVenta.map((det, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ height: 'auto', py: 1.5 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>
                            {det.productoNombre}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, flexWrap: 'wrap', mt: 0.5 }}>
                            {det.modelo && det.modelo !== det.productoNombre && <Spec>{det.modelo}</Spec>}
                            {det.imei && <Spec mono>IMEI {det.imei}</Spec>}
                            {det.color && <Spec>{det.color}</Spec>}
                            {det.memoria && <Spec>{det.memoria}</Spec>}
                            {det.bateria != null && <Spec>Batería {det.bateria}%</Spec>}
                          </Box>
                        </TableCell>
                        <TableCell align="right" className="num" sx={{ height: 'auto', py: 1.5 }}>{det.cantidad}</TableCell>
                        <TableCell align="right" sx={{ height: 'auto', py: 1.5 }}>
                          <Money ars={ars(det.precioUnitario)} usd={det.precioUnitario} size="sm" />
                        </TableCell>
                        <TableCell align="right" sx={{ height: 'auto', py: 1.5 }}>
                          <Money ars={ars(det.subtotal)} usd={det.subtotal} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Tarjeta>

            <Tarjeta
              titulo="Pagos recibidos"
              extra={<StatusPill tone={saldada ? 'ok' : 'due'} label={saldada ? 'Saldado' : 'Con saldo'} />}
            >
              {venta.pagos.length === 0 && (
                <Box sx={{ p: '16px 15px', color: 'text.disabled', fontSize: '.78rem' }}>Sin pagos registrados.</Box>
              )}
              {venta.pagos.map((pago, i) => (
                <Box key={i} sx={{ borderTop: i === 0 ? 0 : 1, borderColor: 'pc.dividerSoft' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: '11px 15px' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '.78rem' }}>{pago.metodoNombre}</Typography>
                        {pago.esPermuta && <StatusPill tone="flat" label="Permuta" />}
                      </Box>
                      <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-2px' }}>
                        {pago.fecha}
                      </Typography>
                    </Box>
                    <Money ars={ars(pago.monto)} usd={pago.monto} size="sm" />
                  </Box>
                  {pago.esPermuta && (
                    <Box sx={{
                      mx: '15px', mb: 1.5, p: '9px 11px', borderRadius: '7px',
                      bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'pc.dividerSoft',
                      color: 'text.secondary', fontSize: '.69rem',
                    }}>
                      Recibido: {pago.observacion}
                      {pago.imeiDispositivo && <><br />IMEI: <span className="mono">{pago.imeiDispositivo}</span></>}
                    </Box>
                  )}
                </Box>
              ))}
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
                p: '11px 15px', borderTop: 1, borderColor: 'pc.dividerSoft', bgcolor: 'pc.surfaceMuted',
              }}>
                <Typography sx={{ fontWeight: 600, fontSize: '.78rem' }}>Total pagado</Typography>
                <Money ars={ars(totalPagado)} usd={totalPagado} size="sm" />
              </Box>
            </Tarjeta>

            {venta.observaciones && (
              <Tarjeta titulo="Observaciones">
                <Typography sx={{ p: '12px 15px', color: 'text.secondary', fontSize: '.78rem', lineHeight: 1.55 }}>
                  {venta.observaciones}
                </Typography>
              </Tarjeta>
            )}
          </Box>

          {/* ─── Columna derecha ──────────────────────────────── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>

            <Tarjeta titulo="Resumen">
              <Box sx={{ py: 0.5 }}>
                {venta.bonificacion > 0 && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.75, p: '8px 15px', fontSize: '.78rem' }}>
                      <Box sx={{ color: 'text.secondary' }}>Subtotal</Box>
                      <Box className="num" sx={{ fontWeight: 600 }}>
                        U$S {(venta.totalVenta + venta.bonificacion).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.75, p: '8px 15px', fontSize: '.78rem' }}>
                      <Box sx={{ color: 'text.secondary' }}>Bonificación{venta.motivoBonif ? ` · ${venta.motivoBonif}` : ''}</Box>
                      <Box className="num" sx={{ fontWeight: 600, color: 'error.main' }}>
                        − U$S {venta.bonificacion.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Box>
                    </Box>
                  </>
                )}
                <Box sx={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.75,
                  p: '12px 15px 8px', mt: 0.5, borderTop: 1, borderColor: 'divider',
                }}>
                  <Box sx={{ fontWeight: 600, fontSize: '.8125rem' }}>Total</Box>
                  <Box className="num" sx={{ fontSize: '1.44rem', fontWeight: 600, letterSpacing: '-.035em', color: 'primary.main' }}>
                    U$S {venta.totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Box>
                </Box>
              </Box>
              <Typography className="num" sx={{ p: '0 15px 12px', textAlign: 'right', color: 'text.disabled', fontSize: '.72rem' }}>
                $ {Math.round(ars(venta.totalVenta)).toLocaleString('es-AR')}
                {cotizacion > 0 && ` a la cotización de la venta ($ ${cotizacion.toLocaleString('es-AR')})`}
              </Typography>
            </Tarjeta>

            <Tarjeta titulo="Comprobante">
              {[
                ['Número', `#${venta.id}`, true],
                ['Emitido', venta.fecha, true],
                ['Sucursal', venta.sucursalNombre, false],
              ].map(([k, v, mono], i) => (
                <Box key={k} sx={{
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5,
                  p: '9px 15px', fontSize: '.78rem',
                  borderTop: i === 0 ? 0 : 1, borderColor: 'pc.dividerSoft',
                }}>
                  <Box sx={{ color: 'text.disabled' }}>{k}</Box>
                  <Box className={mono ? 'mono' : undefined} sx={{ fontWeight: 600 }}>{v}</Box>
                </Box>
              ))}
              <Box sx={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5,
                p: '9px 15px', fontSize: '.78rem', borderTop: 1, borderColor: 'pc.dividerSoft',
              }}>
                <Box sx={{ color: 'text.disabled' }}>Estado de pago</Box>
                <Box sx={{ fontWeight: 600, color: saldada ? 'success.main' : 'warning.main' }}>
                  {saldada ? 'Pagada' : 'Pendiente'}
                </Box>
              </Box>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.125, p: '11px 15px',
                bgcolor: 'pc.accentSoft', color: 'primary.main', fontSize: '.75rem', fontWeight: 600,
              }}>
                <VerifiedUser sx={{ fontSize: 16 }} />
                Garantía del local: 60 días
              </Box>
            </Tarjeta>
          </Box>
        </Box>
      </Box>

      {/* Al imprimir queda solo el comprobante */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticketImprimible, #ticketImprimible * { visibility: visible; }
          #ticketImprimible { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </Box>
  );
};

export default TicketDetalle;

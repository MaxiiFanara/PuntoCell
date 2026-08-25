import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box
} from '@mui/material';
import { Print, ArrowBack } from '@mui/icons-material';
import { ventasService } from '../../../services/ventasServices';

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
      subtotal: (Number(d.PrecioUnitario) || 0) * d.Cantidad,
      imei: inv?.IMEI || null,
      color: inv?.color?.Nombre || null,
      memoria: inv?.memoria?.Capacidad || null,
      bateria: inv?.bateria?.Porcentaje ?? null,
    };
  });

  return {
    id: raw.Id,
    fecha: raw.Fecha ? new Date(raw.Fecha).toLocaleString('es-AR') : '-',
    sucursalNombre,
    clienteNombre: raw.cliente?.Nombre || '',
    clienteApellido: raw.cliente?.Apellido || '',
    clienteDni: raw.cliente?.DNI || '-',
    vendedorNombre: `${raw.empleado?.Nombre ?? ''} ${raw.empleado?.Apellido ?? ''}`.trim() || 'Sistema',
    totalVenta: Number(raw.TotalVenta) || 0,
    bonificacion: 0,
    observaciones: raw.Observaciones || '',
    pagos,
    detalleVenta,
  };
};

const TicketDetalle = () => {
  const { id } = useParams();
  const ticketRef = useRef();
  const [venta, setVenta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setVenta(null);
    setError('');
    ventasService.getById(id)
      .then((raw) => setVenta(mapearVenta(raw)))
      .catch((err) => setError(err.message || 'No se pudo cargar la venta.'));
  }, [id]);

  if (error) {
    return <Box sx={{ p: 5, textAlign: 'center', color: 'error.main' }}>{error}</Box>;
  }
  if (!venta) {
      return <Box sx={{ p: 5, textAlign: 'center' }}>Cargando datos del ticket...</Box>;
  }

  const cotizacionRef = venta.pagos?.[0]?.cotizacionDolar || 0;
  const totalPagado = venta.pagos?.reduce((acc, p) => acc + p.monto, 0) || 0;
  const isAdmin = true;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ maxWidth: 'sm', mx: 'auto', mt: 4, mb: 6, px: 2 }}>
      {/* Tarjeta del Ticket */}
      <Card 
        id="ticketImprimible" 
        ref={ticketRef}
        elevation={6}
        sx={{ borderRadius: 4, overflow: 'visible' }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>PUNTO APPLE 🍎</Typography>
          <Typography variant="body2" color="text.secondary">Venta de Dispositivos y Accesorios</Typography>
          <Typography variant="body2" color="text.secondary">La Calera, Córdoba</Typography>
        </Box>

        <CardContent sx={{ pt: 0 }}>
          {/* Badge de Ticket ID */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Chip 
              label={`Ticket Nº ${venta.id}`} 
              variant="outlined" 
              sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}
            />
          </Box>

          {/* Info Principal */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
            <Box>
              <Typography component="span" sx={{ fontWeight: 'bold' }}>Fecha:</Typography><br />
              {venta.fecha}
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography component="span" sx={{ fontWeight: 'bold' }}>Sucursal:</Typography><br />
              {venta.sucursalNombre}
            </Box>
          </Box>

          {/* Info Cliente/Vendedor */}
          <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, fontSize: '0.875rem', mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <Typography variant="body2"><strong>Cliente:</strong> {venta.clienteNombre} {venta.clienteApellido}</Typography>
            <Typography variant="body2"><strong>DNI:</strong> {venta.clienteDni}</Typography>
            {cotizacionRef > 0 && (
              <Typography variant="body2"><strong>Cotización Dólar:</strong> ${cotizacionRef.toLocaleString('es-AR')}</Typography>
            )}
            <Typography variant="body2"><strong>Vendedor:</strong> {venta.vendedorNombre || "Sistema"}</Typography>
          </Box>

          {/* Tabla de Productos */}
          <TableContainer component={Paper} elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Cant</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {venta.detalleVenta.map((det, index) => (
                  <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '0.875rem' }}>{det.productoNombre}</Typography>
                      {det.modelo !== det.productoNombre && (
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{det.modelo}</Typography>
                      )}
                      {det.imei && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.6875rem', border: '1px dashed', borderColor: 'grey.300' }}>
                          <strong>IMEI:</strong> {det.imei} <br />
                          <strong>Color:</strong> {det.color} | <strong>Cap:</strong> {det.memoria} | <strong>Bat:</strong> {det.bateria}%
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">{det.cantidad}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      U$S {det.subtotal.toLocaleString('en-US')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totales */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 3 }}>
            {venta.bonificacion > 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary', fontSize: '0.875rem' }}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">U$S {(venta.totalVenta + venta.bonificacion).toLocaleString()}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main', fontSize: '0.875rem' }}>
                  <Typography variant="body2">Bonificación (-)</Typography>
                  <Typography variant="body2">- U$S {venta.bonificacion.toLocaleString()}</Typography>
                </Box>
              </>
            )}
            <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>TOTAL</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                U$S {venta.totalVenta.toLocaleString()}
              </Typography>
            </Box>
            {cotizacionRef > 0 && (
              <Typography sx={{ textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic' }}>
                (Aprox. AR$ {(venta.totalVenta * cotizacionRef).toLocaleString('es-AR')})
              </Typography>
            )}
          </Box>

          {/* Historial de Pagos */}
          <Box sx={{ mt: 4, borderTop: '1px dashed', borderColor: 'divider', pt: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.disabled', display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
              Historial de Pagos
            </Typography>
            {venta.pagos.map((pago, idx) => (
              <Box key={idx} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography component="span" sx={{ fontWeight: 'bold' }}>{pago.metodoNombre}</Typography>
                    <Typography component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.disabled' }}>({pago.fecha})</Typography>
                    {pago.esPermuta && (
                      <Chip label="PERMUTA" size="small" sx={{ ml: 1, height: 20, fontSize: '0.625rem', bgcolor: 'grey.200' }} />
                    )}
                  </Box>
                  <Typography component="span" sx={{ fontWeight: 'bold' }}>U$S {pago.monto.toLocaleString()}</Typography>
                </Box>
                {pago.esPermuta && (
                  <Box sx={{ ml: 2, mt: 0.5, p: 1, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 1, fontSize: '0.6875rem', fontStyle: 'italic', color: 'text.secondary' }}>
                    Recibido: {pago.observacion} <br />
                    IMEI: {pago.imeiDispositivo}
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          {/* Observaciones y Garantía */}
          {venta.observaciones && (
            <Box sx={{ mt: 2, p: 1.5, borderTop: '1px dashed', borderColor: 'grey.300' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>OBSERVACIONES:</Typography>
              <Typography variant="body2" sx={{ textTransform: 'uppercase', fontWeight: 500 }}>{venta.observaciones}</Typography>
            </Box>
          )}

          <Box sx={{ textAlign: 'center', mt: 5, pt: 2, borderTop: '1px solid', borderColor: 'grey.100' }}>
            <Typography variant="body2" color="text.disabled">¡Gracias por tu compra!</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Tiene garantía de 60 días.</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Botones de Acción (No se imprimen) */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2, '@media print': { display: 'none' } }}>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          sx={{
            textTransform: 'none',
            bgcolor: '#fff',
            color: '#1e293b',
            border: '1.5px solid #e2e8f0',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#f1f5f9', boxShadow: 'none' },
          }}
          onClick={() => window.history.back()}
        >
          Volver
        </Button>
        <Button 
          variant="contained" 
          startIcon={<Print />}
          onClick={handlePrint}
          sx={{ bgcolor: 'grey.900', color: 'white', textTransform: 'none', px: 4, '&:hover': { bgcolor: 'grey.800' } }}
        >
          Imprimir Ticket
        </Button>
      </Box>

      {/* CSS extra para limpiar imperfecciones al imprimir */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #ticketImprimible, #ticketImprimible * { visibility: visible; }
          #ticketImprimible {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </Box>
  );
};

export default TicketDetalle;
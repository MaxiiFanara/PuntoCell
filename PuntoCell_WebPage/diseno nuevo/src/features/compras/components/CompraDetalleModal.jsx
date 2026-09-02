import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';

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

export default function CompraDetalleModal({ open, onClose, compra }) {
  if (!compra) return null;

  // La cotización de la factura sale de sus propios totales: es un comprobante
  // histórico, no se recalcula con el dólar de hoy.
  const cotizacion = compra.totalUSD > 0 ? compra.totalARS / compra.totalUSD : 0;
  const ars = (usd) => usd * cotizacion;
  const unidades = (compra.items || []).reduce((a, i) => a + (Number(i.cant) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Factura <Box component="span" className="mono">{compra.factura}</Box>
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            {compra.proveedor} · {compra.fecha}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>

        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', sm: 'repeat(4,minmax(0,1fr))' },
          border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden',
        }}>
          {[
            { label: 'Proveedor', val: compra.proveedor },
            { label: 'Fecha', val: compra.fecha, mono: true },
            { label: 'Cotización', val: cotizacion > 0 ? `$ ${Math.round(cotizacion).toLocaleString('es-AR')}` : '—', mono: true },
            { label: 'Ítems', val: `${(compra.items || []).length} · ${unidades} un.` },
          ].map((m, i) => (
            <Box key={m.label} sx={{
              p: '10px 13px',
              borderLeft: { xs: i % 2 === 0 ? 0 : 1, sm: i === 0 ? 0 : 1 },
              borderColor: 'pc.dividerSoft',
            }}>
              <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{m.label}</Box>
              <Typography className={m.mono ? 'mono' : undefined}
                sx={{ fontWeight: 600, fontSize: '.8rem', mt: '2px' }}>
                {m.val}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 0.75 }}>Productos adquiridos</Box>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right" sx={{ width: 64 }}>Cant.</TableCell>
                    <TableCell align="right" sx={{ width: 130 }}>Costo</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>Subtotal</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compra.items && compra.items.length > 0 ? compra.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ height: 'auto', py: 1.5 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>
                          {item.modelo}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.625, flexWrap: 'wrap', mt: 0.5 }}>
                          {item.esSerial && item.imei && <Spec mono>IMEI {item.imei}</Spec>}
                          {[item.color, item.memoria, item.bateria, item.estado].filter(Boolean).map((spec, j) => (
                            <Spec key={j}>{spec}</Spec>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="right" className="num" sx={{ height: 'auto', py: 1.5 }}>{item.cant}</TableCell>
                      <TableCell align="right" sx={{ height: 'auto', py: 1.5 }}>
                        <Money ars={ars(item.costo)} usd={item.costo} size="sm" />
                      </TableCell>
                      <TableCell align="right" sx={{ height: 'auto', py: 1.5 }}>
                        <Money ars={ars(item.cant * item.costo)} usd={item.cant * item.costo} />
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ height: 100, textAlign: 'center', color: 'text.disabled' }}>
                        No hay detalles cargados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5,
          p: '13px 15px', borderRadius: '9px', bgcolor: 'pc.accentSoft', color: 'primary.main',
        }}>
          <Box>
            <Box sx={{ typography: 'eyebrow', color: 'inherit', opacity: .75 }}>Total de la factura</Box>
            <Box className="num" sx={{ fontSize: '1.6rem', fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1.1 }}>
              $ {Math.round(compra.totalARS).toLocaleString('es-AR')}
            </Box>
            <Box className="num" sx={{ fontSize: '.72rem', opacity: .75 }}>
              U$S {compra.totalUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Box>
          </Box>
          <StatusPill tone={compra.condicion === 'Pagada' ? 'ok' : 'due'} label={compra.condicion} />
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';

export default function CuentasPorPagarModal({ open, onClose, compras, onSaldar }) {
  const deudas = compras.filter(c => c.condicion === 'Adeudada');
  const totalARS = deudas.reduce((a, d) => a + d.totalARS, 0);
  const totalUSD = deudas.reduce((a, d) => a + d.totalUSD, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Cuentas por pagar
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            {deudas.length === 0
              ? 'Sin facturas pendientes'
              : `${deudas.length} ${deudas.length === 1 ? 'factura pendiente' : 'facturas pendientes'}`}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {deudas.length === 0 ? (
          <Box sx={{ p: '28px 16px', textAlign: 'center', color: 'text.disabled', fontSize: '.78rem' }}>
            No hay cuentas por pagar registradas.
          </Box>
        ) : (
          <>
            <Box sx={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.25,
              p: '13px 16px', borderBottom: 1, borderColor: 'pc.dividerSoft',
            }}>
              <Box>
                <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Total adeudado</Box>
                <Money ars={totalARS} usd={totalUSD} align="left" size="lg" />
              </Box>
            </Box>

            {deudas.map((deuda, i) => (
              <Box
                key={deuda.id}
                sx={{
                  display: 'flex', flexDirection: 'column', gap: 1, p: '12px 16px',
                  borderTop: i === 0 ? 0 : 1, borderColor: 'pc.dividerSoft',
                  '&:hover': { bgcolor: 'pc.surfaceMuted' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '.8rem' }}>{deuda.proveedor}</Typography>
                    <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-2px' }}>
                      {deuda.factura} · {deuda.fecha}
                    </Typography>
                  </Box>
                  <Money ars={deuda.totalARS} usd={deuda.totalUSD} size="sm" />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
                  <StatusPill tone="due" label="Adeudada" />
                  <Button size="small" variant="contained" onClick={() => onSaldar(deuda.id)}>
                    Saldar
                  </Button>
                </Box>
              </Box>
            ))}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

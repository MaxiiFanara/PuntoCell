import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  TextField, MenuItem, Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { comprasService } from '../../../services/comprasServices';
import { ventasService } from '../../../services/ventasServices';
import { useVenta } from '../../punto-venta/context/VentaContext';
import NumberField from '../../../components/ui/NumberField';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtArs = (usd, dolarGlobal) => `$ ${Math.round((usd || 0) * dolarGlobal).toLocaleString('es-AR')}`;
const ID_TURNO_CAJA = 1; // seed fijo — el módulo de caja de la API todavía no está expuesto

export default function CuentasPorPagarModal({ open, onClose, compras, onPagado }) {
  // deuda.saldo/total son USD (fuente de verdad); dolarGlobal solo se usa para mostrar
  // el equivalente en pesos.
  const { dolarGlobal } = useVenta();
  const deudas = (compras || []).filter((c) => c.saldo > 0);
  const [metodos, setMetodos] = useState([]);
  const [abierta, setAbierta] = useState(null); // id de compra con el form abierto
  const [form, setForm] = useState({ monto: '', idMetodo: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    ventasService.getMetodosPago()
      .then((m) => setMetodos(Array.isArray(m) ? m : (m?.data || [])))
      .catch(() => setMetodos([]));
  }, [open]);

  const abrirPago = (deuda) => {
    setAbierta(deuda.id);
    setForm({ monto: String(deuda.saldo), idMetodo: metodos[0]?.Id ?? metodos[0]?.id ?? '' });
  };

  const confirmarPago = async (deuda) => {
    const monto = Number(form.monto);
    if (!monto || monto <= 0) return alert('Ingresá un monto válido.');
    if (monto > deuda.saldo + 0.001) return alert(`El pago no puede superar el saldo (U$S ${fmt(deuda.saldo)} ≈ ${fmtArs(deuda.saldo, dolarGlobal)}).`);
    if (!form.idMetodo) return alert('Elegí un método de pago.');
    setGuardando(true);
    try {
      await comprasService.crearPago({
        IdCompra: deuda.id,
        IdMetodoPago: Number(form.idMetodo),
        Monto: Number(monto.toFixed(2)),
        IdTurnoCaja: ID_TURNO_CAJA,
      });
      setAbierta(null);
      onPagado();
    } catch (e) {
      alert('No se pudo registrar el pago: ' + (e.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Cuentas por pagar
        <IconButton onClick={onClose} size="small" aria-label="Cerrar"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {deudas.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: 'success.main', fontWeight: 600, py: 2 }}>
            Sin cuentas por pagar. 🎉
          </Typography>
        ) : deudas.map((deuda) => (
          <Box key={deuda.id} sx={{ borderRadius: '9px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, p: '12px 14px' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '.8rem' }}>{deuda.proveedor}</Typography>
                <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem' }}>
                  Compra #{deuda.id} · {deuda.fecha}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flex: 'none' }}>
                <Typography className="num" sx={{ fontWeight: 700, color: 'error.main', fontSize: '.84rem' }}>U$S {fmt(deuda.saldo)}</Typography>
                <Typography className="num" sx={{ color: 'text.disabled', fontSize: '.65rem' }}>
                  {fmtArs(deuda.saldo, dolarGlobal)} · de U$S {fmt(deuda.total)}
                </Typography>
              </Box>
              <Button variant={abierta === deuda.id ? 'text' : 'contained'} size="small"
                onClick={() => (abierta === deuda.id ? setAbierta(null) : abrirPago(deuda))}>
                {abierta === deuda.id ? 'Cancelar' : 'Pagar'}
              </Button>
            </Box>

            <Collapse in={abierta === deuda.id}>
              <Box sx={{
                p: '12px 14px', display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
                borderTop: 1, borderColor: 'pc.dividerSoft', bgcolor: 'pc.surfaceMuted',
              }}>
                <NumberField size="small" label="Monto" value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })} sx={{ width: 150 }} />
                <TextField size="small" select label="Método" value={form.idMetodo}
                  onChange={(e) => setForm({ ...form, idMetodo: e.target.value })} sx={{ minWidth: 180 }}>
                  {metodos.map((m) => (
                    <MenuItem key={m.Id ?? m.id} value={m.Id ?? m.id}>{m.Nombre ?? m.nombre}</MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" size="small" disabled={guardando} onClick={() => confirmarPago(deuda)}>
                  {guardando ? '…' : 'Confirmar pago'}
                </Button>
              </Box>
            </Collapse>
          </Box>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

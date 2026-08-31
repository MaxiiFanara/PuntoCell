import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  TextField, MenuItem, Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { comprasService } from '../../../services/comprasServices';
import { ventasService } from '../../../services/ventasServices';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ID_TURNO_CAJA = 1; // seed fijo — el módulo de caja de la API todavía no está expuesto

export default function CuentasPorPagarModal({ open, onClose, compras, onPagado }) {
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
    if (monto > deuda.saldo + 0.001) return alert(`El pago no puede superar el saldo (U$S ${fmt(deuda.saldo)}).`);
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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">Cuentas por Pagar</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#f4f7fb', p: 3 }}>
        {deudas.length === 0 ? (
          <Typography textAlign="center" color="#0e7a56" fontWeight="bold">Sin cuentas por pagar. 🎉</Typography>
        ) : deudas.map((deuda) => (
          <Box key={deuda.id} sx={{ mb: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e2e8f2', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Box>
                <Typography fontWeight="bold" fontSize={14}>{deuda.proveedor}</Typography>
                <Typography variant="caption" color="textSecondary" fontFamily="monospace">Compra #{deuda.id} · {deuda.fecha}</Typography>
              </Box>
              <Box textAlign="right" mr={2}>
                <Typography fontWeight="bold" color="#c0392f" fontFamily="monospace">U$S {fmt(deuda.saldo)}</Typography>
                <Typography variant="caption" color="textSecondary" fontFamily="monospace">de U$S {fmt(deuda.total)}</Typography>
              </Box>
              <Button variant="contained" size="small" color="success" sx={{ textTransform: 'none' }}
                onClick={() => (abierta === deuda.id ? setAbierta(null) : abrirPago(deuda))}>
                {abierta === deuda.id ? 'Cancelar' : 'Pagar'}
              </Button>
            </Box>

            <Collapse in={abierta === deuda.id}>
              <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" type="number" label="Monto" value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: e.target.value })} sx={{ width: 140 }} />
                <TextField size="small" select label="Método" value={form.idMetodo}
                  onChange={(e) => setForm({ ...form, idMetodo: e.target.value })} sx={{ minWidth: 200 }}>
                  {metodos.map((m) => (
                    <MenuItem key={m.Id ?? m.id} value={m.Id ?? m.id}>{m.Nombre ?? m.nombre}</MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" size="small" disabled={guardando}
                  onClick={() => confirmarPago(deuda)} sx={{ textTransform: 'none', bgcolor: '#0e7a56' }}>
                  {guardando ? '…' : 'Confirmar pago'}
                </Button>
              </Box>
            </Collapse>
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#fff', borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

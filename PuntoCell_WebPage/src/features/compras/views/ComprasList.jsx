import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography, Stack, CircularProgress, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import KpiCards from '../components/KpiCards';
import ComprasTable from '../components/ComprasTable';
import CuentasPorPagarModal from '../components/CuentasPorPagarModal';
import CompraDetalleModal from '../components/CompraDetalleModal';
import CompraCreateModal from '../components/CompraCreateModal';

import { comprasService, ESTADO_PAGO } from '../../../services/comprasServices';

// Normaliza una Compra de la API + el nombre de proveedor resuelto aparte.
const normalizar = (c, proveedoresMap) => ({
  id: c.Id ?? c.id,
  fecha: c.Fecha ? String(c.Fecha).slice(0, 10) : '—',
  proveedor: proveedoresMap[c.IdProveedor] || `Proveedor #${c.IdProveedor}`,
  idProveedor: c.IdProveedor,
  total: Number(c.TotalCosto) || 0,
  saldo: Number(c.SaldoPendiente) || 0,
  estadoPago: c.EstadoPago,
  condicion: ESTADO_PAGO[c.EstadoPago] || '—',
});

export default function ComprasList() {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [openCreate, setOpenCreate] = useState(false);
  const [openDeudas, setOpenDeudas] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [lista, proveedores] = await Promise.all([
        comprasService.getCompras(),
        comprasService.getProveedores(),
      ]);
      const map = {};
      (proveedores || []).forEach((p) => { map[p.Id ?? p.id] = p.Nombre ?? p.nombre; });
      setCompras((lista || []).map((c) => normalizar(c, map)).sort((a, b) => b.id - a.id));
    } catch (e) {
      setError('No se pudieron cargar las compras: ' + (e.message || ''));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto', bgcolor: '#f4f7fb', minHeight: '100vh' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="overline" sx={{ color: '#8695ad', fontWeight: 700, letterSpacing: 1 }}>Gestión de Abastecimiento</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f1729' }}>Historial de Compras</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" startIcon={<ReceiptLongIcon />} onClick={() => setOpenDeudas(true)}
            sx={{ bgcolor: '#9c5f07', '&:hover': { bgcolor: '#7a4a05' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Cuentas por Pagar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}
            sx={{ bgcolor: '#2456d6', '&:hover': { bgcolor: '#1b429f' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
            Registrar Compra
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          <KpiCards compras={compras} />
          <ComprasTable compras={compras} onVerDetalle={(c) => setDetalleId(c.id)} />
        </>
      )}

      <CompraCreateModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onGuardado={() => { setOpenCreate(false); cargar(); }}
      />
      <CuentasPorPagarModal
        open={openDeudas}
        onClose={() => setOpenDeudas(false)}
        compras={compras}
        onPagado={() => { cargar(); }}
      />
      {detalleId && (
        <CompraDetalleModal open onClose={() => setDetalleId(null)} compraId={detalleId} />
      )}
    </Box>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import KpiCards from '../components/KpiCards';
import ComprasTable from '../components/ComprasTable';
import CuentasPorPagarModal from '../components/CuentasPorPagarModal';
import CompraDetalleModal from '../components/CompraDetalleModal';
import CompraCreateModal from '../components/CompraCreateModal';
import PageHeader from '../../../components/ui/PageHeader';

import { comprasService, ESTADO_PAGO } from '../../../services/comprasServices';

// Normaliza una Compra de la API + el nombre de proveedor resuelto aparte.
const normalizar = (c, proveedoresMap) => ({
  id: c.Id ?? c.id,
  fecha: c.Fecha ? String(c.Fecha).slice(0, 10) : '—',
  proveedor: proveedoresMap[c.IdProveedor] || 'Proveedor',
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

  const adeudadas = compras.filter((c) => c.saldo > 0).length;

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Abastecimiento"
        title="Historial de compras"
        meta={`${compras.length} ${compras.length === 1 ? 'factura registrada' : 'facturas registradas'}`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<ReceiptLongIcon sx={{ fontSize: '16px !important' }} />}
              onClick={() => setOpenDeudas(true)}
            >
              Cuentas por pagar{adeudadas > 0 ? ` (${adeudadas})` : ''}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
              onClick={() => setOpenCreate(true)}
            >
              Registrar compra
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error">{error}</Alert>}

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

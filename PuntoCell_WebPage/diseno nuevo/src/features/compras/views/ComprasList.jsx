import { useState } from 'react';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import KpiCards from '../components/KpiCards';
import ComprasTable from '../components/ComprasTable';
import CuentasPorPagarModal from '../components/CuentasPorPagarModal';
import CompraDetalleModal from '../components/CompraDetalleModal';
import CompraCreateModal from '../components/CompraCreateModal';

import PageHeader from '../../../components/ui/PageHeader';
import StatusPill from '../../../components/ui/StatusPill';

// Datos de prueba iniciales — este módulo todavía no tiene backend.
const initialData = [
  {
    id: 1002, fecha: '21/08/2026', factura: '0001-4589', proveedor: 'Distribuidora Celular Sur', totalUSD: 450, totalARS: 472500, condicion: 'Pagada',
    items: [{ modelo: 'iPhone 13', esSerial: true, imei: '356938035643809', color: 'Negro', memoria: '128 GB', bateria: '89%', estado: 'usado', costo: 450, cant: 1 }]
  },
  {
    id: 1001, fecha: '15/08/2026', factura: 'A-0045-88', proveedor: 'Importador Mayorista SA', totalUSD: 850, totalARS: 892500, condicion: 'Adeudada',
    items: [
      { modelo: 'Samsung Galaxy S23', esSerial: true, imei: '351824097756310', color: 'Verde', memoria: '256 GB', bateria: '100%', estado: 'nuevo', costo: 800, cant: 1 },
      { modelo: 'Auriculares TWS', esSerial: false, color: 'Blanco', memoria: '', bateria: '', estado: 'nuevo', costo: 25, cant: 2 }
    ]
  }
];

export default function ComprasList() {
  const [compras, setCompras] = useState(initialData);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDeudas, setOpenDeudas] = useState(false);
  const [detalleCompra, setDetalleCompra] = useState(null); // null = cerrado, objeto = abierto

  const handleGuardarCompra = (nuevaCompra) => {
    setCompras([{ ...nuevaCompra, id: compras.length > 0 ? compras[0].id + 1 : 1000 }, ...compras]);
  };

  const handleSaldarDeuda = (id) => {
    setCompras(compras.map(c => c.id === id ? { ...c, condicion: 'Pagada' } : c));
  };

  const adeudadas = compras.filter(c => c.condicion === 'Adeudada').length;

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Abastecimiento"
        title="Historial de compras"
        meta={`${compras.length} ${compras.length === 1 ? 'factura registrada' : 'facturas registradas'}`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <StatusPill tone="due" label="Datos de ejemplo" />
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

      <KpiCards compras={compras} />

      <ComprasTable compras={compras} onVerDetalle={(compra) => setDetalleCompra(compra)} />

      <CompraCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onGuardar={handleGuardarCompra} />
      <CuentasPorPagarModal open={openDeudas} onClose={() => setOpenDeudas(false)} compras={compras} onSaldar={handleSaldarDeuda} />
      {detalleCompra && (
        <CompraDetalleModal open={!!detalleCompra} onClose={() => setDetalleCompra(null)} compra={detalleCompra} />
      )}
    </Box>
  );
}

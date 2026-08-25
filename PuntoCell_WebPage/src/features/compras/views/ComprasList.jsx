import React, { useState } from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import KpiCards from '../components/KpiCards';
import ComprasTable from '../components/ComprasTable';
import CuentasPorPagarModal from '../components/CuentasPorPagarModal';
import CompraDetalleModal from '../components/CompraDetalleModal';
import CompraCreateModal from '../components/CompraCreateModal';

// Datos de prueba iniciales
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

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto', bgcolor: '#f4f7fb', minHeight: '100vh' }}>
      
      {/* Cabecera */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="overline" sx={{ color: '#8695ad', fontWeight: 700, letterSpacing: 1 }}>Gestión de Abastecimiento</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f1729' }}>Historial de Compras</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            startIcon={<ReceiptLongIcon />}
            onClick={() => setOpenDeudas(true)}
            sx={{ bgcolor: '#9c5f07', '&:hover': { bgcolor: '#7a4a05' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Cuentas por Pagar
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setOpenCreate(true)}
            sx={{ bgcolor: '#2456d6', '&:hover': { bgcolor: '#1b429f' }, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Registrar Compra
          </Button>
        </Stack>
      </Box>

      {/* KPIs */}
      <KpiCards compras={compras} />

      {/* Filtros y Tabla */}
      <ComprasTable compras={compras} onVerDetalle={(compra) => setDetalleCompra(compra)} />

      {/* Modales */}
      <CompraCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onGuardar={handleGuardarCompra} />
      <CuentasPorPagarModal open={openDeudas} onClose={() => setOpenDeudas(false)} compras={compras} onSaldar={handleSaldarDeuda} />
      {detalleCompra && <CompraDetalleModal open={!!detalleCompra} onClose={() => setDetalleCompra(null)} compra={detalleCompra} />}
      
    </Box>
  );
}
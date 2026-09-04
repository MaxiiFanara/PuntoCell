import { Box } from '@mui/material';
import KpiCard from '../../../components/ui/KpiCard';
import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';
import { useVenta } from '../../punto-venta/context/VentaContext';

export default function KpiCards({ compras }) {
  // c.total/c.saldo son USD (fuente de verdad, ver compra.service.js); dolarGlobal solo
  // se usa para mostrar el equivalente en pesos.
  const { dolarGlobal } = useVenta();
  const totalComprado = compras.reduce((acc, c) => acc + c.total, 0);
  const adeudadas = compras.filter((c) => c.saldo > 0);
  const deuda = adeudadas.reduce((acc, c) => acc + c.saldo, 0);
  const pagadas = compras.filter((c) => c.estadoPago === 3).length;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>
      <KpiCard
        eyebrow="Total comprado"
        tone="accent"
        value={<Money ars={totalComprado * dolarGlobal} usd={totalComprado} align="left" size="lg" />}
        sub={`${compras.length} ${compras.length === 1 ? 'factura registrada' : 'facturas registradas'}`}
      />
      <KpiCard
        eyebrow="Cuentas por pagar"
        tone="warn"
        value={<Money ars={deuda * dolarGlobal} usd={deuda} align="left" size="lg" />}
        sub={`${adeudadas.length} ${adeudadas.length === 1 ? 'factura con saldo' : 'facturas con saldo'}`}
        badge={adeudadas.length > 0 ? <StatusPill tone="due" label="Pendiente" /> : null}
      />
      <KpiCard
        eyebrow="Pagadas"
        tone="ok"
        value={pagadas}
        sub={`de ${compras.length} ${compras.length === 1 ? 'operación' : 'operaciones'}`}
      />
    </Box>
  );
}

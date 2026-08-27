import { Box } from '@mui/material';
import KpiCard from '../../../components/ui/KpiCard';
import StatusPill from '../../../components/ui/StatusPill';

const pesos = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;
const dolares = (n) =>
  `U$S ${(Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function KpiCards({ compras }) {
  const totalARS = compras.reduce((acc, c) => acc + c.totalARS, 0);
  const totalUSD = compras.reduce((acc, c) => acc + c.totalUSD, 0);

  const adeudadas = compras.filter(c => c.condicion === 'Adeudada');
  const deudaARS = adeudadas.reduce((acc, c) => acc + c.totalARS, 0);
  const deudaUSD = adeudadas.reduce((acc, c) => acc + c.totalUSD, 0);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>
      <KpiCard
        eyebrow="Total comprado"
        tone="accent"
        value={pesos(totalARS)}
        sub={dolares(totalUSD)}
      />
      <KpiCard
        eyebrow="Cuentas por pagar"
        tone="warn"
        value={pesos(deudaARS)}
        sub={`${dolares(deudaUSD)} · ${adeudadas.length} ${adeudadas.length === 1 ? 'factura' : 'facturas'}`}
        badge={adeudadas.length > 0 ? <StatusPill tone="due" label="Pendiente" /> : null}
      />
      <KpiCard
        eyebrow="Operaciones"
        tone="mute"
        value={compras.length}
        sub={`${compras.length === 1 ? 'factura registrada' : 'facturas registradas'}`}
      />
    </Box>
  );
}

import { Box, Button, Paper, Switch, Typography } from '@mui/material';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { useVenta } from '../context/VentaContext';

export const TotalSection = ({ onCobrar }) => {
  const { totalVenta, esMayorista, dolarGlobal, carrito, cliente, toggleMayorista } = useVenta();

  const totalArs = totalVenta * dolarGlobal;
  const unidades = carrito.reduce((a, i) => a + (Number(i.Cantidad) || 0), 0);

  const faltaCliente = !cliente;
  const carritoVacio = carrito.length === 0;

  const handleCobrar = () => {
    if (carritoVacio) return alert('⚠️ El carrito está vacío.');
    if (faltaCliente) return alert('⚠️ Falta seleccionar el CLIENTE.');
    onCobrar();
  };

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* Mayorista es un modo que reescribe todos los precios del carrito, así que
          va arriba y visible, no escondido abajo. */}
      <Box
        component="label"
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25,
          p: '10px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft', cursor: 'pointer',
          bgcolor: esMayorista ? 'pc.accentSoft' : 'transparent',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '.78rem', color: esMayorista ? 'primary.main' : 'text.primary' }}>
            Precio mayorista
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-2px' }}>
            {esMayorista ? 'Aplicado a todo el carrito' : 'Usando precio minorista'}
          </Typography>
        </Box>
        <Switch
          checked={esMayorista}
          onChange={(e) => toggleMayorista(e.target.checked)}
          size="small"
        />
      </Box>

      {/* El total en pesos es el número principal; el dólar queda de referencia. */}
      <Box sx={{ p: '16px 15px 14px', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Total a cobrar</Box>
        <Box
          className="num"
          sx={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1.05, color: 'primary.main' }}
        >
          $ {Math.round(totalArs).toLocaleString('es-AR')}
        </Box>
        <Box className="num" sx={{ fontSize: '.78rem', color: 'text.secondary' }}>
          U$S {totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Box>
      </Box>

      <Box sx={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25,
        p: '9px 15px', borderTop: 1, borderColor: 'pc.dividerSoft', fontSize: '.75rem',
      }}>
        <Box sx={{ color: 'text.disabled' }}>Cotización aplicada</Box>
        <Box className="mono" sx={{ fontWeight: 600 }}>$ {Number(dolarGlobal).toLocaleString('es-AR')}</Box>
      </Box>
      <Box sx={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.25,
        p: '9px 15px', borderTop: 1, borderColor: 'pc.dividerSoft', fontSize: '.75rem',
      }}>
        <Box sx={{ color: 'text.disabled' }}>Ítems</Box>
        <Box className="num" sx={{ fontWeight: 600 }}>
          {carrito.length} {carrito.length === 1 ? 'ítem' : 'ítems'} · {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
        </Box>
      </Box>

      <Box sx={{ p: '12px 15px', borderTop: 1, borderColor: 'pc.dividerSoft', bgcolor: 'pc.surfaceMuted' }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={handleCobrar}
          startIcon={<PointOfSaleIcon sx={{ fontSize: '17px !important' }} />}
        >
          Cobrar
        </Button>
        {(carritoVacio || faltaCliente) && (
          <Typography sx={{ mt: 1, color: 'text.disabled', fontSize: '.69rem', textAlign: 'center' }}>
            {carritoVacio ? 'Agregá al menos un producto' : 'Falta elegir el cliente'}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

import {
  FormControlLabel, Switch,
  Button, Divider, Box, Paper, Typography
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useVenta } from '../context/VentaContext';

export const TotalSection = ({ onCobrar }) => {
  const {
    totalVenta,
    esMayorista,
    dolarGlobal,
    carrito,
    cliente,
    toggleMayorista
  } = useVenta();

  const totalArs = totalVenta * dolarGlobal;

  const formatArs = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  });

  const handleToggleMayorista = (e) => {
    const nuevoValor = e.target.checked;
    toggleMayorista(nuevoValor);
    alert(nuevoValor ? "📉 Precios Mayoristas APLICADOS" : "📈 Precios Minoristas RESTAURADOS");
  };

  const handleCobrar = () => {
    if (carrito.length === 0) {
      alert("⚠️ El carrito está vacío.");
      return;
    }
    if (!cliente) {
      alert("⚠️ Falta seleccionar el CLIENTE.");
      return;
    }
    onCobrar();
  };

  return (
    <Paper elevation={6} sx={{ bgcolor: '#020f30', color: 'white', p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1 }}>
      
      <FormControlLabel
        control={
          <Switch
            checked={esMayorista}
            onChange={handleToggleMayorista}
            sx={{ '& .MuiSwitch-thumb': { bgcolor: esMayorista ? '#facc15' : '#fff' }, '& .MuiSwitch-track': { bgcolor: esMayorista ? '#facc15' : '#fff' } }}
          />
        }
        label={
          <Box component="span" sx={{ color: '#facc15', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon /> Cambiar a precio mayorista
          </Box>
        }
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', flex: 1, justifyContent: 'center' }}>
        <Typography sx={{ color: 'grey.300', fontSize: '1.125rem', mb: 0.5 }}>TOTAL</Typography>
        <Typography sx={{ color: '#4ade80', fontWeight: 'bold', fontSize: '3rem', mb: 1, lineHeight: 1 }}>
          U$S {totalVenta.toFixed(2)}
        </Typography>

        <Divider sx={{ borderColor: 'grey.600', width: '100%', my: 2 }} />

        <Typography sx={{ color: '#93c5fd', fontWeight: 600, fontSize: '1.5rem' }}>
          {formatArs.format(totalArs)}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1.5, gap: 1 }}>
          <Typography sx={{ color: 'grey.400', fontSize: '0.875rem' }}>Cotización: 1 USD = $</Typography>
          <Typography sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{dolarGlobal}</Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={handleCobrar}
        startIcon={<AttachMoneyIcon />}
        sx={{ 
          width: '100%', 
          mt: 3, 
          py: 1.5, 
          fontSize: '1.125rem', 
          fontWeight: 'bold', 
          borderRadius: 3, 
          textTransform: 'none', 
          boxShadow: 3,
          bgcolor: '#02631e', 
          '&:hover': { bgcolor: 'white', color: '#02631e' }
        }}
      >
        COBRAR
      </Button>
    </Paper>
  );
};
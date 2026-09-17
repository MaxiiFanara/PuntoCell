import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Stack, TextField, Button, Divider, Alert, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/whatsapp';
import { pagosService } from '../../../services/pagosServices';

const MOTIVOS = {
  inexistente: 'ya no está disponible',
  sin_stock: 'no tiene stock suficiente',
};

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const navigate = useNavigate();

  const [comprador, setComprador] = useState({ email: '', nombre: '', dni: '', celular: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [rechazados, setRechazados] = useState([]);

  const emailValido = /^\S+@\S+\.\S+$/.test(comprador.email);
  // Se compara por dígitos: el comprador puede escribirlo con puntos.
  const dniValido = /^\d{7,9}$/.test(comprador.dni.replace(/\D/g, ''));
  // Todos obligatorios: con estos cuatro alcanza para registrar la compra a su
  // nombre. Si el DNI ya es cliente del local se reusa su ficha y el resto se
  // ignora; si no, se da de alta con estos datos.
  const nombreValido = comprador.nombre.trim().length >= 3;
  const celularValido = comprador.celular.replace(/\D/g, '').length >= 8;
  const puedePagar =
    items.length > 0 && emailValido && nombreValido && dniValido && celularValido && !enviando;

  const cambiar = (campo) => (e) => setComprador((prev) => ({ ...prev, [campo]: e.target.value }));

  const nombreDe = (id) => items.find((i) => String(i.id) === String(id))?.name || `Producto ${id}`;

  const pagar = async () => {
    setEnviando(true);
    setError(null);
    setRechazados([]);
    try {
      const { initPoint } = await pagosService.crearCheckout({
        items: items.map((i) => ({ id: i.id, cantidad: i.quantity })),
        comprador,
      });
      // Se sale del sitio: no se limpia el carrito hasta que el pago esté aprobado.
      window.location.href = initPoint;
    } catch (err) {
      if (err.status === 409) setRechazados(err.detalle);
      else setError(err.message || 'No pudimos iniciar el pago. Intentá de nuevo.');
      setEnviando(false);
    }
  };

  if (!items.length) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Tu carrito está vacío</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Agregá productos antes de continuar con el pago.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/catalogo')}>Ver el catálogo</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/catalogo')} sx={{ mb: 2 }}>
        Seguir comprando
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: 3 }}>
        Finalizar compra
      </Typography>

      <Box sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Stack spacing={1.5}>
          {items.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2">
                {item.name} <Typography component="span" color="text.secondary">× {item.quantity}</Typography>
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                ${formatCurrency(item.price * item.quantity)}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>Total</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            ${formatCurrency(totalPrice)}
          </Typography>
        </Box>
      </Box>

      {rechazados.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Mientras comprabas cambió la disponibilidad:
          <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
            {rechazados.map((r) => (
              <li key={r.id}>
                {nombreDe(r.id)} {MOTIVOS[r.motivo] || 'no se puede comprar'}
                {r.motivo === 'sin_stock' && ` (quedan ${r.disponible})`}
              </li>
            ))}
          </Box>
          Ajustá el carrito y volvé a intentar.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Email" type="email" required fullWidth
          value={comprador.email} onChange={cambiar('email')}
          error={comprador.email.length > 0 && !emailValido}
          helperText="Ahí te llega el comprobante de Mercado Pago"
        />
        <TextField
          label="Nombre y apellido" required fullWidth
          value={comprador.nombre} onChange={cambiar('nombre')}
          error={comprador.nombre.length > 0 && !nombreValido}
        />
        <TextField
          label="DNI" required fullWidth
          value={comprador.dni} onChange={cambiar('dni')}
          error={comprador.dni.length > 0 && !dniValido}
          inputProps={{ inputMode: 'numeric' }}
          helperText="Con esto registramos la compra a tu nombre"
        />
        <TextField
          label="Celular" required fullWidth
          value={comprador.celular} onChange={cambiar('celular')}
          error={comprador.celular.length > 0 && !celularValido}
          inputProps={{ inputMode: 'tel' }}
          helperText="Para coordinar la entrega"
        />
      </Stack>

      <Button
        variant="contained" color="primary" fullWidth size="large"
        disabled={!puedePagar} onClick={pagar}
        startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {enviando ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago'}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        Te vamos a llevar al sitio de Mercado Pago para completar el pago de forma segura.
      </Typography>
    </Container>
  );
}

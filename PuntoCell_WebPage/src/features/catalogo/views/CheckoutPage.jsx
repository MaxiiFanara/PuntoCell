import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, TextField, Button, Divider, Alert, CircularProgress, Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/whatsapp';
import { pagosService } from '../../../services/pagosServices';
import { btn, field, muted } from '../../../components/ui/publicStyles';

const MOTIVOS = {
  inexistente: 'ya no está disponible',
  sin_stock: 'no tiene stock suficiente',
};

// El ancho y el ritmo vertical los pone el <main> de CatalogoLayout.
const vacioCentrado = { maxWidth: 680, mx: 'auto' };

/**
 * Campo del formulario con el rótulo arriba en vez del label flotante de MUI.
 * El control de la vitrina mide 48px fijos y el label flotante le come la mitad
 * de la caja; arriba, además, el helper de abajo queda como única nota al pie.
 */
function Campo({ id, label, ...props }) {
  return (
    <Box>
      <Typography
        component="label"
        htmlFor={id}
        sx={{ display: 'block', mb: 0.75, fontSize: '.875rem', fontWeight: 600 }}
      >
        {label}
      </Typography>
      <TextField id={id} required fullWidth sx={field} {...props} />
    </Box>
  );
}

/**
 * Finalizar compra, en dos caras verticales.
 *
 * Antes era una sola columna angosta: el resumen arriba, el formulario abajo y el
 * total fuera de pantalla justo cuando había que cargar cuatro campos y decidir.
 *
 * Ahora los datos van a la izquierda y el pedido a la derecha, uno al lado del
 * otro: mientras escribís seguís viendo qué estás comprando y cuánto suma. En
 * pantallas chicas no hay ancho para dos caras, así que se apila en el orden en
 * que se decide: primero qué llevás, después tus datos, y al final el pago.
 */
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

  const totalUnidades = items.reduce((n, i) => n + i.quantity, 0);

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
      <Box sx={{ ...vacioCentrado, textAlign: 'center' }}>
        <Typography component="h1" sx={{ typography: 'd3', mb: 1 }}>
          Tu carrito está vacío
        </Typography>
        <Typography sx={{ ...muted, fontSize: '.9375rem' }}>
          Agregá productos antes de continuar con el pago.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/catalogo')} sx={{ ...btn, mt: 3 }}>
          Ver el catálogo
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/catalogo')}
        sx={{ ...btn, height: 38, px: 1.5, ml: -1.5, mb: 2 }}
      >
        Seguir comprando
      </Button>

      <Typography component="h1" sx={{ typography: 'd2' }}>
        Finalizar compra
      </Typography>

      {/* Los avisos van a lo ancho de las dos caras: si la disponibilidad cambió
          mientras compraba, eso no puede quedar escondido en una columna. */}
      {rechazados.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
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

      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      <Box
        sx={{
          mt: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
          columnGap: { md: 6 },
          rowGap: 4,
          alignItems: 'start',
        }}
      >
        {/* ---------- cara 1: tu pedido ---------- */}
        <Box sx={{ gridColumn: { md: '2 / 3' }, gridRow: { md: '1 / 2' } }}>
          <Typography component="h2" sx={{ typography: 'd3', mb: 0.75 }}>
            Tu pedido
          </Typography>
          <Typography sx={{ ...muted, fontSize: '.9375rem', mb: 3 }}>
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
            {' · '}
            {totalUnidades} {totalUnidades === 1 ? 'unidad' : 'unidades'}
          </Typography>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack spacing={1.75}>
              {items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '.9375rem', lineHeight: 1.35 }}>
                      {item.name}
                    </Typography>
                    <Typography className="mono" sx={{ ...muted, mt: 0.25, fontSize: '.8125rem' }}>
                      {item.quantity} × ${formatCurrency(item.price)}
                    </Typography>
                  </Box>
                  <Typography
                    className="mono"
                    sx={{ fontSize: '.9375rem', fontWeight: 500, whiteSpace: 'nowrap' }}
                  >
                    ${formatCurrency(item.price * item.quantity)}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography sx={{ fontSize: '.9375rem', fontWeight: 600 }}>Total</Typography>
              <Typography
                className="mono"
                sx={{
                  fontSize: 'clamp(1.5rem, 3vw, 1.875rem)',
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: '-.025em',
                  color: 'primary.main',
                }}
              >
                ${formatCurrency(totalPrice)}
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* ---------- cara 2: tus datos ----------
            En escritorio la grilla la trae a la izquierda y le da las dos filas de
            alto; en el teléfono cae después del pedido, que es el orden en que se
            decide. Sin `order` de CSS: el DOM ya está en el orden correcto, y así
            el teclado recorre lo mismo que ve el ojo. */}
        <Box sx={{ gridColumn: { md: '1 / 2' }, gridRow: { md: '1 / 3' } }}>
          <Typography component="h2" sx={{ typography: 'd3', mb: 0.75 }}>
            Tus datos
          </Typography>
          <Typography sx={{ ...muted, fontSize: '.9375rem', mb: 3 }}>
            Con estos cuatro datos registramos la compra a tu nombre.
          </Typography>

          <Stack spacing={2.5}>
            <Campo
              id="checkout-email" label="Email" type="email"
              value={comprador.email} onChange={cambiar('email')}
              error={comprador.email.length > 0 && !emailValido}
              helperText="Ahí te llega el comprobante de Mercado Pago"
            />
            <Campo
              id="checkout-nombre" label="Nombre y apellido"
              value={comprador.nombre} onChange={cambiar('nombre')}
              error={comprador.nombre.length > 0 && !nombreValido}
            />
            <Campo
              id="checkout-dni" label="DNI"
              value={comprador.dni} onChange={cambiar('dni')}
              error={comprador.dni.length > 0 && !dniValido}
              inputProps={{ inputMode: 'numeric' }}
              helperText="Con esto registramos la compra a tu nombre"
            />
            <Campo
              id="checkout-celular" label="Celular"
              value={comprador.celular} onChange={cambiar('celular')}
              error={comprador.celular.length > 0 && !celularValido}
              inputProps={{ inputMode: 'tel' }}
              helperText="Para coordinar la entrega"
            />
          </Stack>
        </Box>

        {/* ---------- el pago ----------
            Debajo del pedido en escritorio y al final de todo en el teléfono: en
            los dos casos es lo último que se lee antes de decidir. */}
        <Box sx={{ gridColumn: { md: '2 / 3' }, gridRow: { md: '2 / 3' } }}>
          <Button
            variant="contained" color="primary" fullWidth
            disabled={!puedePagar} onClick={pagar}
            startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : null}
            sx={btn}
          >
            {enviando ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago'}
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 2 }}>
            <LockOutlinedIcon sx={{ ...muted, fontSize: 16, mt: '2px', flex: 'none' }} />
            <Typography sx={{ ...muted, fontSize: '.8125rem', lineHeight: 1.5 }}>
              Te vamos a llevar al sitio de Mercado Pago para completar el pago de
              forma segura.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, TextField, Button, Divider, Alert, CircularProgress, Paper, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/whatsapp';
import { pagosService } from '../../../services/pagosServices';
import { catalogoService } from '../../../services/catalogoServices'; // <--- Importamos el servicio para la cotización
import { btn, field, muted } from '../../../components/ui/publicStyles';

const MOTIVOS = {
  inexistente: 'ya no está disponible',
  sin_stock: 'no tiene stock suficiente',
};

const vacioCentrado = { maxWidth: 680, mx: 'auto' };

const formatPesos = (amount) => Math.round(amount).toLocaleString('es-AR');

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

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const navigate = useNavigate();

  const [comprador, setComprador] = useState({ email: '', nombre: '', dni: '', celular: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [rechazados, setRechazados] = useState([]);

  // ================= ESTADO DE COTIZACIÓN Y MONEDA =================
  const [cotizacionDolar, setCotizacionDolar] = useState(null);
  const [monedaVista, setMonedaVista] = useState('USD'); // 'USD' o 'ARS'

  useEffect(() => {
    let mounted = true;
    const cargarDolarSistema = async () => {
      try {
        const resCotizaciones = await catalogoService.getCotizaciones();
        let listaCotizaciones = resCotizaciones.data || resCotizaciones || [];
        if (listaCotizaciones.data && Array.isArray(listaCotizaciones.data)) {
          listaCotizaciones = listaCotizaciones.data;
        }
        
        const cotizacionesDolar = listaCotizaciones.filter(c =>
          (c.Clave || c.clave || '').toLowerCase() === 'dolarblue'
        );
        
        const cotizacionReciente = cotizacionesDolar.reduce((masReciente, actual) => {
          if (!masReciente) return actual;
          const fechaActual = new Date(actual.CreatedAt || actual.createdAt || 0).getTime();
          const fechaReciente = new Date(masReciente.CreatedAt || masReciente.createdAt || 0).getTime();
          if (fechaActual !== fechaReciente) return fechaActual > fechaReciente ? actual : masReciente;
          return (actual.Id ?? actual.id ?? 0) > (masReciente.Id ?? masReciente.id ?? 0) ? actual : masReciente;
        }, null);

        if (mounted && cotizacionReciente) {
          setCotizacionDolar(parseFloat(cotizacionReciente.Valor || cotizacionReciente.valor) || null);
        }
      } catch (err) {
        console.error("Error al obtener cotización en checkout:", err);
      }
    };
    cargarDolarSistema();
    return () => { mounted = false; };
  }, []);
  // =================================================================

  const emailValido = /^\S+@\S+\.\S+$/.test(comprador.email);
  const dniValido = /^\d{7,9}$/.test(comprador.dni.replace(/\D/g, ''));
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
        <Typography component="h1" sx={{ typography: 'd2' }}>
          Finalizar compra
        </Typography>

        {/* Selector visual de moneda */}
        {cotizacionDolar > 0 && (
          <ToggleButtonGroup
            value={monedaVista}
            exclusive
            onChange={(e, val) => val && setMonedaVista(val)}
            size="small"
            sx={{ bgcolor: 'background.paper', borderRadius: '8px' }}
          >
            <ToggleButton value="USD" sx={{ px: 2, fontSize: '0.75rem', fontWeight: 600 }}>Ver en U$S</ToggleButton>
            <ToggleButton value="ARS" sx={{ px: 2, fontSize: '0.75rem', fontWeight: 600 }}>Ver en $ ARS</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

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
              {items.map((item) => {
                const subUsd = item.price * item.quantity;
                const subArs = cotizacionDolar ? subUsd * cotizacionDolar : 0;
                
                return (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '.9375rem', lineHeight: 1.35 }}>
                        {item.name}
                      </Typography>
                      <Typography className="mono" sx={{ ...muted, mt: 0.25, fontSize: '.8125rem' }}>
                        {item.quantity} × {monedaVista === 'USD' ? `U$S ${formatCurrency(item.price)}` : `$ ${formatPesos(item.price * cotizacionDolar)}`}
                      </Typography>
                    </Box>
                    <Typography
                      className="mono"
                      sx={{ fontSize: '.9375rem', fontWeight: 500, whiteSpace: 'nowrap' }}
                    >
                      {monedaVista === 'USD' ? `U$S ${formatCurrency(subUsd)}` : `$ ${formatPesos(subArs)}`}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography sx={{ fontSize: '.9375rem', fontWeight: 600 }}>Total</Typography>
              <Box sx={{ textAlign: 'right' }}>
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
                  {monedaVista === 'USD' ? `U$S ${formatCurrency(totalPrice)}` : `$ ${formatPesos(totalPrice * (cotizacionDolar || 1))} ARS`}
                </Typography>
                {cotizacionDolar > 0 && monedaVista === 'USD' && (
                  <Typography className="mono" sx={{ fontSize: '.75rem', color: 'text.disabled', mt: 0.5 }}>
                    Equivalente: $ {formatPesos(totalPrice * cotizacionDolar)} ARS
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* ---------- cara 2: tus datos ---------- */}
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

        {/* ---------- el pago ---------- */}
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
              forma segura en Pesos Argentinos (ARS) según la cotización del sistema.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
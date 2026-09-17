import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Stack, Button, Divider, Alert, CircularProgress,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PrintIcon from '@mui/icons-material/Print';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useCart } from '../context/CartContext';
import { formatCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { pagosService } from '../../../services/pagosServices';
import '../comprobante.css';

const PRESENTACION = {
  approved: { icono: CheckCircleOutlineIcon, color: 'success.main', titulo: 'Pago aprobado', bajada: 'Guardá este comprobante: es la constancia de tu compra.' },
  pending:  { icono: HourglassEmptyIcon,     color: 'warning.main', titulo: 'Pago pendiente', bajada: 'Mercado Pago todavía está procesando el pago. Te avisan por email cuando se acredite.' },
  rejected: { icono: ErrorOutlineIcon,       color: 'error.main',   titulo: 'Pago rechazado', bajada: 'No se realizó el cobro. Tu carrito quedó intacto para que puedas intentar de nuevo.' },
  desconocido: { icono: ErrorOutlineIcon,    color: 'text.secondary', titulo: 'Estado no reconocido', bajada: 'Consultá el estado en tu cuenta de Mercado Pago o escribinos.' },
};

export default function PagoResultado() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { items, clearCart } = useCart();

  const paymentId = params.get('payment_id') || params.get('collection_id');

  const [pago, setPago] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // El carrito se guarda antes de limpiarlo, para poder armar el mensaje de
  // WhatsApp de coordinación con el detalle de lo que se compró.
  const itemsComprados = useRef(items);

  useEffect(() => {
    if (!paymentId) {
      setError('No recibimos el número de pago. Revisá tu email de Mercado Pago.');
      setCargando(false);
      return;
    }

    // El estado se le pregunta a Mercado Pago, no se lee del query string:
    // cualquiera puede escribir ?status=approved en la URL.
    pagosService.consultarPago(paymentId)
      .then((data) => {
        if (!data) {
          setError('No encontramos ese pago en Mercado Pago.');
          return;
        }
        setPago(data);
        if (data.estado === 'approved') clearCart();
      })
      .catch(() => setError('No pudimos consultar el estado del pago. Intentá recargar la página.'))
      .finally(() => setCargando(false));
    // clearCart cambia de identidad en cada render del provider: dejarlo fuera
    // de las dependencias evita volver a consultar el pago en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  if (cargando) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary" sx={{ mt: 2 }}>Confirmando el pago…</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/catalogo')}>Volver al catálogo</Button>
      </Container>
    );
  }

  const { icono: Icono, color, titulo, bajada } = PRESENTACION[pago.estado] || PRESENTACION.desconocido;
  const aprobado = pago.estado === 'approved';

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Icono sx={{ fontSize: 64, color }} />
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mt: 1 }}>{titulo}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>{bajada}</Typography>
      </Box>

      <Box
        className="comprobante"
        sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Typography variant="overline" color="text.secondary">Comprobante</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Punto Cell</Typography>

        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Pago N° {pago.paymentId}</Typography>
          {pago.fecha && (
            <Typography variant="body2" color="text.secondary">
              {new Date(pago.fecha).toLocaleString('es-AR')}
            </Typography>
          )}
          {pago.medio && (
            <Typography variant="body2" color="text.secondary">Medio: {pago.medio}</Typography>
          )}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1}>
          {pago.items.map((item, i) => (
            <Box key={`${item.title}-${i}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2">
                {item.title} <Typography component="span" color="text.secondary">× {item.quantity}</Typography>
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                ${formatCurrency(item.unitPrice * item.quantity)}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>Total</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
            ${formatCurrency(pago.total)}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1.5} className="no-imprimir" sx={{ mt: 3 }}>
        {aprobado && (
          <>
            <Button variant="contained" size="large" startIcon={<PrintIcon />} onClick={() => window.print()}>
              Imprimir comprobante
            </Button>
            <Button
              variant="outlined" size="large" startIcon={<WhatsAppIcon />}
              onClick={() => window.open(buildWhatsAppLink(itemsComprados.current, pago.paymentId), '_blank')}
            >
              Coordinar la entrega
            </Button>
          </>
        )}
        {!aprobado && (
          <Button variant="contained" size="large" onClick={() => navigate('/catalogo/checkout')}>
            Volver a intentar
          </Button>
        )}
        <Button variant="text" onClick={() => navigate('/catalogo')}>Volver al catálogo</Button>
      </Stack>
    </Container>
  );
}

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, Divider, Alert, CircularProgress, Paper,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PrintIcon from '@mui/icons-material/Print';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useCart } from '../context/CartContext';
import { formatCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { pagosService } from '../../../services/pagosServices';
import { btn, muted } from '../../../components/ui/publicStyles';
import '../comprobante.css';

const PRESENTACION = {
  approved: { icono: CheckCircleOutlineIcon, color: 'success.main', titulo: 'Pago aprobado', bajada: 'Guardá este comprobante: es la constancia de tu compra.' },
  pending:  { icono: HourglassEmptyIcon,     color: 'warning.main', titulo: 'Pago pendiente', bajada: 'Mercado Pago todavía está procesando el pago. Te avisan por email cuando se acredite.' },
  rejected: { icono: ErrorOutlineIcon,       color: 'error.main',   titulo: 'Pago rechazado', bajada: 'No se realizó el cobro. Tu carrito quedó intacto para que puedas intentar de nuevo.' },
  desconocido: { icono: ErrorOutlineIcon,    color: 'text.secondary', titulo: 'Estado no reconocido', bajada: 'Consultá el estado en tu cuenta de Mercado Pago o escribinos.' },
};

// Misma columna angosta que el checkout: el comprobante se lee, no se recorre.
// El ancho y el ritmo vertical los pone el <main> de CatalogoLayout. Acá
// sólo se declara que esta vista quiere una columna más angosta que el resto.
const columna = { maxWidth: 680, mx: 'auto' };

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
      <Box sx={{ ...columna, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ...muted, mt: 2, fontSize: '.9375rem' }}>Confirmando el pago…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={columna}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/catalogo')} sx={btn}>
          Volver al catálogo
        </Button>
      </Box>
    );
  }

  const { icono: Icono, color, titulo, bajada } = PRESENTACION[pago.estado] || PRESENTACION.desconocido;
  const aprobado = pago.estado === 'approved';

  return (
    <Box sx={columna}>
      {/* El color del ícono no es decoración: es la única marca que separa
          aprobado de pendiente y de rechazado antes de leer el título. */}
      <Box sx={{ textAlign: 'center' }}>
        <Icono sx={{ fontSize: 40, color }} />
        <Typography component="h1" sx={{ typography: 'd2', mt: 1.5 }}>{titulo}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 1.5, maxWidth: '46ch', mx: 'auto' }}>
          {bajada}
        </Typography>
      </Box>

      {pago.avisoRegistro && (
        <Alert severity="warning" className="no-imprimir" sx={{ mt: 4 }}>
          {pago.avisoRegistro}
        </Alert>
      )}

      <Paper className="comprobante" sx={{ p: 3, borderRadius: 2, mt: 4 }}>
        <Typography sx={{ ...muted, fontSize: '.8125rem' }}>Comprobante</Typography>
        <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '-.02em', mt: 0.25 }}>
          Punto Cell
        </Typography>

        <Stack spacing={0.5} sx={{ mt: 2 }}>
          <Typography sx={{ ...muted, fontSize: '.875rem' }}>
            Pago N° <span className="mono">{pago.paymentId}</span>
          </Typography>
          {pago.ventaId && (
            <Typography sx={{ ...muted, fontSize: '.875rem' }}>
              Venta N° <span className="mono">{pago.ventaId}</span>
            </Typography>
          )}
          {pago.fecha && (
            <Typography className="mono" sx={{ ...muted, fontSize: '.875rem' }}>
              {new Date(pago.fecha).toLocaleString('es-AR')}
            </Typography>
          )}
          {pago.medio && (
            <Typography sx={{ ...muted, fontSize: '.875rem' }}>Medio: {pago.medio}</Typography>
          )}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Stack spacing={1.5}>
          {pago.items.map((item, i) => (
            <Box key={`${item.title}-${i}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography sx={{ fontSize: '.9375rem' }}>
                {item.title}{' '}
                <Typography component="span" className="mono" sx={{ ...muted, fontSize: '.875rem' }}>
                  × {item.quantity}
                </Typography>
              </Typography>
              <Typography className="mono" sx={{ fontSize: '.9375rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                ${formatCurrency(item.unitPrice * item.quantity)}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
          <Typography sx={{ fontSize: '.9375rem', fontWeight: 600 }}>Total</Typography>
          <Typography
            className="mono"
            sx={{ fontSize: '1.375rem', fontWeight: 500, letterSpacing: '-.02em', color: 'primary.main' }}
          >
            ${formatCurrency(pago.total)}
          </Typography>
        </Box>
      </Paper>

      <Stack spacing={1.5} className="no-imprimir" sx={{ mt: 3 }}>
        {aprobado && (
          <>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} sx={btn}>
              Imprimir comprobante
            </Button>
            <Button
              variant="outlined" startIcon={<WhatsAppIcon />}
              onClick={() => window.open(buildWhatsAppLink(itemsComprados.current, pago.paymentId), '_blank')}
              sx={btn}
            >
              Coordinar la entrega
            </Button>
          </>
        )}
        {!aprobado && (
          <Button variant="contained" onClick={() => navigate('/catalogo/checkout')} sx={btn}>
            Volver a intentar
          </Button>
        )}
        <Button variant="text" onClick={() => navigate('/catalogo')} sx={{ ...btn, height: 38 }}>
          Volver al catálogo
        </Button>
      </Stack>
    </Box>
  );
}

import {
  Drawer, Box, Typography, IconButton, Snackbar, Alert, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useNavigate } from 'react-router-dom';

import { useCart } from '../context/CartContext';
import { buildWhatsAppLink, formatCurrency } from '../utils/whatsapp';
import { btn, muted } from '../../../components/ui/publicStyles';

// Botón del stepper. Mismo control que el "agregar" de la card: 1px de filete,
// radio de control y un scale(.94) al presionar.
const stepper = {
  width: 30,
  height: 30,
  border: 1,
  borderColor: 'divider',
  borderRadius: '8px',
  color: 'text.primary',
  transition: 'background-color 180ms ease, border-color 180ms ease, transform 160ms cubic-bezier(.23,1,.32,1)',
  '&:active': { transform: 'scale(.94)' },
};

/**
 * El carrito lateral: la revisión rápida antes de ir al checkout.
 *
 * Es una sola columna a propósito. Acá el comprador mira, ajusta cantidades y
 * sigue de largo; la distribución en dos caras vive en la pantalla de finalizar
 * compra, que es donde hay datos que cargar y una decisión que tomar.
 */
export default function CartDrawer() {
  const {
    items, isOpen, setIsOpen,
    removeFromCart, updateQuantity, clearCart,
    totalPrice, totalItems,
    snackbar, closeSnack,
  } = useCart();

  const navigate = useNavigate();

  const irAlCheckout = () => {
    setIsOpen(false);
    navigate('/catalogo/checkout');
  };

  const handleCheckout = () => {
    if (!items.length) return;
    window.open(buildWhatsAppLink(items), '_blank');
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100vw', sm: 420 },
              bgcolor: 'background.paper',
              borderLeft: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {/* Encabezado. Era el único lugar del sistema donde el verde se usaba como
            fondo decorativo: el acento queda para el total y para el botón de pago. */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, minWidth: 0 }}>
            <Typography component="h2" sx={{ typography: 'd3' }}>
              Tu selección
            </Typography>
            {totalItems > 0 && (
              <Typography className="mono" sx={{ ...muted, fontSize: '.8125rem' }}>
                {totalItems}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar el carrito"
            sx={{ color: 'text.secondary', flex: 'none', '&:active': { transform: 'scale(.94)' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Items */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2.5 }}>
          {items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 0.5 }}>
                Todavía no agregaste productos
              </Typography>
              <Typography sx={{ ...muted, fontSize: '.875rem' }}>
                Explorá el catálogo y guardá lo que te interese.
              </Typography>
            </Box>
          ) : (
            // Sin foto: no hay campo de imagen en la base. El nombre y el precio
            // ocupan la fila entera, y la separación la hace un filete.
            <Box>
              {items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    py: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '.9375rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-.02em' }}>
                      {item.name}
                    </Typography>
                    <Typography className="mono" sx={{ mt: 0.5, fontSize: '1rem', fontWeight: 500, letterSpacing: '-.02em' }}>
                      ${formatCurrency(item.price * item.quantity)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label={`Quitar una unidad de ${item.name}`}
                        sx={stepper}
                      >
                        <RemoveIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                      <Typography className="mono" sx={{ minWidth: 28, textAlign: 'center', fontSize: '.875rem' }}>
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        disabled={Number.isFinite(Number(item.stock)) && item.quantity >= Number(item.stock)}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label={`Agregar una unidad de ${item.name}`}
                        sx={stepper}
                      >
                        <AddIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Quitar ${item.name} del carrito`}
                    sx={{
                      flex: 'none',
                      color: 'text.secondary',
                      '&:active': { transform: 'scale(.94)' },
                      '@media (hover: hover) and (pointer: fine)': {
                        '&:hover': { color: 'error.main' },
                      },
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Pie */}
        {items.length > 0 && (
          <Box sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Typography sx={{ fontSize: '.9375rem', fontWeight: 600 }}>Total</Typography>
              <Typography
                className="mono"
                sx={{ fontSize: '1.375rem', fontWeight: 500, letterSpacing: '-.02em', color: 'primary.main' }}
              >
                ${formatCurrency(totalPrice)}
              </Typography>
            </Box>

            <Typography sx={{ ...muted, fontSize: '.8125rem', mb: 2 }}>
              Pagá online con Mercado Pago, o escribinos para coordinar la entrega.
            </Typography>

            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<CreditCardIcon />}
              onClick={irAlCheckout}
              sx={btn}
            >
              Pagar con Mercado Pago
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<WhatsAppIcon />}
              onClick={handleCheckout}
              sx={{ ...btn, mt: 1 }}
            >
              Consultar disponibilidad
            </Button>
            <Button
              variant="text"
              fullWidth
              onClick={clearCart}
              sx={{ ...btn, height: 38, mt: 1, fontSize: '.8125rem' }}
            >
              Vaciar carrito
            </Button>
          </Box>
        )}
      </Drawer>

      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert onClose={closeSnack} severity={snackbar.severity || 'success'} variant="filled" sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

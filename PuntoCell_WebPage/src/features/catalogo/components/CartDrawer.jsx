import {
  Drawer, Box, Typography, IconButton, Stack, Snackbar, Alert, Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useNavigate } from 'react-router-dom';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useCart } from '../context/CartContext';
import { buildWhatsAppLink, formatCurrency } from '../utils/whatsapp';
import ProductImagePlaceholder from './ProductImagePlaceholder';

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
        PaperProps={{
          sx: { width: { xs: '100vw', sm: 420 }, bgcolor: 'background.paper', borderLeft: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCartOutlinedIcon />
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              Tu selección
            </Typography>
            {totalItems > 0 && (
              <Box sx={{ bgcolor: 'secondary.main', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                {totalItems}
              </Box>
            )}
          </Box>
          <IconButton onClick={() => setIsOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Items */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {items.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, color: 'text.secondary', py: 8 }}>
              <ShoppingCartOutlinedIcon sx={{ fontSize: 64, opacity: 0.2 }} />
              <Typography variant="body1" textAlign="center">
                Todavía no agregaste productos.<br />Explorá nuestra colección y guardá tus favoritos.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', gap: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <Box sx={{ width: 72, height: 72, flexShrink: 0, borderRadius: 3, overflow: 'hidden' }}>
                    <ProductImagePlaceholder categoria={item.category} iconSize={28} ratio="1 / 1" />
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 700 }}>
                      ${formatCurrency(item.price * item.quantity)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity - 1)} sx={{ p: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                        {item.quantity}
                      </Typography>
                      <IconButton size="small" disabled={Number.isFinite(Number(item.stock)) && item.quantity >= Number(item.stock)} onClick={() => updateQuantity(item.id, item.quantity + 1)} sx={{ p: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={() => removeFromCart(item.id)} sx={{ alignSelf: 'flex-start', color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Footer */}
        {items.length > 0 && (
          <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', lineHeight: 1.7, maxWidth: '60%' }}>
                Pagá online con Mercado Pago, o escribinos para coordinar la entrega.
              </Typography>
              <Box textAlign="right">
                <Typography variant="body1" sx={{ fontWeight: 500 }}>Total</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.03em' }}>
                  ${formatCurrency(totalPrice)}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              startIcon={<CreditCardIcon />}
              onClick={irAlCheckout}
            >
              Pagar con Mercado Pago
            </Button>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              size="large"
              startIcon={<WhatsAppIcon />}
              onClick={handleCheckout}
              sx={{ mt: 1 }}
            >
              Consultar disponibilidad
            </Button>
            <Button variant="text" fullWidth size="small" onClick={clearCart} sx={{ mt: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
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

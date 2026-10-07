import { useEffect, useState } from 'react';
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

// Importamos exactamente el servicio que ya tienes en el sistema
import { catalogoService } from '../../../services/catalogoServices';

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

// Formateador específico para pesos (sin decimales)
const formatPesos = (amount) => Math.round(amount).toLocaleString('es-AR');

export default function CartDrawer() {
  const {
    items, isOpen, setIsOpen,
    removeFromCart, updateQuantity, clearCart,
    totalPrice, totalItems,
    snackbar, closeSnack,
  } = useCart();

  const navigate = useNavigate();
  
  // ================= ESTADO DE COTIZACIÓN =================
  const [cotizacionDolar, setCotizacionDolar] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    if (isOpen) {
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
        } catch (error) {
          console.error("Error al obtener la cotización del sistema:", error);
        }
      };
      
      cargarDolarSistema();
    }
    
    return () => { mounted = false; };
  }, [isOpen]);
  // =========================================================

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
          <IconButton onClick={() => setIsOpen(false)} aria-label="Cerrar el carrito" sx={{ color: 'text.secondary', flex: 'none', '&:active': { transform: 'scale(.94)' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

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
            <Box>
              {items.map((item) => {
                const subtotalUSD = item.price * item.quantity;
                const subtotalARS = cotizacionDolar ? subtotalUSD * cotizacionDolar : 0;
                
                return (
                  <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 2, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '.9375rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-.02em' }}>
                        {item.name}
                      </Typography>
                      
                      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column' }}>
                        <Typography className="mono" sx={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '-.02em', color: 'primary.main', lineHeight: 1.2 }}>
                          U$S {formatCurrency(subtotalUSD)}
                        </Typography>
                        {cotizacionDolar > 0 && (
                          <Typography className="mono" sx={{ fontSize: '.75rem', color: 'text.disabled', fontWeight: 500 }}>
                            $ {formatPesos(subtotalARS)}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
                        <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Quitar unidad`} sx={stepper}>
                          <RemoveIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                        <Typography className="mono" sx={{ minWidth: 28, textAlign: 'center', fontSize: '.875rem' }}>{item.quantity}</Typography>
                        <IconButton size="small" disabled={Number.isFinite(Number(item.stock)) && item.quantity >= Number(item.stock)} onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Agregar unidad`} sx={stepper}>
                          <AddIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => removeFromCart(item.id)} aria-label={`Quitar`} sx={{ flex: 'none', color: 'text.secondary', '&:active': { transform: 'scale(.94)' }, '@media (hover: hover) and (pointer: fine)': { '&:hover': { color: 'error.main' } } }}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {items.length > 0 && (
          <Box sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
            
            {/* Total final */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1 }}>
              <Typography sx={{ fontSize: '.9375rem', fontWeight: 600, mt: 0.5 }}>Total</Typography>
              <Typography className="mono" sx={{ fontSize: '1.375rem', fontWeight: 500, letterSpacing: '-.02em', color: 'primary.main', lineHeight: 1.2 }}>
                U$S {formatCurrency(totalPrice)}
              </Typography>
            </Box>

            {/* Aclaración explícita de cotización debajo del total */}
            {cotizacionDolar > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 500, textAlign: 'right' }}>
                  Equivalente: <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>$ {formatPesos(totalPrice * cotizacionDolar)} ARS</Box>
                  <Box component="span" sx={{ display: 'block', fontSize: '.7rem', mt: 0.25 }}>
                    (Cotización: ${formatPesos(cotizacionDolar)})
                  </Box>
                </Typography>
              </Box>
            )}

            <Typography sx={{ ...muted, fontSize: '.8125rem', mb: 2 }}>
              Pagá online con Mercado Pago, o escribinos para coordinar la entrega.
            </Typography>

            <Button variant="contained" color="primary" fullWidth startIcon={<CreditCardIcon />} onClick={irAlCheckout} sx={btn}>
              Pagar con Mercado Pago
            </Button>
            <Button variant="outlined" fullWidth startIcon={<WhatsAppIcon />} onClick={handleCheckout} sx={{ ...btn, mt: 1 }}>
              Consultar disponibilidad
            </Button>
            <Button variant="text" fullWidth onClick={clearCart} sx={{ ...btn, height: 38, mt: 1, fontSize: '.8125rem' }}>
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
import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Badge, Container, Avatar, Tooltip } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useCart } from '../context/CartContext';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { STORE_CONFIG } from '../config/store';

export default function Navbar() {
  const theme = useTheme();
  const { totalItems, setIsOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { business, navbar } = STORE_CONFIG;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = location.pathname === '/';
  const isTransparent = isHome && navbar.transparentOnTop && !scrolled;

  return (
    <AppBar position="fixed" elevation={0} sx={{ backgroundColor: isTransparent ? 'transparent' : theme.custom.navbar.background, backdropFilter: navbar.blur && !isTransparent ? theme.custom.navbar.blur : 'none', borderBottom: isTransparent ? '1px solid transparent' : theme.custom.navbar.border, transition: 'all .3s ease' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ gap: 1, minHeight: { xs: 74, md: 88 } }}>

          <Tooltip title="Volver al inicio">
            <IconButton
              onClick={() => navigate('/')}
              sx={{
                color: isTransparent ? 'white' : 'text.primary',
                mr: 0.5,
                bgcolor: isTransparent ? 'rgba(255,255,255,.12)' : theme.custom.cards.softBackground,
                backdropFilter: 'blur(8px)',
                border: '1px solid',
                borderColor: isTransparent ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.05)',
                transition: 'all .25s ease',
                '&:hover': { bgcolor: isTransparent ? 'rgba(255,255,255,.2)' : theme.palette.divider },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          {navbar.showLogo && (
            <Avatar src={business.logo} alt={business.name} onClick={() => navigate('/catalogo')} sx={{ mr: 1.5, width: 42, height: 42, cursor: 'pointer', border: isTransparent ? '2px solid rgba(255,255,255,.8)' : `2px solid ${theme.palette.primary.main}`, transition: 'all .3s ease', '&:hover': { transform: 'scale(1.05)' } }} />
          )}
          
          <Typography variant="h5" onClick={() => navigate('/catalogo')} sx={{ flexGrow: 1, cursor: 'pointer', fontFamily: '"Playfair Display", serif', fontWeight: 700, letterSpacing: '-0.02em', color: isTransparent ? 'white' : 'text.primary', transition: 'all .3s ease' }}>
            {business.name}
          </Typography>

          {/* Botón del Carrito */}
          <IconButton onClick={() => setIsOpen(true)} sx={{ color: isTransparent ? 'white' : 'text.primary', ml: 1, bgcolor: isTransparent ? 'rgba(255,255,255,.12)' : theme.custom.cards.softBackground, backdropFilter: 'blur(8px)', border: '1px solid', borderColor: isTransparent ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.05)', transition: 'all .25s ease', '&:hover': { bgcolor: isTransparent ? 'rgba(255,255,255,.2)' : theme.palette.divider } }}>
            <Badge badgeContent={totalItems} color="secondary">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>

        </Toolbar>
      </Container>
    </AppBar>
  );
}

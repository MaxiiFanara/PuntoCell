import { Box, Typography, Button } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';

export default function Hero() {
  return (
    <Box 
      component="section" 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        px: 2, // px-4 en Tailwind equivale a 2 en MUI (2 * 8px = 16px)
        py: { xs: 8, md: 12 }, // py-16 en mobile, py-24 en desktop
        background: 'linear-gradient(to bottom, #ffffff, #f9fafb)' 
      }}
    >
      <Box sx={{ maxWidth: '896px', mx: 'auto', textAlign: 'center' }}>
        
        {/* Título E-commerce */}
        <Typography 
          variant="h1" 
          component="h1" 
          sx={{ 
            mb: 3, 
            fontSize: { xs: '3rem', md: '3.75rem' }, 
            fontWeight: 800, 
            letterSpacing: '-0.025em',
            color: '#111827' // gray-900
          }}
        >
          Tu próximo equipo,{' '}
          <Box component="span" sx={{ color: 'primary.dark' }}>
            al mejor precio
          </Box>
        </Typography>
        
        {/* Subtítulo E-commerce */}
        <Typography 
          variant="body1" 
          sx={{ 
            maxWidth: '672px', 
            mx: 'auto', 
            mb: 5, 
            fontSize: '1.25rem', 
            color: 'text.secondary' // Toma el color secundario del theme
          }}
        >
          Encuentra los últimos modelos, repuestos originales y el servicio técnico más confiable para tu dispositivo.
        </Typography>

        {/* Botón Call to Action para la tienda */}
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<ShoppingBagIcon />}
          href="/catalogo"
          sx={{ 
            bgcolor: 'primary.dark', // Usamos el color del theme
            padding: '14px 32px',
            fontSize: '1.1rem',
            textTransform: 'none',
            borderRadius: '12px',
            boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
            '&:hover': { bgcolor: 'primary.main' }
          }}
        >
          Ver Catálogo Online
        </Button>
      </Box>
    </Box>
  );
}
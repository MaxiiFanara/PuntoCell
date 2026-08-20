import { Box, Typography, Button } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <Box 
      component="nav" 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        px: 3, 
        py: 2, 
        bgcolor: 'background.paper', 
        borderBottom: '1px solid #f3f4f6', 
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' 
      }}
    >
      
      {/* Logo o Nombre del Local */}
      <Typography 
        variant="h6" 
        sx={{ 
          fontSize: '1.5rem', 
          fontWeight: 900, 
          letterSpacing: '-0.05em', 
          color: 'text.primary' 
        }}
      >
        PUNTO<Box component="span" sx={{ color: 'primary.dark' }}>CELL</Box>
      </Typography>
      
      {/* Enlaces de la tienda (Ocultos en celulares, visibles en PC) 
      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 4 }}>
        {['Inicio', 'Catálogo', 'Servicio Técnico'].map((text) => (
          <Typography 
            key={text}
            component="a" 
            href="#" 
            sx={{ 
              fontWeight: 500, 
              color: 'text.secondary', 
              textDecoration: 'none',
              transition: 'color 0.2s',
              '&:hover': { color: 'primary.dark' } 
            }}
          >
            {text}
          </Typography>
        ))}
      </Box>
      */}
      {/* Botón de Acceso Interno */}
      <Button 
        component={Link} 
        to="/login" 
        variant="outlined" 
        size="small"
        startIcon={<LockPersonIcon />}
        sx={{ 
          color: '#4b5563', 
          borderColor: '#e5e7eb',
          textTransform: 'none',
          fontWeight: 'bold',
          borderRadius: '8px',
          '&:hover': { bgcolor: '#f3f4f6', borderColor: '#d1d5db' }
        }}
      >
        Gestión Empleados
      </Button>

    </Box>
  );
}
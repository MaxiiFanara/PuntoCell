import { Box, Button, Typography } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import { Link } from 'react-router-dom';

// La marca es la misma del rail interno (AppLayout): el sistema y la vitrina
// tienen que leerse como la misma empresa.
export default function Navbar() {
  return (
    <Box
      component="nav"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: { xs: 2.5, md: 5 },
        height: 64,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none' }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: '9px', flex: 'none',
            bgcolor: 'primary.main', color: 'primary.contrastText',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: '.82rem', letterSpacing: '-.02em',
          }}
        >
          PC
        </Box>
        <Typography sx={{ fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-.02em', color: 'text.primary' }}>
          Punto Cell
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Button href="/catalogo" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          Catálogo
        </Button>
        <Button
          component={Link}
          to="/login"
          variant="outlined"
          startIcon={<LockPersonIcon sx={{ fontSize: '16px !important' }} />}
        >
          Gestión
        </Button>
      </Box>
    </Box>
  );
}

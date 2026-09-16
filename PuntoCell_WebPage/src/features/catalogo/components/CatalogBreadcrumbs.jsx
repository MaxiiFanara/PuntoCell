import { Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from 'react-router-dom';

const estiloItem = {
  fontSize: '.78rem',
  color: 'text.secondary',
  '&:hover': { color: 'text.primary' },
};

/**
 * Ruta de navegación de la vitrina. Con `current` (el nombre del producto)
 * "Catálogo" pasa a ser enlace y el producto queda como hoja.
 */
export default function CatalogBreadcrumbs({ current }) {
  return (
    <Breadcrumbs
      aria-label="Ruta de navegación"
      separator={<NavigateNextIcon sx={{ fontSize: 15 }} />}
      sx={{
        mb: 2.5,
        '& .MuiBreadcrumbs-separator': { mx: 0.5, color: 'text.disabled' },
      }}
    >
      <MuiLink component={Link} to="/" underline="hover" sx={estiloItem}>
        Inicio
      </MuiLink>

      {current ? (
        <MuiLink component={Link} to="/catalogo" underline="hover" sx={estiloItem}>
          Catálogo
        </MuiLink>
      ) : (
        <Typography sx={{ ...estiloItem, color: 'text.primary', fontWeight: 600 }}>
          Catálogo
        </Typography>
      )}

      {current && (
        <Typography
          sx={{
            ...estiloItem,
            color: 'text.primary',
            fontWeight: 600,
            maxWidth: { xs: 180, sm: 420 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {current}
        </Typography>
      )}
    </Breadcrumbs>
  );
}

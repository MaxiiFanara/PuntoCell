import { Box } from '@mui/material';
import { getCategoriaIcon } from '../utils/categorias';

// Reemplaza la foto de producto: no hay campo de imagen en la base todavía
// (agregarlo implica backend + upload + storage, fuera de alcance). Mientras
// tanto, un ícono por categoría sobre el mismo fondo muted que ya usaba la
// landing en su vidriera de ejemplo.
export default function ProductImagePlaceholder({ categoria, iconSize = 44, sx }) {
  // eslint-disable-next-line react-hooks/static-components
  const Icon = getCategoriaIcon(categoria);
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'pc.surfaceMuted',
        color: 'text.disabled',
        ...sx,
      }}
    >
      <Icon sx={{ fontSize: iconSize, opacity: 0.45 }} />
    </Box>
  );
}

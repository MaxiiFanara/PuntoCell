import { Box } from '@mui/material';
import { getCategoriaIcon } from '../utils/categorias';

// Reemplaza la foto de producto: no hay campo de imagen en la base todavía
// (agregarlo implica backend + upload + storage, fuera de alcance).
//
// La proporción la fija el propio placeholder, no el contenedor: antes era
// height:100% y heredaba la del padre, así que en el detalle (un alto fijo de
// 600px dentro de media pantalla) salía una tira vertical. Quien necesite otra
// forma pasa `ratio`.
export default function ProductImagePlaceholder({ categoria, iconSize = 44, ratio = '4 / 3', sx }) {
  const Icon = getCategoriaIcon(categoria);
  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: ratio,
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'pc.surfaceMuted',
        color: 'text.disabled',
        ...sx,
      }}
    >
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon sx={{ fontSize: iconSize, opacity: 0.45 }} />
    </Box>
  );
}

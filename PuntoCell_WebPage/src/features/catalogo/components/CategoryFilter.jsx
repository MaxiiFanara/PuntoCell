import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { formatCategoria } from '../utils/categorias';

// Usa el ToggleButtonGroup que el tema ya estila como píldoras de filtro
// (ver theme/index.js, MuiToggleButton). Antes eran Chips de 42px con fuente
// propia: el mismo control, con otra escala, al lado del resto del sistema.
export default function CategoryFilter({ categories, selected, onChange }) {
  return (
    <Box
      sx={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        px: { xs: 2.5, md: 0 },
        mx: { xs: -2.5, md: 0 },
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      <ToggleButtonGroup
        exclusive
        value={selected}
        // `null` llega al deseleccionar la activa: se ignora para que siempre
        // haya exactamente una categoría vigente.
        onChange={(_, valor) => valor !== null && onChange(valor)}
        aria-label="Filtrar por categoría"
        sx={{ flexWrap: 'nowrap', minWidth: 'max-content' }}
      >
        {categories.map((cat) => (
          <ToggleButton key={cat} value={cat}>
            {cat === 'Todos' ? cat : formatCategoria(cat)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

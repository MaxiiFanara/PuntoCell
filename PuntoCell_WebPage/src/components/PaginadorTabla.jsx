import { Box, Pagination } from '@mui/material';

// Pie de tabla con la paginación. No renderiza nada si hay una sola página.
export default function PaginadorTabla({ pagina, totalPaginas, onChange, mostrar = true }) {
  if (!mostrar || totalPaginas <= 1) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5, borderTop: 1, borderColor: 'pc.dividerSoft' }}>
      <Pagination
        count={totalPaginas}
        page={pagina}
        onChange={(_, p) => onChange(p)}
        color="primary"
        shape="rounded"
        size="small"
      />
    </Box>
  );
}

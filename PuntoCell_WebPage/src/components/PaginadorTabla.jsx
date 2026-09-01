import { Box, Pagination } from '@mui/material';

// Pie de tabla con la paginación. No renderiza nada si hay una sola página.
export default function PaginadorTabla({ pagina, totalPaginas, onChange, mostrar = true }) {
  if (!mostrar || totalPaginas <= 1) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
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

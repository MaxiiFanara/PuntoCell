import { Box, Pagination } from '@mui/material'

// Paginador con soporte de elipsis (truncamiento) nativo de MUI.
export default function TablePager({ page, pageCount, from, to, total, unidad = 'registros', onChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        flexWrap: 'wrap',
        p: '11px 15px',
        borderTop: 1,
        borderColor: 'pc.dividerSoft',
      }}
    >
      <Box sx={{ fontSize: '.75rem', color: 'text.disabled' }}>
        Mostrando <Box component="b" className="num" sx={{ color: 'text.secondary' }}>{from}–{to}</Box>
        {' de '}
        <Box component="b" className="num" sx={{ color: 'text.secondary' }}>{total}</Box>
        {' '}{unidad}
      </Box>

      <Pagination 
        count={pageCount} 
        page={page} 
        onChange={(_, p) => onChange?.(p)}
        color="primary"
        shape="rounded"
        size="small"
        sx={{
          '& .MuiPaginationItem-root': {
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          },
          '& .Mui-selected': {
            fontWeight: 700,
          }
        }}
      />
    </Box>
  )
}

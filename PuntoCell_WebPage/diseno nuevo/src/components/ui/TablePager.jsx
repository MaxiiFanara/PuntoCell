import { Box, Button, IconButton } from '@mui/material'

// ponytail: paginador plano, sin elipsis. Con más de ~12 páginas conviene
// truncar con "…"; hoy ninguna vista llega, así que no está.
export default function TablePager({ page, pageCount, from, to, total, unidad = 'registros', onChange }) {
  const go = (n) => n >= 1 && n <= pageCount && n !== page && onChange?.(n)

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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton size="small" aria-label="Página anterior" disabled={page <= 1} onClick={() => go(page - 1)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </IconButton>

        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <Button
            key={n}
            size="small"
            onClick={() => go(n)}
            aria-current={n === page ? 'page' : undefined}
            sx={{
              minWidth: 28,
              px: 1.125,
              color: n === page ? 'primary.contrastText' : 'text.secondary',
              bgcolor: n === page ? 'primary.main' : 'transparent',
              fontWeight: n === page ? 700 : 500,
              fontVariantNumeric: 'tabular-nums',
              '&:hover': {
                bgcolor: n === page ? 'primary.dark' : 'pc.surfaceMuted',
              },
            }}
          >
            {n}
          </Button>
        ))}

        <IconButton size="small" aria-label="Página siguiente" disabled={page >= pageCount} onClick={() => go(page + 1)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m10 6 6 6-6 6" />
          </svg>
        </IconButton>
      </Box>
    </Box>
  )
}

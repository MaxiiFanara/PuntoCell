import React from 'react'
import { Box, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material'

export default function DashboardRangeFilter({ range, seeAll, onChangeFrom, onChangeTo, onToggleSeeAll }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        borderRadius: '16px',
        px: { xs: 2, md: 3 },
        py: 2,
        bgcolor: 'rgba(255,255,255,0.02)',
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography sx={{ fontSize: '.85rem', fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Filtros de rango
        </Typography>
        <Typography sx={{ fontSize: '.85rem', color: 'text.secondary' }}>
          Por defecto consulta desde un mes atrás hasta hoy.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <TextField
          size="small"
          type="date"
          label="Desde"
          value={range.from}
          onChange={(event) => onChangeFrom(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label="Hasta"
          value={range.to}
          onChange={(event) => onChangeTo(event.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <FormControlLabel
          control={<Checkbox checked={seeAll} onChange={(event) => onToggleSeeAll(event.target.checked)} />}
          label="Ver todo"
        />
      </Box>
    </Box>
  )
}
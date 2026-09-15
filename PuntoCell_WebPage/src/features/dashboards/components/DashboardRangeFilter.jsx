import React from 'react'
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

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

      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <DatePicker
            label="Desde"
            value={range.from ? dayjs(range.from) : null}
            onChange={(value) => onChangeFrom(value ? value.format('YYYY-MM-DD') : '')}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />
          <DatePicker
            label="Hasta"
            value={range.to ? dayjs(range.to) : null}
            onChange={(value) => onChangeTo(value ? value.format('YYYY-MM-DD') : '')}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
          />
          <FormControlLabel
            control={<Checkbox checked={seeAll} onChange={(event) => onToggleSeeAll(event.target.checked)} />}
            label="Ver todo"
          />
        </Box>
      </LocalizationProvider>
    </Box>
  )
}
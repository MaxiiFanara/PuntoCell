import React from 'react'
import { Box, Checkbox, FormControlLabel, Typography, Select, MenuItem, FormControl, Switch, ListItemText } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

export default function DashboardRangeFilter({ 
  range, seeAll, onChangeFrom, onChangeTo, onToggleSeeAll,
  sucursales = [], branchId = '', onChangeBranch = null,
  isComparing = false, onToggleCompare = null,
  compareBranches = [], onChangeCompareBranches = null
}) {
  return (
    <Box
      sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 2, borderRadius: '16px', px: { xs: 2, md: 3 }, py: 2,
        bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: '200px' }}>
        <Typography sx={{ fontSize: '.85rem', fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', color: 'text.secondary' }}>
          Filtros del Dashboard
        </Typography>
        <Typography sx={{ fontSize: '.85rem', color: 'text.secondary' }}>
          Por defecto consulta desde un mes atrás hasta hoy.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end' }}>
            
            {!isComparing && onChangeBranch && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={branchId}
                  onChange={(e) => onChangeBranch(e.target.value)}
                  displayEmpty
                  sx={{ fontSize: '0.85rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Todas las sucursales</MenuItem>
                  {sucursales.map(s => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.85rem' }}>{s.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {isComparing && onChangeCompareBranches && (
              <FormControl size="small" sx={{ minWidth: 250 }}>
                <Select
                  multiple
                  displayEmpty
                  value={compareBranches}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Evitar que seleccionen más de 4 para no saturar los gráficos
                    if (val.length <= 4) onChangeCompareBranches(val);
                  }}
                  renderValue={(selected) => {
                    if (selected.length === 0) return <Typography sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Seleccionar sucursales...</Typography>;
                    return <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'primary.main' }}>{selected.length} sucursales a comparar</Typography>;
                  }}
                  sx={{ fontSize: '0.85rem' }}
                >
                  <MenuItem value="" sx={{ fontSize: '0.85rem' }}>
                    <Checkbox checked={compareBranches.indexOf('') > -1} size="small" />
                    <ListItemText primary="Todas las sucursales (Global)" primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
                  </MenuItem>
                  {sucursales.map((s) => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontSize: '0.85rem' }}>
                      <Checkbox checked={compareBranches.indexOf(s.id) > -1} size="small" />
                      <ListItemText primary={s.nombre} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <DatePicker label="Desde" value={range.from ? dayjs(range.from) : null} onChange={(value) => onChangeFrom(value ? value.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }} />
            <DatePicker label="Hasta" value={range.to ? dayjs(range.to) : null} onChange={(value) => onChangeTo(value ? value.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', sx: { minWidth: 140 } } }} />
            <FormControlLabel control={<Checkbox checked={seeAll} onChange={(event) => onToggleSeeAll(event.target.checked)} size="small" />} label={<Typography sx={{ fontSize: '0.85rem' }}>Ver todo</Typography>} sx={{ mr: 0 }} />
          </Box>
        </LocalizationProvider>

        {onToggleCompare && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, pt: 1, width: '100%', justifyContent: { xs: 'flex-start', md: 'flex-end' }, borderTop: '1px dashed', borderColor: 'divider' }}>
            <FormControlLabel
              control={<Switch checked={isComparing} onChange={(e) => onToggleCompare(e.target.checked)} color="primary" size="small" />}
              label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Comparar sucursales (Múltiple)</Typography>}
              sx={{ mr: 0 }}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
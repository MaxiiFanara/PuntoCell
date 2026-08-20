import {
  Typography, TextField, Box, ToggleButton,
  ToggleButtonGroup, Button, MenuItem, InputAdornment, Chip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'
import TuneIcon from '@mui/icons-material/Tune'

const ESTADOS = [
  { value: null,           label: 'Activas',     color: '#475569' },
  { value: 'en espera',     label: 'Espera',      color: '#d97706' },
  { value: 'en reparación', label: 'Reparación',  color: '#0284c7' },
  { value: 'terminado',     label: 'Terminado',   color: '#059669' },
  { value: 'entregado',     label: 'Entregado',   color: '#7c3aed' },
  { value: 'anulado',       label: 'Anulada',     color: '#dc2626' },
  { value: 'todos',         label: 'Todos',       color: '#0f172a' },
]

const FiltrosReparaciones = ({ filtros, setFiltros, empleados }) => {
  const handleEstado   = (_, v) => { if (v !== undefined) setFiltros((f) => ({ ...f, estado: v })) }
  const handleBusqueda = (e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))
  const handleEmpleado = (e) => setFiltros((f) => ({ ...f, empleadoId: e.target.value || null }))
  const limpiar = () => setFiltros({ estado: null, busqueda: '', empleadoId: null })

  const hayFiltros = filtros.busqueda || filtros.empleadoId || filtros.estado !== null
  const estadoActual = ESTADOS.find((e) => e.value === filtros.estado)

  return (
    <Box
      sx={{
        backgroundColor: '#fff',
        borderRadius: 3,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        mb: 3,
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <Box sx={{
        px: 2.5, py: 1.5,
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', gap: 1.5,
        backgroundColor: '#fafbfc',
      }}>
        <TuneIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>
          Criterios de búsqueda
        </Typography>
        {hayFiltros && (
          <>
            {estadoActual && estadoActual.value !== null && (
              <Chip
                label={estadoActual.label}
                size="small"
                onDelete={() => setFiltros((f) => ({ ...f, estado: null }))}
                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569' }}
              />
            )}
            <Button
              size="small"
              startIcon={<FilterListOffIcon sx={{ fontSize: '13px !important' }} />}
              onClick={limpiar}
              sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', px: 1.25, py: 0.4, borderRadius: 1.5,
                '&:hover': { color: '#475569', backgroundColor: '#f1f5f9' } }}
            >
              Limpiar
            </Button>
          </>
        )}
      </Box>

      {/* Body */}
      <Box sx={{ p: 2.5 }}>
        {/* Search row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
          <TextField
            placeholder="Buscar por cliente, dispositivo, N° orden, falla…"
            value={filtros.busqueda}
            onChange={handleBusqueda}
            sx={{ minWidth: 280, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 17, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
          />
          {empleados?.length > 0 && (
            <TextField
              select
              label="Empleado"
              value={filtros.empleadoId ?? ''}
              onChange={handleEmpleado}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todos los empleados</MenuItem>
              {empleados.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.apellido}, {emp.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        {/* Estado toggles */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>
            Estado:
          </Typography>
          <ToggleButtonGroup
            value={filtros.estado}
            exclusive
            onChange={handleEstado}
            size="small"
            sx={{ flexWrap: 'wrap', gap: 0.75 }}
          >
            {ESTADOS.map(({ value, label }) => (
              <ToggleButton
                key={String(value)}
                value={value}
              >
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Box>
  )
}

export default FiltrosReparaciones

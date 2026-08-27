import { useMemo } from 'react'
import {
  TextField, Box, ToggleButton, ToggleButtonGroup,
  Button, MenuItem, InputAdornment, IconButton,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import FilterBar, { FilterField } from '../ui/FilterBar'
import StatusPill from '../ui/StatusPill'

const ESTADOS = [
  { value: null,            label: 'Activas' },
  { value: 'en espera',     label: 'Espera' },
  { value: 'en reparación', label: 'Reparación' },
  { value: 'terminado',     label: 'Terminado' },
  { value: 'entregado',     label: 'Entregado' },
  { value: 'anulado',       label: 'Anulada' },
  { value: 'todos',         label: 'Todos' },
]

const FiltrosReparaciones = ({ filtros, setFiltros, empleados }) => {
  const handleEstado   = (_, v) => { if (v !== undefined) setFiltros((f) => ({ ...f, estado: v })) }
  const handleBusqueda = (e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))
  const handleEmpleado = (e) => setFiltros((f) => ({ ...f, empleadoId: e.target.value || null }))
  const limpiar = () => setFiltros({ estado: null, busqueda: '', empleadoId: null })

  // El estado por defecto (null → "Activas") no cuenta como filtro activo.
  const hayFiltros = Boolean(filtros.busqueda || filtros.empleadoId || filtros.estado !== null)

  const chipsActivos = useMemo(() => {
    const activos = []
    if (filtros.busqueda) activos.push({ campo: 'busqueda', texto: filtros.busqueda })
    if (filtros.empleadoId) {
      const emp = empleados?.find((e) => String(e.id) === String(filtros.empleadoId))
      activos.push({ campo: 'empleadoId', texto: emp ? `${emp.apellido}, ${emp.nombre}` : 'Empleado' })
    }
    if (filtros.estado !== null) {
      const est = ESTADOS.find((e) => e.value === filtros.estado)
      activos.push({ campo: 'estado', texto: est?.label ?? filtros.estado })
    }
    return activos
  }, [filtros, empleados])

  const quitarChip = (campo) => {
    if (campo === 'estado') setFiltros((f) => ({ ...f, estado: null }))
    else setFiltros((f) => ({ ...f, [campo]: campo === 'empleadoId' ? null : '' }))
  }

  return (
    <FilterBar
      columns="minmax(240px,1.6fr) minmax(180px,1fr)"
      chips={chipsActivos.map((c) => (
        <StatusPill
          key={c.campo}
          tone="flat"
          label={c.texto}
          sx={{ pr: '5px' }}
          meta={
            <IconButton
              size="small"
              aria-label={`Quitar filtro ${c.campo}`}
              onClick={() => quitarChip(c.campo)}
              sx={{ width: 15, height: 15, p: 0, color: 'inherit', opacity: .7, '&:hover': { opacity: 1 } }}
            >
              <CloseIcon sx={{ fontSize: 11 }} />
            </IconButton>
          }
        />
      ))}
      actions={hayFiltros && <Button size="small" onClick={limpiar}>Limpiar</Button>}
    >
      <FilterField label="Buscar">
        <TextField
          placeholder="Cliente, dispositivo, N° orden, falla…"
          value={filtros.busqueda}
          onChange={handleBusqueda}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </FilterField>

      {empleados?.length > 0 && (
        <FilterField label="Empleado">
          <TextField select value={filtros.empleadoId ?? ''} onChange={handleEmpleado} fullWidth>
            <MenuItem value="">Todos los empleados</MenuItem>
            {empleados.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.apellido}, {emp.nombre}</MenuItem>
            ))}
          </TextField>
        </FilterField>
      )}

      <FilterField label="Estado" sx={{ gridColumn: '1 / -1' }}>
        <ToggleButtonGroup value={filtros.estado} exclusive onChange={handleEstado}>
          {ESTADOS.map(({ value, label }) => (
            <ToggleButton key={String(value)} value={value}>{label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </FilterField>
    </FilterBar>
  )
}

export default FiltrosReparaciones

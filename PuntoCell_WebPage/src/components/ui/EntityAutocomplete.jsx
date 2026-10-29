import { Autocomplete, TextField } from '@mui/material'

const idPorDefecto = (o) => o?.Id ?? o?.id ?? ''
const labelPorDefecto = (o) => o?.Nombre ?? o?.nombre ?? ''

/**
 * Select buscable (escribir para filtrar, desplegable, elegir una opción) — mismo
 * comportamiento que ya usa "Artículo existente" en CompraCreateModal. Reemplazo directo
 * de un <Select>/<TextField select> de catálogo (Color, Memoria, Batería, etc.): `value`
 * sigue siendo el id escalar de siempre y `onChange` recibe el nuevo id escalar (o '' si
 * se limpia), no un objeto — así cada pantalla lo conecta a su propio handler sin cambiar
 * cómo guarda ese campo.
 */
export default function EntityAutocomplete({
  label, options = [], value, onChange,
  getId = idPorDefecto, getLabel = labelPorDefecto,
  size = 'small', fullWidth = true, placeholder, disabled, sx,
}) {
  const seleccionado = options.find((o) => String(getId(o)) === String(value)) ?? null

  return (
    <Autocomplete
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      sx={sx}
      options={options}
      getOptionLabel={(o) => getLabel(o) || ''}
      isOptionEqualToValue={(o, v) => String(getId(o)) === String(getId(v))}
      value={seleccionado}
      onChange={(_, nuevo) => onChange(nuevo ? getId(nuevo) : '')}
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
    />
  )
}

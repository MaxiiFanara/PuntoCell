import { useState } from 'react'
import { MenuItem, Select } from '@mui/material'
import { aplicarTamano, leerTamano } from '../../utils/fontSize'

export default function FontSizeSelect() {
  const [valor, setValor] = useState(leerTamano)

  const cambiar = (e) => {
    const nuevo = e.target.value
    setValor(nuevo)
    aplicarTamano(nuevo)
  }

  return (
    <Select
      value={valor}
      onChange={cambiar}
      size="small"
      aria-label="Tamaño de letra"
      title="Tamaño de letra"
      sx={{ minWidth: 104, '@media print': { display: 'none' } }}
      inputProps={{ 'aria-label': 'Tamaño de letra' }}
    >
      <MenuItem value="chico">Chico</MenuItem>
      <MenuItem value="mediano">Mediano</MenuItem>
      <MenuItem value="grande">Grande</MenuItem>
    </Select>
  )
}

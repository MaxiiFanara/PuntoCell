import { useRef, useLayoutEffect } from 'react'
import { TextField } from '@mui/material'
import { formatearMiles, limpiarMiles } from '../../utils/format'

// Cuenta cuántos dígitos hay en `texto` antes de la posición `pos`.
const digitosAntesDe = (texto, pos) => texto.slice(0, pos).replace(/\D/g, '').length

// Encuentra en `texto` la posición justo después de haber "visto" `n` dígitos.
const posicionParaDigitos = (texto, n) => {
  if (n <= 0) return 0
  let vistos = 0
  for (let i = 0; i < texto.length; i++) {
    if (/\d/.test(texto[i])) {
      vistos++
      if (vistos === n) return i + 1
    }
  }
  return texto.length
}

/**
 * TextField numérico con separadores de miles PURAMENTE visuales (punto de miles,
 * coma decimal — misma convención es-AR que ya usa el resto de la app). Drop-in
 * reemplazo de un TextField numérico controlado: `value`/`onChange` siguen recibiendo
 * y emitiendo el valor CRUDO de siempre (dígitos + "." decimal, sin separadores) — el
 * formateo/desformateo vive centralizado en utils/format.js (formatearMiles/limpiarMiles),
 * no se reimplementa acá ni en cada pantalla.
 *
 * `onChange` se llama con un evento sintético mínimo `{ target: { value, name } }`,
 * compatible con los handlers `set(campo)` ya usados en todo el sistema.
 */
export default function NumberField({ value, onChange, name, slotProps, ...props }) {
  const inputRef = useRef(null)
  const caretDigitos = useRef(null)

  const visual = formatearMiles(value ?? '')

  const handleChange = (e) => {
    caretDigitos.current = digitosAntesDe(e.target.value, e.target.selectionStart)
    const crudo = limpiarMiles(e.target.value)
    onChange({ target: { value: crudo, name: name ?? e.target.name } })
  }

  // Tras re-renderizar con el nuevo valor formateado, recolocamos el cursor en la
  // misma posición "semántica" (mismos dígitos a la izquierda), no al final del input.
  useLayoutEffect(() => {
    if (caretDigitos.current == null || !inputRef.current) return
    const pos = posicionParaDigitos(visual, caretDigitos.current)
    inputRef.current.setSelectionRange(pos, pos)
    caretDigitos.current = null
  }, [visual])

  return (
    <TextField
      {...props}
      name={name}
      value={visual}
      onChange={handleChange}
      inputRef={inputRef}
      slotProps={{ ...slotProps, htmlInput: { inputMode: 'decimal', ...(slotProps?.htmlInput || {}) } }}
    />
  )
}

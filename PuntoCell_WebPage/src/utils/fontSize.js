// Tamaño de tipografía global. Casi todo el sistema está en rem (tema MUI),
// así que alcanza con escalar el font-size de <html>. "Chico" = 87,5% (estable); "Mediano" = 110%, a pedido, ya no es el
// original. Íconos/imágenes en px no se ven afectados.
const CLAVE = 'pc-font-size'
const TAMANOS = { chico: '87.5%', mediano: '110%', grande: '125%' }

export const leerTamano = () => {
  try {
    const v = localStorage.getItem(CLAVE)
    return v in TAMANOS ? v : 'mediano'
  } catch {
    return 'mediano'
  }
}

export const aplicarTamano = (valor) => {
  document.documentElement.style.fontSize = TAMANOS[valor]
  try { localStorage.setItem(CLAVE, valor) } catch { /* sin persistencia */ }
}

// Se llama al arrancar para que también lo respeten las pantallas sin navbar.
export const aplicarTamanoGuardado = () => {
  document.documentElement.style.fontSize = TAMANOS[leerTamano()]
}

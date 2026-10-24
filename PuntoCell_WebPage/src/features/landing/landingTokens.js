// Tokens de la landing. La cara oscura (hero, carrusel, "Visitanos") es siempre
// oscura, sea cual sea el modo del sitio: es la identidad de la apertura.
export const DISPLAY = '"Bricolage Grotesque", Archivo, ui-sans-serif, system-ui, sans-serif'
// Itálica editorial: una palabra por título, nunca más.
export const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif'
export const MONO = '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace'
export const NOCHE = '#04120d'
export const MENTA = '#3ddc97'
// Acento de acción: el color de lo que se toca (CTA principal). La menta queda para marca e íconos.
export const LIMA = '#d8ff3d'
export const LIMA_HOVER = '#e9ff85'
// Superficie de tarjetas sobre la noche: un verde apenas más claro que el fondo.
export const SUPERFICIE = '#0a1f17'
// Papel cálido: sólo la etiqueta de precio del hero.
export const CREMA = '#f2efe6'

export const EASE = 'cubic-bezier(.23,1,.32,1)'

// Con colorSchemeSelector: 'data' el tema marca <html> con `data-light` / `data-dark`.
// Poner `data-dark` en un subárbol reasigna ahí los tokens a su versión oscura: los
// componentes de adentro (Paper, ProductCard, etc.) se adaptan solos.
export const ESQUEMA_OSCURO = { 'data-dark': '' }

/**
 * Botón de la landing: 160ms de press (scale .97) y hover sólo con puntero fino.
 * En táctil el hover se dispara al tocar y quedaba pegado; el `&:hover` base lo
 * devuelve al color de reposo.
 */
export const boton = ({ bg = 'transparent', color, hoverBg, border, hoverBorder, height = 54 }) => ({
  height,
  px: 3.5,
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: '14px',
  textTransform: 'none',
  letterSpacing: '-.005em',
  bgcolor: bg,
  color,
  ...(border && { border }),
  transition: `transform 160ms ${EASE}, background-color 180ms ease, border-color 180ms ease`,
  '&:active': { transform: 'scale(.97)' },
  '&:hover': { bgcolor: bg, ...(hoverBorder && { borderColor: border?.split(' ').pop() }) },
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': { bgcolor: hoverBg ?? bg, ...(hoverBorder && { borderColor: hoverBorder }) },
  },
})

// Fondo único de toda la landing (el mismo de la apertura): aurora verde sobre la noche.
export const COLORES_FONDO = ['#1f8a68', '#12684e', '#0d5240', NOCHE]

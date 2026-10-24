import { MONO, PUBLIC_MAXW, PUBLIC_GUTTER, PUBLIC_SECTION_Y, PUBLIC_CONTROL_H } from '../../theme'

/**
 * Primitivos de la cara pública (landing + catálogo).
 *
 * La vitrina y el panel comparten el mismo tema, pero no la misma densidad: el
 * panel se mide en filas de 46px y controles de 32px, la vitrina en aire. Esto
 * no es un tema aparte, son los mismos tokens con otra escala, y vive acá para
 * que no se reescriba en cada componente.
 *
 * Reglas del sistema que estos objetos sostienen:
 *  - El verde es el ÚNICO acento. Además del precio, la acción primaria y el anillo
 *    de foco, acompaña fondos suaves (color-mix al 5-14%), íconos y píldoras.
 *  - La separación la hacen el aire y un filete de 1px. Nunca una caja adentro
 *    de otra caja.
 *  - Mono con tabular-nums sólo para precios y datos comparables.
 *  - `text.disabled` no se usa nunca para texto: va `pc.textMuted`.
 */

/** Tipografía de carácter de la cara pública: títulos en grotesk y una palabra en serif itálica. */
export const DISPLAY = '"Bricolage Grotesque", Archivo, ui-sans-serif, system-ui, sans-serif'
export const SERIF = '"Instrument Serif", Georgia, "Times New Roman", serif'

/** Ancho y márgenes del contenido. Lo usa todo bloque de la cara pública. */
export const shell = {
  width: '100%',
  maxWidth: `${PUBLIC_MAXW}px`,
  mx: 'auto',
  px: PUBLIC_GUTTER,
}

/** Ritmo vertical de sección. `linea` agrega el filete superior que las separa. */
export const section = (linea = false) => ({
  py: PUBLIC_SECTION_Y,
  ...(linea && { borderTop: 1, borderColor: 'divider' }),
})

/**
 * Botón de la vitrina: 48px en vez de los 38 del panel. El radio y el peso salen
 * del tema, así que un botón público y uno interno se reconocen como el mismo
 * control a distinta escala.
 */
export const btn = {
  height: PUBLIC_CONTROL_H,
  px: 3,
  fontSize: '.9375rem',
  letterSpacing: '-.005em',
  '& .MuiButton-startIcon svg, & .MuiButton-endIcon svg': { fontSize: '18px !important' },
  transition: 'transform 160ms cubic-bezier(.23,1,.32,1), background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  '&:active': { transform: 'scale(.98)' },
}

/** Campo de texto de la vitrina, a la misma altura que el botón. */
export const field = {
  '& .MuiOutlinedInput-root': {
    height: PUBLIC_CONTROL_H,
    borderRadius: '8px',
    bgcolor: 'background.paper',
    fontSize: '.9375rem',
  },
  '& .MuiOutlinedInput-input': { minHeight: PUBLIC_CONTROL_H, py: 0 },
}

/**
 * Superficie: papel con filete y el lift suave del tema. Es la única forma de
 * caja del sistema, y no se anida.
 */
export const surface = {
  bgcolor: 'background.paper',
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  boxShadow: 'var(--pc-palette-pc-lift)',
}

/** El precio. Único lugar, junto a la acción primaria y el foco, donde va el verde. */
export const price = (grande = false) => ({
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-.02em',
  fontWeight: 500,
  color: 'primary.main',
  fontSize: grande ? 'clamp(1.75rem, 3vw, 2.25rem)' : '1.375rem',
  lineHeight: 1,
})

/** Texto atenuado. Nunca `text.disabled`, que no llega a 4.5:1. */
export const muted = { color: 'pc.textMuted' }

/**
 * Elevación en hover, sólo donde hay puntero fino. En táctil el hover se dispara
 * al tocar y deja el estado pegado.
 */
export const hoverLift = {
  transition: 'transform 220ms cubic-bezier(.23,1,.32,1), box-shadow 220ms cubic-bezier(.23,1,.32,1), border-color 220ms ease',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: 'var(--pc-palette-pc-liftPop)',
      borderColor: 'text.disabled',
    },
  },
  '&:active': { transform: 'translateY(-1px)' },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'border-color 220ms ease',
    '@media (hover: hover) and (pointer: fine)': { '&:hover': { transform: 'none' } },
  },
}

/**
 * La entrada de la apertura: fundido y 8px de subida, escalonado.
 * Es el único movimiento de entrada de toda la cara pública; el resto es estado.
 */
export const enter = (i = 0) => ({
  '@media (prefers-reduced-motion: no-preference)': {
    opacity: 0,
    animation: 'pcRise 600ms cubic-bezier(.23,1,.32,1) forwards',
    animationDelay: `${i * 60}ms`,
  },
})

// Tokens de la landing. La cara oscura (hero, carrusel, "Visitanos") es siempre
// oscura, sea cual sea el modo del sitio: es la identidad de la apertura.
export const DISPLAY = '"Space Grotesk", Archivo, ui-sans-serif, system-ui, sans-serif'
export const NOCHE = '#04120d'
export const MENTA = '#3ddc97'
// Superficie de tarjetas sobre la noche: un verde apenas más claro que el fondo.
export const SUPERFICIE = '#0a1f17'

// Con colorSchemeSelector: 'data' el tema marca <html> con `data-light` / `data-dark`.
// Poner `data-dark` en un subárbol reasigna ahí los tokens a su versión oscura: los
// componentes de adentro (Paper, ProductCard, etc.) se adaptan solos.
export const ESQUEMA_OSCURO = { 'data-dark': '' }

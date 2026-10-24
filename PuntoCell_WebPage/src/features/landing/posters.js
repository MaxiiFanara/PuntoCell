import { MENTA, NOCHE } from './landingTokens'

/**
 * Láminas del carrusel de servicios, dibujadas como SVG (no hay fotos todavía).
 * El carrusel las usa de textura WebGL, así que el texto va cocido en la imagen:
 * el contenido accesible vive en el HTML que acompaña al carrusel.
 *
 * Cuando haya fotos, alcanza con poner `src: '/images/...'` en cada ítem de
 * SERVICIOS (ServiceShowcase.jsx) y no hace falta tocar nada más.
 */

const W = 800
const H = 1000
const FUENTE = "Helvetica Neue, Helvetica, Arial, sans-serif"

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function envolver(texto, max) {
  const lineas = []
  let actual = ''
  for (const palabra of texto.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (prueba.length > max && actual) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = prueba
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

export function lamina({ numero, titulo, descripcion, tono }) {
  const tit = envolver(titulo, 13)
  const desc = envolver(descripcion, 30)

  // Se arma de abajo hacia arriba: el bloque de texto siempre termina en el mismo margen.
  const yFinal = H - 96
  const descY0 = yFinal - (desc.length - 1) * 50
  const titY0 = descY0 - 64 - (tit.length - 1) * 84

  const titulos = tit
    .map((l, i) => `<text x="64" y="${titY0 + i * 84}" font-size="76" font-weight="700" fill="#fff">${esc(l)}</text>`)
    .join('')
  const descripciones = desc
    .map(
      (l, i) =>
        `<text x="64" y="${descY0 + i * 50}" font-size="34" fill="#fff" fill-opacity=".82">${esc(l)}</text>`,
    )
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FUENTE}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tono}"/><stop offset="1" stop-color="${NOCHE}"/></linearGradient>
<radialGradient id="r" cx="82%" cy="14%" r="75%"><stop offset="0" stop-color="${MENTA}" stop-opacity=".5"/><stop offset="1" stop-color="${MENTA}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<rect width="${W}" height="${H}" fill="url(#r)"/>
<g fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2">
<circle cx="660" cy="190" r="120"/><circle cx="660" cy="190" r="220"/><circle cx="660" cy="190" r="320"/><circle cx="660" cy="190" r="420"/>
</g>
<text x="60" y="270" font-size="230" font-weight="700" fill="none" stroke="${MENTA}" stroke-width="3">${esc(numero)}</text>
${titulos}
${descripciones}
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

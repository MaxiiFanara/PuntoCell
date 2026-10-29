// Ejes del gráfico de radar del comparador. Las fichas de mobileapi.dev son texto
// libre en inglés ("Li-Ion 3582 mAh", "~460 ppi density"), así que cada eje trae su
// parser. Si un dato no se puede leer devuelve null y el eje no se dibuja.
//
// `ref` es el máximo del eje cuando ningún equipo lo supera; si alguno lo supera,
// el eje se estira para que entre. Todos los ejes parten de cero.

export const numeros = (texto, regex) =>
  [...String(texto || '').matchAll(regex)].map((m) => parseFloat(m[1])).filter(Number.isFinite)

export const maximo = (lista) => (lista.length ? Math.max(...lista) : null)

// "256gb" / "1tb" -> GB
export const aGb = (texto) => {
  const m = String(texto || '').toLowerCase().match(/([\d.]+)\s*(gb|tb)/)
  if (!m) return null
  return parseFloat(m[1]) * (m[2] === 'tb' ? 1024 : 1)
}

const specs = (p) => p.ficha?.specs

export const METRICAS = [
  {
    clave: 'bateria',
    nombre: 'Batería',
    ref: 6000,
    // Algunas versiones de mercado traen dos capacidades: se toma la mayor.
    valor: (p) => maximo(numeros(specs(p)?.battery?.type, /(\d+)\s*mAh/gi)),
    formato: (v) => `${Math.round(v)} mAh`,
  },
  {
    clave: 'pantalla',
    nombre: 'Pantalla',
    ref: 7,
    valor: (p) => maximo(numeros(specs(p)?.display?.size, /([\d.]+)\s*inches/gi)),
    formato: (v) => `${v}"`,
  },
  {
    clave: 'nitidez',
    nombre: 'Nitidez',
    ref: 500,
    valor: (p) => maximo(numeros(specs(p)?.display?.resolution, /(\d+)\s*ppi/gi)),
    formato: (v) => `${Math.round(v)} ppi`,
  },
  {
    clave: 'ram',
    nombre: 'RAM',
    ref: 16,
    // Primero la RAM de la unidad en venta; si no está, la mayor de la ficha.
    valor: (p) => aGb(p.memoria) ?? maximo(numeros(specs(p)?.memory?.internal, /(\d+)\s*GB RAM/gi)),
    formato: (v) => `${v} GB`,
  },
  {
    clave: 'almacenamiento',
    nombre: 'Almacenamiento',
    ref: 512,
    valor: (p) => aGb(p.almacenamiento),
    formato: (v) => (v >= 1024 ? `${v / 1024} TB` : `${v} GB`),
  },
  {
    clave: 'camara',
    nombre: 'Cámara',
    ref: 100,
    // La primera cámara de la lista es la principal.
    valor: (p) => numeros(specs(p)?.main_camera?.modules, /(\d+(?:\.\d+)?)\s*MP/gi)[0] ?? null,
    formato: (v) => `${v} MP`,
  },
]

/**
 * Arma la configuración del RadarChart para los productos a comparar. Se quedan
 * solo los ejes donde TODOS los equipos tienen dato: un eje con un cero inventado
 * haría parecer peor a un equipo por una ficha incompleta.
 * Devuelve null si quedan menos de 3 ejes (un radar de 2 ejes no se lee).
 */
export function armarRadar(productos) {
  const ejes = METRICAS.map((m) => ({ ...m, valores: productos.map(m.valor) })).filter((m) =>
    m.valores.every((v) => v !== null),
  )
  if (ejes.length < 3) return null

  return {
    metrics: ejes.map((m) => ({ name: m.nombre, min: 0, max: Math.max(m.ref, ...m.valores) })),
    series: productos.map((p, i) => ({
      id: p.id,
      label: p.name,
      data: ejes.map((m) => m.valores[i]),
      fillArea: true,
      valueFormatter: (valor, contexto) => {
        const eje = ejes[contexto?.dataIndex]
        return eje ? eje.formato(valor) : String(valor)
      },
    })),
  }
}

// Color de cada equipo, el mismo en el radar y en la tarjeta de arriba (hace de leyenda):
// el verde de la marca, un ámbar y un azul pizarra. Distinguibles entre sí y sin el
// azul/amarillo/rojo por defecto de la librería.
export const COLORES_SERIES = ['#1f9d74', '#e0a23a', '#5b7fa8']

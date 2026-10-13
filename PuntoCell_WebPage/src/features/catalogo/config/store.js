export const STORE_CONFIG = {
  // Lo consume formatCurrency. Faltaba, así que Intl.NumberFormat caía al locale
  // del navegador del visitante: con el navegador en inglés los precios salían
  // "$1,871,100" en vez de "$1.871.100".
  locale: 'es-AR',

  business: {
    name: 'Punto Cell',

    logo:
      'PUNTO CELL',

    whatsapp: '5493517661740',

    // Datos opcionales para el bloque "Visitanos" de la landing. Si se completan
    // se muestran y ajustan el mapa; vacíos, solo se muestra la ciudad.
    address: '',
    hours: '',

    instagram:
      'https://www.instagram.com/puntocell.lacalera?igsh=MThmZTJka3licGVocg==',
  },

  theme: {
    preset: 'puntocell',
  },

  navbar: {
    variant: 'glass',

    transparentOnTop: true,

    blur: true,

    showLogo: true,
  },

  catalog: {
    title: 'Catálogo',

    emptyState: {
      title:
        'No encontramos productos',

      subtitle:
        'Probá otra búsqueda o categoría.',
    },
  },

  productPage: {
    installmentText:
      '',

    addToCartText:
      'Agregar al carrito',

    outOfStockText:
      'Sin stock',

    viewDetailText:
      'Ver detalle',
  },

  footer: {
    description:
      'Encuentra los últimos modelos, repuestos originales y el servicio técnico más confiable para tu dispositivo.',

    copyright:
      'Todos los derechos reservados',
  },
};
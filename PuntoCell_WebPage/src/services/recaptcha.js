// reCAPTCHA v2 invisible con render explícito. El script se carga una sola vez y
// solo desde el login (no en index.html) para no mostrar el badge en todo el sitio.

export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

const ONLOAD_CB = '__pcRecaptchaOnload'
let cargaPromise = null

const cargarScript = () => {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha)
  if (cargaPromise) return cargaPromise

  cargaPromise = new Promise((resolve, reject) => {
    // El callback de carga tiene que existir antes de que llegue api.js.
    window[ONLOAD_CB] = () => resolve(window.grecaptcha)
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?onload=${ONLOAD_CB}&render=explicit&hl=es-419`
    script.async = true
    script.defer = true
    script.onerror = () => {
      cargaPromise = null
      script.remove()
      reject(new Error('No se pudo cargar reCAPTCHA'))
    }
    document.head.appendChild(script)
  })
  return cargaPromise
}

// Renderiza el widget invisible dentro de `container` y devuelve un objeto con
// `ejecutar()` (Promise con el token) y `reset()` (los tokens son de un solo uso).
export const crearRecaptchaInvisible = async (container) => {
  const grecaptcha = await cargarScript()
  let pendiente = null

  const resolver = (fn, valor) => {
    if (!pendiente) return
    const p = pendiente
    pendiente = null
    p[fn](valor)
  }

  const widgetId = grecaptcha.render(container, {
    sitekey: RECAPTCHA_SITE_KEY,
    size: 'invisible',
    callback: (token) => resolver('resolve', token),
    'expired-callback': () => resolver('reject', new Error('La verificación reCAPTCHA expiró. Intentá nuevamente.')),
    'error-callback': () => resolver('reject', new Error('Error de conexión con reCAPTCHA. Intentá nuevamente.')),
  })

  return {
    ejecutar: () => new Promise((resolve, reject) => {
      pendiente = { resolve, reject }
      grecaptcha.execute(widgetId)
    }),
    reset: () => {
      resolver('reject', new Error('Verificación cancelada'))
      grecaptcha.reset(widgetId)
    },
  }
}

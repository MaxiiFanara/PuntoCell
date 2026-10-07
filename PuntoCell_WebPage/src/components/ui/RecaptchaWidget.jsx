import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY
const SCRIPT_SRC = 'https://www.google.com/recaptcha/enterprise.js?render=explicit'

// Carga la API de JavaScript de reCAPTCHA Enterprise una sola vez.
let scriptPromise
const cargarScript = () => {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const tag = document.createElement('script')
      tag.src = SCRIPT_SRC
      tag.async = true
      tag.defer = true
      tag.onload = () => window.grecaptcha.enterprise.ready(resolve)
      tag.onerror = () => { scriptPromise = undefined; reject(new Error('No se pudo cargar reCAPTCHA')) }
      document.head.appendChild(tag)
    })
  }
  return scriptPromise
}

// Equivale al <div class="g-recaptcha" data-sitekey data-action> de la documentación,
// renderizado explícitamente porque el formulario se monta dinámicamente en React.
// ref.getToken() devuelve el token (vence a los 2 min); ref.reset() lo reinicia.
const RecaptchaWidget = forwardRef(function RecaptchaWidget({ action = 'LOGIN', onChange }, ref) {
  const contenedor = useRef(null)
  const widgetId = useRef(null)

  useImperativeHandle(ref, () => ({
    getToken: () => (widgetId.current === null ? '' : window.grecaptcha.enterprise.getResponse(widgetId.current)),
    reset: () => {
      if (widgetId.current !== null) window.grecaptcha.enterprise.reset(widgetId.current)
      onChange?.('')
    },
  }))

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelado = false
    cargarScript().then(() => {
      if (cancelado || !contenedor.current || widgetId.current !== null) return
      widgetId.current = window.grecaptcha.enterprise.render(contenedor.current, {
        sitekey: SITE_KEY,
        action,
        callback: (token) => onChange?.(token),
        'expired-callback': () => onChange?.(''),
        'error-callback': () => onChange?.(''),
      })
    }).catch(() => {})
    return () => { cancelado = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action])

  if (!SITE_KEY) return null
  return <div ref={contenedor} className="g-recaptcha" data-sitekey={SITE_KEY} data-action={action} />
})

export const recaptchaConfigurado = Boolean(SITE_KEY)
export default RecaptchaWidget

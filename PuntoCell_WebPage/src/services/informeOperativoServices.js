// GET /api/auditoria/informe-operativo?desde=&hasta= — solo lectura, exclusivo del rol analista.
import { fetchApi } from './api'

export const informeOperativoService = {
  get: async ({ desde, hasta } = {}) => {
    const qs = new URLSearchParams()
    if (desde) qs.set('desde', new Date(desde).toISOString())
    if (hasta) qs.set('hasta', new Date(hasta).toISOString())
    const res = await fetchApi(`/auditoria/informe-operativo${qs.toString() ? `?${qs}` : ''}`)
    return res?.data ?? null
  },
}

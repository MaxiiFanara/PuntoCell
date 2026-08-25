import { useState, useEffect, useCallback } from 'react'
import {
  getMarcasReparadas,
  getDispositivosReparados,
  getRepuestosUsados,
  getFallasRepetidas,
  getFinanzasResumen,
} from '../services/api'

export const useEstadisticas = () => {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const [marcas, dispositivos, repuestos, fallas, resumen] = await Promise.all([
        getMarcasReparadas(),
        getDispositivosReparados(),
        getRepuestosUsados(),
        getFallasRepetidas(),
        getFinanzasResumen(),
      ])

      const finanzas = resumen
        ? {
            TotalIngresos: Number(resumen.TotalIngresos) || 0,
            TotalCostos:   Number(resumen.TotalCostos)   || 0,
            Ganancia:      Number(resumen.Ganancia)       || 0,
          }
        : null

      setData({ marcas, dispositivos, repuestos, fallas, finanzas })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return { data, loading, error, recargar: cargar }
}

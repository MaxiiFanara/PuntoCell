import { useState, useEffect, useCallback } from 'react'
import { getOrdenes, anularOrden } from '../services/api'

export const useOrdenes = () => {
  const [ordenes, setOrdenes]               = useState([])
  const [metricas, setMetricas]             = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)

  const [filtros, setFiltros] = useState({
    estado:     null,
    busqueda:   '',
    empleadoId: null,
  })

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getOrdenes()
      setOrdenes(data)
      // Métricas calculadas client-side desde las órdenes reales
      // (comparación case-insensitive: el backend puede devolver "en espera", "En Espera", etc.)
      const esEstado = (o, nombre) => o.Estado?.toLowerCase() === nombre.toLowerCase()
      setMetricas({
        // Activas = solo en espera + en reparación (no incluye terminado/entregado/anulado)
        ordenesActivas: data.filter(o => esEstado(o, 'en espera') || esEstado(o, 'en reparación')).length,
        enEspera:       data.filter(o => esEstado(o, 'en espera')).length,
        enReparacion:   data.filter(o => esEstado(o, 'en reparación')).length,
        terminado:      data.filter(o => esEstado(o, 'terminado')).length,
        entregado:      data.filter(o => esEstado(o, 'entregado')).length,
        anulado:        data.filter(o => esEstado(o, 'anulado')).length,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ─── Filtrado derivado ───────────────────────────────────────────────────────
  const ordenesFiltradas = ordenes.filter((o) => {
    if (filtros.estado === null && o.Estado?.toLowerCase() === 'anulado') return false
    if (filtros.estado && filtros.estado !== 'todos') {
      if (o.Estado?.toLowerCase() !== filtros.estado.toLowerCase()) return false
    }
    if (filtros.empleadoId) {
      if (o.IdEmpleado !== filtros.empleadoId) return false
    }
    if (filtros.busqueda.trim()) {
      const term = filtros.busqueda.toLowerCase()
      const campos = [
        o.NombreCliente, o.ApellidoCliente, o.TipoDispositivo,
        o.MarcaDispositivo, o.ModeloDispositivo, o.Falla,
        o.Estado, o.NombreEmpleado, o.ApellidoEmpleado,
        o.NumOrden?.toString(),
      ]
      if (!campos.some((c) => c?.toLowerCase().includes(term))) return false
    }
    return true
  })

  const handleAnular = async (numOrden) => {
    await anularOrden(numOrden)
    await cargar()
  }

  return {
    ordenes: ordenesFiltradas,
    metricas,
    loading,
    error,
    filtros,
    setFiltros,
    ordenSeleccionada,
    setOrdenSeleccionada,
    recargar: cargar,
    handleAnular,
  }
}

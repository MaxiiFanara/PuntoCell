import { useState, useEffect, useCallback } from 'react'
import { getOrdenes, anularOrden } from '../services/api'

export const useOrdenes = () => {
  const [ordenes, setOrdenes]               = useState([])
  const [metricas, setMetricas]             = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)

  // 1. Agregamos las fechas al estado inicial
  const [filtros, setFiltros] = useState({
    estado:     null,
    busqueda:   '',
    empleadoId: null,
    fechaDesde: null,
    fechaHasta: null,
  })

  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getOrdenes()
      setOrdenes(data)
      const esEstado = (o, nombre) => o.Estado?.toLowerCase() === nombre.toLowerCase()
      setMetricas({
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
    // Filtro por Estado
    if (filtros.estado === null && o.Estado?.toLowerCase() === 'anulado') return false
    if (filtros.estado && filtros.estado !== 'todos') {
      if (o.Estado?.toLowerCase() !== filtros.estado.toLowerCase()) return false
    }
    
    // Filtro por Empleado
    if (filtros.empleadoId) {
      if (o.IdEmpleado !== filtros.empleadoId) return false
    }

    // 2. NUEVO: Filtro por Fechas
    if (filtros.fechaDesde || filtros.fechaHasta) {
      // Tomamos la fecha de la orden (puedes ajustarlo si tu propiedad se llama distinto, ej: FechaCreacion)
      const fechaOrden = new Date(o.FechaEmision)
      
      if (filtros.fechaDesde) {
        // Convertimos el objeto de Day.js (que manda el DatePicker) a fecha nativa, a las 00:00
        const desde = filtros.fechaDesde.toDate ? filtros.fechaDesde.toDate() : new Date(filtros.fechaDesde)
        desde.setHours(0, 0, 0, 0)
        if (fechaOrden < desde) return false
      }
      
      if (filtros.fechaHasta) {
        // Convertimos a fecha nativa, a las 23:59:59 para incluir todo el día final
        const hasta = filtros.fechaHasta.toDate ? filtros.fechaHasta.toDate() : new Date(filtros.fechaHasta)
        hasta.setHours(23, 59, 59, 999)
        if (fechaOrden > hasta) return false
      }
    }

    // Filtro por Búsqueda de texto
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
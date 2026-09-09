import { useState, useEffect, useCallback } from 'react'
import {
  getLocalidades,
  getTiposDispositivo,
  getMarcas,
  getModelos,
  getEstadosOrden,
  getEmpleados,
} from '../services/api'

export const useCatalogos = () => {
  const [catalogos, setCatalogos] = useState({
    localidades: [],
    tipos: [],
    marcas: [],
    modelos: [],
    estados: [],
    empleados: [],
  })
  const [loading, setLoading] = useState(true)
  const [trigger, setTrigger] = useState(0)

  const recargar = useCallback(() => setTrigger(t => t + 1), [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getLocalidades(),
      getTiposDispositivo(),
      getMarcas(),
      getModelos(),
      getEstadosOrden(),
      getEmpleados(),
    ]).then(([localidades, tipos, marcas, modelos, estados, empleados]) => {
      setCatalogos({ localidades, tipos, marcas, modelos, estados, empleados })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [trigger])

  // Con idTipo: solo las marcas que ya tienen algún modelo cargado en esa categoría
  // (evita elegir "Notebook Motorola" al registrar una orden). Sin idTipo: catálogo
  // completo — lo usa el alta de dispositivo nuevo (ModalRegistroDispositivo), que
  // necesita poder elegir cualquier marca para cargar el primer modelo de una
  // categoría nueva. Siempre ordenado alfabéticamente.
  const marcasPorTipo = (idTipo) => {
    const marcas = idTipo
      ? catalogos.marcas.filter(ma => catalogos.modelos.some(m => m.idTipo === idTipo && m.idMarca === ma.id))
      : catalogos.marcas
    return [...marcas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }

  // Modelos disponibles para un tipo y marca dados
  const dispositivosPorTipoYMarca = (idTipo, idMarca) =>
    catalogos.modelos.filter(m => m.idTipo === idTipo && m.idMarca === idMarca)

  return {
    localidades: catalogos.localidades,
    tipos:       catalogos.tipos,
    marcas:      catalogos.marcas,
    modelos:     catalogos.modelos,
    estados:     catalogos.estados,
    empleados:   catalogos.empleados,
    loading,
    recargar,
    marcasPorTipo,
    dispositivosPorTipoYMarca,
  }
}

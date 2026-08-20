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

  // Devuelve siempre el catálogo completo de marcas. Antes se derivaban las marcas
  // "disponibles" a partir de los modelos YA cargados para ese tipo — lo cual es un
  // problema de huevo y gallina: para cargar el primer modelo de una categoría (ej.
  // Notebook) hace falta elegir una marca, pero no aparecía ninguna marca porque
  // todavía no existía ningún modelo Notebook del que derivarla. Además, en la base
  // MarcaProducto no tiene ninguna relación con CategoriaProducto (es un catálogo
  // genérico: Apple, Samsung, Lenovo...), así que filtrar por tipo nunca tuvo sustento
  // real en el esquema. Se mantiene el parámetro idTipo para no romper la firma.
  const marcasPorTipo = () => catalogos.marcas

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

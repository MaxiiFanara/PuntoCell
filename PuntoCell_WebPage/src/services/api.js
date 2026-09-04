import { mapVigentePorInventario, precioVigenteEntreListas, idsListasMayoristas, preciosService } from './preciosServices'

export const API_URL = 'http://localhost:3000/api'

// Fetch para rutas protegidas
export const fetchApi = async (endpoint, options = {}) => {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })

  if (res.status === 401) {
    localStorage.removeItem('pc_usuario')
    window.location.href = '/login'
    return
  }

  if (!res.ok) {
    let message
    try {
      const data = await res.json()
      // validateFields (Joi) devuelve { errors: [...] }, no { message }
      message = data.message || (Array.isArray(data.errors) ? data.errors.join(' | ') : null) || `Error ${res.status}`
    } catch {
      message = `Error ${res.status}`
    }
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return res.json()
}

// Auth

export const loginUsuario = async (identificador, pwd) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ Identificador: identificador, Pwd: pwd }),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || `Error ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const logoutUsuario = () =>
  fetchApi('/auth/logout', { method: 'POST' })

// Perfil plano que consume el front (AuthContext / LoginPage). El backend devuelve
// la fila cruda en PascalCase; acá la normalizamos a un único shape.
export const mapUsuario = (u) => ({
  userID:   u.Id,
  user:     `${u.Nombre ?? ''} ${u.Apellido ?? ''}`.trim() || u.UsuarioEmpleado,
  nombre:   `${u.Nombre ?? ''} ${u.Apellido ?? ''}`.trim() || u.UsuarioEmpleado,
  rol:      u.IdRol,
  sucursal: u.IdSucursal,
})

// GET /auth/me — devuelve el usuario si la cookie de sesión sigue viva, o null.
export const getSesionActual = async () => {
  try {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.user ?? null
  } catch {
    return null
  }
}

export const olvideMiContrasena = async (email) => {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Email: email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
  return data
}

export const resetearContrasena = async (token, nuevaContrasena) => {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Token: token, NewPassword: nuevaContrasena }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
  return data
}

// basic = item de getAll(); detalle = respuesta de getById(); tiposMap = { idCategoria: nombreTipo }
const normalizarOrden = (basic, detalle = null, tiposMap = {}) => ({
  NumOrden:          basic.Id,
  FechaEmision:      basic.FechaEmision ? String(basic.FechaEmision).split('T')[0] : null,
  FechaEntrega:      basic.FechaEntrega ? String(basic.FechaEntrega).split('T')[0] : null,
  IdEstadoOrden:     basic.IdEstadoOrden,
  Estado:            basic.estado?.Nombre ?? '',
  NombreEmpleado:    basic.empleado?.Nombre ?? '',
  ApellidoEmpleado:  basic.empleado?.Apellido ?? '',
  IdEmpleado:        basic.IdEmpleado,
  ModeloDispositivo: detalle?.dispositivo?.modelo?.Nombre ?? basic.dispositivo?.modelo?.Nombre ?? '',
  MarcaDispositivo:  detalle?.dispositivo?.modelo?.marca?.Nombre ?? '',
  TipoDispositivo:   tiposMap[detalle?.dispositivo?.modelo?.IdCategoriaArticulo] ?? '',
  NombreCliente:     detalle?.dispositivo?.cliente?.Nombre ?? '',
  ApellidoCliente:   detalle?.dispositivo?.cliente?.Apellido ?? '',
  DNICliente:        detalle?.dispositivo?.cliente?.DNI ?? '',
  EmailCliente:      detalle?.dispositivo?.cliente?.Email ?? '',
  CelularCliente:    detalle?.dispositivo?.cliente?.Celular ?? '',
  Fallas:            (detalle?.fallas ?? []).map(f => f.Nombre),
  Falla:             detalle?.fallas?.[0]?.Nombre ?? '',
})

// Órdenes

export const getOrdenes = async () => {
  const listRes = await fetchApi('/reparaciones/ordenes-reparacion')
  const basicItems = listRes?.data ?? []

  const detalles = await Promise.all(
    basicItems.map(item =>
      fetchApi(`/reparaciones/ordenes-reparacion/${item.Id}`)
        .then(r => r?.data ?? null)
        .catch(() => null)
    )
  )

  const idCategorias = [...new Set(
    detalles.map(d => d?.dispositivo?.modelo?.IdCategoriaArticulo).filter(Boolean)
  )]
  const categoriasRes = await Promise.all(
    idCategorias.map(id =>
      fetchApi(`/inventario/categoria-articulos/${id}`)
        .then(r => [id, r?.data?.Nombre ?? ''])
        .catch(() => [id, ''])
    )
  )
  const tiposMap = Object.fromEntries(categoriasRes)

  return basicItems.map((basic, i) => normalizarOrden(basic, detalles[i], tiposMap))
}

export const crearOrden = (datos) =>
  fetchApi('/reparaciones/ordenes-reparacion', {
    method: 'POST',
    body: JSON.stringify(datos),
  })

export const actualizarOrden = (id, datos) =>
  fetchApi(`/reparaciones/ordenes-reparacion/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })

export const anularOrden = (id) =>
  fetchApi(`/reparaciones/ordenes-reparacion/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ IdEstadoOrden: 5 }),
  })

// Fallas

export const getFallasPorTipo = async (idTipo) => {
  const res = await fetchApi(`/reparaciones/fallas/por-categoria/${idTipo}`)
  return (res?.data ?? []).map(f => ({ id: f.Id, nombre: f.Nombre }))
}

// Solo Admin/Encargado (el backend exige isAdmin en POST /reparaciones/fallas).
export const crearFalla = (idCategoriaArticulo, nombre) =>
  fetchApi('/reparaciones/fallas', {
    method: 'POST',
    body: JSON.stringify({ Nombre: nombre, IdCategoriaArticulo: idCategoriaArticulo }),
  })

// Reparaciones solo cobra en efectivo/transferencia (Ventas acepta todo el catálogo).
// Se filtra sobre el catálogo real en vez de hardcodear IDs.
export const getMetodosPagoReparacion = async () => {
  const res = await fetchApi('/finanzas/metodo-pagos')
  const lista = res?.data ?? res ?? []
  return lista
    .filter(m => /efectivo|transferencia/i.test(m.Nombre ?? m.nombre ?? ''))
    .map(m => ({ id: m.Id ?? m.id, nombre: m.Nombre ?? m.nombre }))
}

// Catálogos

export const getLocalidades = async () => {
  const res = await fetchApi('/usuarios/localidades')
  return (res?.data ?? []).map(l => ({ id: l.Id ?? l.id, nombre: l.Nombre }))
}

export const getEstadosOrden = async () => {
  const res = await fetchApi('/reparaciones/estados-orden')
  return (res?.data ?? []).map(e => ({ id: e.Id ?? e.id, nombre: e.Nombre }))
}

export const getTiposDispositivo = async () => {
  const res = await fetchApi('/inventario/categoria-articulos')
  return (res?.data ?? [])
    .filter(c => c.EsDispositivo === true || c.EsDispositivo === 1)
    .map(c => ({ id: Number(c.Id), nombre: c.Nombre }))
}

export const getMarcas = async () => {
  const res = await fetchApi('/inventario/marca-articulos')
  return (res?.data ?? []).map(m => ({ id: Number(m.Id), nombre: m.Nombre }))
}

export const getModelos = async () => {
  const res = await fetchApi('/inventario/modelo-articulos')
  return (res?.data ?? []).map(m => ({
    id:      Number(m.Id),
    nombre:  m.Nombre,
    idMarca: Number(m.IdMarcaArticulo),
    idTipo:  Number(m.IdCategoriaArticulo),
  }))
}

export const getEmpleados = async () => {
  try {
    const res = await fetchApi('/usuarios/')
    return (res?.data ?? [])
      .filter(u => u.EsCliente === false || u.EsCliente === 0)
      .map(u => ({ id: u.Id, nombre: u.Nombre, apellido: u.Apellido }))
  } catch (err) {
    if (err.status === 403) return []
    throw err
  }
}

// Dispositivos

export const crearDispositivo = (datos) =>
  fetchApi('/reparaciones/dispositivos-cliente', {
    method: 'POST',
    body: JSON.stringify(datos),
  })

// Modelos

export const crearModeloArticulo = (datos) =>
  fetchApi('/inventario/modelo-articulos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })

// Clientes
export const getClienteByDNI = async (dni) => {
  try {
    const res = await fetchApi(`/usuarios?DNI=${encodeURIComponent(dni)}`)
    const todos = res?.data ?? []
    return todos.find(u => Boolean(u.EsCliente) && String(u.DNI) === String(dni)) ?? null
  } catch (err) {
    if (err.status === 403) return null
    throw err
  }
}

export const crearCliente = (datos) =>
  fetchApi('/usuarios/', {
    method: 'POST',
    body: JSON.stringify({ ...datos, EsCliente: true }),
  })

// Orden — detalle completo
export const getOrdenById = async (id) => {
  const res = await fetchApi(`/reparaciones/ordenes-reparacion/${id}`)
  return res?.data ?? null
}

// Repuestos de orden
// El precio ya no vive en Inventario: se resuelve del PrecioArticulo vigente
// (cualquier lista) mergeando client-side. El backend exige que el repuesto tenga
// un precio vigente para agregarlo a la orden, así que descartamos los que no lo tienen
// (marcándolos con sinPrecio para poder avisar en la UI).
export const getRepuestosDisponibles = async () => {
  const [res, preciosRes, listas] = await Promise.all([
    fetchApi('/reparaciones/inventario/repuestos-disponibles'),
    fetchApi('/precios/precios-articulos').catch(() => ({ data: [] })),
    preciosService.getListas().catch(() => []),
  ])
  const precios = Array.isArray(preciosRes?.data) ? preciosRes.data : (preciosRes ?? [])
  const mapa = mapVigentePorInventario(precios)
  // El repuesto se carga siempre al precio minorista (regla de negocio: mayorista solo
  // aplica con un selector explícito, que este flujo todavía no tiene).
  const listasMayoristas = idsListasMayoristas(listas)
  return (res?.data ?? []).map(item => {
    const idInv = item.id ?? item.Id
    const p = precioVigenteEntreListas(mapa, idInv, { excluir: listasMayoristas })
      || precioVigenteEntreListas(mapa, idInv) // fallback si solo hay precio en lista mayorista
    return {
      id:       idInv,
      nombre:   item.articulo?.Nombre ?? '',
      stock:    item.Stock ?? 0,
      precio:   p ? Number(p.ValorFinal) || 0 : 0,
      sinPrecio: !p,
      marca:    item.articulo?.modelo?.marca?.Nombre ?? '',
      modelo:   item.articulo?.modelo?.Nombre ?? '',
    }
  })
}

export const agregarRepuestoOrden = (datos) =>
  fetchApi('/reparaciones/repuestos-orden', {
    method: 'POST',
    body: JSON.stringify(datos),
  })

export const eliminarRepuestoOrden = (id) =>
  fetchApi(`/reparaciones/repuestos-orden/${id}`, { method: 'DELETE' })

export const enviarComprobanteEmail = (idOrden, pdfBase64) =>
  fetchApi(`/reparaciones/ordenes-reparacion/${idOrden}/testemail`, {
    method: 'POST',
    body: JSON.stringify({ pdfBase64 }),
  })

export const getPagosOrden = async (idOrden) => {
  const res = await fetchApi('/reparaciones/pagos-reparacion')
  const todos = res?.data ?? []
  return todos.filter(p => p.IdOrdenReparacion === idOrden)
}

// Estadísticas

export const getMarcasReparadas = async (limit) => {
  const qs = limit !== undefined ? `?limit=${limit}` : ''
  const res = await fetchApi(`/estadisticas/marca-mas-reparada${qs}`)
  return res?.data ?? []
}

export const getDispositivosReparados = async (limit) => {
  const qs = limit !== undefined ? `?limit=${limit}` : ''
  const res = await fetchApi(`/estadisticas/dispositivo-mas-reparado${qs}`)
  return res?.data ?? []
}

export const getRepuestosUsados = async (limit) => {
  const qs = limit !== undefined ? `?limit=${limit}` : ''
  const res = await fetchApi(`/estadisticas/repuesto-mas-usado${qs}`)
  return res?.data ?? []
}

export const getFallasRepetidas = async (limit) => {
  const qs = limit !== undefined ? `?limit=${limit}` : ''
  const res = await fetchApi(`/estadisticas/falla-mas-repetida${qs}`)
  return res?.data ?? []
}

export const getFinanzasResumen = async () => {
  const res = await fetchApi('/estadisticas/finanzas')
  return res?.data ?? null
}

export const getDashboardMetricas = async () => {
  const res = await fetchApi('/estadisticas/dashboard')
  return res?.data ?? null
}

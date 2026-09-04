import { fetchApi } from './api';

export const inventarioService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchApi(`/inventario/inventarios?${query}`);
    // El controlador envía { data: [...] }
    return response?.data || response || [];
  },

  getById: async (id) => {
    const response = await fetchApi(`/inventario/inventarios/${id}`);
    return response?.data || response;
  },

  // Búsqueda exacta por IMEI: la usan la validación de duplicados y la búsqueda en Punto de Venta
  buscarPorIMEI: async (imei, { excluirId } = {}) => {
    if (!imei) return null;
    const response = await fetchApi(`/inventario/inventarios?IMEI=${encodeURIComponent(imei)}`);
    const items = response?.data || response || [];
    const lista = Array.isArray(items) ? items : [];
    const otros = excluirId ? lista.filter((it) => String(it.Id ?? it.id) !== String(excluirId)) : lista;
    return otros[0] || null;
  },

  getModelos: async () => {
    const response = await fetchApi('/inventario/modelo-articulos');
    return response?.data || response || [];
  },

  // EsDispositivo indica si la categoría requiere IMEI (equipo) o no (accesorio/repuesto)
  getCategorias: async () => {
    const response = await fetchApi('/inventario/categoria-articulos');
    return response?.data || response || [];
  },

  createArticulo: async (data) => {
    return await fetchApi('/inventario/articulos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  create: async (data) => {
    return await fetchApi('/inventario/inventarios', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  ejecutarTraspaso: async (payload) => {
    return await fetchApi('/inventario/transferencias/ejecutar', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  update: async (id, data) => {
    return await fetchApi(`/inventario/inventarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  updateArticulo: async (id, data) => {
    return await fetchApi(`/inventario/articulos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  delete: async (id) => {
    return await fetchApi(`/inventario/inventarios/${id}`, {
      method: 'DELETE'
    });
  },

  getColores: async () => {
    const response = await fetchApi('/inventario/colores');
    return response?.data || response || [];
  },

  getMemorias: async () => {
    const response = await fetchApi('/inventario/memorias');
    return response?.data || response || [];
  },

  getBaterias: async () => {
    const response = await fetchApi('/inventario/baterias');
    return response?.data || response || [];
  },

  getEstadosInventario: async () => {
    const response = await fetchApi('/inventario/estado-inventarios');
    return response?.data || response || [];
  },

  getSucursales: async () => {
    const response = await fetchApi('/usuarios/sucursales');
    return response?.data || response || [];
  },

  getProveedores: async () => {
    const response = await fetchApi('/compras/proveedores');
    return response?.data || response || [];
  },

  crearProveedor: async (data) => {
    const response = await fetchApi('/compras/proveedores', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response?.data || response;
  },

  // Proveedor placeholder para altas por canje (Inventario exige un proveedor). Se crea una
  // sola vez y se reutiliza.
  obtenerOCrearProveedorCanje: async () => {
    const proveedores = await inventarioService.getProveedores();
    const existente = proveedores.find(p => (p.Nombre || '').trim().toLowerCase() === 'canje de clientes');
    if (existente) return existente.Id || existente.id;
    // Email fijo: la columna es UNIQUE y rechaza un segundo proveedor con Email nulo
    const nuevo = await inventarioService.crearProveedor({ Nombre: 'Canje de Clientes', Email: 'canje@puntocell.com.ar' });
    return nuevo.Id || nuevo.id;
  },

  // Alta completa: crea el Articulo (specs genéricas) y luego el Inventario (unidad física)
  // que lo referencia. Compartido entre "Nuevo Ingreso" y el alta por canje en Punto de Venta.
  crearIngresoCompleto: async (formData) => {
    // Canje entra sin precio de venta: no es vendible hasta que se le fije precio manualmente
    const payloadArticulo = {
      Nombre: formData.nombreModelo || "Equipo genérico",
      EsSerializado: formData.esSerializado,
      EsVendible: !formData.modoCanje,
      EsRepuesto: !formData.esSerializado,
      Activo: true,
      IdModeloArticulo: Number(formData.idModeloArticulo)
    };

    const resArticulo = await inventarioService.createArticulo(payloadArticulo);
    const idArticuloNuevo = resArticulo.data?.Id || resArticulo.Id || resArticulo.data?.id || resArticulo.id;

    if (!idArticuloNuevo) throw new Error("El backend no devolvió el ID del nuevo artículo creado.");

    const payloadInventario = {
      IdArticulo: idArticuloNuevo,
      IdSucursal: Number(formData.idSucursal) || 1,
      IdProveedor: formData.idProveedor ? Number(formData.idProveedor) : null,
      Stock: Number(formData.stock) || 1,
      IdEstadoInventario: formData.idEstadoInventario ? Number(formData.idEstadoInventario) : 1,
      PrecioCosto: formData.precioCosto !== "" ? Number(formData.precioCosto) : 0,
      PrecioMayor: formData.precioMayor !== "" ? Number(formData.precioMayor) : null,
      PrecioMenor: formData.precioMenor !== "" ? Number(formData.precioMenor) : null,
      IMEI: formData.esSerializado && formData.imei ? String(formData.imei).trim() : null,
      IdColor: formData.idColor ? Number(formData.idColor) : null,
      IdMemoria: formData.idMemoria ? Number(formData.idMemoria) : null,
      IdBateria: formData.idBateria ? Number(formData.idBateria) : null,
      Observaciones: formData.observaciones ? formData.observaciones : null,
      MesesGarantiaLocal: formData.mesesGarantiaLocal || new Date().toISOString(),
      CreatedAt: new Date().toISOString()
    };

    const resInventario = await inventarioService.create(payloadInventario);
    return resInventario?.data || resInventario;
  }
};

import { fetchApi } from './api';
import { preciosService, mapVigentePorInventario, valorFinalVigente, LISTA_MINORISTA_ID } from './preciosServices';

export const inventarioService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchApi(`/inventario/inventarios?${query}`);
    // El controlador envía { data: [...] }
    return response?.data || response || [];
  },

  // Inventario + precio de venta vigente ya resuelto. El modelo nuevo no trae el
  // precio en /inventario/inventarios, así que hacemos 1 request extra a
  // /precios/precios-articulos y lo mergeamos client-side.
  //   { ...fila, PrecioVenta, PrecioMinorista, PrecioMayorista, precios: {mapa por lista} }
  getConPrecios: async (params = {}, { idListaMayorista } = {}) => {
    const [items, preciosArticulos] = await Promise.all([
      inventarioService.getAll(params),
      preciosService.getPreciosArticulos(),
    ]);
    const mapa = mapVigentePorInventario(preciosArticulos);
    const lista = Array.isArray(items) ? items : (items?.data || []);
    return lista.map((fila) => {
      const id = fila.Id ?? fila.id;
      const minorista = valorFinalVigente(mapa, id, LISTA_MINORISTA_ID);
      const mayorista = idListaMayorista
        ? valorFinalVigente(mapa, id, idListaMayorista) || minorista
        : minorista;
      return {
        ...fila,
        precios: mapa[id] || {},
        PrecioMinorista: minorista,
        PrecioMayorista: mayorista,
        PrecioVenta: minorista,
      };
    });
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

  // Alta de un equipo recibido en canje desde el Punto de Venta (ModalCobro).
  // Crea el Articulo (specs genéricas) y el Inventario que lo referencia.
  // NO carga precio: el equipo de canje entra NO vendible y se le fija precio
  // después desde la pantalla de Precios (modelo nuevo: ListaPrecio + PrecioArticulo).
  crearIngresoCompleto: async (formData) => {
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

    // IdProveedor es NOT NULL. En canje usamos el proveedor placeholder "Canje de Clientes".
    const idProveedor = formData.idProveedor
      ? Number(formData.idProveedor)
      : await inventarioService.obtenerOCrearProveedorCanje();

    const payloadInventario = {
      IdArticulo: idArticuloNuevo,
      IdSucursal: Number(formData.idSucursal) || 1,
      IdProveedor: idProveedor,
      Stock: Number(formData.stock) || 1,
      IdEstadoInventario: formData.idEstadoInventario ? Number(formData.idEstadoInventario) : 1,
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

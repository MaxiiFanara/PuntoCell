// ============================================================
//  CAPA DE SERVICIOS – USUARIOS/EMPLEADOS (Admin)
// ============================================================

import { fetchApi } from './api';

export const usuariosService = {
  // Solo empleados (EsCliente = false). El backend ya filtra Activo = true.
  getAll: async () => {
    const response = await fetchApi('/usuarios/');
    const data = response?.data || response || [];
    return data.filter((u) => u.EsCliente === false || u.EsCliente === 0);
  },

  getById: async (id) => {
    const response = await fetchApi(`/usuarios/${id}`);
    return response?.data || response;
  },

  create: async (data) => {
    const response = await fetchApi('/usuarios/', {
      method: 'POST',
      body: JSON.stringify({ ...data, EsCliente: false }),
    });
    return response?.data || response;
  },

  update: async (id, data) => {
    const response = await fetchApi(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response?.data || response;
  },

  // Baja lógica (el backend marca Activo = false, no borra el registro).
  delete: async (id) => {
    return await fetchApi(`/usuarios/${id}`, { method: 'DELETE' });
  },

  getRoles: async () => {
    const response = await fetchApi('/usuarios/roles');
    return response?.data || response || [];
  },

  getSucursales: async () => {
    const response = await fetchApi('/usuarios/sucursales');
    return response?.data || response || [];
  },
};

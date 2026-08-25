import { fetchApi } from './api';

export const clientesService = {
  buscarPorDni: async (dni) => {
    try {
      const res = await fetchApi(`/usuarios?DNI=${encodeURIComponent(dni)}`);
      const todos = res?.data ?? res ?? [];

      return todos.find(u => Boolean(u.EsCliente) && String(u.DNI) === String(dni)) ?? null;
    } catch (err) {
      if (err.status === 403) return null;
      throw err;
    }
  },

  // Distingue "DNI libre" de "DNI ocupado por un empleado" (DNI es UNIQUE en toda la tabla
  // Usuario) antes de ofrecer el alta como cliente nuevo — ver ClienteSection.jsx.
  existeComoNoCliente: async (dni) => {
    try {
      const res = await fetchApi(`/usuarios?DNI=${encodeURIComponent(dni)}`);
      const todos = res?.data ?? res ?? [];
      return todos.find(u => !u.EsCliente && String(u.DNI) === String(dni)) ?? null;
    } catch (err) {
      if (err.status === 403) return null;
      throw err;
    }
  },

  create: async (datosCliente) => {
    const payload = {
      ...datosCliente,
      EsCliente: true,
      IdRol: 3
    };

    const response = await fetchApi('/usuarios/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return response?.data || response;
  }
};

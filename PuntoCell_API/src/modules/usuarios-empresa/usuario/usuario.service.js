import { hashPassword } from '../../../core/utils/bcrypt.js';
import { models } from '../../../models/index.js';

export default class UsuarioService {
  constructor(usuarioDAO, notificacionService) {
    this.usuarioDAO = usuarioDAO;
    this.notificacionService = notificacionService;
    this.ATTRIBUTES = { exclude: ['Pwd'] };
  }

  async #validarRelaciones(data) {
    if (data.IdRol) {
      const rol = await models.Rol.findByPk(data.IdRol);
      if (!rol) {
        const err = new Error('El Rol especificado no existe en el sistema.');
        err.statusCode = 400;
        throw err;
      }
    }
    if (data.IdSucursal) {
      const sucursal = await models.Sucursal.findByPk(data.IdSucursal);
      if (!sucursal) {
        const err = new Error('La Sucursal especificada no existe en el sistema.');
        err.statusCode = 400;
        throw err;
      }
    }
    if (data.IdLocalidad) {
      const localidad = await models.Localidad.findByPk(data.IdLocalidad);
      if (!localidad) {
        const err = new Error('La Localidad especificada no existe en el sistema.');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  async #validarEmailUnico(email, excludeId = null) {
    const existe = await this.usuarioDAO.findOne({ where: { Email: email } });
    if (existe && existe.Id !== excludeId) throw new Error('El correo electrónico ya está registrado');
  }

  async #validarDNIUnico(dni, excludeId = null) {
    if (!dni) return;
    const existe = await this.usuarioDAO.findOne({ where: { DNI: dni } });
    if (existe && existe.Id !== excludeId) throw new Error('El DNI ya está registrado');
  }

  #generarPasswordAleatoria(longitud = 8) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < longitud; i++) {
      password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return password;
  }

  async #generarUsuarioEmpleado(nombre, apellido) {
    const cleanNombre = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const cleanApellido = apellido.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const baseUsuario = `${cleanNombre.charAt(0)}${cleanApellido.replace(/\s+/g, '')}`;

    let usuarioGenerado = baseUsuario;
    let contador = 1;

    while (true) {
      const existe = await this.usuarioDAO.findOne({ where: { UsuarioEmpleado: usuarioGenerado } });
      if (!existe) break;
      usuarioGenerado = `${baseUsuario}${contador}`;
      contador++;
    }

    return usuarioGenerado;
  }

  async getAll(query = {}) {
    // DNI/EsCliente llegan por query string (ej. la búsqueda de cliente del Punto de Venta,
    // GET /usuarios?DNI=...) — antes se ignoraban acá y el filtrado quedaba 100% del lado del
    // frontend, trayendo TODOS los usuarios activos. Se filtra en el servidor para que la
    // búsqueda sea explícita y consistente con lo que realmente hay en la base.
    const { page, limit, DNI, EsCliente } = query;
    const where = { Activo: true };
    if (DNI) where.DNI = String(DNI);
    if (EsCliente !== undefined) where.EsCliente = EsCliente === true || EsCliente === 'true' || EsCliente === '1';

    return await this.usuarioDAO.getAll({
      page,
      limit,
      where,
      attributes: this.ATTRIBUTES
    });
  }

  async getById(id) {
    const usuario = await this.usuarioDAO.getById(id, {
      attributes: this.ATTRIBUTES
    });
    if (!usuario) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return usuario;
  }

  async create(data) {
    await this.#validarRelaciones(data);
    await this.#validarEmailUnico(data.Email);
    if (data.DNI) await this.#validarDNIUnico(data.DNI);

    const esCliente = Boolean(data.EsCliente);

    if (esCliente) {
      const creado = await this.usuarioDAO.create({ ...data, Pwd: null, UsuarioEmpleado: null });
      const { Pwd, ...resultado } = creado.toJSON();
      return resultado;
    }

    const usuarioEmpleado = await this.#generarUsuarioEmpleado(data.Nombre, data.Apellido);
    const passwordAleatoria = this.#generarPasswordAleatoria(8);
    const hashedPwd = await hashPassword(passwordAleatoria);

    const creado = await this.usuarioDAO.create({
      ...data,
      Pwd: hashedPwd,
      UsuarioEmpleado: usuarioEmpleado
    });

    await this.notificacionService.enviarPasswordEmpleado(
      creado.Email,
      creado.Nombre,
      usuarioEmpleado,
      passwordAleatoria
    );

    const { Pwd, ...resultado } = creado.toJSON();
    return resultado;
  }

  async update(id, data) {
    const usuario = await this.usuarioDAO.getById(id);
    if (!usuario) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }

    await this.#validarRelaciones(data);
    if (data.Email) await this.#validarEmailUnico(data.Email, parseInt(id));
    if (data.DNI) await this.#validarDNIUnico(data.DNI, parseInt(id));
    if (data.Pwd) data.Pwd = await hashPassword(data.Pwd);

    const actualizado = await this.usuarioDAO.update(id, data);
    const { Pwd, ...resultado } = actualizado.toJSON();
    return resultado;
  }

  async delete(id) {
    const actualizado = await this.usuarioDAO.update(id, { Activo: false });
    if (!actualizado) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      throw err;
    }
    return true;
  }
}
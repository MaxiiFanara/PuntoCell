import { Op } from 'sequelize';
import { ROL_ANALISTA } from '../../../core/constants/roles.js';
import { hashPassword } from '../../../core/utils/bcrypt.js';
import { models } from '../../../models/index.js';
import { registerAudit } from '../../../core/utils/audit.util.js';

export default class UsuarioService {
  constructor(usuarioDAO, notificacionService, bitacoraService = null) {
    this.usuarioDAO = usuarioDAO;
    this.notificacionService = notificacionService;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = { exclude: ['Pwd'] };
  }

  async #validarRelaciones(data, auditContext = {}) {
    if (data.IdRol) {
      const rol = await models.Rol.findByPk(data.IdRol);
      // El rol analista es técnico y único: se da de alta solo por script, nunca desde la API
      if (!rol || rol.Id === ROL_ANALISTA) {
        const err = new Error('El Rol especificado no existe en el sistema.');
        err.statusCode = 400;
        try { await registerAudit(this.bitacoraService, { detalle: `Validación fallida al crear/actualizar usuario: Rol ${data.IdRol} inexistente`, Accion: 'Validar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
        throw err;
      }
    }
    if (data.IdSucursal) {
      const sucursal = await models.Sucursal.findByPk(data.IdSucursal);
      if (!sucursal) {
        const err = new Error('La Sucursal especificada no existe en el sistema.');
        err.statusCode = 400;
        try { await registerAudit(this.bitacoraService, { detalle: `Validación fallida al crear/actualizar usuario: Sucursal ${data.IdSucursal} inexistente`, Accion: 'Validar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
        throw err;
      }
    }
    if (data.IdLocalidad) {
      const localidad = await models.Localidad.findByPk(data.IdLocalidad);
      if (!localidad) {
        const err = new Error('La Localidad especificada no existe en el sistema.');
        err.statusCode = 400;
        try { await registerAudit(this.bitacoraService, { detalle: `Validación fallida al crear/actualizar usuario: Localidad ${data.IdLocalidad} inexistente`, Accion: 'Validar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
        throw err;
      }
    }
  }

  async #validarEmailUnico(email, excludeId = null, auditContext = {}) {
    const existe = await this.usuarioDAO.findOne({ where: { Email: email } });
    if (existe && existe.Id !== excludeId) {
      try { await registerAudit(this.bitacoraService, { detalle: `Validación fallida: Email ${email} ya registrado`, Accion: 'Validar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('El correo electrónico ya está registrado');
    }
  }

  async #validarDNIUnico(dni, excludeId = null, auditContext = {}) {
    if (!dni) return;
    const existe = await this.usuarioDAO.findOne({ where: { DNI: dni } });
    if (existe && existe.Id !== excludeId) {
      try { await registerAudit(this.bitacoraService, { detalle: `Validación fallida: DNI ${dni} ya registrado`, Accion: 'Validar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw new Error('El DNI ya está registrado');
    }
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
    // El usuario analista no se lista en ningún módulo (los clientes tienen IdRol NULL, de ahí el OR)
    const where = { Activo: true, IdRol: { [Op.or]: [{ [Op.is]: null }, { [Op.ne]: ROL_ANALISTA }] } };
    if (DNI) where.DNI = String(DNI);
    if (EsCliente !== undefined) where.EsCliente = EsCliente === true || EsCliente === 'true' || EsCliente === '1';

    return await this.usuarioDAO.getAll({
      page,
      limit,
      where,
      attributes: this.ATTRIBUTES
    });
  }

  async getById(id, auditContext = {}) {
    const usuario = await this.usuarioDAO.getById(id, {
      attributes: this.ATTRIBUTES
    });
    if (!usuario || usuario.IdRol === ROL_ANALISTA) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      try { await registerAudit(this.bitacoraService, { detalle: `Consulta de usuario fallida: Usuario ${id} no encontrado`, Accion: 'Consultar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw err;
    }
    return usuario;
  }

  async create(data, auditContext = {}) {
    await this.#validarRelaciones(data, auditContext);
    await this.#validarEmailUnico(data.Email, null, auditContext);
    if (data.DNI) await this.#validarDNIUnico(data.DNI, null, auditContext);

    const esCliente = Boolean(data.EsCliente);

    if (esCliente) {
      const creado = await this.usuarioDAO.create({ ...data, Pwd: null, UsuarioEmpleado: null });
      const { Pwd, ...resultado } = creado.toJSON();
      try { await registerAudit(this.bitacoraService, { detalle: `Registro de usuario cliente exitoso: ${resultado.Email}`, Accion: 'Registrar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
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
    try { await registerAudit(this.bitacoraService, { detalle: `Registro de usuario empleado exitoso: ${resultado.Email}`, Accion: 'Registrar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return resultado;
  }

  async update(id, data, auditContext = {}) {
    const usuario = await this.usuarioDAO.getById(id);
    if (!usuario || usuario.IdRol === ROL_ANALISTA) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      try { await registerAudit(this.bitacoraService, { detalle: `Modificación de usuario fallida: Usuario ${id} no encontrado`, Accion: 'Modificar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw err;
    }

    await this.#validarRelaciones(data, auditContext);
    if (data.Email) await this.#validarEmailUnico(data.Email, parseInt(id), auditContext);
    if (data.DNI) await this.#validarDNIUnico(data.DNI, parseInt(id), auditContext);
    if (data.Pwd) data.Pwd = await hashPassword(data.Pwd);

    const actualizado = await this.usuarioDAO.update(id, data);
    const { Pwd, ...resultado } = actualizado.toJSON();
    try { await registerAudit(this.bitacoraService, { detalle: `Modificación de usuario exitosa: Usuario ${id}`, Accion: 'Modificar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return resultado;
  }

  async delete(id, auditContext = {}) {
    const objetivo = await this.usuarioDAO.getById(id);
    const actualizado = objetivo?.IdRol === ROL_ANALISTA ? null : await this.usuarioDAO.update(id, { Activo: false });
    if (!actualizado) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      try { await registerAudit(this.bitacoraService, { detalle: `Eliminación de usuario fallida: Usuario ${id} no encontrado`, Accion: 'Eliminar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
      throw err;
    }
    try { await registerAudit(this.bitacoraService, { detalle: `Eliminación de usuario exitosa: Usuario ${id}`, Accion: 'Eliminar Usuario', IdEmpleado: auditContext?.IdEmpleado || null, IdSucursal: auditContext?.IdSucursal || null, IpAddress: auditContext?.IpAddress || null }); } catch(e){}
    return true;
  }
}
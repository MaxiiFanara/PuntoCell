import { Op } from 'sequelize';
import { comparePassword, hashPassword } from '../../core/utils/bcrypt.js';
import { generateToken, verifyToken } from '../../core/utils/jwt.util.js';
import { registerAudit } from '../../core/utils/audit.util.js';

export default class AuthService {
  constructor(usuarioDAO, notificacionService, bitacoraService = null) {
    this.usuarioDAO = usuarioDAO;
    this.notificacionService = notificacionService;
    this.bitacoraService = bitacoraService;
  }

  _nombreCompleto(user) {
    return `${user.Nombre ?? ''} ${user.Apellido ?? ''}`.trim() || user.UsuarioEmpleado || `Id ${user.Id}`;
  }

  async login(identificador, password, ctx = {}) {
    const user = await this.usuarioDAO.findOne({
      where: {
        [Op.or]: [
          { Email: identificador },
          { UsuarioEmpleado: identificador }
        ],
        EsCliente: false,
        Activo: true
      }
    });

    if (!user) {
      await registerAudit(this.bitacoraService, {
        Accion: `Login fallido: identificador "${identificador}" inexistente o inactivo`,
        detalle: `Intento de inicio de sesión rechazado (usuario no encontrado)`,
        IpAddress: ctx.Ip
      });
      throw new Error('Credenciales inválidas');
    }

    const isValidPassword = await comparePassword(password, user.Pwd);

    if (!isValidPassword) {
      await registerAudit(this.bitacoraService, {
        Accion: `Login fallido: contraseña incorrecta para ${this._nombreCompleto(user)}`,
        detalle: `Intento de inicio de sesión rechazado (contraseña incorrecta)`,
        IdEmpleado: user.Id,
        IdSucursal: user.IdSucursal,
        IpAddress: ctx.Ip
      });
      throw new Error('Credenciales inválidas');
    }

    const payload = { id: user.Id, rol: user.IdRol, sucursal: user.IdSucursal, type: 'session' };
    const token = generateToken(payload, '8h');
    const { Pwd, ...userResponse } = user.toJSON();

    await registerAudit(this.bitacoraService, {
      Accion: `Usuario ${this._nombreCompleto(user)} inició sesión`,
      detalle: `Inicio de sesión exitoso`,
      IdEmpleado: user.Id,
      IdSucursal: user.IdSucursal,
      IpAddress: ctx.Ip
    });

    return { user: userResponse, token };
  }

  // El cierre de sesión llega sin req.user (la ruta es pública); el controller
  // resuelve al usuario desde la cookie firmada y lo pasa por ctx.
  async logout(ctx = {}) {
    if (!ctx.IdEmpleado) return;
    await registerAudit(this.bitacoraService, {
      Accion: `Usuario Id ${ctx.IdEmpleado} cerró sesión`,
      detalle: `Cierre de sesión`,
      IdEmpleado: ctx.IdEmpleado,
      IdSucursal: ctx.IdSucursal ?? null,
      IpAddress: ctx.Ip
    });
  }

  async forgotPassword(email) {
    // 1. Buscamos al usuario por su email
    const user = await this.usuarioDAO.findOne({ where: { Email: email, Activo: true } });
    
    // Por seguridad, no revelamos si el email existe o no (evita escaneo de correos)
    if (!user) {
      return { message: 'Si el email existe, recibirás un correo de recuperación' };
    }

    // 2. Generamos el token JWT válido por 15 minutos exactos
    const resetToken = generateToken({ id: user.Id, type: 'reset' }, '15m');

    // 3. INTEGRACIÓN: Llamamos a la función de Nodemailer que acabas de crear
    await this.notificacionService.enviarEmailRecuperacion(user.Email, user.Nombre, resetToken);

    return {
      message: 'Se ha enviado un email con instrucciones para restablecer tu contraseña'
    };
  }

  async resetPassword(token, newPassword) {
    const payload = verifyToken(token);
    
    if (!payload || payload.type !== 'reset') {
      throw new Error('Token inválido o expirado');
    }

    const user = await this.usuarioDAO.getById(payload.id);
    if (!user || !user.Activo) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 400;
      throw err;
    }

    const isSamePassword = await comparePassword(newPassword, user.Pwd);
    if (isSamePassword) {
      throw new Error('La nueva contraseña no puede ser igual a la anterior');
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.usuarioDAO.update(user.Id, { Pwd: hashedPassword });

    return { message: 'Contraseña actualizada exitosamente' };
  }
}
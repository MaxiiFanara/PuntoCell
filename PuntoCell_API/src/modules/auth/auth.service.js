import { Op } from 'sequelize';
import { comparePassword, hashPassword } from '../../core/utils/bcrypt.js';
import { generateToken, verifyToken } from '../../core/utils/jwt.util.js';

export default class AuthService {
  constructor(usuarioDAO, notificacionService) {
    this.usuarioDAO = usuarioDAO;
    this.notificacionService = notificacionService;
  }



  async login(identificador, password) {
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
      throw new Error('Credenciales inválidas');
    }

    const isValidPassword = await comparePassword(password, user.Pwd);
    
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    const payload = { id: user.Id, rol: user.IdRol, sucursal: user.IdSucursal, type: 'session' };
    const token = generateToken(payload, '8h');
    const { Pwd, ...userResponse } = user.toJSON();

    return { user: userResponse, token };
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
import { env } from '../../core/config/env.js';

export default class AuthController {
  constructor(service) {
    this.service = service;
  }

  get cookieOptions() {
    return {
      httpOnly: true,
      secure: env.APP.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true,
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    };
  }

  login = async (req, res, next) => {
    try {
      const { Identificador, Pwd } = req.body;
      const data = await this.service.login(Identificador, Pwd);
      
      const { token, user } = data;

      console.log('Token generado:', token);

      res.cookie('jwt_punto_cell', token, this.cookieOptions);

      return res.status(200).json({ 
        status: 'success', 
        message: 'Autenticación exitosa',
        data: { user } 
      });
    } catch (err) {
      if (err.message === 'Credenciales inválidas') {
        return res.status(401).json({ status: 'error', message: err.message });
      }
      next(err);
    }
  };

  logout = (req, res) => {
    res.clearCookie('jwt_punto_cell', {
      httpOnly: true,
      secure: env.APP.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true
    });
    
    return res.status(200).json({ status: 'success', message: 'Sesión cerrada exitosamente' });
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { Email } = req.body;
      const data = await this.service.forgotPassword(Email);
      return res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  };

 resetPassword = async (req, res, next) => {
  try {
    const { Token, NewPassword } = req.body;
    await this.service.resetPassword(Token, NewPassword);
    
    // Cerramos la sesión obligando al usuario a loguearse con la nueva contraseña
    res.clearCookie('jwt_punto_cell', {
      httpOnly: true,
      secure: env.APP.NODE_ENV === 'production',
      sameSite: 'strict',
      signed: true
    });

    return res.status(200).json({ 
      status: 'success', 
      data: { message: 'Contraseña actualizada exitosamente. Por favor iniciá sesión nuevamente.' }
    });
  } catch (err) {
    if (err.statusCode || err.message.includes('Token') || err.message.includes('contraseña')) {
      return res.status(err.statusCode || 400).json({ status: 'error', message: err.message });
    }
    next(err);
  }
};
}
import { verifyToken, generateToken } from '../utils/jwt.util.js';
import { env } from '../config/env.js';
import logger from '../../core/utils/logger.js';

export const requireAuth = (req, res, next) => {
  try {
    const token = req.signedCookies.jwt_punto_cell;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No autorizado. Por favor, inicie sesión.'
      });
    }

    const payload = verifyToken(token);

    if (!payload || payload.type !== 'session') {
      return res.status(401).json({
        status: 'error',
        message: 'Sesión inválida o expirada.'
      });
    }

    // Sliding window: refresco automático si queda poco tiempo
    const tiempoRestanteSegundos = payload.exp - Math.floor(Date.now() / 1000);
    const DIEZ_MINUTOS = 10 * 60;

    if (tiempoRestanteSegundos < DIEZ_MINUTOS && tiempoRestanteSegundos > 0) {
      const nuevoPayload = { 
        id: payload.id, 
        rol: payload.rol, 
        sucursal: payload.sucursal, 
        type: 'session' 
      };
      
      const nuevoToken = generateToken(nuevoPayload, '8h');

      res.cookie('jwt_punto_cell', nuevoToken, {
        httpOnly: true,
        secure: env.APP.NODE_ENV === 'production',
        sameSite: 'strict',
        signed: true,
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
      });
    }

    req.user = payload;
    next();

  } catch (error) {
    logger.error('Error en middleware de autenticación:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Error interno de autenticación.' 
    });
  }
};

export const preventDoubleLogin = (req, res, next) => {
  try {
    const token = req.signedCookies.jwt_punto_cell;

    if (token) {
      const payload = verifyToken(token);

      if (payload && payload.type === 'session') {
        return res.status(400).json({
          status: 'error',
          message: 'Ya tienes una sesión activa.'
        });
      }
    }

    next();

  } catch (error) {
    // Token manipulado u otro error: dejamos pasar, el login normal emite uno nuevo
    next();
  }
};

export const isAdmin = (req, res, next) => {
  const idRol = req.user?.rol;

  if (idRol !== 1 && idRol !== 2) {
    const error = new Error('Acceso denegado. Esta acción requiere privilegios de Administrador o Encargado.');
    error.statusCode = 403;
    return next(error);
  }

  next();
};

export const verificarTransicionEstado = (req, res, next) => {
  const idRol = req.user?.rol;
  const nuevoEstado = parseInt(req.body.IdEstadoOrden);

  if (idRol === 1 || idRol === 2) return next();

  const transicionesPorRol = {
    3: [4, 5],
    4: [2, 3, 5]
  };

  const permitidos = transicionesPorRol[idRol];
  if (!permitidos) {
    const err = new Error('No tiene permisos para cambiar el estado de una orden.');
    err.statusCode = 403;
    return next(err);
  }

  if (!permitidos.includes(nuevoEstado)) {
    const err = new Error('No tiene permisos para cambiar la orden a este estado.');
    err.statusCode = 403;
    return next(err);
  }

  next();
};
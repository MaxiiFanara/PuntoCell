import { models } from '../../models/index.js';

export const MENSAJE_CAJA_CERRADA = 'La caja está cerrada. Abra la caja para poder continuar.';

// Reemplaza en todo el body cualquier IdTurnoCaja (ventas, pagos, compras, señas, pago final)
// por el turno realmente abierto: el front todavía manda un id fijo.
const asignarTurno = (nodo, idTurno) => {
  if (Array.isArray(nodo)) return nodo.forEach((item) => asignarTurno(item, idTurno));
  if (!nodo || typeof nodo !== 'object') return;
  for (const clave of Object.keys(nodo)) {
    if (clave === 'IdTurnoCaja') nodo[clave] = idTurno;
    else asignarTurno(nodo[clave], idTurno);
  }
};

// Exige un turno de caja abierto en la sucursal del usuario antes de registrar una operación
// con dinero. `cuando` permite aplicarlo solo a ciertos requests (ej. cambio de estado con cobro).
// Solo se monta en rutas internas autenticadas: la venta del catálogo online no pasa por acá.
export const requireCajaAbierta = (cuando = null) => async (req, res, next) => {
  try {
    if (cuando && !cuando(req)) return next();

    const turno = await models.TurnoCaja.findOne({
      where: { IdSucursal: req.user?.sucursal, FechaCierre: null },
      order: [['Id', 'DESC']]
    });

    if (!turno) {
      const error = new Error(MENSAJE_CAJA_CERRADA);
      error.statusCode = 409;
      return next(error);
    }

    asignarTurno(req.body, turno.Id);
    next();
  } catch (error) {
    next(error);
  }
};

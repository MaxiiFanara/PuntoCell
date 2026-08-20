import Joi from 'joi';
import { nombrePropio, dni, celular, numeroCasa, email, textoDireccion } from '../../../core/utils/joiCampos.js';

export const nuevaReparacionSchema = Joi.object({
  cliente: Joi.object({
    Id: Joi.number().allow(null).optional(),
    DNI: dni.required(),
    Nombre: nombrePropio.required(),
    Apellido: nombrePropio.required(),
    Email: email.required(),
    Celular: celular.required(),
    Calle: textoDireccion(100).allow('', null).optional(),
    Numero: numeroCasa.allow('', null).optional()
  }).required(),

  dispositivo: Joi.object({
    IMEI: Joi.string().max(50).allow('', null).optional(),
    Desbloqueo: Joi.string().max(100).allow('', null).optional(),
    Observaciones: Joi.string().max(500).allow('', null).optional(),
    IdModeloArticulo: Joi.number().integer().required()
  }).required(),

  idsFallas: Joi.array().items(Joi.number().integer()).optional(),

  observacionIngreso: Joi.string().allow('', null).optional(),

  sena: Joi.object({
    Monto: Joi.number().precision(2).positive().required(),
    IdMetodoPago: Joi.number().integer().required(),
    IdTurnoCaja: Joi.number().integer().required()
  }).optional()
});



export const cambiarEstadoSchema = Joi.object({
  IdEstadoOrden: Joi.number().integer().positive().required(),
  ObservacionTecnico: Joi.string().allow('', null),
  
  // Habilitamos que el técnico mande la mano de obra
  PrecioManoObra: Joi.number().precision(2).min(0).optional(),
  
  // Habilitamos el array de repuestos
  repuestos: Joi.array().items(
    Joi.object({
      IdInventario: Joi.number().integer().required(),
      Cantidad: Joi.number().integer().min(1).required()
    })
  ).optional(),

  // Habilitamos el pago final para cuando se entregue el equipo
  pagoFinal: Joi.object({
    IdMetodoPago: Joi.number().integer().required(),
    IdTurnoCaja: Joi.number().integer().required()
  }).optional()
});

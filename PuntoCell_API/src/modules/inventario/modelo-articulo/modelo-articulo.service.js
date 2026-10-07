import { registerAudit } from '../../../core/utils/audit.util.js';
import logger from '../../../core/utils/logger.js';

export default class ModeloArticuloService {
  constructor(modeloDAO, bitacoraService = null) {
    this.modeloDAO = modeloDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = ['Id', 'Nombre', 'IdMarcaArticulo', 'IdCategoriaArticulo'];
  }

  _getRelatedModels() {
    const sequelize = this.modeloDAO.model.sequelize;
    return {
      MarcaArticulo: sequelize.models.MarcaArticulo,
      CategoriaArticulo: sequelize.models.CategoriaArticulo
    };
  }

  async getAll(query = {}, auditContext = null) {
    try {
      return await this.modeloDAO.getAll({
        attributes: this.ATTRIBUTES,
        order: [['Nombre', 'ASC']]
      });
    } catch (error) {
      logger.error("🔥 ERROR EXACTO DE SQL:", error.message);
      await registerAudit(this.bitacoraService, {
        detalle: `Error obteniendo Modelos: ${error.message}`,
        Accion: 'Obtener Modelos',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw error;
    }
  }

  async getById(id, auditContext = null) {
    const { MarcaArticulo, CategoriaArticulo } = this._getRelatedModels();
    const item = await this.modeloDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: MarcaArticulo, as: 'marca', attributes: ['Id', 'Nombre'] },
      { model: CategoriaArticulo, as: 'categoria', attributes: ['Id', 'Nombre'] }
    ] });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `ModeloArticulo no encontrado (Id=${id})`,
        Accion: 'Obtener ModeloArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ModeloArticulo no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const existe = await this.modeloDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) {
      await registerAudit(this.bitacoraService, {
        detalle: `Intento crear ModeloArticulo duplicado Nombre=${data.Nombre}`,
        Accion: 'Crear ModeloArticulo',
        IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
        IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('El modelo ya existe');
    }

    // validar existencia de Marca y Categoria
    const { MarcaArticulo, CategoriaArticulo } = this._getRelatedModels();
    const marca = await MarcaArticulo.findByPk(data.IdMarcaArticulo);
    if (!marca) {
      await registerAudit(this.bitacoraService, {
        detalle: `MarcaArticulo no encontrada Id=${data.IdMarcaArticulo}`,
        Accion: 'Crear ModeloArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('MarcaArticulo no encontrada');
    }
    const categoria = await CategoriaArticulo.findByPk(data.IdCategoriaArticulo);
    if (!categoria) {
      await registerAudit(this.bitacoraService, {
        detalle: `CategoriaArticulo no encontrada Id=${data.IdCategoriaArticulo}`,
        Accion: 'Crear ModeloArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('CategoriaArticulo no encontrada');
    }

    const created = await this.modeloDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `ModeloArticulo creado Id=${created.Id || created.id || ''}`,
      Accion: 'Crear ModeloArticulo',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.modeloDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `ModeloArticulo no encontrado (Id=${id})`,
        Accion: 'Actualizar ModeloArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ModeloArticulo no encontrado');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.modeloDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar ModeloArticulo a Nombre duplicado=${data.Nombre}`,
          Accion: 'Actualizar ModeloArticulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe un modelo con ese nombre');
      }
    }

    // validar existencia de Marca y Categoria (solo si vienen en el payload)
    const { MarcaArticulo, CategoriaArticulo } = this._getRelatedModels();
    if (data.IdMarcaArticulo !== undefined) {
      const marca = await MarcaArticulo.findByPk(data.IdMarcaArticulo);
      if (!marca) {
        await registerAudit(this.bitacoraService, {
          detalle: `MarcaArticulo no encontrada Id=${data.IdMarcaArticulo}`,
          Accion: 'Actualizar ModeloArticulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('MarcaArticulo no encontrada');
      }
    }
    if (data.IdCategoriaArticulo !== undefined) {
      const categoria = await CategoriaArticulo.findByPk(data.IdCategoriaArticulo);
      if (!categoria) {
        await registerAudit(this.bitacoraService, {
          detalle: `CategoriaArticulo no encontrada Id=${data.IdCategoriaArticulo}`,
          Accion: 'Actualizar ModeloArticulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('CategoriaArticulo no encontrada');
      }
    }

    const updated = await this.modeloDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `ModeloArticulo actualizado Id=${id}`,
      Accion: 'Actualizar ModeloArticulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.modeloDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `ModeloArticulo no encontrado (Id=${id})`,
        Accion: 'Eliminar ModeloArticulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ModeloArticulo no encontrado');
    }
    const removed = await this.modeloDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `ModeloArticulo eliminada Id=${id}`,
      Accion: 'Eliminar ModeloArticulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

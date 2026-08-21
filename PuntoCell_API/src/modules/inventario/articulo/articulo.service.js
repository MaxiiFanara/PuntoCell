import { registerAudit } from '../../../core/utils/audit.util.js';

export default class ArticuloService {
  constructor(articuloDAO, bitacoraService = null) {
    this.articuloDAO = articuloDAO;
    this.bitacoraService = bitacoraService;
    this.ATTRIBUTES = {};
  }

  _getRelatedModels() {
    const sequelize = this.articuloDAO.model.sequelize;
    return {
      ModeloArticulo: sequelize.models.ModeloArticulo
    };
  }

  async getAll(query = {}, auditContext = null) {
    const { page, limit } = query;
    const { ModeloArticulo } = this._getRelatedModels();
    return await this.articuloDAO.getAll({ page, limit, attributes: this.ATTRIBUTES, include: [
      { model: ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre'] }
    ] });
  }

  async getById(id, auditContext = null) {
    const { ModeloArticulo } = this._getRelatedModels();
    const item = await this.articuloDAO.getById(id, { attributes: this.ATTRIBUTES, include: [
      { model: ModeloArticulo, as: 'modelo', attributes: ['Id', 'Nombre'] }
    ] });
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Articulo no encontrado (Id=${id})`,
        Accion: 'Obtener Articulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Articulo no encontrado');
    }
    return item;
  }

  async create(data, auditContext = null) {
    const { ModeloArticulo } = this._getRelatedModels();
    const modelo = await ModeloArticulo.findByPk(data.IdModeloArticulo);
    if (!modelo) {
      await registerAudit(this.bitacoraService, {
        detalle: `ModeloArticulo no encontrado Id=${data.IdModeloArticulo}`,
        Accion: 'Crear Articulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('ModeloArticulo no encontrado');
    }
    const created = await this.articuloDAO.create(data);
    await registerAudit(this.bitacoraService, {
      detalle: `Articulo creado Id=${created.Id || created.id || ''}`,
      Accion: 'Crear Articulo',
      IdEmpleado: data?.IdEmpleado || auditContext?.IdEmpleado,
      IdSucursal: data?.IdSucursal || auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return created;
  }

  async update(id, data, auditContext = null) {
    const item = await this.articuloDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Articulo no encontrado (Id=${id})`,
        Accion: 'Actualizar Articulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Articulo no encontrado');
    }
    if (data.Nombre !== undefined) {
      const existe = await this.articuloDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) {
        await registerAudit(this.bitacoraService, {
          detalle: `Intento actualizar Articulo a Nombre duplicado=${data.Nombre}`,
          Accion: 'Actualizar Articulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('Ya existe un articulo con ese nombre');
      }
    }

    if (data.IdModeloArticulo !== undefined) {
      const { ModeloArticulo } = this._getRelatedModels();
      const modelo = await ModeloArticulo.findByPk(data.IdModeloArticulo);
      if (!modelo) {
        await registerAudit(this.bitacoraService, {
          detalle: `ModeloArticulo no encontrado Id=${data.IdModeloArticulo}`,
          Accion: 'Actualizar Articulo',
          IdEmpleado: auditContext?.IdEmpleado,
          IdSucursal: auditContext?.IdSucursal,
          IpAddress: auditContext?.Ip,
          Fecha: new Date()
        }).catch(() => {});
        throw new Error('ModeloArticulo no encontrado');
      }
    }

    const updated = await this.articuloDAO.update(id, data);
    await registerAudit(this.bitacoraService, {
      detalle: `Articulo actualizado Id=${id}`,
      Accion: 'Actualizar Articulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return updated;
  }

  async remove(id, auditContext = null) {
    const item = await this.articuloDAO.getById(id);
    if (!item) {
      await registerAudit(this.bitacoraService, {
        detalle: `Articulo no encontrado (Id=${id})`,
        Accion: 'Eliminar Articulo',
        IdEmpleado: auditContext?.IdEmpleado,
        IdSucursal: auditContext?.IdSucursal,
        IpAddress: auditContext?.Ip,
        Fecha: new Date()
      }).catch(() => {});
      throw new Error('Articulo no encontrado');
    }
    const removed = await this.articuloDAO.remove(id);
    await registerAudit(this.bitacoraService, {
      detalle: `Articulo eliminado Id=${id}`,
      Accion: 'Eliminar Articulo',
      IdEmpleado: auditContext?.IdEmpleado,
      IdSucursal: auditContext?.IdSucursal,
      IpAddress: auditContext?.Ip,
      Fecha: new Date()
    }).catch(() => {});
    return removed;
  }
}

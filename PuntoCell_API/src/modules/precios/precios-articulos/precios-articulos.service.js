import { auditar } from '../../../core/utils/audit.util.js';

export default class PreciosArticulosService {
  constructor(preciosArticulosDAO, listaPreciosService, bitacoraService = null) {
    this.preciosArticulosDAO = preciosArticulosDAO;
    this.listaPreciosService = listaPreciosService;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) { return this.preciosArticulosDAO.getAll({ page: query.page, limit: query.limit }); }
  async getById(id) { return this.preciosArticulosDAO.getById(id); }

  round2(value) {
    return Number(Number(value || 0).toFixed(2));
  }

  async computeFields(payload) {
    const CostoBase = this.round2(payload.CostoBase || 0);

    let PorcentajeGanancia = 0;
    let factorCv = 0.26; // Fallback
    
    if (payload.IdListaPrecio) {
      const lista = await this.listaPreciosService.getById(payload.IdListaPrecio);
      if (lista) {
        PorcentajeGanancia = Number(lista.PorcentajeRentabilidad || 0);
        factorCv = Number(lista.FactorCostosVariables || 26) / 100;
      }
    }

    const CostoVariables = this.round2(CostoBase * factorCv);
    const CostoReal = this.round2(CostoBase + CostoVariables);
    const ValorFinal = this.round2(CostoReal + (CostoReal * (PorcentajeGanancia / 100)));

    return { CostoBase, CostoVariables, CostoReal, PorcentajeGanancia, ValorFinal };
  }

  async create(data, ctx = null) {
    const computed = await this.computeFields(data);
    const payload = { ...data, ...computed };
    const creado = await this.preciosArticulosDAO.create(payload);
    await auditar(this.bitacoraService, ctx,
      `Cargó un precio para el inventario #${data.IdInventario} (precio #${creado.Id})`,
      `Lista ${data.IdListaPrecio} · costo ${computed.CostoBase} → venta ${computed.ValorFinal}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const existing = await this.preciosArticulosDAO.getById(id);
    if (!existing) return null;

    const existingData = existing.dataValues ? existing.dataValues : existing;
    const merged = { ...existingData, ...data };
    const computed = await this.computeFields(merged);
    const payload = { ...merged, ...computed };
    const actualizado = await this.preciosArticulosDAO.update(id, payload);
    await auditar(this.bitacoraService, ctx, `Modificó el precio de artículo #${id}`,
      `Nuevo costo ${computed.CostoBase} → venta ${computed.ValorFinal}`);
    return actualizado;
  }

  async remove(id, ctx = null) {
    const eliminado = await this.preciosArticulosDAO.remove(id);
    await auditar(this.bitacoraService, ctx, `Eliminó el precio de artículo #${id}`, `Baja de precio de artículo`);
    return eliminado;
  }

  async bulkUpdate(payload, ctx = null) {
    const sequelize = this.preciosArticulosDAO.model.sequelize;
    const t = await sequelize.transaction();
    try {
      const { resolverListasPrecioCategoria, reprecificarInventario } = await import('../../../core/utils/precios.util.js');
      
      let actualizados = 0;
      for (const update of payload.updates) {
        const inv = await sequelize.models.Inventario.findByPk(update.IdInventario, {
          include: [{
            model: sequelize.models.Articulo,
            as: 'articulo',
            include: [{ model: sequelize.models.ModeloArticulo, as: 'modelo' }]
          }],
          transaction: t
        });

        if (!inv) continue;

        const idCat = inv.articulo?.modelo?.IdCategoriaArticulo;
        const listas = await resolverListasPrecioCategoria(sequelize, idCat, t);
        
        await reprecificarInventario(sequelize, {
          IdInventario: update.IdInventario,
          CostoBase: update.CostoBase,
          listas
        }, t);
        
        actualizados++;
      }
      
      await t.commit();
      
      await auditar(this.bitacoraService, ctx, 
        `Actualización masiva de costos base`, 
        `Se repreciaron ${actualizados} productos en base al CSV importado`);
        
      return { actualizados };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrada = () => { const e = new Error('Falla no encontrada'); e.statusCode = 404; return e; };

export default class FallaService {
  constructor(fallaDAO, bitacoraService = null) {
    this.fallaDAO = fallaDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.fallaDAO.getAll({ page, limit, where: { Activa: true }, order: [['Nombre', 'ASC']] });
  }

  async getById(id) {
    const falla = await this.fallaDAO.getById(id);
    if (!falla) throw noEncontrada();
    return falla;
  }

  async create(data, ctx = null) {
    const creada = await this.fallaDAO.create(data);
    await auditar(this.bitacoraService, ctx, `Creó la falla "${data.Nombre}" (#${creada.Id})`, `Alta de falla`);
    return creada;
  }

  async update(id, data, ctx = null) {
    const falla = await this.fallaDAO.getById(id);
    if (!falla) throw noEncontrada();
    const actualizada = await this.fallaDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó la falla "${falla.Nombre}" (#${id})`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizada;
  }

  async delete(id, ctx = null) {
    const falla = await this.fallaDAO.getById(id);
    if (!falla) throw noEncontrada();
    const actualizado = await this.fallaDAO.update(id, { Activa: false });
    if (!actualizado) throw new Error('No se pudo dar de baja la falla');
    await auditar(this.bitacoraService, ctx, `Dio de baja la falla "${falla.Nombre}" (#${id})`, `Baja lógica de falla`);
    return true;
  }

  async getByCategoriaArticulo(idCategoria) {
    return await this.fallaDAO.getAll({ where: { IdCategoriaArticulo: idCategoria, Activa: true } });
  }
}

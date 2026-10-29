import { auditar } from '../../../core/utils/audit.util.js';

const noEncontrado = () => { const e = new Error('Dispositivo del cliente no encontrado'); e.statusCode = 404; return e; };

export default class DispositivoClienteService {
  constructor(dispositivoClienteDAO, bitacoraService = null) {
    this.dispositivoClienteDAO = dispositivoClienteDAO;
    this.bitacoraService = bitacoraService;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.dispositivoClienteDAO.getAll({ page, limit });
  }

  async getById(id) {
    const dispositivo = await this.dispositivoClienteDAO.getById(id);
    if (!dispositivo) throw noEncontrado();
    return dispositivo;
  }

  async create(data, ctx = null) {
    const creado = await this.dispositivoClienteDAO.create({ ...data, CreatedAt: new Date() });
    await auditar(this.bitacoraService, ctx, `Registró un dispositivo del cliente`,
      `Cliente ${data.IdCliente ?? '-'} · modelo ${data.IdModeloArticulo ?? '-'}`);
    return creado;
  }

  async update(id, data, ctx = null) {
    const dispositivo = await this.dispositivoClienteDAO.getById(id);
    if (!dispositivo) throw noEncontrado();
    const actualizado = await this.dispositivoClienteDAO.update(id, data);
    await auditar(this.bitacoraService, ctx, `Modificó el dispositivo del cliente`, `Campos: ${Object.keys(data).join(', ')}`);
    return actualizado;
  }

  async delete(id, ctx = null) {
    const dispositivo = await this.dispositivoClienteDAO.getById(id);
    if (!dispositivo) throw noEncontrado();
    const actualizado = await this.dispositivoClienteDAO.update(id, { Activo: false });
    if (!actualizado) throw new Error('No se pudo dar de baja el dispositivo');
    await auditar(this.bitacoraService, ctx, `Dio de baja el dispositivo del cliente`, `Baja lógica de dispositivo`);
    return true;
  }
}

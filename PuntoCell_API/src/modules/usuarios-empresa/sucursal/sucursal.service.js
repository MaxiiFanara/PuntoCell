export default class SucursalService {
  constructor(sucursalDAO) {
    this.sucursalDAO = sucursalDAO;
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    return await this.sucursalDAO.getAll({
      page,
      limit,
      where: { Activa: true }
    });
  }

  async getById(id) {
    const sucursal = await this.sucursalDAO.getById(id);
    if (!sucursal) throw new Error('Sucursal no encontrada');
    return sucursal;
  }

  async create(data) {
    // Asignamos la fecha actual si la base de datos no lo hace automáticamente
    const nuevaSucursal = { ...data, CreatedAt: new Date() };
    return await this.sucursalDAO.create(nuevaSucursal);
  }

  async update(id, data) {
    const sucursal = await this.sucursalDAO.getById(id);
    if (!sucursal) throw new Error('Sucursal no encontrada');
    
    return await this.sucursalDAO.update(id, data);
  }

  async delete(id) {
    const sucursal = await this.sucursalDAO.getById(id);
    if (!sucursal) throw new Error('Sucursal no encontrada');
    
    // Baja lógica
    const actualizado = await this.sucursalDAO.update(id, { Activa: false });
    if (!actualizado) throw new Error('No se pudo dar de baja la sucursal');
    return true;
  }
}
export default class LocalidadService {
  constructor(localidadDAO) {
    this.localidadDAO = localidadDAO;
    this.ATTRIBUTES = {};
  }

  async getAll(query = {}) {
    const { page, limit } = query;
    
    return await this.localidadDAO.getAll({ 
      page, 
      limit, 
      attributes: this.ATTRIBUTES 
    });
  }

  async getById(id) {
    const localidad = await this.localidadDAO.getById(id, { 
      attributes: this.ATTRIBUTES 
    });
    
    if (!localidad) throw new Error('Localidad no encontrada');
    return localidad;
  }


  async create(data) {
    const existe = await this.localidadDAO.findOne({ where: { Nombre: data.Nombre } });
    if (existe) throw new Error('La localidad ya existe');
    return await this.localidadDAO.create(data);
  }

  async update(id, data) {
    const localidad = await this.localidadDAO.getById(id);
    if (!localidad) throw new Error('Localidad no encontrada');
    if (data.Nombre !== undefined) {
      const existe = await this.localidadDAO.findOne({ where: { Nombre: data.Nombre } });
      if (existe && existe.Id !== parseInt(id)) throw new Error('Ya existe una localidad con ese nombre');
    }
    return await this.localidadDAO.update(id, data);
  }

  async remove(id) {
    const localidad = await this.localidadDAO.getById(id);
    if (!localidad) throw new Error('Localidad no encontrada');
    return await this.localidadDAO.remove(id);
  }
}
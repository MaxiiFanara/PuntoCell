import BaseDAO from '../../core/base/base.dao.js';

// Las vistas son de solo lectura: alcanza con heredar getAll / findOne de BaseDAO.
export default class EstadisticaDAO extends BaseDAO {
  constructor(model) {
    super(model);
  }
}

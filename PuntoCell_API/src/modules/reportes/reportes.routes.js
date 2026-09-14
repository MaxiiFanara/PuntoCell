import { Router } from 'express'
import { requireAuth } from '../../core/middlewares/auth.middleware.js'

export default (container) => {
  const router = Router()
  const { reportesController } = container.reportes

  router.use(requireAuth)

  router.get('/compras', reportesController.compras)
  router.get('/ventas', reportesController.ventas)
  router.get('/inventario', reportesController.inventario)
  router.get('/reparaciones', reportesController.reparaciones)

  return router
}
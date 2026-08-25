import { useState, useEffect } from 'react'
import {
  Container, Snackbar, Alert, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
  Button, Box, Typography,
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Navbar from '../components/layout/Navbar'
import DashboardMetrics from '../components/dashboard/DashboardMetrics'
import AccionesReparacion from '../components/layout/AccionesReparacion'
import FiltrosReparaciones from '../components/filters/FiltrosReparaciones'
import TablaReparaciones from '../components/table/TablaReparaciones'
import ModalReparacion from '../components/modals/ModalReparacion'
import ModalRegistroCliente from '../components/modals/ModalRegistroCliente'
import ModalRegistroDispositivo from '../components/modals/ModalRegistroDispositivo'
import ModalBuscarCliente from '../components/modals/ModalBuscarCliente'
import ModalBuscarDispositivo from '../components/modals/ModalBuscarDispositivo'
import { useOrdenes } from '../hooks/useOrdenes'
import { useCatalogos } from '../hooks/useCatalogos'
import { usePermisos } from '../hooks/usePermisos'
import { useAuth } from '../context/AuthContext'

const ReparacionesPage = () => {
  const { usuario } = useAuth()
  const permisos = usePermisos()
  const {
    ordenes, metricas, loading, filtros, setFiltros,
    ordenSeleccionada, setOrdenSeleccionada,
    recargar, handleAnular,
  } = useOrdenes()
  const catalogos = useCatalogos()

  const [modalReparacion,  setModalReparacion]  = useState({ open: false, modoEdicion: false, modoSoloLectura: false })
  const [modalCliente,     setModalCliente]     = useState({ open: false, dniInicial: '' })
  const [modalDispositivo, setModalDispositivo] = useState(false)
  const [modalBuscar,          setModalBuscar]          = useState(false)
  const [modalBuscarDispositivo, setModalBuscarDispositivo] = useState(false)
  const [confirmarAnular,  setConfirmarAnular]  = useState(false)

  const [showMetrics, setShowMetrics] = useState(true)

  useEffect(() => {
    window.kpi = () => setShowMetrics(v => !v)
    return () => { delete window.kpi }
  }, [])

  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
  const notify = (msg, severity = 'success') => setSnack({ open: true, msg, severity })

  const handleRowClick     = (o) => setOrdenSeleccionada((prev) => prev?.NumOrden === o.NumOrden ? null : o)
  const handleNueva        = () => setModalReparacion({ open: true, modoEdicion: false, modoSoloLectura: false })
  const handleModificar    = () => { if (ordenSeleccionada) setModalReparacion({ open: true, modoEdicion: true,  modoSoloLectura: false }) }
  const handleVerDetalle   = () => { if (ordenSeleccionada) setModalReparacion({ open: true, modoEdicion: false, modoSoloLectura: true  }) }
  const handleGuardado     = () => { recargar(); setOrdenSeleccionada(null); notify(modalReparacion.modoEdicion ? 'Orden actualizada.' : 'Reparación registrada.') }
  const handleAnularConfirm = async () => {
    try {
      await handleAnular(ordenSeleccionada.NumOrden)
      notify(`Orden #${ordenSeleccionada.NumOrden} anulada.`)
      setOrdenSeleccionada(null)
    } catch { notify('Error al anular la orden.', 'error') }
    finally { setConfirmarAnular(false) }
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#eef2f7' }}>
      

      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>

        {showMetrics && <DashboardMetrics metricas={metricas} loading={loading} />}

        <AccionesReparacion
          permisos={permisos}
          ordenSeleccionada={ordenSeleccionada}
          onNuevaReparacion={handleNueva}
          onModificar={handleModificar}
          onVerDetalle={handleVerDetalle}
          onAnular={() => setConfirmarAnular(true)}
          onBuscarCliente={() => setModalBuscar(true)}
          onBuscarDispositivo={() => setModalBuscarDispositivo(true)}
          onRegistrarCliente={() => setModalCliente({ open: true, dniInicial: '' })}
          onRegistrarDispositivo={() => setModalDispositivo(true)}
        />

        <FiltrosReparaciones filtros={filtros} setFiltros={setFiltros} empleados={catalogos.empleados} />

        <TablaReparaciones
          ordenes={ordenes}
          loading={loading}
          onRowClick={handleRowClick}
          ordenSeleccionada={ordenSeleccionada}
        />

      </Container>

      {/* Modales */}
      <ModalReparacion
        open={modalReparacion.open}
        onClose={() => setModalReparacion((s) => ({ ...s, open: false }))}
        modoEdicion={modalReparacion.modoEdicion}
        modoSoloLectura={modalReparacion.modoSoloLectura}
        ordenEditar={ordenSeleccionada}
        localidades={catalogos.localidades}
        tipos={catalogos.tipos}
        marcasPorTipo={catalogos.marcasPorTipo}
        dispositivosPorTipoYMarca={catalogos.dispositivosPorTipoYMarca}
        estados={catalogos.estados}
        usuario={usuario}
        onGuardado={handleGuardado}
        onAbrirRegistroCliente={(dni) => setModalCliente({ open: true, dniInicial: dni ?? '' })}
        onAbrirRegistroDispositivo={() => setModalDispositivo(true)}
      />

      <ModalBuscarCliente open={modalBuscar} onClose={() => setModalBuscar(false)} />

      <ModalBuscarDispositivo
        open={modalBuscarDispositivo}
        onClose={() => setModalBuscarDispositivo(false)}
        tipos={catalogos.tipos}
        marcas={catalogos.marcas}
        modelos={catalogos.modelos ?? []}
      />

      <ModalRegistroCliente
        open={modalCliente.open}
        onClose={() => setModalCliente((s) => ({ ...s, open: false }))}
        localidades={catalogos.localidades}
        dniInicial={modalCliente.dniInicial}
        onClienteGuardado={() => notify('Cliente registrado exitosamente.')}
      />

      <ModalRegistroDispositivo
        open={modalDispositivo}
        onClose={() => setModalDispositivo(false)}
        tipos={catalogos.tipos}
        marcas={catalogos.marcas}
        onDispositivoGuardado={() => { notify('Dispositivo registrado.'); catalogos.recargar() }}
      />

      {/* Confirmar anular */}
      <Dialog open={confirmarAnular} onClose={() => setConfirmarAnular(false)} PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, background: 'linear-gradient(135deg, #fee2e2, #fecaca)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningAmberIcon sx={{ color: '#dc2626', fontSize: 21 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Confirmar anulación</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569', fontSize: '0.9rem' }}>
            ¿Estás seguro de que querés anular la orden{' '}
            <strong style={{ color: '#0f172a' }}>#{ordenSeleccionada?.NumOrden}</strong>?{' '}
            Esta acción cambiará el estado a <strong>Anulado</strong> y no puede deshacerse.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConfirmarAnular(false)} sx={{ borderColor: '#e2e8f0', color: '#475569' }}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleAnularConfirm}>
            Sí, anular orden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: 2, minWidth: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ReparacionesPage

import { useState, useEffect } from 'react'
import {
  Snackbar, Alert, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
  Button, Box, Fab,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import PageHeader from '../components/ui/PageHeader'
import KpiCard from '../components/ui/KpiCard'
import AccionesReparacion from '../components/layout/AccionesReparacion'
import FiltrosReparaciones from '../components/filters/FiltrosReparaciones'
import TablaReparaciones from '../components/table/TablaReparaciones'
import ModalReparacion from '../components/modals/ModalReparacion'
import ModalRegistroCliente from '../components/modals/ModalRegistroCliente'
import ModalRegistroDispositivo from '../components/modals/ModalRegistroDispositivo'
import ModalBuscarCliente from '../components/modals/ModalBuscarCliente'
import ModalBuscarDispositivo from '../components/modals/ModalBuscarDispositivo'
import AsistenteTecnicoChat from '../components/modals/AsistenteTecnicoChat'
import { useOrdenes } from '../hooks/useOrdenes'
import { useCatalogos } from '../hooks/useCatalogos'
import { usePermisos } from '../hooks/usePermisos'
import { useAuth } from '../context/AuthContext'

// Tono de cada KPI, en el mismo gradiente de atención que EstadoChip
// (espera/anulado neutros, en curso destacado, terminado en ámbar por la acción
// pendiente de entrega, entregado en verde de éxito).
const KPIS = [
  { key: 'ordenesActivas', eyebrow: 'Activas',       tone: 'accent' },
  { key: 'enEspera',       eyebrow: 'En espera',      tone: 'mute'   },
  { key: 'enReparacion',   eyebrow: 'En reparación',  tone: 'accent' },
  { key: 'terminado',      eyebrow: 'Terminado',      tone: 'warn'   },
  { key: 'entregado',      eyebrow: 'Entregado',      tone: 'ok'     },
  { key: 'anulado',        eyebrow: 'Anulado',        tone: 'mute'   },
]

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
  const [chatAbierto, setChatAbierto] = useState(false)

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
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Reparaciones"
        title="Órdenes de reparación"
        meta={`${ordenes.length} ${ordenes.length === 1 ? 'orden listada' : 'órdenes listadas'}`}
        action={
          permisos.puedeRegistrar && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleNueva}>
              Registrar Reparación
            </Button>
          )
        }
      />

      {showMetrics && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)', lg: 'repeat(6,1fr)' }, gap: 1.5 }}>
          {KPIS.map((k) => (
            <KpiCard
              key={k.key}
              eyebrow={k.eyebrow}
              tone={k.tone}
              loading={loading}
              value={String(metricas?.[k.key] ?? 0)}
            />
          ))}
        </Box>
      )}

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

      <AsistenteTecnicoChat
        open={chatAbierto}
        onClose={() => setChatAbierto(false)}
        ordenSeleccionada={ordenSeleccionada}
        usuario={usuario}
      />

      {!chatAbierto && (
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setChatAbierto(true)}
          sx={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 1200,
            borderRadius: '999px',
            boxShadow: (theme) => theme.vars.palette.pc.lift,
            '@media print': { display: 'none' },
          }}
        >
          <SmartToyOutlinedIcon sx={{ mr: 1 }} />
          Asistente técnico
        </Fab>
      )}

      {/* Confirmar anular */}
      <Dialog open={confirmarAnular} onClose={() => setConfirmarAnular(false)} PaperProps={{ sx: { maxWidth: 420 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '10px', bgcolor: 'error.light',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <WarningAmberIcon sx={{ color: 'error.main', fontSize: 21 }} />
          </Box>
          Confirmar anulación
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            ¿Estás seguro de que querés anular la orden{' '}
            <Box component="strong" className="mono" sx={{ color: 'text.primary' }}>#{ordenSeleccionada?.NumOrden}</Box>?{' '}
            Esta acción cambiará el estado a <strong>Anulado</strong> y no puede deshacerse.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmarAnular(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleAnularConfirm}>
            Sí, anular orden
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ minWidth: 300 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ReparacionesPage

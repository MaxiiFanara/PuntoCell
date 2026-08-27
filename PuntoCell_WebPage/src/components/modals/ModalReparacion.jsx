import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Snackbar, CircularProgress,
  Typography, Checkbox, FormControlLabel,
  Chip, Box, IconButton, MenuItem, Autocomplete,
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import BuildIcon from '@mui/icons-material/Build'
import EditIcon from '@mui/icons-material/Edit'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import LockIcon from '@mui/icons-material/Lock'
import HandymanIcon from '@mui/icons-material/Handyman'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalAtmIcon from '@mui/icons-material/LocalAtm'
import DownloadIcon from '@mui/icons-material/Download'
import {
  getClienteByDNI, crearOrden, actualizarOrden, getFallasPorTipo,
  getOrdenById, getRepuestosDisponibles, agregarRepuestoOrden, eliminarRepuestoOrden,
  getPagosOrden, enviarComprobanteEmail, getMetodosPagoReparacion,
} from '../../services/api'
import ModalRegistroFalla from './ModalRegistroFalla'
import StatusPill from '../ui/StatusPill'

// Transiciones válidas por estado actual
const TRANS = { 1: [1, 2, 5], 2: [2, 3, 5], 3: [3, 4], 4: [4], 5: [5] }

const hoy = () => new Date().toISOString().split('T')[0]

const EMPTY = {
  dni: '', nombreCliente: '', apellidoCliente: '', emailCliente: '',
  celularCliente: '', calleCliente: '', numeroCliente: '', pisoCliente: '',
  deptoCliente: '', localidadCliente: '',
  idTipo: '', idMarca: '', idModelo: '',
  imei: '',
  tienePassword: false, passwordDispositivo: '',
  observacionesDispositivo: '',
  fallaSeleccionada: '', fallasAgregadas: [],
  fechaIngreso: hoy(), fechaEntrega: '', estado: '',
  observacionIngreso: '',
  observacionTecnico: '',
  precioManoObra: '',
  idMetodoPago: '1',
  montoSena: '',
  idMetodoPagoSena: '1',
}

// Sub-componentes

const Seccion = ({ title, subtitle, children }) => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }}>
    <Box sx={{ p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
      <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: '.72rem', color: 'text.disabled', mt: '2px' }}>{subtitle}</Typography>}
    </Box>
    <Box sx={{ p: '15px' }}>{children}</Box>
  </Box>
)

const Campo = ({ label, hint, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, ...sx }}>
    {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>}
    {children}
    {hint && <Typography sx={{ fontSize: '.69rem', color: 'text.disabled' }}>{hint}</Typography>}
  </Box>
)

const CampoReadonly = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 0.5 }}>{label}</Box>
    <Box sx={{
      px: '11px', minHeight: 32, borderRadius: '7px',
      bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider',
      display: 'flex', alignItems: 'center',
    }}>
      <Typography sx={{ fontSize: '.8125rem', fontWeight: 600, color: value ? 'text.primary' : 'text.disabled' }}>
        {value || '—'}
      </Typography>
    </Box>
  </Box>
)

// Componente principal

const ModalReparacion = ({
  open, onClose, modoEdicion, modoSoloLectura = false, ordenEditar,
  localidades, tipos, marcasPorTipo, dispositivosPorTipoYMarca,
  estados, usuario, onGuardado, onAbrirRegistroCliente,
  onAbrirRegistroDispositivo,
}) => {
  const clienteIdRef = useRef(null)
  const [form, setForm]                           = useState(EMPTY)
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [clienteNuevo, setClienteNuevo]           = useState(false)
  const [fallasPorTipo, setFallasPorTipo]         = useState([])
  const [loading, setLoading]                     = useState(false)
  const [buscandoCliente, setBuscandoCliente]     = useState(false)
  const [error, setError]                         = useState('')
  const [senaNegativaToast, setSenaNegativaToast] = useState(false)
  const [modalFallaOpen, setModalFallaOpen]       = useState(false)
  const [metodosPago, setMetodosPago]             = useState([])

  // Reparaciones solo cobra en efectivo/transferencia; el filtro vive en el service, no acá
  useEffect(() => {
    getMetodosPagoReparacion().then(setMetodosPago).catch(() => setMetodosPago([]))
  }, [])

  // Solo Admin/Encargado (coincide con isAdmin del backend en POST /reparaciones/fallas)
  const puedeGestionarFallas = usuario?.rol === 1 || usuario?.rol === 2

  // Repuesto state (edit mode)
  const [inventarioDisponible, setInventarioDisponible] = useState([])
  const [repuestosOrden, setRepuestosOrden]             = useState([])        // existentes en API
  const [repuestosNuevos, setRepuestosNuevos]           = useState([])        // pendientes de POST
  const [repuestosEliminar, setRepuestosEliminar]       = useState(new Set()) // pendientes de DELETE
  const [repuestoInput, setRepuestoInput]               = useState('')
  const [loadingEditData, setLoadingEditData]           = useState(false)
  const [observacionIngresoOriginal, setObservacionIngresoOriginal] = useState('')

  // Financiero
  const [pagosOrden, setPagosOrden]             = useState([])
  const [datosFinancieros, setDatosFinancieros] = useState({ costoRepuestos: 0, precioManoObra: 0, totalReparacion: 0 })

  // Datos del dispositivo no presentes en la orden normalizada
  const [dispositivoExtra, setDispositivoExtra] = useState({ imei: '', desbloqueo: '' })

  const marcas  = form.idTipo ? marcasPorTipo(Number(form.idTipo)) : []
  const modelos = form.idTipo && form.idMarca
    ? dispositivosPorTipoYMarca(Number(form.idTipo), Number(form.idMarca)) : []

  const estadoSeleccionado = modoEdicion ? (estados ?? []).find(e => e.nombre === form.estado) : null
  const targetEstadoId     = estadoSeleccionado?.id ?? null
  const currentEstadoId    = ordenEditar?.IdEstadoOrden ?? null
  const esEstadoReparacion = currentEstadoId === 2

  // Estados que el backend permite para cada rol
  const ESTADOS_POR_ROL = { 3: [4, 5], 4: [2, 3, 5] }  // Atención: Entregado/Anulado; Técnico: Reparación/Terminado/Anulado
  const estadosPermitidos = (() => {
    const porTransicion = currentEstadoId
      ? (estados ?? []).filter(e => (TRANS[currentEstadoId] ?? []).includes(e.id))
      : (estados ?? [])
    const restriccionRol = ESTADOS_POR_ROL[usuario?.rol]
    return restriccionRol
      ? porTransicion.filter(e => restriccionRol.includes(e.id))
      : porTransicion
  })()

  const totalRepuestos = [
    ...repuestosOrden.map(r => r.precioCobrado * r.cantidad),
    ...repuestosNuevos.map(r => r.precioCobrado * r.cantidad),
  ].reduce((s, x) => s + x, 0)

  // Permite gestionar repuestos: orden ya en estado 2 O transicionando hacia estado 2
  const puedeGestionarRepuestos = esEstadoReparacion || (modoEdicion && targetEstadoId === 2)

  // Financiero
  const manoObraActual      = Number(form.precioManoObra) || 0
  const costoRepuestosDisplay = totalRepuestos > 0 ? totalRepuestos : datosFinancieros.costoRepuestos
  const señaPagada          = pagosOrden
    .filter(p => (p.Observacion ?? '').toLowerCase().includes('seña'))
    .reduce((s, p) => s + Number(p.Monto), 0)
  const pagoEntregaRecord   = pagosOrden.find(p => (p.Observacion ?? '').toLowerCase().includes('saldo final'))
  const metodoPagoEntregaNombre = pagoEntregaRecord
    ? (metodosPago.find(m => m.id === pagoEntregaRecord.IdMetodoPago)?.nombre ?? `Método #${pagoEntregaRecord.IdMetodoPago}`)
    : null
  const saldoEntrega        = datosFinancieros.costoRepuestos + datosFinancieros.precioManoObra - señaPagada

  const showResumen = (modoEdicion && (targetEstadoId === 3 || targetEstadoId === 4 || (currentEstadoId ?? 0) >= 3))
    || (modoSoloLectura && (currentEstadoId ?? 0) >= 3)
  const showDelivery = (modoEdicion && targetEstadoId === 4) || (modoSoloLectura && currentEstadoId === 4)

  // Editable al pasar a Terminado por primera vez, o siempre para admin/encargado
  const puedeEditarManoObra = modoEdicion && targetEstadoId === 3 && (
    currentEstadoId !== 3 || [1, 2].includes(usuario?.rol)
  )

  const inventarioParaAutocompletar = inventarioDisponible.filter(item =>
    !repuestosOrden.some(r => r.idInventario === item.id) &&
    !repuestosNuevos.some(r => r.idInventario === item.id)
  )

  // Reset al abrir
  useEffect(() => {
    if (!open) return
    clienteIdRef.current = null
    setError('')
    setRepuestosOrden([])
    setRepuestosNuevos([])
    setRepuestosEliminar(new Set())
    setRepuestoInput('')
    setInventarioDisponible([])
    setObservacionIngresoOriginal('')
    setPagosOrden([])
    setDatosFinancieros({ costoRepuestos: 0, precioManoObra: 0, totalReparacion: 0 })
    setDispositivoExtra({ imei: '', desbloqueo: '' })

    if ((modoEdicion || modoSoloLectura) && ordenEditar) {
      const fallasEdit = Array.isArray(ordenEditar.Fallas)
        ? ordenEditar.Fallas.map((nombre, idx) => ({ id: `edit-${idx}`, nombre }))
        : ordenEditar.Falla ? [{ id: 'edit-0', nombre: ordenEditar.Falla }] : []
      setForm({
        ...EMPTY,
        dni:             ordenEditar.DNICliente      || '',
        nombreCliente:   ordenEditar.NombreCliente   || '',
        apellidoCliente: ordenEditar.ApellidoCliente || '',
        emailCliente:    ordenEditar.EmailCliente    || '',
        celularCliente:  ordenEditar.CelularCliente  || '',
        idTipo:   ordenEditar.IdTipoDispositivo  ? String(ordenEditar.IdTipoDispositivo)  : '',
        idMarca:  ordenEditar.IdMarcaDispositivo ? String(ordenEditar.IdMarcaDispositivo) : '',
        idModelo: ordenEditar.IdDispositivo      ? String(ordenEditar.IdDispositivo)      : '',
        fallasAgregadas: fallasEdit,
        fechaIngreso: ordenEditar.FechaEmision?.split('T')[0] || hoy(),
        estado:       ordenEditar.Estado || '',
      })
      setClienteEncontrado(true)
      setClienteNuevo(false)

      setLoadingEditData(true)
      Promise.all([getOrdenById(ordenEditar.NumOrden), getRepuestosDisponibles(), getPagosOrden(ordenEditar.NumOrden)])
        .then(([rawOrden, inventario, pagos]) => {
          setInventarioDisponible(inventario ?? [])
          const repsList = rawOrden?.repuestos ?? []
          setRepuestosOrden(repsList.map(r => {
            const invItem = (inventario ?? []).find(inv => inv.id === r.IdInventario)
            return {
              repuestoOrdenId: r.Id,
              idInventario:    r.IdInventario,
              cantidad:        r.Cantidad ?? 1,
              precioCobrado:   Number(r.PrecioCobrado) || 0,
              nombre:          invItem?.nombre ?? `Repuesto #${r.IdInventario}`,
              marca:           invItem?.marca  ?? '',
              modelo:          invItem?.modelo ?? '',
            }
          }))
          setPagosOrden(pagos ?? [])
          setDatosFinancieros({
            costoRepuestos:  Number(rawOrden?.CostoRepuestos)  || 0,
            precioManoObra:  Number(rawOrden?.PrecioManoObra)  || 0,
            totalReparacion: Number(rawOrden?.TotalReparacion) || 0,
          })
          // Precarga la mano de obra ya guardada, para no volver a pedirla al reabrir la orden
          if (rawOrden?.PrecioManoObra) {
            setForm(f => ({ ...f, precioManoObra: String(rawOrden.PrecioManoObra) }))
          }
          setDispositivoExtra({
            imei:       rawOrden?.dispositivo?.IMEI       ?? '',
            desbloqueo: rawOrden?.dispositivo?.Desbloqueo ?? '',
          })
          const seguimientos = rawOrden?.seguimientos ?? []
          const primero = seguimientos[0]
          const ultimo  = seguimientos.length > 1 ? seguimientos.at(-1) : null
          if (primero?.ObservacionTecnico) setObservacionIngresoOriginal(primero.ObservacionTecnico)
          if (ultimo?.ObservacionTecnico)  setForm(f => ({ ...f, observacionTecnico: ultimo.ObservacionTecnico }))
        })
        .catch(() => {})
        .finally(() => setLoadingEditData(false))
    } else {
      setForm(EMPTY)
      setClienteEncontrado(false)
      setClienteNuevo(false)
    }
  }, [open, modoEdicion, modoSoloLectura, ordenEditar])

  // Fallas por tipo
  useEffect(() => {
    if (form.idTipo) getFallasPorTipo(Number(form.idTipo)).then(setFallasPorTipo)
    else setFallasPorTipo([])
  }, [form.idTipo])

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => {
      const next = { ...f, [field]: val }
      if (field === 'idTipo')  { next.idMarca = ''; next.idModelo = '' }
      if (field === 'idMarca') { next.idModelo = '' }
      return next
    })
  }

  const setSoloDigitos = (field, maxLen) => (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, maxLen)
    setForm((f) => ({ ...f, [field]: val }))
  }

  const buscarCliente = async () => {
    if (!form.dni.trim()) return
    setBuscandoCliente(true); setError('')
    try {
      const c = await getClienteByDNI(form.dni.trim())
      if (c) {
        clienteIdRef.current = c.Id ?? null
        setForm(f => ({
          ...f,
          nombreCliente:    c.Nombre,
          apellidoCliente:  c.Apellido,
          emailCliente:     c.Email       || '',
          celularCliente:   c.Celular     || '',
          calleCliente:     c.Calle       || '',
          numeroCliente:    c.Numero      || '',
          pisoCliente:      c.Piso        || '',
          deptoCliente:     c.Depto       || '',
          localidadCliente: c.IdLocalidad || '',
        }))
        setClienteEncontrado(true); setClienteNuevo(false)
      } else {
        clienteIdRef.current = null
        setForm(f => ({
          ...f, nombreCliente: '', apellidoCliente: '', emailCliente: '',
          celularCliente: '', calleCliente: '', localidadCliente: '',
        }))
        setClienteEncontrado(true); setClienteNuevo(true)
      }
    } catch { setError('Error al buscar el cliente.') }
    finally   { setBuscandoCliente(false) }
  }

  // Fallas
  const agregarFalla = () => {
    if (!form.fallaSeleccionada) return
    const falla = form.fallaSeleccionada
    if (form.fallasAgregadas.find(f => f.id === falla.id)) return
    setForm(f => ({ ...f, fallasAgregadas: [...f.fallasAgregadas, falla], fallaSeleccionada: '' }))
  }
  const quitarFalla = (falla) =>
    setForm(f => ({ ...f, fallasAgregadas: f.fallasAgregadas.filter(x => x.id !== falla.id) }))

  // Refresca el catálogo y agrega la falla directo a la orden, sin un segundo paso manual
  const handleFallaCreada = async (nuevaFalla) => {
    try {
      const lista = await getFallasPorTipo(Number(form.idTipo))
      setFallasPorTipo(lista)
    } catch { /* si falla el refresh, igual dejamos la falla ya agregada abajo */ }
    if (nuevaFalla?.id) {
      setForm(f => ({ ...f, fallasAgregadas: [...f.fallasAgregadas, nuevaFalla] }))
    }
  }

  // Repuestos
  const agregarRepuesto = (item) => {
    if (!item) return
    setRepuestosNuevos(prev => {
      if (prev.find(r => r.idInventario === item.id)) return prev
      return [...prev, { idInventario: item.id, cantidad: 1, precioCobrado: item.precio, nombre: item.nombre, marca: item.marca, modelo: item.modelo, stock: item.stock }]
    })
    setRepuestoInput('')
  }

  const quitarRepuestoNuevo = (idInventario) =>
    setRepuestosNuevos(prev => prev.filter(r => r.idInventario !== idInventario))

  const quitarRepuestoExistente = (repuestoOrdenId) => {
    setRepuestosOrden(prev => prev.filter(r => r.repuestoOrdenId !== repuestoOrdenId))
    setRepuestosEliminar(prev => new Set([...prev, repuestoOrdenId]))
  }

  const cambiarCantidadNuevo = (idInventario, delta) =>
    setRepuestosNuevos(prev =>
      prev.map(r => r.idInventario === idInventario
        ? { ...r, cantidad: Math.min(r.stock ?? Infinity, Math.max(1, r.cantidad + delta)) }
        : r
      )
    )

  // Validación
  const validar = () => {
    if (!form.dni) return 'El DNI es obligatorio.'
    if (!form.nombreCliente || !form.apellidoCliente) return 'Nombre y apellido del cliente son obligatorios.'
    if (!modoEdicion) {
      if (!form.emailCliente)  return 'El email del cliente es obligatorio.'
      if (!form.celularCliente) return 'El celular del cliente es obligatorio.'
      if (!form.idTipo)        return 'Seleccioná el tipo de dispositivo.'
      if (!form.idMarca)       return 'Seleccioná la marca.'
      if (!form.idModelo)      return 'Seleccioná el modelo.'
      if (!form.imei)          return 'El IMEI del dispositivo es obligatorio.'
    }
    if (form.fallasAgregadas.length === 0) return 'Agregá al menos una falla.'
    if (form.tienePassword && !form.passwordDispositivo) return 'Ingresá la contraseña del dispositivo.'
    if (!modoEdicion && Number(form.montoSena) > 0 && !form.idMetodoPagoSena)
      return 'Seleccioná el método de pago para la seña.'
    if (modoEdicion && !form.estado) return 'Seleccioná el estado de la orden.'
    if (modoEdicion && targetEstadoId === 3 && !form.precioManoObra)
      return 'Ingresá el precio de mano de obra para marcar la orden como Terminada.'
    if (modoEdicion && form.precioManoObra !== '' && Number(form.precioManoObra) < 0)
      return 'El precio de mano de obra no puede ser negativo.'
    return null
  }

  // Guardar
  const handleGuardar = async () => {
    const err = validar(); if (err) { setError(err); return }
    setError(''); setLoading(true)
    try {
      if (modoEdicion && ordenEditar) {
        const estadoObj     = (estados ?? []).find(e => e.nombre === form.estado)
        const nuevoEstadoId = estadoObj?.id
        const payload = {
          IdEstadoOrden:      nuevoEstadoId,
          ObservacionTecnico: form.observacionTecnico?.trim() || 'Actualización de estado.',
        }
        if (nuevoEstadoId === 3) payload.PrecioManoObra = Number(form.precioManoObra)
        if (nuevoEstadoId === 4) payload.pagoFinal = { IdMetodoPago: Number(form.idMetodoPago), IdTurnoCaja: 1 }

        const transicionandoAState2 = nuevoEstadoId === 2 && currentEstadoId !== 2
        if (transicionandoAState2) {
          await actualizarOrden(ordenEditar.NumOrden, payload)
        }

        for (const repuestoOrdenId of repuestosEliminar) {
          await eliminarRepuestoOrden(repuestoOrdenId)
        }
        for (const r of repuestosNuevos) {
          await agregarRepuestoOrden({ IdOrdenReparacion: ordenEditar.NumOrden, IdInventario: r.idInventario, Cantidad: r.cantidad })
        }

        if (!transicionandoAState2) {
          await actualizarOrden(ordenEditar.NumOrden, payload)
        }
      } else {
        await crearOrden({
          cliente: {
            ...(clienteIdRef.current ? { Id: clienteIdRef.current } : {}),
            DNI: form.dni, Nombre: form.nombreCliente, Apellido: form.apellidoCliente,
            Email: form.emailCliente, Celular: form.celularCliente,
            ...(form.calleCliente  && { Calle:  form.calleCliente }),
            ...(form.numeroCliente && { Numero: form.numeroCliente }),
          },
          dispositivo: {
            ...(form.imei && { IMEI: form.imei }),
            Desbloqueo:       form.tienePassword ? form.passwordDispositivo : 'Sin clave',
            Observaciones:    form.observacionesDispositivo || '',
            IdModeloArticulo: Number(form.idModelo),
          },
          idsFallas: form.fallasAgregadas.filter(f => typeof f.id === 'number').map(f => f.id),
          ...(form.observacionIngreso && { observacionIngreso: form.observacionIngreso }),
          ...(Number(form.montoSena) > 0 && {
            sena: {
              Monto:         Number(form.montoSena),
              IdMetodoPago:  Number(form.idMetodoPagoSena),
              IdTurnoCaja:   1,
            },
          }),
        })
      }
      if (modoEdicion && targetEstadoId === 4) {
        const pdfBase64 = buildDoc().output('datauristring').split(',')[1]
        enviarComprobanteEmail(ordenEditar.NumOrden, pdfBase64)
          .catch(() => {})
      }
      onGuardado?.(); onClose()
    } catch (e) {
      setError(e.message || 'Error al guardar la orden.')
    } finally {
      setLoading(false)
    }
  }

  const buildDoc = () => {
    const doc   = new jsPDF()
    const azul  = [37, 99, 235]
    const gris  = [100, 116, 139]
    const negro = [15, 23, 42]
    const fmt   = (n) => `$${Number(n).toLocaleString('es-AR')}`
    const linea = (y) => { doc.setDrawColor(226, 232, 240); doc.line(14, y, 196, y) }

    doc.setFillColor(...azul)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18).setFont('helvetica', 'bold')
    doc.text('PuntoCell', 14, 12)
    doc.setFontSize(10).setFont('helvetica', 'normal')
    doc.text('Comprobante de Reparación', 14, 20)
    doc.text(`Orden #${ordenEditar?.NumOrden}   |   ${ordenEditar?.FechaEntrega ?? ordenEditar?.FechaEmision ?? ''}`, 196, 20, { align: 'right' })

    let y = 38
    doc.setTextColor(...azul).setFontSize(11).setFont('helvetica', 'bold')
    doc.text('DISPOSITIVO', 14, y); y += 5; linea(y); y += 6
    doc.setTextColor(...negro).setFontSize(10).setFont('helvetica', 'normal')
    ;[['Marca', ordenEditar?.MarcaDispositivo || '—'], ['Modelo', ordenEditar?.ModeloDispositivo || '—'],
      ['IMEI', dispositivoExtra.imei || '—'], ['Contraseña', dispositivoExtra.desbloqueo || '—']
    ].forEach(([lbl, val]) => { doc.setFont('helvetica', 'bold').text(lbl + ':', 14, y); doc.setFont('helvetica', 'normal').text(val, 55, y); y += 7 })

    y += 3; doc.setTextColor(...azul).setFontSize(11).setFont('helvetica', 'bold')
    doc.text('CLIENTE', 14, y); y += 5; linea(y); y += 6
    doc.setTextColor(...negro).setFontSize(10)
    ;[['DNI', ordenEditar?.DNICliente || '—'],
      // El template literal de antes siempre devolvía un string con contenido (la
      // coma), así que el `|| '—'` nunca se activaba y el PDF podía imprimir
      // "undefined, undefined".
      ['Nombre', [ordenEditar?.ApellidoCliente, ordenEditar?.NombreCliente].filter(Boolean).join(', ') || '—'],
      ['Teléfono', ordenEditar?.CelularCliente || '—'], ['Email', ordenEditar?.EmailCliente || '—']
    ].forEach(([lbl, val]) => { doc.setFont('helvetica', 'bold').text(lbl + ':', 14, y); doc.setFont('helvetica', 'normal').text(val, 55, y); y += 7 })

    const fallas = Array.isArray(ordenEditar?.Fallas) ? ordenEditar.Fallas : []
    if (fallas.length > 0) {
      y += 3; doc.setTextColor(...azul).setFontSize(11).setFont('helvetica', 'bold')
      doc.text('PROBLEMAS REPORTADOS', 14, y); y += 5; linea(y); y += 6
      doc.setTextColor(...negro).setFontSize(10).setFont('helvetica', 'normal')
      fallas.forEach(f => { doc.text(`• ${f}`, 18, y); y += 7 })
    }

    y += 3; doc.setTextColor(...azul).setFontSize(11).setFont('helvetica', 'bold')
    doc.text('RESUMEN DE COSTOS', 14, y); y += 5; linea(y); y += 6
    doc.setTextColor(...negro).setFontSize(10)
    const costoRows = [['Repuestos', fmt(datosFinancieros.costoRepuestos)], ['Mano de obra', fmt(datosFinancieros.precioManoObra)]]
    if (señaPagada > 0) costoRows.push(['Seña pagada', `− ${fmt(señaPagada)}`])
    costoRows.forEach(([lbl, val]) => { doc.setFont('helvetica', 'bold').text(lbl + ':', 14, y); doc.setFont('helvetica', 'normal').text(val, 90, y, { align: 'right' }); y += 7 })
    y += 2; linea(y); y += 6
    doc.setFillColor(...azul)
    doc.roundedRect(14, y - 3, 76, 10, 2, 2, 'F')
    doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold')
    doc.text('Total cobrado:', 17, y + 4)
    doc.text(fmt(saldoEntrega), 88, y + 4, { align: 'right' })

    doc.setTextColor(...gris).setFontSize(8).setFont('helvetica', 'normal')
    doc.text('Documento generado por PuntoCell', 105, 287, { align: 'center' })

    return doc
  }

  const generarPDF = () => {
    const doc  = buildDoc()
    const blob = doc.output('blob')
    const url  = URL.createObjectURL(blob)
    const tab  = window.open(url, '_blank')
    if (tab) tab.addEventListener('unload', () => URL.revokeObjectURL(url))
  }

  const titulo = modoSoloLectura
    ? `Detalle de Orden #${ordenEditar?.NumOrden}`
    : modoEdicion ? `Modificar Orden #${ordenEditar?.NumOrden}` : 'Registrar reparación'

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">

      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          {titulo}
          {(modoEdicion || modoSoloLectura) && ordenEditar && (
            <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
              {ordenEditar.NombreCliente} {ordenEditar.ApellidoCliente} · {ordenEditar.MarcaDispositivo} {ordenEditar.ModeloDispositivo}
            </Box>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 1.75 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>

          {/* Cliente */}
          <Seccion title="Datos del cliente" subtitle={!modoEdicion && !modoSoloLectura ? 'Buscá por DNI para autocompletar' : null}>
            {modoSoloLectura ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1.5 }}>
                <CampoReadonly label="DNI"      value={ordenEditar?.DNICliente} />
                <CampoReadonly label="Nombre"   value={ordenEditar?.NombreCliente} />
                <CampoReadonly label="Apellido" value={ordenEditar?.ApellidoCliente} />
                <CampoReadonly label="Email"    value={ordenEditar?.EmailCliente} />
                <CampoReadonly label="Celular"  value={ordenEditar?.CelularCliente} />
              </Box>
            ) : !modoEdicion ? (
              <>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: clienteEncontrado ? 1.75 : 0 }}>
                  <Campo label="DNI del cliente" sx={{ width: 200 }}>
                    <TextField
                      fullWidth value={form.dni}
                      onChange={setSoloDigitos('dni', 8)} onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
                      placeholder="Ej: 30123456" slotProps={{ htmlInput: { maxLength: 8, inputMode: 'numeric' } }}
                    />
                  </Campo>
                  <Button variant="contained" onClick={buscarCliente}
                    disabled={buscandoCliente || !form.dni.trim()}
                    startIcon={buscandoCliente ? <CircularProgress size={14} color="inherit" /> : <SearchIcon sx={{ fontSize: 16 }} />}
                    sx={{ height: 32 }}>
                    {buscandoCliente ? 'Buscando…' : 'Buscar'}
                  </Button>
                  {clienteEncontrado && !clienteNuevo && (
                    <StatusPill tone="ok" label="Cliente encontrado" sx={{ height: 32 }} />
                  )}
                </Box>

                {clienteNuevo && (
                  <Alert severity="warning" sx={{ mb: 1.75 }}
                    action={<Button size="small" color="inherit" onClick={() => onAbrirRegistroCliente?.(form.dni)}>Registrar ahora</Button>}>
                    No se encontró un cliente con DNI {form.dni}.
                  </Alert>
                )}

                {clienteEncontrado && !clienteNuevo && (
                  <>
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Cliente existente — estos datos no se pueden modificar desde acá.
                    </Alert>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))' }, gap: 1.5 }}>
                      <CampoReadonly label="Nombre" value={form.nombreCliente} />
                      <CampoReadonly label="Apellido" value={form.apellidoCliente} />
                      <CampoReadonly label="Email" value={form.emailCliente} />
                      <CampoReadonly label="Celular" value={form.celularCliente} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1.5fr' }, gap: 1.5, mt: 1.5 }}>
                      <CampoReadonly label="Calle" value={form.calleCliente} />
                      <CampoReadonly label="Número" value={form.numeroCliente} />
                      <CampoReadonly label="Piso" value={form.pisoCliente} />
                      <CampoReadonly label="Localidad" value={localidades.find(l => l.id === form.localidadCliente)?.nombre} />
                    </Box>
                  </>
                )}
              </>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0,1fr))' }, gap: 1.5 }}>
                <CampoReadonly label="DNI"      value={ordenEditar?.DNICliente} />
                <CampoReadonly label="Nombre"   value={ordenEditar?.NombreCliente} />
                <CampoReadonly label="Apellido" value={ordenEditar?.ApellidoCliente} />
                <CampoReadonly label="Celular"  value={ordenEditar?.CelularCliente} />
              </Box>
            )}
          </Seccion>

          {/* Dispositivo */}
          <Seccion title="Dispositivo" subtitle={(modoEdicion || modoSoloLectura) ? 'El dispositivo no puede modificarse' : 'Seleccioná tipo, marca y modelo'}>
            {(modoEdicion || modoSoloLectura) ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1.5 }}>
                <CampoReadonly label="Tipo"   value={ordenEditar?.TipoDispositivo} />
                <CampoReadonly label="Marca"  value={ordenEditar?.MarcaDispositivo} />
                <CampoReadonly label="Modelo" value={ordenEditar?.ModeloDispositivo} />
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr auto', sm: 'repeat(4, minmax(0,1fr)) auto' }, gap: 1.5, alignItems: 'end' }}>
                  <Campo label="Tipo">
                    <TextField fullWidth select value={form.idTipo} onChange={set('idTipo')}>
                      <MenuItem value="">Seleccione…</MenuItem>
                      {tipos.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>)}
                    </TextField>
                  </Campo>
                  <Campo label="Marca">
                    <TextField fullWidth select value={form.idMarca} onChange={set('idMarca')} disabled={!form.idTipo}>
                      <MenuItem value="">Seleccione…</MenuItem>
                      {marcas.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                    </TextField>
                    {form.idTipo && marcas.length === 0 && (
                      <Typography sx={{ fontSize: '.69rem', color: 'warning.main', mt: 0.5 }}>
                        Sin modelos registrados. Usá el botón + para agregar uno.
                      </Typography>
                    )}
                  </Campo>
                  <Campo label="Modelo">
                    <TextField fullWidth select value={form.idModelo} onChange={set('idModelo')} disabled={!form.idMarca}>
                      <MenuItem value="">Seleccione…</MenuItem>
                      {modelos.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
                    </TextField>
                  </Campo>
                  <IconButton onClick={onAbrirRegistroDispositivo} title="Agregar nuevo modelo"
                    sx={{ border: 1, borderColor: 'divider', borderRadius: '7px', height: 32, width: 32 }}>
                    <AddCircleOutlineIcon fontSize="small" />
                  </IconButton>
                  <Campo label="IMEI">
                    <TextField fullWidth value={form.imei} onChange={setSoloDigitos('imei', 15)}
                      placeholder="Ej: 356938035643809" slotProps={{ htmlInput: { maxLength: 15, inputMode: 'numeric' } }} />
                  </Campo>
                  <Box sx={{ gridColumn: { xs: 'span 3', sm: 'span 2' } }}>
                    <Campo label="Observaciones del dispositivo">
                      <TextField fullWidth value={form.observacionesDispositivo}
                        onChange={set('observacionesDispositivo')} placeholder="Ej: pantalla rota, sin tapa trasera…" />
                    </Campo>
                  </Box>
                </Box>

                <Box sx={{ mt: 1.75, p: '12px 13px', borderRadius: '9px', bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider' }}>
                  <FormControlLabel
                    control={<Checkbox checked={form.tienePassword} onChange={set('tienePassword')} size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <LockIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 500 }}>
                          El dispositivo tiene contraseña de desbloqueo
                        </Typography>
                      </Box>
                    }
                  />
                  {form.tienePassword && (
                    <Box sx={{ mt: 1.25, width: { xs: '100%', sm: '50%' } }}>
                      <Campo label="Contraseña de desbloqueo">
                        <TextField fullWidth value={form.passwordDispositivo} onChange={set('passwordDispositivo')} />
                      </Campo>
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Seccion>

          {/* Fallas */}
          <Seccion title="Fallas del dispositivo" subtitle={(modoEdicion || modoSoloLectura) ? 'Las fallas no pueden modificarse' : 'Podés agregar múltiples fallas'}>
            {!modoEdicion && !modoSoloLectura && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap', mb: 1.5 }}>
                <Campo label="Seleccionar falla" sx={{ minWidth: 220 }}>
                  <TextField select fullWidth value={form.fallaSeleccionada}
                    onChange={set('fallaSeleccionada')} disabled={!form.idTipo}>
                    <MenuItem value="">Seleccione…</MenuItem>
                    {fallasPorTipo.map(f => <MenuItem key={f.id} value={f}>{f.nombre}</MenuItem>)}
                  </TextField>
                </Campo>
                <Button variant="outlined" startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />} onClick={agregarFalla}
                  disabled={!form.fallaSeleccionada} sx={{ height: 32 }}>
                  Agregar
                </Button>
                {!form.idTipo && (
                  <Typography sx={{ fontSize: '.72rem', color: 'text.disabled', fontStyle: 'italic' }}>
                    Seleccioná un tipo de dispositivo primero
                  </Typography>
                )}
                {form.idTipo && fallasPorTipo.length === 0 && puedeGestionarFallas && (
                  <Button variant="outlined" startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />} onClick={() => setModalFallaOpen(true)}
                    sx={{ height: 32 }}>
                    Agregar falla al catálogo
                  </Button>
                )}
                {form.idTipo && fallasPorTipo.length === 0 && !puedeGestionarFallas && (
                  <Typography sx={{ fontSize: '.72rem', color: 'text.disabled', fontStyle: 'italic' }}>
                    No hay fallas cargadas para este tipo — pedile a un administrador o encargado que agregue una.
                  </Typography>
                )}
              </Box>
            )}

            <Box sx={{
              border: 1, borderStyle: form.fallasAgregadas.length ? 'solid' : 'dashed',
              borderColor: 'divider', borderRadius: '9px', p: 1.5, minHeight: 52,
              bgcolor: 'pc.surfaceMuted',
              display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center',
            }}>
              {form.fallasAgregadas.length === 0 ? (
                <Typography sx={{ fontSize: '.8125rem', color: 'text.disabled', fontStyle: 'italic' }}>
                  No hay fallas agregadas todavía
                </Typography>
              ) : (
                form.fallasAgregadas.map(falla => (
                  <Chip key={falla.id} label={falla.nombre} size="small"
                    onDelete={!modoEdicion ? () => quitarFalla(falla) : undefined}
                    deleteIcon={<CloseIcon sx={{ fontSize: '14px !important' }} />}
                    sx={{ bgcolor: 'warning.light', color: 'warning.main' }} />
                ))
              )}
            </Box>
          </Seccion>

          {/* Repuestos */}
          {(modoEdicion || modoSoloLectura) && (
            <Seccion title="Repuestos utilizados"
              subtitle={modoSoloLectura ? 'Repuestos registrados en esta orden' : puedeGestionarRepuestos ? 'Podés agregar o quitar repuestos' : 'Gestión disponible en estado "En reparación"'}>

              {loadingEditData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={26} />
                </Box>
              ) : (
                <>
                  {puedeGestionarRepuestos && !modoSoloLectura && (
                    <Autocomplete
                      options={inventarioParaAutocompletar}
                      getOptionLabel={(o) => o.nombre}
                      inputValue={repuestoInput}
                      onInputChange={(_, v) => setRepuestoInput(v)}
                      onChange={(_, v) => agregarRepuesto(v)}
                      openOnFocus
                      filterOptions={(opts, { inputValue }) => {
                        const q = inputValue.toLowerCase().trim()
                        if (q.length >= 2) {
                          return opts.filter(o =>
                            o.nombre.toLowerCase().includes(q) ||
                            o.marca.toLowerCase().includes(q) ||
                            o.modelo.toLowerCase().includes(q)
                          )
                        }
                        const marcaDisp  = (ordenEditar?.MarcaDispositivo  ?? '').toLowerCase()
                        const modeloDisp = (ordenEditar?.ModeloDispositivo ?? '').toLowerCase()
                        if (!marcaDisp && !modeloDisp) return []
                        return opts.filter(o =>
                          (marcaDisp  && o.marca.toLowerCase().includes(marcaDisp))  ||
                          (modeloDisp && o.modelo.toLowerCase().includes(modeloDisp))
                        )
                      }}
                      noOptionsText={
                        repuestoInput.trim().length < 2
                          ? `Sin sugerencias para ${ordenEditar?.MarcaDispositivo ?? 'este dispositivo'} — escribí para buscar`
                          : 'Sin resultados'
                      }
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}
                          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: '10px !important' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '.8125rem', color: 'text.primary' }}>{option.nombre}</Typography>
                            <Typography sx={{ fontSize: '.72rem', color: 'text.secondary' }}>{option.marca} · {option.modelo}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography className="num" sx={{ fontWeight: 700, fontSize: '.8125rem', color: 'primary.main' }}>
                              ${option.precio.toLocaleString('es-AR')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                              <InventoryIcon sx={{ fontSize: 11, color: option.stock <= 3 ? 'error.main' : 'text.disabled' }} />
                              <Typography sx={{ fontSize: '.68rem', color: option.stock <= 3 ? 'error.main' : 'text.disabled', fontWeight: 600 }}>
                                {option.stock} en stock
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      renderInput={(params) => (
                        <TextField {...params}
                          placeholder={`Sugerencias para ${ordenEditar?.MarcaDispositivo ?? 'este dispositivo'} · escribí para buscar más`}
                          slotProps={{
                            input: {
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      )}
                      sx={{ mb: 1.75 }}
                    />
                  )}

                  {(repuestosOrden.length + repuestosNuevos.length) === 0 ? (
                    <Box sx={{
                      border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: '9px', p: 2.5,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, bgcolor: 'pc.surfaceMuted',
                    }}>
                      <HandymanIcon sx={{ fontSize: 26, color: 'text.disabled' }} />
                      <Typography sx={{ fontSize: '.8125rem', color: 'text.disabled', fontStyle: 'italic' }}>
                        No hay repuestos en esta orden
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Repuesto</TableCell>
                            <TableCell align="center" sx={{ width: 120 }}>Cantidad</TableCell>
                            <TableCell align="right" sx={{ width: 130 }}>Precio unit.</TableCell>
                            <TableCell align="right" sx={{ width: 110 }}>Subtotal</TableCell>
                            {esEstadoReparacion && !modoSoloLectura && <TableCell sx={{ width: 40 }} />}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {repuestosOrden.map(r => (
                            <TableRow key={`ex-${r.repuestoOrdenId}`} hover>
                              <TableCell>
                                <Typography sx={{ fontWeight: 600, fontSize: '.8125rem', color: 'text.primary' }}>{r.nombre}</Typography>
                                <Typography sx={{ fontSize: '.69rem', color: 'text.secondary' }}>{r.marca} · {r.modelo}</Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography className="num" sx={{ fontWeight: 700, fontSize: '.875rem' }}>{r.cantidad}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography className="num" sx={{ fontWeight: 600, fontSize: '.8125rem' }}>
                                  ${r.precioCobrado.toLocaleString('es-AR')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography className="num" sx={{ fontWeight: 700, fontSize: '.875rem', color: 'primary.main' }}>
                                  ${(r.precioCobrado * r.cantidad).toLocaleString('es-AR')}
                                </Typography>
                              </TableCell>
                              {esEstadoReparacion && (
                                <TableCell>
                                  <IconButton size="small" onClick={() => quitarRepuestoExistente(r.repuestoOrdenId)}
                                    sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                          {repuestosNuevos.map(r => (
                            <TableRow key={`new-${r.idInventario}`} hover sx={{ bgcolor: 'pc.accentSoft' }}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                                  <Box>
                                    <Typography sx={{ fontWeight: 600, fontSize: '.8125rem', color: 'text.primary' }}>{r.nombre}</Typography>
                                    <Typography sx={{ fontSize: '.69rem', color: 'text.secondary' }}>{r.marca} · {r.modelo}</Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                  <IconButton size="small" onClick={() => cambiarCantidadNuevo(r.idInventario, -1)}
                                    sx={{ width: 24, height: 24, border: 1, borderColor: 'divider', borderRadius: '5px', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>
                                    <RemoveIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                  <Typography className="num" sx={{ fontWeight: 700, fontSize: '.875rem', minWidth: 22, textAlign: 'center' }}>{r.cantidad}</Typography>
                                  <IconButton size="small" onClick={() => cambiarCantidadNuevo(r.idInventario, 1)}
                                    sx={{ width: 24, height: 24, border: 1, borderColor: 'divider', borderRadius: '5px', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>
                                    <AddIcon sx={{ fontSize: 13 }} />
                                  </IconButton>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <Typography className="num" sx={{ fontWeight: 600, fontSize: '.8125rem' }}>
                                  ${r.precioCobrado.toLocaleString('es-AR')}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography className="num" sx={{ fontWeight: 700, fontSize: '.875rem', color: 'primary.main' }}>
                                  ${(r.precioCobrado * r.cantidad).toLocaleString('es-AR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <IconButton size="small" onClick={() => quitarRepuestoNuevo(r.idInventario)}
                                  sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Box sx={{ px: '15px', py: '10px', bgcolor: 'pc.surfaceMuted', borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontSize: '.78rem', color: 'text.secondary', fontWeight: 600 }}>Total repuestos:</Typography>
                        <Typography className="num" sx={{ fontSize: '.95rem', fontWeight: 700, color: 'primary.main' }}>
                          ${totalRepuestos.toLocaleString('es-AR')}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Seccion>
          )}

          {/* Seña */}
          {!modoEdicion && !modoSoloLectura && (
            <Seccion title="Seña" subtitle="Monto entregado por el cliente al dejar el equipo (opcional)">
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))' }, gap: 1.5, alignItems: 'end' }}>
                <Campo label="Monto de seña">
                  <TextField
                    fullWidth type="number" value={form.montoSena}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                        e.preventDefault()
                        if (e.key === '-') setSenaNegativaToast(true)
                      }
                    }}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) { setSenaNegativaToast(true); return }
                      set('montoSena')(e)
                    }}
                    placeholder="0"
                    slotProps={{
                      input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                      htmlInput: { min: 0 },
                    }}
                  />
                </Campo>
                {Number(form.montoSena) > 0 && (
                  <Campo label="Método de pago">
                    <TextField select fullWidth value={form.idMetodoPagoSena} onChange={set('idMetodoPagoSena')}>
                      {metodosPago.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                    </TextField>
                  </Campo>
                )}
              </Box>
              {Number(form.montoSena) > 0 && (
                <Box sx={{ mt: 1.5, p: '10px 12px', borderRadius: '9px', bgcolor: 'warning.light', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalAtmIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography className="num" sx={{ fontSize: '.8rem', color: 'warning.main', fontWeight: 600 }}>
                    Seña registrada: ${Number(form.montoSena).toLocaleString('es-AR')} — El resto se cobrará al entregar.
                  </Typography>
                </Box>
              )}
            </Seccion>
          )}

          {/* Resumen financiero */}
          {showResumen && (
            <Seccion title="Resumen de costos">
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden' }}>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '15px', py: '11px', borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
                  <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 600 }}>Repuestos</Typography>
                  <Typography className="num" sx={{ fontSize: '.8125rem', fontWeight: 700, color: 'text.primary' }}>
                    ${costoRepuestosDisplay.toLocaleString('es-AR')}
                  </Typography>
                </Box>

                {puedeEditarManoObra ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: '15px', py: '10px', borderBottom: 1, borderColor: 'pc.dividerSoft', bgcolor: 'pc.accentSoft' }}>
                    <Typography sx={{ fontSize: '.8125rem', color: 'primary.main', fontWeight: 700 }}>Mano de obra</Typography>
                    <TextField
                      type="number" size="small"
                      value={form.precioManoObra} onChange={set('precioManoObra')}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0 } }}
                      placeholder="0"
                      error={Number(form.precioManoObra) < 0}
                      helperText={Number(form.precioManoObra) < 0 ? 'No puede ser negativo' : ''}
                      sx={{ width: 170 }}
                    />
                  </Box>
                ) : datosFinancieros.precioManoObra > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '15px', py: '11px', borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
                    <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 600 }}>Mano de obra</Typography>
                    <Typography className="num" sx={{ fontSize: '.8125rem', fontWeight: 700, color: 'text.primary' }}>
                      ${datosFinancieros.precioManoObra.toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                )}

                {señaPagada > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '15px', py: '11px', borderBottom: 1, borderColor: 'pc.dividerSoft' }}>
                    <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 600 }}>Seña pagada</Typography>
                    <Typography className="num" sx={{ fontSize: '.8125rem', fontWeight: 700, color: 'error.main' }}>
                      − ${señaPagada.toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '15px', py: '13px', bgcolor: 'pc.accentSoft' }}>
                  <Typography sx={{ fontSize: '.84rem', fontWeight: 700, color: 'primary.main' }}>
                    {showDelivery ? 'A cobrar ahora' : señaPagada > 0 ? 'A cobrar' : 'Total'}
                  </Typography>
                  <Typography className="num" sx={{
                    fontSize: '1.1rem', fontWeight: 700, color: 'primary.main',
                    fontStyle: currentEstadoId === 3 && targetEstadoId !== 4 ? 'italic' : 'normal',
                    opacity: currentEstadoId === 3 && targetEstadoId !== 4 ? .75 : 1,
                  }}>
                    {currentEstadoId === 3 && targetEstadoId !== 4
                      ? 'Pendiente...'
                      : `$${Math.max(0,
                          showDelivery
                            ? saldoEntrega
                            : targetEstadoId === 3
                              ? costoRepuestosDisplay + manoObraActual - señaPagada
                              : datosFinancieros.totalReparacion - señaPagada
                        ).toLocaleString('es-AR')}`
                    }
                  </Typography>
                </Box>

                {modoEdicion && targetEstadoId === 4 && (
                  <Box sx={{ px: '15px', py: '13px', borderTop: 1, borderColor: 'divider' }}>
                    <Campo label="Método de pago">
                      <TextField fullWidth select value={form.idMetodoPago} onChange={set('idMetodoPago')}>
                        {metodosPago.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                      </TextField>
                    </Campo>
                  </Box>
                )}

                {modoSoloLectura && currentEstadoId === 4 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: '15px', py: '11px', borderTop: 1, borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary', fontWeight: 600 }}>Método de pago (entrega)</Typography>
                    <Typography sx={{ fontSize: '.8125rem', fontWeight: 700, color: 'text.primary' }}>
                      {metodoPagoEntregaNombre ?? (señaPagada >= datosFinancieros.totalReparacion ? 'Cubierto por seña' : '—')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Seccion>
          )}

          {/* Detalles */}
          <Seccion title="Detalles de la orden">
            {modoSoloLectura ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1.5 }}>
                <CampoReadonly label="Fecha de ingreso" value={ordenEditar?.FechaEmision?.split('T')[0] ?? ordenEditar?.FechaEmision ?? '–'} />
                <CampoReadonly label="Estado" value={ordenEditar?.Estado} />
                <CampoReadonly label="Empleado emisor" value={ordenEditar?.NombreEmpleado ? `${ordenEditar.NombreEmpleado} ${ordenEditar.ApellidoEmpleado}`.trim() : '–'} />
                {observacionIngresoOriginal && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <CampoReadonly label="Observación de ingreso" value={observacionIngresoOriginal} />
                  </Box>
                )}
                {form.observacionTecnico && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <CampoReadonly label="Última observación técnica" value={form.observacionTecnico} />
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0,1fr))' }, gap: 1.5 }}>
                  <Campo label="Fecha de ingreso">
                    <TextField fullWidth type="date" value={form.fechaIngreso} onChange={set('fechaIngreso')}
                      slotProps={{ htmlInput: { readOnly: true } }} sx={{ '& input': { color: 'text.disabled' } }} />
                  </Campo>

                  {!modoEdicion && (
                    <Campo label="Fecha de entrega estimada">
                      <TextField fullWidth type="date" value={form.fechaEntrega} onChange={set('fechaEntrega')}
                        slotProps={{ htmlInput: { min: hoy() } }} />
                    </Campo>
                  )}

                  {modoEdicion && (
                    <Campo label="Estado de la orden">
                      <TextField fullWidth select value={form.estado} onChange={set('estado')}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {estadosPermitidos.map(e => <MenuItem key={e.id} value={e.nombre}>{e.nombre}</MenuItem>)}
                      </TextField>
                    </Campo>
                  )}

                  <CampoReadonly label="Empleado emisor" value={usuario?.user} />
                </Box>

                {!modoEdicion && (
                  <Campo label="Observación de ingreso">
                    <TextField fullWidth multiline rows={2}
                      placeholder="Ej: cliente trae cable de carga, sin tapa trasera…"
                      value={form.observacionIngreso} onChange={set('observacionIngreso')} />
                  </Campo>
                )}

                {modoEdicion && observacionIngresoOriginal && (
                  <CampoReadonly label="Observación de ingreso" value={observacionIngresoOriginal} />
                )}

                {modoEdicion && usuario?.rol !== 3 && (
                  <Campo label="Observación técnica">
                    <TextField fullWidth multiline rows={2}
                      placeholder="Ej: requiere reemplazo de placa, diagnóstico completado…"
                      value={form.observacionTecnico} onChange={set('observacionTecnico')} />
                  </Campo>
                )}
              </Box>
            )}
          </Seccion>

        </Box>
      </DialogContent>

      <DialogActions>
        {modoSoloLectura ? (
          <>
            {currentEstadoId === 4 && (
              <Button variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />} onClick={generarPDF}>
                Descargar PDF
              </Button>
            )}
            <Button variant="contained" onClick={onClose} sx={{ ml: 'auto' }}>
              Cerrar
            </Button>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <Button onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button variant="contained" color={modoEdicion ? 'success' : 'primary'}
              onClick={handleGuardar} disabled={loading}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : modoEdicion ? <EditIcon sx={{ fontSize: 16 }} /> : <BuildIcon sx={{ fontSize: 16 }} />}>
              {loading ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Registrar reparación'}
            </Button>
          </Box>
        )}
      </DialogActions>

      <Snackbar
        open={senaNegativaToast}
        autoHideDuration={3000}
        onClose={() => setSenaNegativaToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setSenaNegativaToast(false)}>
          La seña no puede ser un valor negativo.
        </Alert>
      </Snackbar>

      <ModalRegistroFalla
        open={modalFallaOpen}
        onClose={() => setModalFallaOpen(false)}
        idCategoria={form.idTipo}
        categoriaNombre={tipos.find(t => String(t.id) === String(form.idTipo))?.nombre}
        onFallaGuardada={handleFallaCreada}
      />
    </Dialog>
  )
}

export default ModalReparacion

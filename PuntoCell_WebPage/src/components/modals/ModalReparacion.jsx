import { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Alert, Snackbar, CircularProgress,
  Typography, Checkbox, FormControlLabel,
  Chip, Box, IconButton, Paper, MenuItem, Autocomplete,
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import BuildIcon from '@mui/icons-material/Build'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import CloseIcon from '@mui/icons-material/Close'
import SearchIcon from '@mui/icons-material/Search'
import PersonIcon from '@mui/icons-material/Person'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import LockIcon from '@mui/icons-material/Lock'
import HandymanIcon from '@mui/icons-material/Handyman'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import InventoryIcon from '@mui/icons-material/Inventory'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import LocalAtmIcon from '@mui/icons-material/LocalAtm'
import DownloadIcon from '@mui/icons-material/Download'
import {
  getClienteByDNI, crearOrden, actualizarOrden, getFallasPorTipo,
  getOrdenById, getRepuestosDisponibles, agregarRepuestoOrden, eliminarRepuestoOrden,
  getPagosOrden, enviarComprobanteEmail, getMetodosPagoReparacion,
} from '../../services/api'
import ModalRegistroFalla from './ModalRegistroFalla'
import { soloImei, esImeiValido } from '../../utils/validators'

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

const SeccionHeader = ({ icon: Icon, title, subtitle, color = '#2563eb' }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2.5 }}>
    <Box sx={{
      width: 36, height: 36, borderRadius: 2,
      background: `linear-gradient(135deg, ${color}22, ${color}11)`,
      border: `1.5px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, mt: 0.25,
    }}>
      <Icon sx={{ fontSize: 17, color }} />
    </Box>
    <Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', lineHeight: 1.2 }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.25 }}>{subtitle}</Typography>}
    </Box>
  </Box>
)

const CampoReadonly = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
      {label}
    </Typography>
    <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', minHeight: 36 }}>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>
        {value || <span style={{ color: '#cbd5e1' }}>–</span>}
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
      if (!esImeiValido(form.imei)) return 'El IMEI del dispositivo es obligatorio y debe tener exactamente 15 dígitos.'
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
      ['Nombre', `${ordenEditar?.ApellidoCliente}, ${ordenEditar?.NombreCliente}` || '—'],
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '94vh' } }}>

      {/* Header */}
      <DialogTitle sx={{
        background: modoSoloLectura
          ? 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)'
          : modoEdicion
            ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)'
            : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        color: '#fff', py: 2.5, px: 3,
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {modoSoloLectura ? <VisibilityIcon sx={{ fontSize: 20 }} /> : modoEdicion ? <EditIcon sx={{ fontSize: 20 }} /> : <BuildIcon sx={{ fontSize: 20 }} />}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>{titulo}</Typography>
          {modoEdicion && ordenEditar && (
            <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', mt: 0.25 }}>
              {ordenEditar.NombreCliente} {ordenEditar.ApellidoCliente} · {ordenEditar.MarcaDispositivo} {ordenEditar.ModeloDispositivo}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose}
          sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.12)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Body */}
      <DialogContent dividers sx={{ p: 0, backgroundColor: '#eef2f7' }}>
        {error && (
          <Box sx={{ px: 3, pt: 2.5 }}>
            <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 2 }}>{error}</Alert>
          </Box>
        )}

        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Cliente */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5, overflow: 'hidden' }}>
            <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
              <SeccionHeader icon={PersonIcon} title="Datos del Cliente" subtitle="Buscá por DNI para autocompletar" color="#2563eb" />

              {modoSoloLectura ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <CampoReadonly label="DNI"      value={ordenEditar?.DNICliente} />
                  <CampoReadonly label="Nombre"   value={ordenEditar?.NombreCliente} />
                  <CampoReadonly label="Apellido" value={ordenEditar?.ApellidoCliente} />
                  <CampoReadonly label="Email"    value={ordenEditar?.EmailCliente} />
                  <CampoReadonly label="Celular"  value={ordenEditar?.CelularCliente} />
                </Box>
              ) : !modoEdicion ? (
                <>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', mb: clienteEncontrado ? 3 : 0 }}>
                    <TextField
                      label="DNI del Cliente *" value={form.dni}
                      onChange={setSoloDigitos('dni', 8)} onKeyDown={(e) => e.key === 'Enter' && buscarCliente()}
                      placeholder="Ej: 30123456" inputProps={{ maxLength: 8, inputMode: 'numeric' }} sx={{ width: 200 }}
                    />
                    <Button variant="contained" onClick={buscarCliente}
                      disabled={buscandoCliente || !form.dni.trim()}
                      startIcon={buscandoCliente ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                      sx={{ height: 40 }}>
                      {buscandoCliente ? 'Buscando…' : 'Buscar'}
                    </Button>
                    {clienteEncontrado && !clienteNuevo && (
                      <Box sx={{ px: 1.75, py: 0.75, borderRadius: 2, background: 'linear-gradient(135deg, #d1fae5, #ecfdf5)', border: '1.5px solid #6ee7b7' }}>
                        <Typography sx={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 700 }}>✓ Cliente encontrado</Typography>
                      </Box>
                    )}
                  </Box>

                  {clienteNuevo && (
                    <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}
                      action={<Button size="small" color="inherit" sx={{ fontWeight: 700 }} onClick={() => onAbrirRegistroCliente?.(form.dni)}>Registrar ahora</Button>}>
                      No se encontró un cliente con DNI {form.dni}.
                    </Alert>
                  )}

                  {clienteEncontrado && !clienteNuevo && (
                    <>
                      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        Cliente existente — estos datos no se pueden modificar desde acá.
                      </Alert>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CampoReadonly label="Nombre" value={form.nombreCliente} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CampoReadonly label="Apellido" value={form.apellidoCliente} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CampoReadonly label="Email" value={form.emailCliente} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <CampoReadonly label="Celular" value={form.celularCliente} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                          <CampoReadonly label="Calle" value={form.calleCliente} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <CampoReadonly label="Número" value={form.numeroCliente} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <CampoReadonly label="Piso" value={form.pisoCliente} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <CampoReadonly label="Localidad" value={localidades.find(l => l.id === form.localidadCliente)?.nombre} />
                        </Grid>
                      </Grid>
                    </>
                  )}
                </>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                  <CampoReadonly label="DNI"      value={ordenEditar?.DNICliente} />
                  <CampoReadonly label="Nombre"   value={ordenEditar?.NombreCliente} />
                  <CampoReadonly label="Apellido" value={ordenEditar?.ApellidoCliente} />
                  <CampoReadonly label="Celular"  value={ordenEditar?.CelularCliente} />
                </Box>
              )}

            </Box>
          </Paper>

          {/* Dispositivo */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5 }}>
            <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
              <SeccionHeader icon={PhoneAndroidIcon} title="Dispositivo"
                subtitle={(modoEdicion || modoSoloLectura) ? 'El dispositivo no puede modificarse' : 'Seleccioná tipo, marca y modelo'}
                color="#0284c7" />

              {(modoEdicion || modoSoloLectura) ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  <CampoReadonly label="Tipo"   value={ordenEditar?.TipoDispositivo} />
                  <CampoReadonly label="Marca"  value={ordenEditar?.MarcaDispositivo} />
                  <CampoReadonly label="Modelo" value={ordenEditar?.ModeloDispositivo} />
                </Box>
              ) : (
                <>
                  <Grid container spacing={2} alignItems="flex-end">
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Tipo *" value={form.idTipo} onChange={set('idTipo')}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {tipos.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Marca *" value={form.idMarca} onChange={set('idMarca')} disabled={!form.idTipo}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {marcas.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                      </TextField>
                      {form.idTipo && marcas.length === 0 && (
                        <Typography sx={{ fontSize: '0.72rem', color: '#d97706', mt: 0.5 }}>
                          Sin modelos registrados para este tipo. Usá el botón + para agregar uno.
                        </Typography>
                      )}
                    </Grid>
                    <Grid size={{ xs: 10, sm: 3 }}>
                      <TextField fullWidth select label="Modelo *" value={form.idModelo} onChange={set('idModelo')} disabled={!form.idMarca}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {modelos.map(d => <MenuItem key={d.id} value={String(d.id)}>{d.nombre}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 2, sm: 1 }} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                      <IconButton onClick={onAbrirRegistroDispositivo} title="Agregar nuevo modelo"
                        sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2, color: '#0284c7', '&:hover': { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' } }}>
                        <AddCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="IMEI *" value={form.imei}
                        onChange={(e) => setForm((f) => ({ ...f, imei: soloImei(e.target.value) }))}
                        placeholder="Ej: 356938035643809" inputProps={{ maxLength: 15, inputMode: 'numeric' }}
                        error={form.imei.length > 0 && !esImeiValido(form.imei)}
                        helperText={`${form.imei.length}/15 dígitos`} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Observaciones del dispositivo" value={form.observacionesDispositivo}
                        onChange={set('observacionesDispositivo')} placeholder="Ej: pantalla rota, sin tapa trasera…" />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <FormControlLabel
                      control={<Checkbox checked={form.tienePassword} onChange={set('tienePassword')} size="small" />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <LockIcon sx={{ fontSize: 15, color: '#64748b' }} />
                          <Typography sx={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                            El dispositivo tiene contraseña de desbloqueo
                          </Typography>
                        </Box>
                      }
                    />
                    {form.tienePassword && (
                      <TextField label="Contraseña de desbloqueo *" value={form.passwordDispositivo}
                        onChange={set('passwordDispositivo')}
                        sx={{ mt: 1.5, width: { xs: '100%', sm: '50%' } }} />
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Paper>

          {/* Fallas */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5 }}>
            <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
              <SeccionHeader icon={ReportProblemIcon} title="Fallas del Dispositivo"
                subtitle={(modoEdicion || modoSoloLectura) ? 'Las fallas no pueden modificarse' : 'Podés agregar múltiples fallas'}
                color="#d97706" />

              {!modoEdicion && !modoSoloLectura && (
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                  <TextField select label="Seleccionar falla" value={form.fallaSeleccionada}
                    onChange={set('fallaSeleccionada')} disabled={!form.idTipo} sx={{ minWidth: 220 }}>
                    <MenuItem value="">Seleccione…</MenuItem>
                    {fallasPorTipo.map(f => <MenuItem key={f.id} value={f}>{f.nombre}</MenuItem>)}
                  </TextField>
                  <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={agregarFalla}
                    disabled={!form.fallaSeleccionada}
                    sx={{ height: 40, borderColor: '#fde68a', color: '#92400e', fontWeight: 700, '&:hover': { borderColor: '#f59e0b', backgroundColor: '#fffbeb' } }}>
                    Agregar
                  </Button>
                  {!form.idTipo && (
                    <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Seleccioná un tipo de dispositivo primero
                    </Typography>
                  )}
                  {form.idTipo && fallasPorTipo.length === 0 && puedeGestionarFallas && (
                    <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={() => setModalFallaOpen(true)}
                      sx={{ height: 40, borderColor: '#fde68a', color: '#92400e', fontWeight: 700, '&:hover': { borderColor: '#f59e0b', backgroundColor: '#fffbeb' } }}>
                      Agregar falla al catálogo
                    </Button>
                  )}
                  {form.idTipo && fallasPorTipo.length === 0 && !puedeGestionarFallas && (
                    <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No hay fallas cargadas para este tipo — pedile a un administrador o encargado que agregue una.
                    </Typography>
                  )}
                </Box>
              )}

              <Box sx={{
                border: form.fallasAgregadas.length ? '1.5px solid #fde68a' : '1.5px dashed #e2e8f0',
                borderRadius: 2, p: 2, minHeight: 60,
                backgroundColor: form.fallasAgregadas.length ? '#fffbeb' : '#fafbfc',
                display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', transition: 'all 0.2s',
              }}>
                {form.fallasAgregadas.length === 0 ? (
                  <Typography sx={{ fontSize: '0.82rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                    No hay fallas agregadas todavía
                  </Typography>
                ) : (
                  form.fallasAgregadas.map(falla => (
                    <Chip key={falla.id} label={falla.nombre} size="small"
                      onDelete={!modoEdicion ? () => quitarFalla(falla) : undefined}
                      deleteIcon={<CloseIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1.5px solid #fde68a', fontWeight: 700,
                        '& .MuiChip-deleteIcon': { color: '#d97706', '&:hover': { color: '#b45309' } } }} />
                  ))
                )}
              </Box>
            </Box>
          </Paper>

          {/* Repuestos */}
          {(modoEdicion || modoSoloLectura) && (
            <Paper elevation={0} sx={{ border: '1.5px solid #ccfbf1', borderRadius: 2.5 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
                <SeccionHeader icon={HandymanIcon} title="Repuestos Utilizados"
                  subtitle={modoSoloLectura ? 'Repuestos registrados en esta orden' : puedeGestionarRepuestos ? 'Podés agregar o quitar repuestos' : 'Gestión disponible en estado "En Reparación"'}
                  color="#0f766e" />

                {loadingEditData ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={28} sx={{ color: '#0f766e' }} />
                  </Box>
                ) : (
                  <>
                    {puedeGestionarRepuestos && !modoSoloLectura && (
                      <Autocomplete
                        options={inventarioParaAutocompletar}
                        getOptionLabel={(o) => o.nombre}
                        getOptionDisabled={(o) => o.sinPrecio}
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
                          inventarioDisponible.length === 0
                            ? 'No hay repuestos con stock. Cargá repuestos desde Compras (clasificación "Repuesto").'
                            : repuestoInput.trim().length < 2
                              ? `Sin sugerencias para ${ordenEditar?.MarcaDispositivo ?? 'este dispositivo'} — escribí para buscar`
                              : 'Sin resultados'
                        }
                        renderOption={(props, option) => (
                          <Box component="li" {...props} key={option.id}
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: '10px !important' }}>
                            <Box>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{option.nombre}</Typography>
                              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>{option.marca} · {option.modelo}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: option.sinPrecio ? '#dc2626' : '#0f766e' }}>
                                {option.sinPrecio ? 'sin precio' : `$${option.precio.toLocaleString('es-AR')}`}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                                <InventoryIcon sx={{ fontSize: 11, color: option.stock <= 3 ? '#dc2626' : '#64748b' }} />
                                <Typography sx={{ fontSize: '0.7rem', color: option.stock <= 3 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                                  {option.stock} en stock
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        )}
                        renderInput={(params) => (
                          <TextField {...params} label="Buscar repuesto"
                            placeholder={`Sugerencias para ${ordenEditar?.MarcaDispositivo ?? 'este dispositivo'} · escribí para buscar más`}
                            slotProps={{
                              input: {
                                ...params.InputProps,
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon sx={{ color: '#0f766e', fontSize: 20 }} />
                                  </InputAdornment>
                                ),
                              },
                            }}
                          />
                        )}
                        sx={{ mb: 2.5 }}
                      />
                    )}

                    {(repuestosOrden.length + repuestosNuevos.length) === 0 ? (
                      <Box sx={{ border: '1.5px dashed #99f6e4', borderRadius: 2, p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, backgroundColor: '#f0fdf9' }}>
                        <HandymanIcon sx={{ fontSize: 28, color: '#5eead4' }} />
                        <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No hay repuestos en esta orden
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ border: '1.5px solid #99f6e4', borderRadius: 2, overflow: 'hidden' }}>
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
                              <TableRow key={`ex-${r.repuestoOrdenId}`}
                                sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { backgroundColor: '#f0fdf9' } }}>
                                <TableCell>
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{r.nombre}</Typography>
                                  <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{r.marca} · {r.modelo}</Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.cantidad}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                    ${r.precioCobrado.toLocaleString('es-AR')}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f766e' }}>
                                    ${(r.precioCobrado * r.cantidad).toLocaleString('es-AR')}
                                  </Typography>
                                </TableCell>
                                {esEstadoReparacion && (
                                  <TableCell>
                                    <IconButton size="small" onClick={() => quitarRepuestoExistente(r.repuestoOrdenId)}
                                      sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626', backgroundColor: '#fef2f2' } }}>
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                            {repuestosNuevos.map(r => (
                              <TableRow key={`new-${r.idInventario}`}
                                sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { backgroundColor: '#f0fdf9' }, backgroundColor: '#f0fdf4' }}>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
                                    <Box>
                                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{r.nombre}</Typography>
                                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{r.marca} · {r.modelo}</Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => cambiarCantidadNuevo(r.idInventario, -1)}
                                      sx={{ width: 26, height: 26, border: '1px solid #e2e8f0', borderRadius: 1, color: '#475569', '&:hover': { borderColor: '#0f766e', color: '#0f766e' } }}>
                                      <RemoveIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', minWidth: 24, textAlign: 'center' }}>{r.cantidad}</Typography>
                                    <IconButton size="small" onClick={() => cambiarCantidadNuevo(r.idInventario, 1)}
                                      sx={{ width: 26, height: 26, border: '1px solid #e2e8f0', borderRadius: 1, color: '#475569', '&:hover': { borderColor: '#0f766e', color: '#0f766e' } }}>
                                      <AddIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                    ${r.precioCobrado.toLocaleString('es-AR')}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f766e' }}>
                                    ${(r.precioCobrado * r.cantidad).toLocaleString('es-AR')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <IconButton size="small" onClick={() => quitarRepuestoNuevo(r.idInventario)}
                                    sx={{ color: '#94a3b8', '&:hover': { color: '#dc2626', backgroundColor: '#fef2f2' } }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#f0fdf9', borderTop: '1.5px solid #99f6e4', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                          <Typography sx={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total repuestos:</Typography>
                          <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#0f766e' }}>
                            ${totalRepuestos.toLocaleString('es-AR')}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Paper>
          )}

          {/* Seña */}
          {!modoEdicion && !modoSoloLectura && (
            <Paper elevation={0} sx={{ border: '1.5px solid #fef3c7', borderRadius: 2.5 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
                <SeccionHeader icon={LocalAtmIcon} title="Seña" subtitle="Monto entregado por el cliente al dejar el equipo (opcional)" color="#d97706" />
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Monto de seña"
                      value={form.montoSena}
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
                  </Grid>
                  {Number(form.montoSena) > 0 && (
                    <Grid size={{ xs: 12, sm: 5 }}>
                      <TextField fullWidth select label="Método de pago *" value={form.idMetodoPagoSena} onChange={set('idMetodoPagoSena')}>
                        {metodosPago.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                      </TextField>
                    </Grid>
                  )}
                  {Number(form.montoSena) > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, background: 'linear-gradient(135deg, #fef9c3, #fef3c7)', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalAtmIcon sx={{ fontSize: 16, color: '#d97706' }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                          Seña registrada: ${Number(form.montoSena).toLocaleString('es-AR')} — El resto se cobrará al entregar.
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Paper>
          )}

          {/* Resumen financiero */}
          {showResumen && (
            <Paper elevation={0} sx={{ border: '1.5px solid #ddd6fe', borderRadius: 2.5 }}>
              <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
                <SeccionHeader icon={ReceiptLongIcon} title="Resumen de Costos" color="#7c3aed" />

                <Box sx={{ border: '1.5px solid #ddd6fe', borderRadius: 2, overflow: 'hidden' }}>

                  {/* Repuestos */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid #ede9fe' }}>
                    <Typography sx={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>Repuestos</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                      ${costoRepuestosDisplay.toLocaleString('es-AR')}
                    </Typography>
                  </Box>

                  {/* Mano de obra */}
                  {puedeEditarManoObra ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: 2.5, py: 1.25, borderBottom: '1px solid #ede9fe', backgroundColor: '#faf5ff' }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#7c3aed', fontWeight: 700 }}>Mano de obra *</Typography>
                      <TextField
                        type="number" size="small"
                        value={form.precioManoObra} onChange={set('precioManoObra')}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0 } } }}
                        placeholder="0"
                        error={Number(form.precioManoObra) < 0}
                        helperText={Number(form.precioManoObra) < 0 ? 'No puede ser negativo' : ''}
                        sx={{ width: 180 }}
                      />
                    </Box>
                  ) : datosFinancieros.precioManoObra > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid #ede9fe' }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#475569', fontWeight: 600 }}>Mano de obra</Typography>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                        ${datosFinancieros.precioManoObra.toLocaleString('es-AR')}
                      </Typography>
                    </Box>
                  )}

                  {/* Seña pagada (se muestra siempre que exista) */}
                  {señaPagada > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid #ede9fe', backgroundColor: '#f0fdf4' }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: 600 }}>Seña pagada</Typography>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#16a34a' }}>
                        − ${señaPagada.toLocaleString('es-AR')}
                      </Typography>
                    </Box>
                  )}

                  {/* Total: "Pendiente" en estado 3, el backend calcula recién al entregar */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                      {showDelivery ? 'A cobrar ahora' : señaPagada > 0 ? 'A cobrar' : 'Total'}
                    </Typography>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, color: '#fff', fontStyle: currentEstadoId === 3 && targetEstadoId !== 4 ? 'italic' : 'normal', opacity: currentEstadoId === 3 && targetEstadoId !== 4 ? 0.75 : 1 }}>
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

                  {/* Método de pago: selector al pasar a estado 4 */}
                  {modoEdicion && targetEstadoId === 4 && (
                    <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid #ddd6fe' }}>
                      <TextField fullWidth select label="Método de pago *" value={form.idMetodoPago} onChange={set('idMetodoPago')}>
                        {metodosPago.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
                      </TextField>
                    </Box>
                  )}

                  {/* Método de pago: solo lectura en orden entregada */}
                  {modoSoloLectura && currentEstadoId === 4 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderTop: '1px solid #ddd6fe', backgroundColor: '#faf5ff' }}>
                      <Typography sx={{ fontSize: '0.875rem', color: '#7c3aed', fontWeight: 600 }}>Método de pago (entrega)</Typography>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#7c3aed' }}>
                        {metodoPagoEntregaNombre ?? (señaPagada >= datosFinancieros.totalReparacion ? 'Cubierto por seña' : '—')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          )}

          {/* Detalles */}
          <Paper elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: 2.5 }}>
            <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
              <SeccionHeader icon={CalendarMonthIcon} title="Detalles de la Orden" color="#7c3aed" />

              {modoSoloLectura ? (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CampoReadonly label="Fecha de Ingreso" value={ordenEditar?.FechaEmision?.split('T')[0] ?? ordenEditar?.FechaEmision ?? '–'} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CampoReadonly label="Estado" value={ordenEditar?.Estado} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CampoReadonly label="Empleado emisor" value={ordenEditar?.NombreEmpleado ? `${ordenEditar.NombreEmpleado} ${ordenEditar.ApellidoEmpleado}`.trim() : '–'} />
                  </Grid>
                  {observacionIngresoOriginal && (
                    <Grid size={{ xs: 12 }}>
                      <CampoReadonly label="Observación de ingreso" value={observacionIngresoOriginal} />
                    </Grid>
                  )}
                  {form.observacionTecnico && (
                    <Grid size={{ xs: 12 }}>
                      <CampoReadonly label="Última observación técnica" value={form.observacionTecnico} />
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField fullWidth type="date" label="Fecha de Ingreso"
                      value={form.fechaIngreso} onChange={set('fechaIngreso')}
                      InputLabelProps={{ shrink: true }} inputProps={{ readOnly: true }}
                      sx={{ '& input': { color: '#94a3b8' } }} />
                  </Grid>

                  {!modoEdicion && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth type="date" label="Fecha de Entrega estimada"
                        value={form.fechaEntrega} onChange={set('fechaEntrega')}
                        InputLabelProps={{ shrink: true }}
                        slotProps={{ htmlInput: { min: hoy() } }} />
                    </Grid>
                  )}

                  {modoEdicion && (
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField fullWidth select label="Estado de la Orden *" value={form.estado} onChange={set('estado')}>
                        <MenuItem value="">Seleccione…</MenuItem>
                        {estadosPermitidos.map(e => <MenuItem key={e.id} value={e.nombre}>{e.nombre}</MenuItem>)}
                      </TextField>
                    </Grid>
                  )}

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 1.75, borderRadius: 2, background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1.5px solid #c4b5fd' }}>
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                        Empleado emisor
                      </Typography>
                      <Typography sx={{ fontWeight: 700, color: '#4c1d95', fontSize: '0.9rem' }}>
                        {usuario?.user || '–'}
                      </Typography>
                    </Box>
                  </Grid>

                  {!modoEdicion && (
                    <Grid size={{ xs: 12 }}>
                      <TextField fullWidth multiline rows={2} label="Observación de ingreso"
                        placeholder="Ej: cliente trae cable de carga, sin tapa trasera…"
                        value={form.observacionIngreso} onChange={set('observacionIngreso')} />
                    </Grid>
                  )}

                  {modoEdicion && observacionIngresoOriginal && (
                    <Grid size={{ xs: 12 }}>
                      <CampoReadonly label="Observación de ingreso" value={observacionIngresoOriginal} />
                    </Grid>
                  )}

                  {modoEdicion && usuario?.rol !== 3 && (
                    <Grid size={{ xs: 12 }}>
                      <TextField fullWidth multiline rows={2} label="Observación técnica"
                        placeholder="Ej: requiere reemplazo de placa, diagnóstico completado…"
                        value={form.observacionTecnico} onChange={set('observacionTecnico')} />
                    </Grid>
                  )}

                </Grid>
              )}
            </Box>
          </Paper>

        </Box>
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, borderTop: '1.5px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        {modoSoloLectura ? (
          <>
            {currentEstadoId === 4 && (
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={generarPDF}
                sx={{ borderColor: '#6d28d9', color: '#6d28d9', '&:hover': { borderColor: '#5b21b6', backgroundColor: '#f5f3ff' } }}>
                Descargar PDF
              </Button>
            )}
            <Button variant="contained" onClick={onClose}
              sx={{ minWidth: 140, backgroundColor: '#4338ca', '&:hover': { backgroundColor: '#3730a3' } }}>
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" onClick={onClose} disabled={loading}
              sx={{ borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#94a3b8' } }}>
              Cancelar
            </Button>
            <Button variant="contained" color={modoEdicion ? 'success' : 'primary'}
              onClick={handleGuardar} disabled={loading}
              startIcon={loading ? <CircularProgress size={15} color="inherit" /> : modoEdicion ? <EditIcon /> : <BuildIcon />}
              sx={{ minWidth: 180 }}>
              {loading ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Registrar Reparación'}
            </Button>
          </>
        )}
      </DialogActions>

      <Snackbar
        open={senaNegativaToast}
        autoHideDuration={3000}
        onClose={() => setSenaNegativaToast(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setSenaNegativaToast(false)}
          sx={{ borderRadius: 2 }}
        >
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

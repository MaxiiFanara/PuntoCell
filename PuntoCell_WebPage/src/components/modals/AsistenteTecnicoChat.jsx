import { useEffect, useMemo, useState } from 'react'
import {
  Drawer, Box, Typography, IconButton, TextField, Button,
  Chip, Divider, CircularProgress, Alert, Paper
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import SendIcon from '@mui/icons-material/Send'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import ElectricBoltOutlinedIcon from '@mui/icons-material/ElectricBoltOutlined'
import PsychologyAltOutlinedIcon from '@mui/icons-material/PsychologyAltOutlined'
import { consultarAsistenteTecnico } from '../../services/api'

const EMPTY_HINT = 'Contale al asistente qué síntomas tiene el equipo, qué probaste y qué necesitás revisar.'

const buildContext = (ordenSeleccionada, usuario) => {
  if (!ordenSeleccionada) return undefined

  return {
    orden: {
      numero: ordenSeleccionada.NumOrden,
      estado: ordenSeleccionada.Estado,
      cliente: `${ordenSeleccionada.ApellidoCliente ?? ''} ${ordenSeleccionada.NombreCliente ?? ''}`.trim() || null,
      dispositivo: `${ordenSeleccionada.MarcaDispositivo ?? ''} ${ordenSeleccionada.ModeloDispositivo ?? ''}`.trim() || null,
      tipoDispositivo: ordenSeleccionada.TipoDispositivo ?? null,
      falla: ordenSeleccionada.Falla ?? null,
      fallas: ordenSeleccionada.Fallas ?? [],
      tecnico: `${ordenSeleccionada.ApellidoEmpleado ?? ''} ${ordenSeleccionada.NombreEmpleado ?? ''}`.trim() || null,
      fechaEmision: ordenSeleccionada.FechaEmision ?? null,
      fechaEntrega: ordenSeleccionada.FechaEntrega ?? null,
    },
    tecnicoActual: usuario ? {
      id: usuario.userID ?? usuario.id ?? null,
      nombre: usuario.nombre ?? usuario.user ?? null,
      rol: usuario.rol ?? null,
      sucursal: usuario.sucursal ?? null,
    } : undefined,
  }
}

const Bubble = ({ role, children }) => (
  <Box sx={{ display: 'flex', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }}>
    <Paper
      elevation={0}
      sx={{
        maxWidth: '86%',
        px: 1.5,
        py: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: role === 'user' ? 'primary.light' : 'divider',
        bgcolor: role === 'user' ? 'pc.accentSoft' : 'background.paper',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <Typography sx={{ fontSize: '.875rem', lineHeight: 1.55 }}>{children}</Typography>
    </Paper>
  </Box>
)

export default function AsistenteTecnicoChat({ open, onClose, ordenSeleccionada, usuario }) {
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Escribí un síntoma, una sospecha o lo que ya mediste. Si hay una orden seleccionada, voy a usar ese contexto automáticamente.',
    },
  ])

  const contexto = useMemo(() => buildContext(ordenSeleccionada, usuario), [ordenSeleccionada, usuario])
  const historialParaIA = useMemo(() => conversation.slice(-8), [conversation])

  useEffect(() => {
    if (!open) return
    setError('')
  }, [open])

  useEffect(() => {
    if (!ordenSeleccionada) return
    const msg = `Contexto cargado desde la orden #${ordenSeleccionada.NumOrden}`
    setConversation((prev) => (prev.some((item) => item.role === 'system' && item.text === msg)
      ? prev
      : [...prev, { role: 'system', text: msg }]
    ))
  }, [ordenSeleccionada])

  const limpiar = () => {
    setConversation([
      {
        role: 'assistant',
        text: 'Chat reiniciado. Volvé a contarme el caso técnico.',
      },
    ])
    setMensaje('')
    setError('')
  }

  const enviar = async () => {
    const texto = mensaje.trim()
    if (texto.length < 3 || loading) return

    setConversation((prev) => [...prev, { role: 'user', text: texto }])
    setMensaje('')
    setLoading(true)
    setError('')

    try {
      const data = await consultarAsistenteTecnico({
        mensaje: texto,
        contexto,
        historial: historialParaIA,
      })

      setConversation((prev) => [...prev, { role: 'assistant', text: data?.respuesta || 'No hubo respuesta del asistente.' }])
    } catch (err) {
      setError(err.message || 'No se pudo consultar al asistente técnico.')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      enviar()
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: 440 },
            display: 'flex',
            flexDirection: 'column',
            borderLeft: 1,
            borderColor: 'divider',
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box sx={{ width: 38, height: 38, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'pc.accentSoft', color: 'primary.main', flex: 'none' }}>
            <SmartToyOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, letterSpacing: '-.02em' }}>Asistente técnico</Typography>
            <Typography sx={{ fontSize: '.8rem', color: 'text.secondary' }}>Diagnóstico guiado con IA</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar chatbot" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.25, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip icon={<BuildOutlinedIcon />} label={ordenSeleccionada ? `Orden #${ordenSeleccionada.NumOrden}` : 'Sin orden seleccionada'} size="small" />
          <Chip icon={<ElectricBoltOutlinedIcon />} label={ordenSeleccionada?.Estado ?? 'Estado no cargado'} size="small" variant="outlined" />
        </Box>
        <Typography sx={{ fontSize: '.85rem', color: 'text.secondary', lineHeight: 1.45 }}>
          {ordenSeleccionada
            ? 'Usa el contexto de la orden seleccionada para preguntar sobre síntomas, pruebas, componentes o próximos pasos.'
            : 'Podés preguntar igual; si seleccionás una orden, el contexto técnico se agrega automáticamente.'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'background.default' }}>
        {conversation.map((item, index) => (
          item.role === 'system' ? (
            <Alert key={`${item.role}-${index}`} severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
              {item.text}
            </Alert>
          ) : (
            <Bubble key={`${item.role}-${index}`} role={item.role}>{item.text}</Bubble>
          )
        ))}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'text.secondary' }}>
            <CircularProgress size={18} thickness={5} />
            <Typography sx={{ fontSize: '.875rem' }}>Consultando al asistente...</Typography>
          </Box>
        )}

        {error && <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>{error}</Alert>}
      </Box>

      <Divider />

      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={limpiar}
          disabled={loading}
          sx={{ alignSelf: 'flex-start' }}
        >
          Nueva conversación
        </Button>
        <TextField
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={EMPTY_HINT}
          multiline
          minRows={3}
          maxRows={6}
          fullWidth
          helperText={mensaje.trim().length > 0 && mensaje.trim().length < 3 ? 'El mensaje debe tener al menos 3 caracteres.' : 'Enter envía el mensaje. Shift+Enter permite saltos de línea.'}
          error={mensaje.trim().length > 0 && mensaje.trim().length < 3}
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={enviar}
            disabled={loading || mensaje.trim().length < 3}
            sx={{ flex: 1 }}
          >
            Enviar
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
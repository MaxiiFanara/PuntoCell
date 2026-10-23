import { useEffect, useMemo, useState } from 'react'
import {
  Drawer, Box, Typography, IconButton, TextField, Button,
  Chip, Divider, CircularProgress, Alert, Paper
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import SendIcon from '@mui/icons-material/Send'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined'
import { consultarAsistenteUsuario } from '../../services/api'
import MarkdownMessage from '../ui/MarkdownMessage'

const buildContext = ({ pantalla, usuario }) => ({
  pantalla: pantalla ?? null,
  usuario: usuario ? {
    id: usuario.userID ?? usuario.id ?? null,
    nombre: usuario.nombre ?? usuario.user ?? null,
    rol: usuario.rol ?? null,
    sucursal: usuario.sucursal ?? null,
  } : null,
})

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
        wordBreak: 'break-word',
      }}
    >
      <MarkdownMessage text={children} />
    </Paper>
  </Box>
)

export default function AsistenteUsuarioChat({ open, onClose, usuario, pantalla }) {
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Preguntame cómo usar una pantalla, dónde encontrar una opción o qué significa un campo. Voy a usar el contexto de la sección actual para responderte como manual guiado.',
    },
  ])

  const contexto = useMemo(() => buildContext({ pantalla, usuario }), [pantalla, usuario])
  const historialParaIA = useMemo(() => conversation.slice(-8), [conversation])

  useEffect(() => {
    if (!open) return
    setError('')
  }, [open])

  const limpiar = () => {
    setConversation([
      {
        role: 'assistant',
        text: 'Chat reiniciado. Decime qué querés hacer en el sistema y te voy guiando paso a paso.',
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
      const data = await consultarAsistenteUsuario({
        mensaje: texto,
        contexto,
        historial: historialParaIA,
      })

      setConversation((prev) => [...prev, { role: 'assistant', text: data?.respuesta || 'No hubo respuesta del asistente.' }])
    } catch (err) {
      setError(err.message || 'No se pudo consultar al asistente de usuario.')
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
            <SupportAgentOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, letterSpacing: '-.02em' }}>Asistente de usuario</Typography>
            <Typography sx={{ fontSize: '.8rem', color: 'text.secondary' }}>Manual guiado del sistema</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar asistente de usuario" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.25, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip icon={<MenuBookOutlinedIcon />} label={pantalla?.nombre ?? 'Sistema'} size="small" />
          <Chip icon={<InfoOutlinedIcon />} label={usuario ? (usuario.rol === 1 || usuario.rol === 2 ? 'Acceso administrativo' : 'Usuario común') : 'Sesión activa'} size="small" variant="outlined" />
        </Box>
        <Typography sx={{ fontSize: '.85rem', color: 'text.secondary', lineHeight: 1.45 }}>
          {pantalla?.detalle
            ? pantalla.detalle
            : 'Describime qué querés hacer y te indico los pasos dentro de la sección actual.'}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'background.default' }}>
        {conversation.map((item, index) => (
          <Bubble key={`${item.role}-${index}`} role={item.role}>{item.text}</Bubble>
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
          Reiniciar conversación
        </Button>
        <TextField
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Por ejemplo: ¿Cómo registro una venta?"
          multiline
          minRows={4}
          maxRows={8}
          fullWidth
          disabled={loading}
          helperText="Enter envía. Shift+Enter agrega una nueva línea."
        />
        <Button
          variant="contained"
          endIcon={<SendIcon />}
          onClick={enviar}
          disabled={loading || mensaje.trim().length < 3}
          sx={{ alignSelf: 'flex-end' }}
        >
          Consultar
        </Button>
      </Box>
    </Drawer>
  )
}
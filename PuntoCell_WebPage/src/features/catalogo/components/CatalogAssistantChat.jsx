import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import SendIcon from '@mui/icons-material/Send'
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined'
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'

import { consultarAsistenteCatalogo } from '../../../services/api'
import MarkdownMessage from '../../../components/ui/MarkdownMessage'
import { useProducts } from '../context/ProductContext'

const buildContext = ({ pathname, product, categories }) => ({
  pantalla: pathname.startsWith('/catalogo/product/')
    ? 'Detalle de producto'
    : pathname === '/catalogo'
      ? 'Catálogo principal'
      : 'Catálogo online',
  ruta: pathname,
  productoActual: product ? {
    id: product.id,
    nombre: product.name,
    categoria: product.category,
    precio: product.price,
    stock: product.stock,
    sucursal: product.sucursal || null,
    memoria: product.dimensions || null,
    descripcion: product.description || null,
  } : null,
  categoriasDisponibles: categories.slice(0, 12),
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

export default function CatalogAssistantChat() {
  const { pathname } = useLocation()
  const { id } = useParams()
  const { products, getCategories, loading } = useProducts()

  const [open, setOpen] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const [error, setError] = useState('')
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      text: 'Decime qué celular estás mirando, qué presupuesto tenés o cuál querés comparar. Puedo ayudarte a elegir una opción del catálogo con stock real.',
    },
  ])

  const categories = useMemo(() => getCategories(), [getCategories, products])

  const currentProduct = useMemo(() => {
    if (!id) return null
    return products.find((product) => String(product.id) === String(id)) ?? null
  }, [id, products])

  const contexto = useMemo(() => buildContext({ pathname, product: currentProduct, categories }), [pathname, currentProduct, categories])
  const historialParaIA = useMemo(() => conversation.slice(-8), [conversation])

  useEffect(() => {
    if (!open) return
    setError('')
  }, [open])

  const limpiar = () => {
    setConversation([
      {
        role: 'assistant',
        text: 'Chat reiniciado. Decime qué buscás y te comparo opciones del catálogo.',
      },
    ])
    setMensaje('')
    setError('')
  }

  const enviar = async () => {
    const texto = mensaje.trim()
    if (texto.length < 3 || loadingChat) return

    setConversation((prev) => [...prev, { role: 'user', text: texto }])
    setMensaje('')
    setLoadingChat(true)
    setError('')

    try {
      const data = await consultarAsistenteCatalogo({
        mensaje: texto,
        contexto,
        historial: historialParaIA,
      })

      setConversation((prev) => [...prev, { role: 'assistant', text: data?.respuesta || 'No hubo respuesta del asistente.' }])
    } catch (err) {
      setError(err.message || 'No se pudo consultar al asistente de catálogo.')
    } finally {
      setLoadingChat(false)
    }
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      enviar()
    }
  }

  const setPrompt = (value) => {
    setMensaje(value)
    setOpen(true)
  }

  return (
    <>
      <Zoom in>
        <Tooltip title="Ayuda para elegir" placement="left" arrow disableTouchListener>
          <Fab
            onClick={() => setOpen(true)}
            aria-label="Abrir asistente de catálogo"
            sx={(theme) => ({
              position: 'fixed',
              bottom: 28 + 52 + 14 + 52 + 14,
              right: 28,
              width: 52,
              height: 52,
              minHeight: 52,
              zIndex: theme.zIndex.fab,
              bgcolor: 'text.primary',
              color: 'background.default',
              boxShadow: 'var(--pc-palette-pc-lift)',
              transition: 'transform 160ms cubic-bezier(.23,1,.32,1), background-color 180ms ease',
              '@media (hover: hover) and (pointer: fine)': {
                '&:hover': { bgcolor: 'pc.surfaceMuted' },
              },
              '&:active': { transform: 'scale(.94)' },
              '@media print': { display: 'none' },
            })}
          >
            <SupportAgentOutlinedIcon sx={{ fontSize: 26 }} />
          </Fab>
        </Tooltip>
      </Zoom>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100vw', sm: 460 },
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
              <Typography sx={{ fontWeight: 800, letterSpacing: '-.02em' }}>Asistente de catálogo</Typography>
              <Typography sx={{ fontSize: '.8rem', color: 'text.secondary' }}>Elegí y compará con OpenRouter</Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setOpen(false)} aria-label="Cerrar asistente de catálogo" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip icon={<CategoryOutlinedIcon />} label={contexto.pantalla} size="small" />
            <Chip icon={<PhoneAndroidOutlinedIcon />} label={currentProduct ? currentProduct.name : (loading ? 'Catálogo cargando...' : `${products.length} productos`)} size="small" variant="outlined" />
          </Box>
          <Typography sx={{ fontSize: '.85rem', color: 'text.secondary', lineHeight: 1.45 }}>
            {currentProduct
              ? 'Si querés, comparo este equipo con otros del catálogo o te digo qué conviene según tu presupuesto.'
              : 'Preguntame por un modelo, una categoría o un rango de precio y te ayudo a elegir entre las opciones disponibles.'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<CompareArrowsOutlinedIcon />} onClick={() => setPrompt('Compará los mejores celulares de este catálogo y recomendame el más conveniente según precio y stock')}>
              Comparar
            </Button>
            <Button size="small" variant="outlined" startIcon={<PhoneAndroidOutlinedIcon />} onClick={() => setPrompt('Ayudame a elegir un celular según presupuesto y uso')}>
              Ayudarme a elegir
            </Button>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: 'background.default' }}>
          {conversation.map((item, index) => (
            <Bubble key={`${item.role}-${index}`} role={item.role}>{item.text}</Bubble>
          ))}

          {loadingChat && (
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
            disabled={loadingChat}
            sx={{ alignSelf: 'flex-start' }}
          >
            Reiniciar conversación
          </Button>
          <TextField
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Por ejemplo: ¿Qué celular me conviene para fotos y batería?"
            multiline
            minRows={3}
            maxRows={6}
            fullWidth
            disabled={loadingChat}
            helperText="Enter envía. Shift+Enter agrega una nueva línea."
          />
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={enviar}
            disabled={loadingChat || mensaje.trim().length < 3}
            sx={{ alignSelf: 'flex-end' }}
          >
            Consultar
          </Button>
        </Box>
      </Drawer>
    </>
  )
}
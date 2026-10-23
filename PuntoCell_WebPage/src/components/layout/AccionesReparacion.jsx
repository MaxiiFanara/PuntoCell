import { Button, Box, Paper, Tooltip, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import SearchIcon from '@mui/icons-material/Search'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

const ActionGroup = ({ label, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Box sx={{ typography: 'eyebrow', color: 'text.disabled', px: 0.5 }}>{label}</Box>
    <Box sx={{ display: 'flex', gap: 1 }}>{children}</Box>
  </Box>
)

const AccionesReparacion = ({
  permisos,
  ordenSeleccionada,
  onNuevaReparacion,
  onModificar,
  onVerDetalle,
  onAnular,
  onRegistrarCliente,
  onRegistrarDispositivo,
  onBuscarCliente,
  onBuscarDispositivo,
  onAbrirAsistente,
}) => {
  const hayOrden    = Boolean(ordenSeleccionada)
  const estadoOrden = ordenSeleccionada?.IdEstadoOrden
  const esTerminal  = [4, 5].includes(estadoOrden) ||
    (permisos.estadoMaxEdicion != null && estadoOrden > permisos.estadoMaxEdicion)
  // Atención puede modificar únicamente órdenes en estado Terminado (3) para pasar a Entregado
  const puedeModificarBtn = permisos.puedeModificar ||
    (permisos.puedeEntregarOrden && !permisos.puedeModificar && ordenSeleccionada?.IdEstadoOrden === 3)

  return (
    <Paper sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-end', p: '13px 15px' }}>
      {/* Grupo: Órdenes */}
      <ActionGroup label="Órdenes">
        {permisos.puedeRegistrar && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onNuevaReparacion}>
            Registrar Reparación
          </Button>
        )}

        {puedeModificarBtn && (
          <Tooltip
            title={
              !hayOrden   ? 'Seleccioná una fila en la tabla primero' :
              esTerminal  ? 'Las órdenes entregadas o anuladas no pueden modificarse' :
              permisos.puedeEntregarOrden && !permisos.puedeModificar && ordenSeleccionada?.IdEstadoOrden !== 3
                ? 'Solo podés modificar órdenes en estado Terminado' :
              ''
            }
            arrow
          >
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={<EditIcon />}
                onClick={onModificar}
                disabled={!hayOrden || esTerminal}
              >
                Modificar
              </Button>
            </span>
          </Tooltip>
        )}

        {permisos.puedeVerDetalle && (
          <Tooltip title={!hayOrden ? 'Seleccioná una fila en la tabla primero' : ''} arrow>
            <span>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<VisibilityIcon />}
                onClick={onVerDetalle}
                disabled={!hayOrden}
              >
                Ver detalle
              </Button>
            </span>
          </Tooltip>
        )}

        {permisos.puedeAnular && (
          <Tooltip title={!hayOrden ? 'Seleccioná una fila en la tabla primero' : ''} arrow>
            <span>
              <Button
                variant="contained"
                color="error"
                startIcon={<BlockIcon />}
                onClick={onAnular}
                disabled={!hayOrden}
              >
                Anular
              </Button>
            </span>
          </Tooltip>
        )}
      </ActionGroup>

      <Divider orientation="vertical" flexItem sx={{ alignSelf: 'stretch', my: 0.5 }} />

      {/* Grupo: Clientes */}
      <ActionGroup label="Clientes">
        <Button variant="outlined" startIcon={<SearchIcon />} onClick={onBuscarCliente}>
          Buscar Cliente
        </Button>
        {permisos.puedeRegistrar && (
          <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={onRegistrarCliente}>
            Registrar Cliente
          </Button>
        )}
      </ActionGroup>

      <Divider orientation="vertical" flexItem sx={{ alignSelf: 'stretch', my: 0.5 }} />

      {/* Grupo: Dispositivos */}
      <ActionGroup label="Dispositivos">
        <Button variant="outlined" startIcon={<SearchIcon />} onClick={onBuscarDispositivo}>
          Buscar Dispositivo
        </Button>
        {permisos.puedeRegistrar && (
          <Button variant="outlined" startIcon={<PhoneAndroidIcon />} onClick={onRegistrarDispositivo}>
            Registrar Dispositivo
          </Button>
        )}
        {onAbrirAsistente && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<SmartToyOutlinedIcon />}
            onClick={onAbrirAsistente}
            sx={{
              borderRadius: '999px',
              boxShadow: (theme) => theme.vars.palette.pc.lift,
            }}
          >
            Asistente técnico
          </Button>
        )}
      </ActionGroup>

      {/* Indicador de selección */}
      {hayOrden && (
        <>
          <Box sx={{ flex: 1, display: { xs: 'none', lg: 'block' } }} />
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 1.75, py: 1, borderRadius: '9px',
            bgcolor: 'pc.accentSoft', color: 'primary.main',
            alignSelf: 'flex-end',
          }}>
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            <Box>
              <Box sx={{ fontSize: '.72rem', fontWeight: 800, lineHeight: 1.2 }} className="mono">
                Orden #{ordenSeleccionada.NumOrden}
              </Box>
              <Box sx={{ fontSize: '.68rem', lineHeight: 1.3, opacity: .8 }}>
                {ordenSeleccionada.ApellidoCliente}, {ordenSeleccionada.NombreCliente} · {ordenSeleccionada.Estado}
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  )
}

export default AccionesReparacion

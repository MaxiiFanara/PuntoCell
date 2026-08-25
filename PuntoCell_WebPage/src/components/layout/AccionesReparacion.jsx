import { Button, Box, Tooltip, Divider, Typography, alpha } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import VisibilityIcon from '@mui/icons-material/Visibility'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import SearchIcon from '@mui/icons-material/Search'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

const ActionGroup = ({ label, children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', px: 0.5 }}>
      {label}
    </Typography>
    <Box sx={{ display: 'flex', gap: 1 }}>
      {children}
    </Box>
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
}) => {
  const hayOrden    = Boolean(ordenSeleccionada)
  const estadoOrden = ordenSeleccionada?.IdEstadoOrden
  const esTerminal  = [4, 5].includes(estadoOrden) ||
    (permisos.estadoMaxEdicion != null && estadoOrden > permisos.estadoMaxEdicion)
  // Atención puede modificar únicamente órdenes en estado Terminado (3) para pasar a Entregado
  const puedeModificarBtn = permisos.puedeModificar ||
    (permisos.puedeEntregarOrden && !permisos.puedeModificar && ordenSeleccionada?.IdEstadoOrden === 3)

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        alignItems: 'flex-end',
        mb: 3,
        p: 2.5,
        backgroundColor: '#fff',
        borderRadius: 3,
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Grupo: Órdenes */}
      <ActionGroup label="Órdenes">
        {permisos.puedeRegistrar && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onNuevaReparacion}
            size="medium"
          >
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
                size="medium"
              >
                Modificar
              </Button>
            </span>
          </Tooltip>
        )}

        {permisos.puedeVerDetalle && (
          <Tooltip
            title={!hayOrden ? 'Seleccioná una fila en la tabla primero' : ''}
            arrow
          >
            <span>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={onVerDetalle}
                disabled={!hayOrden}
                size="medium"
                sx={{ backgroundColor: '#4338ca', '&:hover': { backgroundColor: '#3730a3' } }}
              >
                Ver detalle
              </Button>
            </span>
          </Tooltip>
        )}

        {permisos.puedeAnular && (
          <Tooltip
            title={!hayOrden ? 'Seleccioná una fila en la tabla primero' : ''}
            arrow
          >
            <span>
              <Button
                variant="contained"
                color="error"
                startIcon={<BlockIcon />}
                onClick={onAnular}
                disabled={!hayOrden}
                size="medium"
              >
                Anular
              </Button>
            </span>
          </Tooltip>
        )}
      </ActionGroup>

      <Divider orientation="vertical" flexItem sx={{ alignSelf: 'stretch', borderColor: '#f1f5f9', my: 0.5 }} />

      {/* Grupo: Clientes */}
      <ActionGroup label="Clientes">
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={onBuscarCliente}
          size="medium"
          sx={{ borderColor: '#e2e8f0', color: '#475569', backgroundColor: '#f8fafc', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' } }}
        >
          Buscar Cliente
        </Button>
        {permisos.puedeRegistrar && (
          <Button
            variant="outlined"
            startIcon={<PersonAddIcon />}
            onClick={onRegistrarCliente}
            size="medium"
            sx={{ borderColor: '#e2e8f0', color: '#475569', backgroundColor: '#f8fafc', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' } }}
          >
            Registrar Cliente
          </Button>
        )}
      </ActionGroup>

      <Divider orientation="vertical" flexItem sx={{ alignSelf: 'stretch', borderColor: '#f1f5f9', my: 0.5 }} />

      {/* Grupo: Dispositivos */}
      <ActionGroup label="Dispositivos">
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={onBuscarDispositivo}
          size="medium"
          sx={{ borderColor: '#e2e8f0', color: '#475569', backgroundColor: '#f8fafc', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' } }}
        >
          Buscar Dispositivo
        </Button>
        {permisos.puedeRegistrar && (
          <Button
            variant="outlined"
            startIcon={<PhoneAndroidIcon />}
            onClick={onRegistrarDispositivo}
            size="medium"
            sx={{ borderColor: '#e2e8f0', color: '#475569', backgroundColor: '#f8fafc', '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f1f5f9' } }}
          >
            Registrar Dispositivo
          </Button>
        )}
      </ActionGroup>

      {/* Indicador de selección */}
      {hayOrden && (
        <>
          <Box sx={{ flex: 1, display: { xs: 'none', lg: 'block' } }} />
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 2, py: 1, borderRadius: 2.5,
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: '1.5px solid #bfdbfe',
            alignSelf: 'flex-end',
          }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
            <Box>
              <Typography sx={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 800, lineHeight: 1.2 }}>
                Orden #{ordenSeleccionada.NumOrden}
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#60a5fa', lineHeight: 1 }}>
                {ordenSeleccionada.ApellidoCliente}, {ordenSeleccionada.NombreCliente} · {ordenSeleccionada.Estado}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}

export default AccionesReparacion

import { useState } from 'react';
import { Alert, Box, Button, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useVenta } from '../context/VentaContext';
import { clientesService } from '../../../services/clientesServices';

export const ClienteSection = ({ onOpenNuevoCliente }) => {
  const { cliente, setCliente } = useVenta();
  const [dni, setDni] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [dniOcupadoPorNoCliente, setDniOcupadoPorNoCliente] = useState(false);

  const handleBuscar = async () => {
    if (!dni || dni.length < 7) {
      alert('El DNI debe tener al menos 7 números');
      return;
    }

    setBuscando(true);
    setNoEncontrado(false);
    setDniOcupadoPorNoCliente(false);

    try {
      const response = await clientesService.buscarPorDni(dni);
      // buscarPorDni ya devuelve el objeto usuario (o null) — no viene envuelto en { data }
      let data = response?.data ?? response ?? null;
      let clienteEncontrado = null;

      if (Array.isArray(data)) {
        clienteEncontrado = data.find(c =>
          (String(c.DNI) === String(dni) ||
           String(c.Dni) === String(dni) ||
           String(c.dni) === String(dni))
          &&
          (c.EsCliente === true || c.esCliente === true || c.EsCliente === 1)
        );
      } else if (data) {
        if (
          (String(data.DNI) === String(dni) ||
           String(data.Dni) === String(dni) ||
           String(data.dni) === String(dni))
          &&
          (data.EsCliente === true || data.esCliente === true || data.EsCliente === 1)
        ) {
          clienteEncontrado = data;
        }
      }

      if (clienteEncontrado && (clienteEncontrado.Id || clienteEncontrado.id)) {
        const nombreReal = clienteEncontrado.Nombre || clienteEncontrado.nombre || '';
        const apellidoReal = clienteEncontrado.Apellido || clienteEncontrado.apellido || '';
        const dniReal = clienteEncontrado.DNI || clienteEncontrado.Dni || clienteEncontrado.dni || dni;

        setCliente({
          id: clienteEncontrado.Id || clienteEncontrado.id,
          nombre: `${nombreReal} ${apellidoReal}`.trim() || 'Cliente sin nombre',
          dni: dniReal
        });
        setDni('');
      } else {
        // No hay ningún cliente con ese DNI, pero el DNI es único a nivel de TODA la
        // tabla Usuario — si ya lo tiene un empleado, el alta de cliente fallaría en el
        // backend con "El DNI ya está registrado". Lo chequeamos antes de ofrecer
        // "Registrar Cliente" para no mandar al usuario a un alta que va a rebotar.
        const ocupadoPorNoCliente = await clientesService.existeComoNoCliente(dni);
        if (ocupadoPorNoCliente) {
          setDniOcupadoPorNoCliente(true);
        }
        setNoEncontrado(true);
      }
    } catch (error) {
      console.error("❌ Error buscando cliente:", error);
      setNoEncontrado(true);
    } finally {
      setBuscando(false);
    }
  };

  const limpiarCliente = () => {
    setCliente(null);
    setNoEncontrado(false);
    setDniOcupadoPorNoCliente(false);
    setDni('');
  };

  const iniciales = cliente?.nombre
    ? cliente.nombre.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
        p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
      }}>
        <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>Cliente</Typography>
        {cliente && (
          <Tooltip title="Cambiar cliente">
            <IconButton size="small" onClick={limpiarCliente} aria-label="Cambiar cliente">
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {cliente ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '13px 15px' }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%', flex: 'none',
            bgcolor: 'primary.main', color: 'primary.contrastText',
            display: 'grid', placeItems: 'center', fontSize: '.72rem', fontWeight: 700,
          }}>
            {iniciales}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>
              {cliente.nombre}
            </Typography>
            <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem', mt: '-2px' }}>
              DNI {cliente.dni}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ p: '13px 15px', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box component="label" htmlFor="dni-cliente" sx={{ typography: 'eyebrow', color: 'text.disabled' }}>
              DNI del cliente
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                id="dni-cliente"
                fullWidth
                className="mono"
                placeholder="Sin puntos"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                slotProps={{
                  input: {
                    className: 'mono',
                    startAdornment: <SearchIcon sx={{ fontSize: 15, color: 'text.disabled', mr: 0.75 }} />,
                  },
                }}
              />
              <Button variant="contained" onClick={handleBuscar} disabled={buscando} sx={{ flex: 'none' }}>
                {buscando ? 'Buscando…' : 'Buscar'}
              </Button>
            </Box>
          </Box>

          {noEncontrado && dniOcupadoPorNoCliente && (
            <Alert severity="error">
              Ese DNI ya pertenece a otro usuario del sistema y no es cliente. No se puede registrar como cliente nuevo.
            </Alert>
          )}

          {noEncontrado && !dniOcupadoPorNoCliente && (
            <Alert
              severity="warning"
              action={
                <Button size="small" color="inherit" onClick={() => onOpenNuevoCliente(dni)}>
                  Registrar
                </Button>
              }
            >
              Cliente no encontrado
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};

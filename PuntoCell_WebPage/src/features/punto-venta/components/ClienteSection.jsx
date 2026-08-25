import { useState } from 'react';
import {
  TextField, Button, Alert, Box, Paper, Typography,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { useVenta } from '../context/VentaContext';
import { clientesService } from '../../../services/clientesServices';

export const ClienteSection = ({ onOpenNuevoCliente }) => {
  const { cliente, setCliente, nombreSucursal } = useVenta();
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

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* HEADER DE SUCURSAL */}
      <Box sx={{ bgcolor: 'grey.800', color: 'white', p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <StoreIcon />
        <Typography sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>
          Sucursal {nombreSucursal || 'Centro'}
        </Typography>
      </Box>

      {/* ZONA DE BÚSQUEDA O CLIENTE ACTIVO */}
      <Box sx={{ flex: 1 }}>
        {!cliente ? (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="DNI del Cliente"
                variant="outlined"
                size="small"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleBuscar}
                disabled={buscando}
                sx={{ 
                  bgcolor: '#1976d2', 
                  boxShadow: 'none',
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </Button>
            </Box>

            {/* ALERTA DE NO ENCONTRADO */}
            {noEncontrado && dniOcupadoPorNoCliente && (
              <Alert
                severity="error"
                sx={{ mt: 2, borderRadius: 2, alignItems: 'center' }}
              >
                <Typography sx={{ fontWeight: 'bold' }}>
                  Ese DNI ya pertenece a otro usuario del sistema (no es cliente). No se puede registrar como cliente nuevo.
                </Typography>
              </Alert>
            )}
            {noEncontrado && !dniOcupadoPorNoCliente && (
              <Alert
                severity="warning"
                sx={{ mt: 2, borderRadius: 2, alignItems: 'center' }}
              >
                <Typography sx={{ fontWeight: 'bold', color: '#9a3412', mb: 1 }}>
                  Cliente no encontrado
                </Typography>
               <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  onClick={() => onOpenNuevoCliente(dni)}
                  sx={{ py: 1, borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                >
                  ➕ Registrar Cliente
                </Button>
              </Alert>
            )}
          </>
        ) : (
          <Alert
            severity="success"
            sx={{ display: 'flex', alignItems: 'center' }}
            action={
              <Button
                size="small"
                color="error"
                onClick={limpiarCliente}
                startIcon={<CloseIcon />}
                sx={{ textTransform: 'none' }}
              >
                Cambiar
              </Button>
            }
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#14532d' }}>
              <PersonIcon color="success" />
              <Typography sx={{ fontWeight: 'bold' }}>{cliente.nombre}</Typography>
            </Box>
          </Alert>
        )}
      </Box>
    </Paper>
  );
};
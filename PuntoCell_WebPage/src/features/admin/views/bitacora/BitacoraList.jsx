import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  InputAdornment, 
  Chip, 
  Box, 
  Typography, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';

// Importaciones directas de iconos
import Security from '@mui/icons-material/Security';
import Search from '@mui/icons-material/Search';
import Login from '@mui/icons-material/Login';
import Warning from '@mui/icons-material/Warning';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import Inventory from '@mui/icons-material/Inventory';
import Delete from '@mui/icons-material/Delete';
import Info from '@mui/icons-material/Info';
import Person from '@mui/icons-material/Person';

const BitacoraList = () => {
  // --- ESTADOS: FILTROS ---
  const [filtros, setFiltros] = useState({
    buscar: '',
    fecha: ''
  });

  // --- MOCK DATA: Registros de Auditoría ---
  const [logs] = useState([
    { id: 1, hora: '16/05 14:30:12', sucursal: 'Centro', usuario: 'simon.admin', accion: 'Login Exitoso', detalle: 'Usuario ingresó al sistema', ip: '192.168.1.15' },
    { id: 2, hora: '16/05 14:35:00', sucursal: 'Centro', usuario: 'simon.admin', accion: 'Nueva Venta', detalle: 'Ticket #4582 generado por U$S 1200', ip: '192.168.1.15' },
    { id: 3, hora: '16/05 15:10:45', sucursal: 'La Calera', usuario: 'carlos.vend', accion: 'Login Fallido', detalle: 'Contraseña incorrecta (Intento 1)', ip: '190.22.45.11' },
    { id: 4, hora: '16/05 15:20:10', sucursal: 'Global', usuario: 'Sistema / Anónimo', accion: 'Anular Venta', detalle: 'Se solicitó anulación de Ticket #4580', ip: '127.0.0.1' },
    { id: 5, hora: '16/05 16:05:00', sucursal: 'Centro', usuario: 'simon.admin', accion: 'Ajuste de Inventario', detalle: 'Stock actualizado para iPhone 15 Pro', ip: '192.168.1.15' },
    { id: 6, hora: '16/05 16:30:22', sucursal: 'Centro', usuario: 'ana.vend', accion: 'Consulta Cliente', detalle: 'Búsqueda de historial DNI 35123456', ip: '192.168.1.20' }
  ]);

  // --- LÓGICA DE FILTRADO LOCAL ---
  const logsFiltrados = logs.filter(log => {
    const coincideTexto = log.usuario.toLowerCase().includes(filtros.buscar.toLowerCase()) || 
                          log.accion.toLowerCase().includes(filtros.buscar.toLowerCase()) ||
                          log.detalle.toLowerCase().includes(filtros.buscar.toLowerCase());
    return coincideTexto;
  });

  // --- MANEJADORES ---
  const handleFiltrar = (e) => {
    e.preventDefault();
    console.log("Aplicando filtros:", filtros);
  };

  const limpiarFiltros = () => {
    setFiltros({ buscar: '', fecha: '' });
  };

  // --- FUNCIÓN HELPER: Estilos según la acción adaptado a colores de MUI ---
  const getEstiloAccion = (accion) => {
    const acc = accion.toLowerCase();
    if (acc.includes('login') && !acc.includes('fallido')) return { color: 'info.main', Icono: Login };
    if (acc.includes('fallido')) return { color: 'error.main', Icono: Warning };
    if (acc.includes('venta')) return { color: 'success.main', Icono: ShoppingCart };
    if (acc.includes('inventario') || acc.includes('stock')) return { color: 'warning.main', Icono: Inventory };
    if (acc.includes('eliminar') || acc.includes('anular')) return { color: 'error.main', Icono: Delete };
    return { color: 'text.secondary', Icono: Info }; // Por defecto
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' }, 
          mb: 4, 
          gap: 2 
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}
        >
          <Security color="action" fontSize="large" /> 
          Bitácora de Seguridad
        </Typography>
        <Chip 
          label="Últimos 200 movimientos" 
          size="small" 
          sx={{ bgcolor: 'action.selected', color: 'text.secondary', fontWeight: 'bold' }} 
        />
      </Box>

      {/* PANEL DE BÚSQUEDA */}
      <Paper elevation={1} sx={{ p: 2.5, mb: 4 }}>
        <Box 
          component="form" 
          onSubmit={handleFiltrar} 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 2, 
            alignItems: 'center' 
          }}
        >
          <TextField 
            placeholder="Buscar por usuario, acción, detalle..." 
            fullWidth
            value={filtros.buscar}
            onChange={(e) => setFiltros({...filtros, buscar: e.target.value})}
            InputProps={{ 
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ) 
            }}
          />
          
          <TextField 
            type="date" 
            value={filtros.fecha}
            onChange={(e) => setFiltros({...filtros, fecha: e.target.value})}
            sx={{ width: { xs: '100%', md: '250px' } }}
          />

          <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', md: 'auto' } }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              sx={{ flex: { xs: 1, md: 'none' } }}
            >
              Buscar
            </Button>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={limpiarFiltros} 
              sx={{ flex: { xs: 1, md: 'none' } }}
            >
              Limpiar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* TABLA DE AUDITORÍA */}
      <TableContainer component={Paper} elevation={1}>
        <Table sx={{ minWidth: 800 }} aria-label="tabla de bitacora">
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 3 }}>Hora</TableCell>
              <TableCell>Sucursal</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Acción</TableCell>
              <TableCell>Detalle</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logsFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No se encontraron registros de auditoría con esos filtros.
                </TableCell>
              </TableRow>
            ) : (
              logsFiltrados.map((item) => {
                const { color, Icono } = getEstiloAccion(item.accion);

                return (
                  <TableRow key={item.id}>
                    
                    <TableCell sx={{ pl: 3 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {item.hora}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip label={item.sucursal} size="small" variant="outlined" />
                    </TableCell>
                    
                    <TableCell>
                      {item.usuario.includes('Anónimo') ? (
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                          {item.usuario}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" /> 
                          <Typography variant="body2" fontWeight="bold" color="text.primary">
                            {item.usuario}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: color }}>
                        <Icono fontSize="small" /> 
                        <Typography variant="body2" fontWeight="bold" sx={{ color: color, whiteSpace: 'nowrap' }}>
                          {item.accion}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={item.detalle}
                      >
                        {item.detalle}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                        {item.ip}
                      </Typography>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

    </Box>
  );
};

export default BitacoraList;
import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField, InputAdornment, Chip, Box, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Button, TablePagination
} from '@mui/material';

import Security from '@mui/icons-material/Security';
import Search from '@mui/icons-material/Search';
import Login from '@mui/icons-material/Login';
import Warning from '@mui/icons-material/Warning';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import Inventory from '@mui/icons-material/Inventory';
import Delete from '@mui/icons-material/Delete';
import Info from '@mui/icons-material/Info';
import Person from '@mui/icons-material/Person';

import { bitacoraService } from '../../../../services/bitacoraServices';
import { usuariosService } from '../../../../services/usuariosServices';
import { inventarioService } from '../../../../services/inventarioServices';

const getEstiloAccion = (accion = '') => {
  const acc = accion.toLowerCase();
  if (acc.includes('fallido') || acc.includes('rechaz')) return { color: 'error.main', Icono: Warning };
  if (acc.includes('login') || acc.includes('inició sesión') || acc.includes('sesión')) return { color: 'info.main', Icono: Login };
  if (acc.includes('venta')) return { color: 'success.main', Icono: ShoppingCart };
  if (acc.includes('compra') || acc.includes('pago')) return { color: 'success.main', Icono: ShoppingCart };
  if (acc.includes('inventario') || acc.includes('stock') || acc.includes('precio') || acc.includes('transferencia')) return { color: 'warning.main', Icono: Inventory };
  if (acc.includes('elimin') || acc.includes('anul') || acc.includes('baja')) return { color: 'error.main', Icono: Delete };
  return { color: 'text.secondary', Icono: Info };
};

const BitacoraList = () => {
  const [logs, setLogs] = useState([]);
  const [empleados, setEmpleados] = useState({});
  const [sucursales, setSucursales] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [filtros, setFiltros] = useState({ buscar: '', fecha: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const [bitacoras, emps, sucs] = await Promise.all([
        bitacoraService.getAll(),
        usuariosService.getAll().catch(() => []),
        inventarioService.getSucursales().catch(() => []),
      ]);
      const mapEmp = {};
      (Array.isArray(emps) ? emps : []).forEach((u) => {
        mapEmp[u.Id ?? u.id] = `${u.Nombre ?? ''} ${u.Apellido ?? ''}`.trim() || u.UsuarioEmpleado || `#${u.Id}`;
      });
      const mapSuc = {};
      (Array.isArray(sucs) ? sucs : (sucs?.data || [])).forEach((s) => {
        mapSuc[s.Id ?? s.id] = s.Nombre ?? s.nombre;
      });
      setEmpleados(mapEmp);
      setSucursales(mapSuc);
      setLogs((bitacoras || []).slice().sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha)));
    } catch (e) {
      setError('No se pudo cargar la bitácora: ' + (e.message || ''));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const logsFiltrados = useMemo(() => {
    const q = filtros.buscar.toLowerCase();
    return logs.filter((log) => {
      const emp = empleados[log.IdEmpleado] || '';
      const okTexto = !q ||
        (log.Accion || '').toLowerCase().includes(q) ||
        (log.Detalle || '').toLowerCase().includes(q) ||
        emp.toLowerCase().includes(q);
      const okFecha = !filtros.fecha || String(log.Fecha).slice(0, 10) === filtros.fecha;
      return okTexto && okFecha;
    });
  }, [logs, filtros, empleados]);

  useEffect(() => { setPage(0); }, [filtros]);

  const visibles = logsFiltrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 4, gap: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.primary' }}>
          <Security color="action" fontSize="large" /> Bitácora de Seguridad
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Chip label={`${logsFiltrados.length} registros`} size="small" sx={{ bgcolor: 'action.selected', color: 'text.secondary', fontWeight: 'bold' }} />
          <Button variant="outlined" size="small" onClick={cargar}>Actualizar</Button>
        </Box>
      </Box>

      <Paper elevation={1} sx={{ p: 2.5, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar por acción, detalle o usuario…"
            fullWidth
            value={filtros.buscar}
            onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          />
          <TextField
            type="date"
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
            sx={{ width: { xs: '100%', md: '250px' } }}
          />
          <Button variant="outlined" color="secondary" onClick={() => setFiltros({ buscar: '', fecha: '' })}>
            Limpiar
          </Button>
        </Box>
      </Paper>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {cargando ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: 3 }}>Fecha / Hora</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No se encontraron registros con esos filtros.
                  </TableCell>
                </TableRow>
              ) : visibles.map((item) => {
                const { color, Icono } = getEstiloAccion(item.Accion);
                const emp = empleados[item.IdEmpleado];
                return (
                  <TableRow key={item.Id}>
                    <TableCell sx={{ pl: 3 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {item.Fecha ? new Date(item.Fecha).toLocaleString('es-AR') : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={sucursales[item.IdSucursal] || (item.IdSucursal ? `#${item.IdSucursal}` : 'Global')} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {emp ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight="bold" color="text.primary">{emp}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Sistema / Anónimo</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color }}>
                        <Icono fontSize="small" />
                        <Typography variant="body2" fontWeight="bold" sx={{ color, whiteSpace: 'nowrap' }}>
                          {item.Accion}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary"
                        sx={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={item.Detalle}>
                        {item.Detalle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                        {item.IpAddress}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={logsFiltrados.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );
};

export default BitacoraList;

import { useState, useEffect, useMemo } from 'react';
import {
  TextField, Box, Typography, Paper, Button, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, TablePagination,
} from '@mui/material';
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

import PageHeader from '../../../../components/ui/PageHeader';
import KpiCard from '../../../../components/ui/KpiCard';
import StatusPill from '../../../../components/ui/StatusPill';
import FilterBar, { FilterField } from '../../../../components/ui/FilterBar';

// El color depende del Nivel del registro: error = rojo, warn = naranja, info = verde.
// Las filas viejas (todas 'info') cuyo texto indica un rechazo se tratan como 'warn'
// para que sigan resaltando igual que los registros nuevos.
const COLOR_NIVEL = { error: 'error.main', warn: 'warning.main', info: 'success.main' };

// El backend arma los textos con identificadores internos ("... (#4)", "Id 1", "Id=1741")
// que el usuario no debe ver. Se ocultan solo al mostrar; lo guardado no se modifica.
const ocultarIds = (texto) => String(texto ?? '')
  .replace(/\s*\((?:[^()#]*\s)?#\d+\)/g, '')   // "(#4)", "(devolución #5)"
  .replace(/\s*#\d+/g, '')                      // "#4"
  .replace(/\s*\(?\bId[ =]\d+\)?/gi, '')        // "Id 1", "Id=1741", "(Id 5)"
  .replace(/\s{2,}/g, ' ')
  .trim();

const getEstiloAccion = (accion = '', nivel = 'info') => {
  const acc = accion.toLowerCase();
  const rechazo = acc.includes('fallido') || acc.includes('rechaz') || acc.includes('bloquead');
  const nivelFinal = nivel === 'info' && rechazo ? 'warn' : (COLOR_NIVEL[nivel] ? nivel : 'info');
  const color = COLOR_NIVEL[nivelFinal];

  if (rechazo) return { color, Icono: Warning };
  if (acc.includes('login') || acc.includes('inició sesión') || acc.includes('sesión')) return { color, Icono: Login };
  if (acc.includes('venta')) return { color, Icono: ShoppingCart };
  if (acc.includes('compra') || acc.includes('pago')) return { color, Icono: ShoppingCart };
  if (acc.includes('inventario') || acc.includes('stock') || acc.includes('precio') || acc.includes('transferencia')) return { color, Icono: Inventory };
  if (acc.includes('elimin') || acc.includes('anul') || acc.includes('baja')) return { color, Icono: Delete };
  return { color, Icono: Info };
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
        mapEmp[u.Id ?? u.id] = `${u.Nombre ?? ''} ${u.Apellido ?? ''}`.trim() || u.UsuarioEmpleado || 'Usuario';
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

  const resumen = useMemo(() => ({
    total: logs.length,
    fallidos: logs.filter((l) => (l.Accion || '').toLowerCase().includes('fallido') || (l.Accion || '').toLowerCase().includes('rechaz')).length,
    hoy: logs.filter((l) => String(l.Fecha).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    usuarios: new Set(logs.map((l) => l.IdEmpleado).filter(Boolean)).size,
  }), [logs]);

  const visibles = logsFiltrados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const chips = [];
  if (filtros.buscar) chips.push({ campo: 'buscar', texto: filtros.buscar });
  if (filtros.fecha) chips.push({ campo: 'fecha', texto: filtros.fecha });

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Seguridad"
        title="Bitácora"
        meta={`${logsFiltrados.length} de ${logs.length} ${logs.length === 1 ? 'registro' : 'registros'}`}
        action={<Button variant="outlined" onClick={cargar}>Actualizar</Button>}
      />

      {error && <Typography color="error.main" sx={{ fontSize: '.84rem' }}>{error}</Typography>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard eyebrow="Registros" tone="accent" loading={cargando} value={resumen.total} />
        <KpiCard eyebrow="Hoy" tone="ok" loading={cargando} value={resumen.hoy} />
        <KpiCard eyebrow="Accesos fallidos" tone="error" loading={cargando} value={resumen.fallidos}
          badge={resumen.fallidos > 0 ? <StatusPill tone="late" label="Revisar" /> : null} />
        <KpiCard eyebrow="Usuarios activos" tone="mute" loading={cargando} value={resumen.usuarios} />
      </Box>

      <FilterBar
        columns="minmax(220px,1.8fr) minmax(150px,1fr)"
        chips={chips.map((c) => (
          <StatusPill key={c.campo} tone="flat" label={c.texto} />
        ))}
        actions={(filtros.buscar || filtros.fecha) && (
          <Button size="small" onClick={() => setFiltros({ buscar: '', fecha: '' })}>Limpiar</Button>
        )}
      >
        <FilterField label="Buscar">
          <TextField
            fullWidth placeholder="Acción, detalle o usuario…"
            value={filtros.buscar}
            onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
            slotProps={{ input: { startAdornment: <Search sx={{ fontSize: 15, color: 'text.disabled', mr: .75 }} /> } }}
          />
        </FilterField>
        <FilterField label="Fecha">
          <TextField type="date" fullWidth value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })} />
        </FilterField>
      </FilterBar>

      {cargando ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha / hora</TableCell>
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
                    <TableCell colSpan={6} sx={{ height: 120, textAlign: 'center', color: 'text.disabled' }}>
                      No se encontraron registros con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : visibles.map((item) => {
                  const { color, Icono } = getEstiloAccion(item.Accion, item.Nivel);
                  const emp = empleados[item.IdEmpleado];
                  return (
                    <TableRow key={item.Id} hover>
                      <TableCell className="mono" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {item.Fecha ? new Date(item.Fecha).toLocaleString('es-AR') : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone="neutral" label={sucursales[item.IdSucursal] || (item.IdSucursal ? 'Sucursal' : 'Global')} />
                      </TableCell>
                      <TableCell>
                        {emp ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Person sx={{ fontSize: 15, color: 'text.disabled' }} />
                            <Typography sx={{ fontSize: '.78rem', fontWeight: 600 }}>{emp}</Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: '.78rem', color: 'text.disabled', fontStyle: 'italic' }}>Sistema / Anónimo</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color }}>
                          <Icono sx={{ fontSize: 15 }} />
                          <Typography sx={{ fontSize: '.78rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                            {ocultarIds(item.Accion)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        <Tooltip title={ocultarIds(item.Detalle)}>
                          <Typography sx={{ fontSize: '.78rem', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ocultarIds(item.Detalle)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="mono" sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
                        {item.IpAddress}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={logsFiltrados.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}
    </Box>
  );
};

export default BitacoraList;

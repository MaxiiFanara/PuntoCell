import { useState, useMemo } from 'react';
import {
  Button, TextField, Box, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';

import Login from '@mui/icons-material/Login';
import Warning from '@mui/icons-material/Warning';
import ShoppingCart from '@mui/icons-material/ShoppingCart';
import Inventory from '@mui/icons-material/Inventory';
import Delete from '@mui/icons-material/Delete';
import Info from '@mui/icons-material/Info';
import Person from '@mui/icons-material/Person';

import PageHeader from '../../../../components/ui/PageHeader';
import KpiCard from '../../../../components/ui/KpiCard';
import StatusPill from '../../../../components/ui/StatusPill';
import FilterBar, { FilterField } from '../../../../components/ui/FilterBar';

// --- MOCK DATA: Registros de Auditoría ---
// La bitácora no tiene endpoints montados todavía (/api/auditoria).
const LOGS = [
  { id: 1, hora: '16/05 14:30:12', sucursal: 'Centro', usuario: 'simon.admin', accion: 'Login Exitoso', detalle: 'Usuario ingresó al sistema', ip: '192.168.1.15' },
  { id: 2, hora: '16/05 14:35:00', sucursal: 'Centro', usuario: 'simon.admin', accion: 'Nueva Venta', detalle: 'Ticket #4582 generado por U$S 1200', ip: '192.168.1.15' },
  { id: 3, hora: '16/05 15:10:45', sucursal: 'La Calera', usuario: 'carlos.vend', accion: 'Login Fallido', detalle: 'Contraseña incorrecta (Intento 1)', ip: '190.22.45.11' },
  { id: 4, hora: '16/05 15:20:10', sucursal: 'Global', usuario: 'Sistema / Anónimo', accion: 'Anular Venta', detalle: 'Se solicitó anulación de Ticket #4580', ip: '127.0.0.1' },
  { id: 5, hora: '16/05 16:05:00', sucursal: 'Centro', usuario: 'simon.admin', accion: 'Ajuste de Inventario', detalle: 'Stock actualizado para iPhone 15 Pro', ip: '192.168.1.15' },
  { id: 6, hora: '16/05 16:30:22', sucursal: 'Centro', usuario: 'ana.vend', accion: 'Consulta Cliente', detalle: 'Búsqueda de historial DNI 35123456', ip: '192.168.1.20' },
];

// Estilos según la acción: tono + ícono.
const getEstiloAccion = (accion) => {
  const acc = accion.toLowerCase();
  if (acc.includes('login') && !acc.includes('fallido')) return { color: 'primary.main', Icono: Login };
  if (acc.includes('fallido')) return { color: 'error.main', Icono: Warning };
  if (acc.includes('venta')) return { color: 'success.main', Icono: ShoppingCart };
  if (acc.includes('inventario') || acc.includes('stock')) return { color: 'warning.main', Icono: Inventory };
  if (acc.includes('eliminar') || acc.includes('anular')) return { color: 'error.main', Icono: Delete };
  return { color: 'text.secondary', Icono: Info };
};

const BitacoraList = () => {
  const [filtros, setFiltros] = useState({ buscar: '', fecha: '' });

  const logsFiltrados = useMemo(() => LOGS.filter((log) => {
    const q = filtros.buscar.toLowerCase();
    return log.usuario.toLowerCase().includes(q)
      || log.accion.toLowerCase().includes(q)
      || log.detalle.toLowerCase().includes(q);
  }), [filtros.buscar]);

  const resumen = useMemo(() => ({
    total: LOGS.length,
    fallidos: LOGS.filter((l) => l.accion.toLowerCase().includes('fallido')).length,
    ventas: LOGS.filter((l) => l.accion.toLowerCase().includes('venta')).length,
    usuarios: new Set(LOGS.map((l) => l.usuario)).size,
  }), []);

  const limpiarFiltros = () => setFiltros({ buscar: '', fecha: '' });

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Administración"
        title="Bitácora de seguridad"
        meta="Registro de acciones sensibles del sistema."
        action={<StatusPill tone="due" label="Datos de ejemplo" />}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard eyebrow="Movimientos" tone="accent" value={resumen.total} />
        <KpiCard eyebrow="Logins fallidos" tone="warn" value={resumen.fallidos} />
        <KpiCard eyebrow="Ventas registradas" tone="ok" value={resumen.ventas} />
        <KpiCard eyebrow="Usuarios distintos" tone="mute" value={resumen.usuarios} />
      </Box>

      <FilterBar
        columns="minmax(220px,1.5fr) minmax(150px,1fr)"
        actions={<Button size="small" onClick={limpiarFiltros}>Limpiar</Button>}
      >
        <FilterField label="Buscar">
          <TextField
            placeholder="Usuario, acción o detalle…" fullWidth
            value={filtros.buscar}
            onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
          />
        </FilterField>
        <FilterField label="Fecha">
          <TextField
            type="date" fullWidth
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
          />
        </FilterField>
      </FilterBar>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 800 }} aria-label="tabla de bitácora">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 130 }}>Hora</TableCell>
                <TableCell sx={{ width: 110 }}>Sucursal</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell sx={{ width: 120 }}>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logsFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ height: 120, textAlign: 'center', color: 'text.disabled' }}>
                    No se encontraron registros de auditoría con esos filtros.
                  </TableCell>
                </TableRow>
              ) : logsFiltrados.map((item) => {
                const { color, Icono } = getEstiloAccion(item.accion);

                return (
                  <TableRow key={item.id} hover>
                    <TableCell className="mono" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {item.hora}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone="neutral" label={item.sucursal} dot={false} />
                    </TableCell>
                    <TableCell>
                      {item.usuario.includes('Anónimo') ? (
                        <Typography sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '.8125rem' }}>
                          {item.usuario}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Person sx={{ fontSize: 16, color: 'text.disabled' }} />
                          <Typography sx={{ fontWeight: 600, fontSize: '.8125rem' }}>{item.usuario}</Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, color }}>
                        <Icono sx={{ fontSize: 16 }} />
                        <Typography sx={{ fontWeight: 600, fontSize: '.8125rem', color: 'inherit', whiteSpace: 'nowrap' }}>
                          {item.accion}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{ color: 'text.secondary', fontSize: '.8125rem', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={item.detalle}
                      >
                        {item.detalle}
                      </Typography>
                    </TableCell>
                    <TableCell className="mono" sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
                      {item.ip}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

    </Box>
  );
};

export default BitacoraList;

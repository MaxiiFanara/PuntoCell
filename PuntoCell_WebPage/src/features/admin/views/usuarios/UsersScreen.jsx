import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Typography, Chip, Dialog, DialogTitle, DialogContent,
  DialogContentText, TextField, DialogActions, Box, Tooltip, Avatar, FormControl,
  InputLabel, Select, MenuItem, Alert,
} from '@mui/material';
import { Edit, Delete, PersonAdd, Email, WarningAmber } from '@mui/icons-material';
import { usuariosService } from '../../../../services/usuariosServices';
import { soloLetrasYEspacios, soloDigitos } from '../../../../utils/validators';
import { capitalizar } from '../../../../utils/format';

import PageHeader from '../../../../components/ui/PageHeader';
import KpiCard from '../../../../components/ui/KpiCard';
import StatusPill from '../../../../components/ui/StatusPill';
import TablePager from '../../../../components/ui/TablePager';
import { usePaginacion } from '../../../../hooks/usePaginacion';

const EMPTY_FORM = { DNI: '', Nombre: '', Apellido: '', Email: '', Celular: '', IdRol: '', IdSucursal: '' };

const UsersScreen = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- ESTADOS: MODAL DE CREAR/EDITAR ---
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // --- ESTADOS: ALERT DE ELIMINAR ---
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usuarios, rolesData, sucursalesData] = await Promise.all([
        usuariosService.getAll(),
        usuariosService.getRoles(),
        usuariosService.getSucursales(),
      ]);
      setUsers(usuarios);
      setRoles(rolesData);
      setSucursales(sucursalesData);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const { pagina, setPagina, totalPaginas, itemsPagina, hayPaginacion } = usePaginacion(users);
  const desdeFila = users.length ? (pagina - 1) * 10 + 1 : 0;
  const hastaFila = Math.min(pagina * 10, users.length);

  const nombreRol = (idRol) => capitalizar(roles.find((r) => (r.Id ?? r.id) === idRol)?.Nombre) || '—';
  const nombreSucursal = (idSucursal) => capitalizar(sucursales.find((s) => (s.Id ?? s.id) === idSucursal)?.Nombre) || '—';

  const resumen = useMemo(() => {
    const activos = users.filter((u) => u.Activo).length;
    return {
      total: users.length,
      activos,
      inactivos: users.length - activos,
      roles: roles.length,
    };
  }, [users, roles]);

  // ==========================================
  // LÓGICA DE CREAR / EDITAR
  // ==========================================
  const handleOpen = (userToEdit = null) => {
    setFormError('');
    if (userToEdit) {
      setEditMode(true);
      setEditingId(userToEdit.Id);
      setFormData({
        DNI: userToEdit.DNI || '', Nombre: userToEdit.Nombre || '', Apellido: userToEdit.Apellido || '',
        Email: userToEdit.Email || '', Celular: userToEdit.Celular || '',
        IdRol: userToEdit.IdRol || '', IdSucursal: userToEdit.IdSucursal || '',
      });
    } else {
      setEditMode(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        DNI: formData.DNI, Nombre: formData.Nombre, Apellido: formData.Apellido,
        Email: formData.Email, Celular: formData.Celular,
        IdRol: Number(formData.IdRol), IdSucursal: Number(formData.IdSucursal),
      };
      if (editMode) {
        await usuariosService.update(editingId, payload);
      } else {
        await usuariosService.create(payload);
      }
      handleClose();
      await cargarDatos();
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LÓGICA DE ELIMINAR (baja lógica)
  // ==========================================
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setOpenDeleteAlert(true);
  };

  const confirmDelete = async () => {
    try {
      await usuariosService.delete(userToDelete.Id);
      setOpenDeleteAlert(false);
      setUserToDelete(null);
      await cargarDatos();
    } catch (err) {
      setError(err.message || 'No se pudo dar de baja al usuario.');
      setOpenDeleteAlert(false);
    }
  };

  const mensajeTabla = loading
    ? 'Cargando usuarios…'
    : (users.length === 0 ? 'No hay usuarios cargados.' : null);

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        meta={`${resumen.total} ${resumen.total === 1 ? 'usuario registrado' : 'usuarios registrados'}`}
        action={
          <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpen()}>
            Registrar usuario
          </Button>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard eyebrow="Usuarios" tone="accent" loading={loading} value={resumen.total} />
        <KpiCard eyebrow="Activos" tone="ok" loading={loading} value={resumen.activos} />
        <KpiCard eyebrow="Inactivos" tone="mute" loading={loading} value={resumen.inactivos} />
        <KpiCard eyebrow="Roles del sistema" tone="warn" loading={loading} value={resumen.roles} />
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 780 }}>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Contacto</TableCell>
                <TableCell>Rol asignado</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right" sx={{ width: 96 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mensajeTabla ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ height: 120, textAlign: 'center', color: 'text.disabled' }}>
                    {mensajeTabla}
                  </TableCell>
                </TableRow>
              ) : itemsPagina.map((row) => (
                <TableRow key={row.Id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Avatar sx={{ bgcolor: 'pc.accentSoft', color: 'primary.main', fontWeight: 700, width: 32, height: 32, fontSize: '.8rem' }}>
                        {(row.Nombre || '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: '.8125rem' }}>
                          {capitalizar(row.Nombre)} {capitalizar(row.Apellido)}
                        </Typography>
                        <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem' }}>
                          DNI {row.DNI}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary' }}>
                      <Email sx={{ fontSize: 15 }} />
                      <Typography sx={{ fontSize: '.78rem' }}>{row.Email}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={nombreRol(row.IdRol)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {nombreSucursal(row.IdSucursal)}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={row.Activo ? 'ok' : 'neutral'} label={row.Activo ? 'Activo' : 'Inactivo'} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar usuario">
                      <IconButton size="small" onClick={() => handleOpen(row)}>
                        <Edit sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dar de baja">
                      <IconButton size="small" onClick={() => handleDeleteClick(row)} sx={{ color: 'error.main' }}>
                        <Delete sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {hayPaginacion && (
          <TablePager
            page={pagina}
            pageCount={totalPaginas}
            from={desdeFila}
            to={hastaFila}
            total={users.length}
            unidad={users.length === 1 ? 'usuario' : 'usuarios'}
            onChange={setPagina}
          />
        )}
      </Paper>

      {/* ========================================== */}
      {/* 1. MODAL DE CREAR / EDITAR                 */}
      {/* ========================================== */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Actualizar usuario' : 'Registrar nuevo usuario'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {!editMode && (
            <Alert severity="info">
              El usuario y la contraseña se generan automáticamente y se envían por email.
            </Alert>
          )}

          <TextField
            label="DNI" fullWidth
            value={formData.DNI}
            onChange={(e) => setFormData({ ...formData, DNI: soloDigitos(e.target.value, 8) })}
            inputProps={{ inputMode: 'numeric' }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Nombre" fullWidth
              value={formData.Nombre}
              onChange={(e) => setFormData({ ...formData, Nombre: soloLetrasYEspacios(e.target.value, 25) })}
              helperText={`${formData.Nombre.length}/25`}
            />
            <TextField
              label="Apellido" fullWidth
              value={formData.Apellido}
              onChange={(e) => setFormData({ ...formData, Apellido: soloLetrasYEspacios(e.target.value, 25) })}
              helperText={`${formData.Apellido.length}/25`}
            />
          </Box>

          <TextField
            label="Correo electrónico" type="email" fullWidth
            value={formData.Email}
            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
          />

          <TextField
            label="Celular" fullWidth
            value={formData.Celular}
            onChange={(e) => setFormData({ ...formData, Celular: soloDigitos(e.target.value, 11) })}
            inputProps={{ inputMode: 'numeric' }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Rol del sistema</InputLabel>
              <Select
                value={formData.IdRol}
                onChange={(e) => setFormData({ ...formData, IdRol: e.target.value })}
                label="Rol del sistema"
              >
                {roles.map((r) => (
                  <MenuItem key={r.Id ?? r.id} value={r.Id ?? r.id}>{r.Nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={formData.IdSucursal}
                onChange={(e) => setFormData({ ...formData, IdSucursal: e.target.value })}
                label="Sucursal"
              >
                {sucursales.map((s) => (
                  <MenuItem key={s.Id ?? s.id} value={s.Id ?? s.id}>{s.Nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.DNI || !formData.Nombre || !formData.Apellido || !formData.Email || !formData.Celular || !formData.IdRol || !formData.IdSucursal}
          >
            {saving ? 'Guardando…' : (editMode ? 'Guardar cambios' : 'Crear usuario')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================== */}
      {/* 2. ALERT DE CONFIRMACIÓN (BAJA)            */}
      {/* ========================================== */}
      <Dialog open={openDeleteAlert} onClose={() => setOpenDeleteAlert(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningAmber fontSize="small" /> Dar de baja
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas dar de baja a <strong>{capitalizar(userToDelete?.Nombre)} {capitalizar(userToDelete?.Apellido)}</strong>?
            Perderá acceso inmediatamente. El registro no se borra, queda marcado como inactivo.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteAlert(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">Sí, dar de baja</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default UsersScreen;

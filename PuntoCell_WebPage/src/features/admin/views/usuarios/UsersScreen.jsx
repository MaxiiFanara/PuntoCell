import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Typography, Chip, Dialog, DialogTitle, DialogContent,
  DialogContentText, TextField, DialogActions, Box, Tooltip, Avatar, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress
} from '@mui/material';
import { Edit, Delete, PersonAdd, Group, Email, WarningAmber } from '@mui/icons-material';
import { usuariosService } from '../../../../services/usuariosServices';
import { soloLetrasYEspacios, soloDigitos } from '../../../../utils/validators';
import { capitalizar } from '../../../../utils/format';

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

  const nombreRol = (idRol) => capitalizar(roles.find((r) => (r.Id ?? r.id) === idRol)?.Nombre) || '—';
  const nombreSucursal = (idSucursal) => capitalizar(sucursales.find((s) => (s.Id ?? s.id) === idSucursal)?.Nombre) || '—';

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

  return (
    <Box className="animate-fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Typography variant="h4" className="font-extrabold text-slate-800 flex items-center gap-3">
            <Group sx={{ color: '#2563eb', fontSize: 36 }} /> Gestión de Usuarios
          </Typography>
          <Typography variant="body1" className="text-slate-500 mt-1">
            Administra el acceso y los roles de tus empleados.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpen()}
          sx={{
            bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' },
            py: 1.25, px: 3, borderRadius: '12px', boxShadow: 3, textTransform: 'none', fontWeight: 600
          }}
        >
          Registrar Usuario
        </Button>
      </div>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* TABLA PRINCIPAL */}
      <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: '16px', border: '1px solid #f1f5f9' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Rol Asignado</TableCell>
              <TableCell>Sucursal</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right" sx={{ px: 3 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={28} /></TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                  No hay usuarios cargados.
                </TableCell>
              </TableRow>
            ) : (
              users.map((row) => (
                <TableRow key={row.Id} hover>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', width: 36, height: 36 }}>
                        {(row.Nombre || '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 600, color: '#334155' }}>{capitalizar(row.Nombre)} {capitalizar(row.Apellido)}</Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>DNI {row.DNI}</Typography>
                      </Box>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Email fontSize="small" />
                      <Typography variant="body2">{row.Email}</Typography>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip label={nombreRol(row.IdRol)} size="small" variant="outlined" sx={{ fontWeight: 500, color: '#475569', borderColor: '#cbd5e1' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#475569' }}>{nombreSucursal(row.IdSucursal)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.Activo ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={row.Activo ? 'success' : 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ px: 3 }}>
                    <Tooltip title="Editar Usuario">
                      <IconButton
                        onClick={() => handleOpen(row)}
                        sx={{ color: '#2563eb', '&:hover': { bgcolor: '#eff6ff' }, mr: 1 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dar de baja">
                      <IconButton
                        onClick={() => handleDeleteClick(row)}
                        sx={{ color: '#e11d48', '&:hover': { bgcolor: '#fff1f2' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ========================================== */}
      {/* 1. MODAL DE CREAR / EDITAR                 */}
      {/* ========================================== */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
        <DialogTitle component="div" sx={{ pb: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
            {editMode ? 'Actualizar Usuario' : 'Registrar Nuevo Usuario'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {formError && <Alert severity="error" sx={{ borderRadius: 2 }}>{formError}</Alert>}
          {!editMode && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              El usuario y la contraseña se generan automáticamente y se envían por email.
            </Alert>
          )}

          <div className="flex gap-4">
            <TextField
              label="DNI" fullWidth variant="outlined"
              value={formData.DNI}
              onChange={(e) => setFormData({ ...formData, DNI: soloDigitos(e.target.value, 8) })}
              inputProps={{ inputMode: 'numeric' }}
              slotProps={{ input: { sx: { borderRadius: '12px' } } }}
            />
          </div>

          <div className="flex gap-4">
            <TextField
              label="Nombre" fullWidth variant="outlined"
              value={formData.Nombre}
              onChange={(e) => setFormData({ ...formData, Nombre: soloLetrasYEspacios(e.target.value, 25) })}
              helperText={`${formData.Nombre.length}/25`}
              slotProps={{ input: { sx: { borderRadius: '12px' } } }}
            />
            <TextField
              label="Apellido" fullWidth variant="outlined"
              value={formData.Apellido}
              onChange={(e) => setFormData({ ...formData, Apellido: soloLetrasYEspacios(e.target.value, 25) })}
              helperText={`${formData.Apellido.length}/25`}
              slotProps={{ input: { sx: { borderRadius: '12px' } } }}
            />
          </div>

          <TextField
            label="Correo Electrónico"
            type="email"
            fullWidth variant="outlined"
            value={formData.Email}
            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
            slotProps={{ input: { sx: { borderRadius: '12px' } } }}
          />

          <TextField
            label="Celular" fullWidth variant="outlined"
            value={formData.Celular}
            onChange={(e) => setFormData({ ...formData, Celular: soloDigitos(e.target.value, 11) })}
            inputProps={{ inputMode: 'numeric' }}
            slotProps={{ input: { sx: { borderRadius: '12px' } } }}
          />

          <div className="flex gap-4">
            <FormControl fullWidth variant="outlined">
              <InputLabel>Rol del Sistema</InputLabel>
              <Select
                value={formData.IdRol}
                onChange={(e) => setFormData({ ...formData, IdRol: e.target.value })}
                label="Rol del Sistema"
                sx={{ borderRadius: '12px' }}
              >
                {roles.map((r) => (
                  <MenuItem key={r.Id ?? r.id} value={r.Id ?? r.id}>{r.Nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined">
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={formData.IdSucursal}
                onChange={(e) => setFormData({ ...formData, IdSucursal: e.target.value })}
                label="Sucursal"
                sx={{ borderRadius: '12px' }}
              >
                {sucursales.map((s) => (
                  <MenuItem key={s.Id ?? s.id} value={s.Id ?? s.id}>{s.Nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleClose} sx={{ color: '#64748b', fontWeight: 'bold' }}>CANCELAR</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !formData.DNI || !formData.Nombre || !formData.Apellido || !formData.Email || !formData.Celular || !formData.IdRol || !formData.IdSucursal}
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, px: 3, borderRadius: '8px', fontWeight: 'bold' }}
          >
            {saving ? 'GUARDANDO…' : (editMode ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================== */}
      {/* 2. ALERT DE CONFIRMACIÓN (BAJA)            */}
      {/* ========================================== */}
      <Dialog
        open={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1, maxWidth: '400px' } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#e11d48', pb: 1 }}>
          <WarningAmber fontSize="large" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Dar de baja</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569' }}>
            ¿Estás seguro que deseas dar de baja a <strong>{capitalizar(userToDelete?.Nombre)} {capitalizar(userToDelete?.Apellido)}</strong>? Perderá acceso inmediatamente. El registro no se borra, queda marcado como inactivo.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setOpenDeleteAlert(false)}
            sx={{ color: '#64748b', fontWeight: 'bold' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            sx={{ bgcolor: '#e11d48', '&:hover': { bgcolor: '#be123c' }, fontWeight: 'bold', borderRadius: '8px' }}
          >
            Sí, dar de baja
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default UsersScreen;

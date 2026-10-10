import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Typography, Chip, Dialog, DialogTitle, DialogContent,
  DialogContentText, TextField, DialogActions, Box, Checkbox, FormControlLabel, Tooltip,
} from '@mui/material';
import { Edit, Delete, Add, WarningAmber } from '@mui/icons-material';

import PageHeader from '../../../../components/ui/PageHeader';
import KpiCard from '../../../../components/ui/KpiCard';
import StatusPill from '../../../../components/ui/StatusPill';

// Lista de permisos disponibles en el sistema
const PERMISOS_DISPONIBLES = ['Ventas', 'Inventario', 'Usuarios', 'Reparaciones', 'Configuración', 'Ver Stock'];

const RolesScreen = () => {
  // Mock local, no conectado al backend (existe /usuarios/roles con CRUD real)
  const [roles, setRoles] = useState([
    { id: 1, name: 'Administrador', permissions: ['Ventas', 'Inventario', 'Usuarios', 'Configuración'] },
    { id: 2, name: 'Vendedor', permissions: ['Ventas', 'Ver Stock'] },
    { id: 3, name: 'Técnico', permissions: ['Reparaciones', 'Ver Stock'] },
  ]);

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const resumen = useMemo(() => {
    const totalAsignaciones = roles.reduce((acc, r) => acc + r.permissions.length, 0);
    return {
      totalRoles: roles.length,
      totalPermisos: PERMISOS_DISPONIBLES.length,
      promedio: roles.length ? Math.round((totalAsignaciones / roles.length) * 10) / 10 : 0,
    };
  }, [roles]);

  const handleOpen = (rolAEditar = null) => {
    if (rolAEditar) {
      setEditMode(true);
      setEditingId(rolAEditar.id);
      setNewRoleName(rolAEditar.name);
      setSelectedPermissions(rolAEditar.permissions);
    } else {
      setEditMode(false);
      setEditingId(null);
      setNewRoleName('');
      setSelectedPermissions([]);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = () => {
    if (editMode) {
      const rolesActualizados = roles.map((rol) =>
        rol.id === editingId
          ? { ...rol, name: newRoleName, permissions: selectedPermissions }
          : rol
      );
      setRoles(rolesActualizados);
    } else {
      const nuevoId = roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1;
      const nuevoRol = { id: nuevoId, name: newRoleName, permissions: selectedPermissions };
      setRoles([...roles, nuevoRol]);
    }
    handleClose();
  };

  const togglePermission = (perm) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const handleDeleteClick = (rol) => {
    setRoleToDelete(rol);
    setOpenDeleteAlert(true);
  };

  const confirmDelete = () => {
    setRoles(roles.filter(r => r.id !== roleToDelete.id));
    setOpenDeleteAlert(false);
    setRoleToDelete(null);
  };

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Administración"
        title="Roles"
        meta={`${resumen.totalRoles} ${resumen.totalRoles === 1 ? 'rol definido' : 'roles definidos'}`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <StatusPill tone="due" label="Datos de ejemplo" />
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Registrar rol
            </Button>
          </Box>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, gap: 1.5 }}>
        <KpiCard eyebrow="Roles" tone="accent" value={resumen.totalRoles} />
        <KpiCard eyebrow="Permisos catalogados" tone="mute" value={resumen.totalPermisos} />
        <KpiCard eyebrow="Permisos por rol (prom.)" tone="warn" value={resumen.promedio} />
      </Box>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nombre del rol</TableCell>
                <TableCell>Permisos activos</TableCell>
                <TableCell align="right" sx={{ width: 96 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ height: 120, textAlign: 'center', color: 'text.disabled' }}>
                    No hay roles definidos.
                  </TableCell>
                </TableRow>
              ) : roles.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', maxWidth: 460 }}>
                      {row.permissions.map(p => (
                        <StatusPill key={p} tone="flat" label={p} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar rol">
                      <IconButton size="small" onClick={() => handleOpen(row)}>
                        <Edit sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar rol">
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
      </Paper>

      {/* Modal crear/editar */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Actualizar rol' : 'Crear nuevo rol'}
          <Typography sx={{ color: 'text.disabled', fontSize: '.75rem', fontWeight: 400, mt: '2px' }}>
            Completá la información para asignar privilegios.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
          <TextField
            autoFocus
            label="Nombre del rol (ej. Supervisor)"
            fullWidth
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Permisos del sistema</Box>
          <Box sx={{
            display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 0.5,
            bgcolor: 'pc.surfaceMuted', p: 1.5, borderRadius: '10px', border: 1, borderColor: 'pc.dividerSoft',
          }}>
            {PERMISOS_DISPONIBLES.map((perm) => (
              <FormControlLabel
                key={perm}
                control={
                  <Checkbox
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                }
                label={<Box sx={{ fontSize: '.8125rem' }}>{perm}</Box>}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!newRoleName.trim() || selectedPermissions.length === 0}
          >
            {editMode ? 'Guardar cambios' : 'Crear rol'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de eliminar */}
      <Dialog open={openDeleteAlert} onClose={() => setOpenDeleteAlert(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningAmber fontSize="small" /> Eliminar rol
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar el rol <strong>{roleToDelete?.name}</strong>?
            Los usuarios que tengan este rol asignado perderán sus permisos en el sistema.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteAlert(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">Sí, eliminar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default RolesScreen;

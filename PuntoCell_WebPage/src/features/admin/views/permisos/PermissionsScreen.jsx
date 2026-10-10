import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, Box, Tooltip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogContentText, TextField, DialogActions, FormControl, InputLabel, Select, MenuItem, Alert,
} from '@mui/material';
import { Add, Edit, Delete, WarningAmber } from '@mui/icons-material';

import PageHeader from '../../../../components/ui/PageHeader';
import StatusPill from '../../../../components/ui/StatusPill';

const PermissionsScreen = () => {
  // Mock local, no conectado al backend (existe /usuarios/permisos con CRUD real)
  const [permissions, setPermissions] = useState([
    { id: 'PERM-001', name: 'ventas.crear', description: 'Permite registrar nuevas ventas en el sistema.', module: 'Ventas' },
    { id: 'PERM-002', name: 'ventas.anular', description: 'Permite cancelar ventas ya registradas.', module: 'Ventas' },
    { id: 'PERM-003', name: 'stock.editar', description: 'Permite modificar cantidades y precios de productos.', module: 'Inventario' },
    { id: 'PERM-004', name: 'usuarios.gestionar', description: 'Control total sobre creación y edición de empleados.', module: 'Seguridad' },
  ]);

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', module: '', description: '' });

  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [permToDelete, setPermToDelete] = useState(null);

  const handleOpen = (permToEdit = null) => {
    if (permToEdit) {
      setEditMode(true);
      setEditingId(permToEdit.id);
      setFormData({ name: permToEdit.name, module: permToEdit.module, description: permToEdit.description });
    } else {
      setEditMode(false);
      setEditingId(null);
      setFormData({ name: '', module: '', description: '' });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = () => {
    if (editMode) {
      setPermissions(permissions.map(p => p.id === editingId ? { ...p, ...formData } : p));
    } else {
      const newNumber = permissions.length > 0
        ? Math.max(...permissions.map(p => parseInt(p.id.split('-')[1]))) + 1
        : 1;
      const newId = `PERM-${newNumber.toString().padStart(3, '0')}`;

      setPermissions([...permissions, { id: newId, ...formData }]);
    }
    handleClose();
  };

  const handleDeleteClick = (perm) => {
    setPermToDelete(perm);
    setOpenDeleteAlert(true);
  };

  const confirmDelete = () => {
    setPermissions(permissions.filter(p => p.id !== permToDelete.id));
    setOpenDeleteAlert(false);
    setPermToDelete(null);
  };

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Administración"
        title="Diccionario de permisos"
        meta="Catálogo de acciones y restricciones del sistema Punto Cell."
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <StatusPill tone="due" label="Datos de ejemplo" />
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
              Registrar permiso
            </Button>
          </Box>
        }
      />

      <Alert severity="info">
        <strong>Nota de arquitectura:</strong> los permisos son constantes que el código fuente verifica.
        Modificarlos o eliminarlos puede afectar los roles que ya los tienen asignados.
      </Alert>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Nombre del permiso</TableCell>
                <TableCell sx={{ width: 130 }}>Módulo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right" sx={{ width: 96 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map((perm) => (
                <TableRow key={perm.id} hover>
                  <TableCell>
                    <StatusPill tone="flat" label={perm.name} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{perm.module}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{perm.description}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar permiso">
                      <IconButton size="small" onClick={() => handleOpen(perm)}>
                        <Edit sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar permiso">
                      <IconButton size="small" onClick={() => handleDeleteClick(perm)} sx={{ color: 'error.main' }}>
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
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editMode ? 'Actualizar permiso' : 'Registrar permiso técnico'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5 }}>

          <TextField
            label="Clave del permiso (ej: modulo.accion)"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
            slotProps={{ htmlInput: { className: 'mono' } }}
            helperText="Se formatea automáticamente a minúsculas y puntos."
          />

          <FormControl fullWidth>
            <InputLabel>Módulo del sistema</InputLabel>
            <Select
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              label="Módulo del sistema"
            >
              <MenuItem value="Ventas">Ventas</MenuItem>
              <MenuItem value="Inventario">Inventario</MenuItem>
              <MenuItem value="Seguridad">Seguridad</MenuItem>
              <MenuItem value="Configuración">Configuración</MenuItem>
              <MenuItem value="Administración">Administración</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Descripción corta"
            fullWidth
            multiline rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name || !formData.module}
          >
            {editMode ? 'Guardar cambios' : 'Crear permiso'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de eliminar */}
      <Dialog open={openDeleteAlert} onClose={() => setOpenDeleteAlert(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <WarningAmber fontSize="small" /> Eliminar permiso
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar el permiso <strong>{permToDelete?.name}</strong>?
            Si algún rol tiene asignado este permiso, podría perder acceso a esa función.
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

export default PermissionsScreen;

import React, { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  Button, Typography, Chip, Box, Tooltip, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogContentText, TextField, DialogActions, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { VerifiedUser, InfoOutlined, Add, LockOpen, Edit, Delete, WarningAmber } from '@mui/icons-material';
import { usePaginacion } from '../../../../hooks/usePaginacion';
import PaginadorTabla from '../../../../components/PaginadorTabla';

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

  const { pagina, setPagina, totalPaginas, itemsPagina, hayPaginacion } = usePaginacion(permissions);

  return (
    <Box className="animate-fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Typography variant="h4" className="font-extrabold text-slate-800 flex items-center gap-3">
            <LockOpen sx={{ color: '#2563eb', fontSize: 36 }} /> Diccionario de Permisos
          </Typography>
          <Typography variant="body1" className="text-slate-500 mt-1">
            Catálogo de acciones y restricciones del sistema Punto Cell.
          </Typography>
        </div>
        
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => handleOpen()} // Crear
          sx={{
            bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' },
            py: 1.25, px: 3, borderRadius: '12px', boxShadow: 3, textTransform: 'none', fontWeight: 600
          }}
        >
          Registrar Permiso
        </Button>
      </div>

      {/* CARTEL INFORMATIVO */}
      <Box sx={{ bgcolor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', p: 2, mb: 4, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <InfoOutlined sx={{ color: '#3b82f6', mt: 0.2 }} fontSize="small" />
        <Typography variant="body2" sx={{ color: '#1e40af' }}>
          <strong>Nota de Arquitectura:</strong> Los permisos son constantes que el código fuente verifica. Modificarlos o eliminarlos puede afectar los roles que ya los tienen asignados.
        </Typography>
      </Box>

      {/* TABLA DE PERMISOS */}
      <TableContainer component={Paper} sx={{ boxShadow: 1, borderRadius: '16px', border: '1px solid #f1f5f9' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre del Permiso</TableCell>
              <TableCell>Módulo</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="right" sx={{ px: 3 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {itemsPagina.map((perm) => (
              <TableRow key={perm.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>
                  {perm.id}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={perm.name} 
                    size="small" 
                    icon={<VerifiedUser style={{ fontSize: '14px' }} />}
                    sx={{ fontFamily: 'monospace', fontWeight: 600, bgcolor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 500, color: '#475569' }}>
                  {perm.module}
                </TableCell>
                <TableCell sx={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>
                  {perm.description}
                </TableCell>
                <TableCell align="right" sx={{ px: 3 }}>
                  
                  {/* BOTÓN EDITAR */}
                  <Tooltip title="Editar Permiso">
                    <IconButton 
                      onClick={() => handleOpen(perm)} 
                      sx={{ color: '#2563eb', '&:hover': { color: '#1d4ed8', bgcolor: '#eff6ff' }, mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* BOTÓN ELIMINAR */}
                  <Tooltip title="Eliminar Permiso">
                    <IconButton 
                      onClick={() => handleDeleteClick(perm)} 
                      sx={{ color: '#e11d48', '&:hover': { color: '#be123c', bgcolor: '#fff1f2' } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginadorTabla pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} mostrar={hayPaginacion} />
      </TableContainer>

      {/* Modal crear/editar */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
        <DialogTitle component="div" sx={{ pb: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
            {editMode ? 'Actualizar Permiso' : 'Registrar Permiso Técnico'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          
          <TextField
            label="Clave del Permiso (ej: modulo.accion)"
            fullWidth variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
            slotProps={{ input: { sx: { borderRadius: '12px', fontFamily: 'monospace' } } }}
            helperText="Se formatea automáticamente a minusculas y puntos."
          />

          <FormControl fullWidth variant="outlined">
            <InputLabel>Módulo del Sistema</InputLabel>
            <Select
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              label="Módulo del Sistema"
              sx={{ borderRadius: '12px' }}
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
            fullWidth variant="outlined"
            multiline rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            slotProps={{ input: { sx: { borderRadius: '12px' } } }}
          />

        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleClose} sx={{ color: '#64748b', fontWeight: 'bold', textTransform: 'none' }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!formData.name || !formData.module} 
            sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, px: 3, borderRadius: '8px', fontWeight: 'bold', textTransform: 'none' }}
          >
            {editMode ? 'Guardar Cambios' : 'Crear Permiso'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de eliminar */}
      <Dialog 
        open={openDeleteAlert} 
        onClose={() => setOpenDeleteAlert(false)}
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1, maxWidth: '400px' } } }}
      >
        <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#e11d48', pb: 1 }}>
          <WarningAmber fontSize="large" /> 
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Eliminar Permiso</Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#475569' }}>
            ¿Estás seguro que deseas eliminar el permiso <strong>{permToDelete?.name}</strong>? 
            Si algún Rol tiene asignado este permiso, podría perder acceso a esa función.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenDeleteAlert(false)} sx={{ color: '#64748b', fontWeight: 'bold' }}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmDelete} 
            variant="contained"
            sx={{ bgcolor: '#e11d48', '&:hover': { bgcolor: '#be123c' }, fontWeight: 'bold', borderRadius: '8px' }}
          >
            Sí, Eliminar
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PermissionsScreen;
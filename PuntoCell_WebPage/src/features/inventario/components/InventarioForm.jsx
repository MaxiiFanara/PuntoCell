import React, { useState, useEffect } from 'react';
import {
  Button, TextField, MenuItem, Select, FormControl, InputLabel,
  InputAdornment, Autocomplete, Switch, FormControlLabel, FormHelperText, Box, Typography,
  Alert
} from '@mui/material';
import {
  Save, Store, Smartphone, QrCode2, BatteryChargingFull
} from '@mui/icons-material';
import { inventarioService } from '../../../services/inventarioServices';

const InventarioForm = ({ initialData, isEdit, onSubmit, onCancel, modoCanje = false, excludeIdImei, onReingreso }) => {
  const [formData, setFormData] = useState(initialData);
  const [listaModelos, setListaModelos] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaColores, setListaColores] = useState([]);
  const [listaMemorias, setListaMemorias] = useState([]);
  const [listaBaterias, setListaBaterias] = useState([]);
  const [listaSucursales, setListaSucursales] = useState([]);
  const [listaProveedores, setListaProveedores] = useState([]);
  const [listaEstados, setListaEstados] = useState([]);
  // `error` bloquea el submit (IMEI en uso con stock); `reingresoId` ofrece editar esa fila
  // en vez de dar error, si el IMEI existe pero sin stock.
  const [imeiEstado, setImeiEstado] = useState({ checking: false, error: null, reingresoId: null });

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    const cargarDesplegables = async () => {
      try {
        const [resModelos, resCategorias, resColores, resMemorias, resBaterias, resSucursales, resProveedores, resEstados] = await Promise.all([
          inventarioService.getModelos(),
          inventarioService.getCategorias(),
          inventarioService.getColores(),
          inventarioService.getMemorias(),
          inventarioService.getBaterias(),
          inventarioService.getSucursales(),
          inventarioService.getProveedores(),
          inventarioService.getEstadosInventario()
        ]);

        setListaModelos(Array.isArray(resModelos) ? resModelos : (resModelos.data || []));
        setListaCategorias(Array.isArray(resCategorias) ? resCategorias : (resCategorias.data || []));
        setListaColores(Array.isArray(resColores) ? resColores : (resColores.data || []));
        setListaMemorias(Array.isArray(resMemorias) ? resMemorias : (resMemorias.data || []));
        setListaBaterias(Array.isArray(resBaterias) ? resBaterias : (resBaterias.data || []));
        setListaSucursales(Array.isArray(resSucursales) ? resSucursales : (resSucursales.data || []));
        setListaProveedores(Array.isArray(resProveedores) ? resProveedores : (resProveedores.data || []));
        setListaEstados(Array.isArray(resEstados) ? resEstados : (resEstados.data || []));
      } catch (error) {
        console.error("Error al cargar los datos del formulario:", error);
      }
    };
    cargarDesplegables();
  }, []);

  // Chequea contra el backend, con debounce, si el IMEI cargado ya existe en Inventario.
  useEffect(() => {
    const imei = (formData?.imei || '').trim();
    if (!formData?.esSerializado || imei.length < 6) {
      setImeiEstado({ checking: false, error: null, reingresoId: null });
      return undefined;
    }

    setImeiEstado((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const existente = await inventarioService.buscarPorIMEI(imei, { excluirId: excludeIdImei });
        if (!existente) {
          setImeiEstado({ checking: false, error: null, reingresoId: null });
        } else if (Number(existente.Stock) > 0) {
          setImeiEstado({
            checking: false,
            error: `Este IMEI ya está cargado en inventario (Sucursal Id ${existente.IdSucursal}, Stock ${existente.Stock}).`,
            reingresoId: null
          });
        } else {
          setImeiEstado({
            checking: false,
            error: null,
            reingresoId: existente.Id ?? existente.id
          });
        }
      } catch (err) {
        console.error('No se pudo validar el IMEI:', err);
        setImeiEstado({ checking: false, error: null, reingresoId: null });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData?.imei, formData?.esSerializado, excludeIdImei]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImeiChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 15);
    setFormData({ ...formData, imei: value });
  };

  // Stock: INT NOT NULL CHECK(>= 0) — solo dígitos, sin decimales ni negativos.
  const setSoloEntero = (campo) => (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [campo]: value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (formData.esSerializado && imeiEstado.error) {
      alert(`⚠️ ${imeiEstado.error}`);
      return;
    }
    if (!modoCanje && !formData.idProveedor) {
      alert('⚠️ Seleccioná un proveedor. Es obligatorio para guardar el ingreso.');
      return;
    }
    onSubmit(formData);
  };

  const sectionStyles = {
    bgcolor: 'background.paper',
    p: 3,
    borderRadius: 3,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  };

  // Filtra por EsDispositivo de la categoría del modelo, según el switch de serializado
  const modelosFiltrados = listaModelos.filter((m) => {
    const idCategoria = m.IdCategoriaArticulo ?? m.idCategoriaArticulo;
    const categoria = listaCategorias.find((c) => (c.Id ?? c.id) === idCategoria);
    // Si no encontramos la categoría (datos aún cargando) no ocultamos el modelo.
    if (!categoria) return true;
    return Boolean(categoria.EsDispositivo) === Boolean(formData.esSerializado);
  });

  const headerStyles = {
    color: 'text.secondary',
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    borderBottom: '1px solid #e2e8f0',
    pb: 1,
    mb: 2
  };

  return (
    <Box component="form" onSubmit={handleFormSubmit} sx={{ maxWidth: '1024px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      
      {/* SECCIÓN 1: DETALLES DEL DISPOSITIVO */}
      <Box sx={sectionStyles}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', pb: 1, mb: 2 }}>
          <Typography component="h6" sx={{ ...headerStyles, borderBottom: 'none', pb: 0, mb: 0 }}>
            <Smartphone fontSize="small" /> 1. Detalles del Producto
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={formData.esSerializado}
                onChange={(e) => setFormData({
                  ...formData,
                  esSerializado: e.target.checked,
                  // El modelo elegido puede dejar de ser válido para la otra categoría.
                  idModeloArticulo: '',
                  nombreModelo: ''
                })}
                color="primary"
              />
            }
            label={formData.esSerializado ? "📱 Equipo Serializado (Celular/Tablet)" : "🔌 Accesorio o Repuesto"}
          />
        </Box>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
          <Autocomplete
            options={modelosFiltrados}
            getOptionLabel={(option) => option.Nombre || option.nombre || ''}
            isOptionEqualToValue={(option, value) => option.Id === value.Id}
            value={modelosFiltrados.find(m => (m.Id === formData.idModeloArticulo || m.id === formData.idModeloArticulo)) || null}
            onChange={(event, newValue) => {
              setFormData({
                ...formData,
                idModeloArticulo: newValue ? newValue.Id : '',
                nombreModelo: newValue ? newValue.Nombre : ''
              });
            }}
            renderInput={(params) => <TextField {...params} label="Seleccionar Modelo *" required size="small" />}
          />

          {formData.esSerializado && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <TextField
                label="IMEI / Serial *" name="imei" size="small" required
                value={formData.imei || ''} onChange={handleImeiChange}
                inputProps={{ maxLength: 15, inputMode: 'numeric' }}
                error={Boolean(imeiEstado.error)}
                helperText={
                  imeiEstado.error
                    ? imeiEstado.error
                    : imeiEstado.checking
                      ? 'Verificando IMEI...'
                      : `${(formData.imei || '').length}/15 dígitos`
                }
                InputProps={{ startAdornment: <InputAdornment position="start"><QrCode2 /></InputAdornment> }}
              />
              {imeiEstado.reingresoId && (
                <Alert
                  severity="info"
                  action={
                    onReingreso && (
                      <Button color="inherit" size="small" onClick={() => onReingreso(imeiEstado.reingresoId)}>
                        EDITAR REGISTRO
                      </Button>
                    )
                  }
                >
                  Este IMEI ya existe en inventario (Id {imeiEstado.reingresoId}) pero está sin stock — probablemente sea un
                  reingreso (garantía, reparación o recompra). Editá ese registro en vez de cargar uno nuevo.
                </Alert>
              )}
            </Box>
          )}

          <FormControl fullWidth size="small">
            <InputLabel>Color</InputLabel>
            <Select name="idColor" value={formData.idColor || ''} onChange={handleChange} label="Color">
              <MenuItem value=""><em>-- N/A --</em></MenuItem>
              {listaColores.map(c => <MenuItem key={c.id || c.Id} value={c.id || c.Id}>{c.Nombre || c.nombre}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Memoria</InputLabel>
            <Select name="idMemoria" value={formData.idMemoria || ''} onChange={handleChange} label="Memoria">
              <MenuItem value=""><em>-- N/A --</em></MenuItem>
              {listaMemorias.map(m => <MenuItem key={m.id || m.Id} value={m.id || m.Id}>{m.Capacidad || m.capacidad || m.Nombre}</MenuItem>)}
            </Select>
          </FormControl>

          {formData.esSerializado && (
            <FormControl fullWidth size="small">
              <InputLabel>Batería</InputLabel>
              <Select
                name="idBateria" value={formData.idBateria || ''} onChange={handleChange} label="Batería"
                startAdornment={<InputAdornment position="start"><BatteryChargingFull fontSize="small" /></InputAdornment>}
              >
                <MenuItem value=""><em>-- N/A --</em></MenuItem>
                {listaBaterias.map(b => (
                  <MenuItem key={b.id || b.Id} value={b.id || b.Id}>
                    {(b.Porcentaje ?? b.porcentaje)}%
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {/* El precio ya no se carga acá. Equipos por Compras (con su costo) y equipos de
          canje sin precio (se les fija uno después desde la pantalla de Precios). */}
      <Alert severity="info" sx={{ borderRadius: 3 }}>
        El precio de venta se define en la pantalla de Precios (modelo ListaPrecio + PrecioArticulo).
        El equipo de canje se registra en inventario recién al confirmar la venta.
      </Alert>

      {/* SECCIÓN 3: LOGÍSTICA */}
      <Box sx={sectionStyles}>
        <Typography component="h6" sx={headerStyles}>
          <Store fontSize="small" /> 3. Logística
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <FormControl fullWidth size="small" disabled={isEdit}>
            <InputLabel>Sucursal</InputLabel>
            <Select
              name="idSucursal"
              value={listaSucursales.some(s => (s.id ?? s.Id) === formData.idSucursal) ? formData.idSucursal : ''}
              onChange={handleChange}
              label="Sucursal"
            >
              {listaSucursales.map(s => <MenuItem key={s.id || s.Id} value={s.id || s.Id}>{s.Nombre || s.nombre}</MenuItem>)}
            </Select>
            {isEdit && <FormHelperText sx={{ color: '#f59e0b', fontWeight: 'bold' }}>* Para mover, usá Traspaso.</FormHelperText>}
          </FormControl>

          <FormControl fullWidth size="small" required error={!formData.idProveedor}>
            <InputLabel>Proveedor *</InputLabel>
            <Select name="idProveedor" value={formData.idProveedor || ''} onChange={handleChange} label="Proveedor *">
              <MenuItem value=""><em>-- Seleccionar --</em></MenuItem>
              {listaProveedores.map(p => <MenuItem key={p.Id || p.id} value={p.Id || p.id}>{p.Nombre || p.nombre}</MenuItem>)}
            </Select>
            {!formData.idProveedor && <FormHelperText>Obligatorio</FormHelperText>}
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Estado</InputLabel>
            <Select
              name="idEstadoInventario"
              value={listaEstados.some(e => (e.Id ?? e.id) === formData.idEstadoInventario) ? formData.idEstadoInventario : ''}
              onChange={handleChange}
              label="Estado"
            >
              {listaEstados.map(e => <MenuItem key={e.Id ?? e.id} value={e.Id ?? e.id}>{e.Nombre ?? e.nombre}</MenuItem>)}
            </Select>
            {/* Antes quedaba fijo en "Nuevo" (Id 1) sin poder cambiarlo — clave para poder
                marcar un reingreso (garantía/reparación) como Usado/Reacondicionado. */}
          </FormControl>

          <TextField
            label="Stock Actual" name="stock" size="small"
            value={formData.stock || 1} onChange={setSoloEntero('stock')}
            inputProps={{ inputMode: 'numeric', readOnly: formData.esSerializado }}
            sx={formData.esSerializado ? { bgcolor: '#f8fafc' } : {}}
            helperText={formData.esSerializado ? 'Fijo en 1: los equipos serializados se cargan de a uno' : undefined}
          />
        </Box>
      </Box>

      {/* SECCIÓN 4: OBSERVACIONES */}
      <Box sx={sectionStyles}>
        <TextField 
          label="Observaciones (Opcional)" name="observaciones" multiline rows={3} fullWidth
          value={formData.observaciones || ''} onChange={handleChange}
          placeholder="Escribe detalles adicionales..."
        />
      </Box>

      {/* BOTONES */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pb: 4 }}>
        <Button variant="outlined" color="inherit" onClick={onCancel} sx={{ bgcolor: 'white', px: 3 }}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" color="primary" startIcon={<Save />} sx={{ fontWeight: 'bold', px: 4, boxShadow: 2 }}>
          {isEdit ? "GUARDAR CAMBIOS" : "GUARDAR INGRESO"}
        </Button>
      </Box>
    </Box>
  );
};

export default InventarioForm;
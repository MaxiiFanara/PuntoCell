import { useState, useEffect } from 'react';
import {
  Alert, Autocomplete, Box, Button, MenuItem, Paper, Select, Switch, TextField, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { inventarioService } from '../../../services/inventarioServices';
import { esImeiValido } from '../../../utils/validators';
import EntityAutocomplete from '../../../components/ui/EntityAutocomplete';
import { toast } from 'sonner';

import ModalRegistroDispositivo from '../../../components/modals/ModalRegistroDispositivo';

const Campo = ({ label, children, hint, error, span = 1, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, gridColumn: span > 1 ? `span ${span}` : undefined, ...sx }}>
    {label && <Box sx={{ typography: 'eyebrow', color: error ? 'error.main' : 'text.disabled' }}>{label}</Box>}
    {children}
    {hint && (
      <Typography sx={{ fontSize: '.69rem', color: error ? 'error.main' : 'text.disabled' }}>{hint}</Typography>
    )}
  </Box>
);

const Seccion = ({ titulo, extra, children, columnas = 2 }) => (
  <Paper sx={{ overflow: 'hidden' }}>
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
      p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
    }}>
      <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>{titulo}</Typography>
      {extra}
    </Box>
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: `repeat(${columnas}, minmax(0,1fr))` },
      gap: 1.5, p: '15px',
    }}>
      {children}
    </Box>
  </Paper>
);

const InventarioForm = ({ initialData, isEdit, onSubmit, onCancel, modoCanje = false, excludeIdImei, onReingreso }) => {
  const [formData, setFormData] = useState(initialData);
  const [listaModelos, setListaModelos] = useState([]);
  const [listaCategorias, setListaCategorias] = useState([]);
  const [listaMarcas, setListaMarcas] = useState([]);
  const [listaColores, setListaColores] = useState([]);
  const [listaMemorias, setListaMemorias] = useState([]);
  const [listaBaterias, setListaBaterias] = useState([]);
  const [listaSucursales, setListaSucursales] = useState([]);
  const [listaProveedores, setListaProveedores] = useState([]);
  const [listaEstados, setListaEstados] = useState([]);
  // `error` bloquea el submit (IMEI en uso con stock); `reingresoId` ofrece editar esa fila
  // en vez de dar error, si el IMEI existe pero sin stock.
  const [imeiEstado, setImeiEstado] = useState({ checking: false, error: null, reingresoId: null });

  // Nuevo Modal Modelo
  const [modalModeloOpen, setModalModeloOpen] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    const cargarDesplegables = async () => {
      try {
        const [resModelos, resCategorias, resColores, resMemorias, resBaterias, resSucursales, resProveedores, resEstados, resMarcas] = await Promise.all([
          inventarioService.getModelos(),
          inventarioService.getCategorias(),
          inventarioService.getColores(),
          inventarioService.getMemorias(),
          inventarioService.getBaterias(),
          inventarioService.getSucursales(),
          inventarioService.getProveedores(),
          inventarioService.getEstadosInventario(),
          fetch('/api/inventario/marca-articulos').then(r => r.json()).catch(() => ({ data: [] }))
        ]);

        setListaModelos(Array.isArray(resModelos) ? resModelos : (resModelos.data || []));
        setListaCategorias(Array.isArray(resCategorias) ? resCategorias : (resCategorias.data || []));
        setListaMarcas(resMarcas?.data || resMarcas || []);
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

  // Precios: DECIMAL(18,2) CHECK(>= 0) en la BD — solo dígitos y un único punto decimal
  const setSoloPrecio = (campo) => (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const primerPunto = value.indexOf('.');
    if (primerPunto !== -1) {
      value = value.slice(0, primerPunto + 1) + value.slice(primerPunto + 1).replace(/\./g, '');
    }
    setFormData({ ...formData, [campo]: value });
  };

  // Stock: INT NOT NULL CHECK(>= 0) — solo dígitos, sin decimales ni negativos.
  const setSoloEntero = (campo) => (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, [campo]: value });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (formData.esSerializado && !esImeiValido(formData.imei)) {
      toast.error('⚠️ El IMEI es obligatorio y debe tener exactamente 15 dígitos.');
      return;
    }
    if (formData.esSerializado && imeiEstado.error) {
      toast.error(`⚠️ ${imeiEstado.error}`);
      return;
    }
    if (!formData.idProveedor) {
      toast.error('⚠️ Seleccioná un proveedor. Es obligatorio para guardar el ingreso.');
      return;
    }
    // En canje no se carga precio acá: el precio de toma se define en ModalCobro
    if (!modoCanje && (!formData.precioMenor || Number(formData.precioMenor) <= 0)) {
      toast.error('⚠️ Ingresá un precio público válido, mayor a 0.');
      return;
    }
    onSubmit(formData);
  };

  // Filtra por EsDispositivo de la categoría del modelo, según el switch de serializado
  const modelosFiltrados = listaModelos.filter((m) => {
    const idCategoria = m.IdCategoriaArticulo ?? m.idCategoriaArticulo;
    const categoria = listaCategorias.find((c) => (c.Id ?? c.id) === idCategoria);
    // Si no encontramos la categoría (datos aún cargando) no ocultamos el modelo.
    if (!categoria) return true;
    return Boolean(categoria.EsDispositivo) === Boolean(formData.esSerializado);
  });

  const faltaPrecio = !modoCanje && !formData.precioMenor;

  return (
    <Box component="form" onSubmit={handleFormSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>

      {/* ─── Producto ───────────────────────────────────────── */}
      <Seccion
        titulo="Producto"
        extra={
          <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
            <Typography sx={{ fontSize: '.75rem', color: 'text.secondary' }}>
              {formData.esSerializado ? 'Equipo serializado' : 'Accesorio o repuesto'}
            </Typography>
            <Switch
              size="small"
              checked={Boolean(formData.esSerializado)}
              onChange={(e) => setFormData({
                ...formData,
                esSerializado: e.target.checked,
                // El modelo elegido puede dejar de ser válido para la otra categoría.
                idModeloArticulo: '',
                nombreModelo: ''
              })}
            />
          </Box>
        }
      >
        <Campo label="Modelo *">
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
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
              renderInput={(params) => <TextField {...params} required placeholder="Elegí un modelo" />}
            />
            <Button
              variant="outlined"
              sx={{ minWidth: '40px', px: 1 }}
              onClick={() => setModalModeloOpen(true)}
              title="Crear nuevo modelo"
            >
              +
            </Button>
          </Box>
        </Campo>

        {formData.esSerializado && (
          <Campo
            label="IMEI / Serial *"
            error={Boolean(imeiEstado.error)}
            hint={
              imeiEstado.error ? imeiEstado.error
                : imeiEstado.checking ? 'Verificando IMEI…'
                : `${(formData.imei || '').length}/15 dígitos`
            }
          >
            <TextField
              name="imei" required fullWidth className="mono"
              placeholder="Sin espacios"
              value={formData.imei || ''} onChange={handleImeiChange}
              error={Boolean(imeiEstado.error)}
              slotProps={{ htmlInput: { maxLength: 15, inputMode: 'numeric', className: 'mono' } }}
            />
          </Campo>
        )}

        <Campo label="Color">
          <EntityAutocomplete options={listaColores}
            value={formData.idColor} onChange={(id) => handleChange({ target: { name: 'idColor', value: id } })}
            placeholder="Sin especificar" />
        </Campo>

        <Campo label="Memoria">
          <EntityAutocomplete options={listaMemorias}
            getLabel={(m) => m.Capacidad ?? m.capacidad ?? m.Nombre ?? ''}
            value={formData.idMemoria} onChange={(id) => handleChange({ target: { name: 'idMemoria', value: id } })}
            placeholder="Sin especificar" />
        </Campo>

        {formData.esSerializado && (
          <Campo label="Batería (%)" hint="Del 0 al 100">
            <TextField
              name="bateriaPorcentaje" fullWidth type="number" className="mono" placeholder="Ej: 85"
              value={formData.bateriaPorcentaje || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFormData({ ...formData, bateriaPorcentaje: val === '' ? '' : Math.max(0, Math.min(100, parseInt(val) || 0)) });
              }}
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
            />
          </Campo>
        )}

        {imeiEstado.reingresoId && (
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Alert
              severity="info"
              action={onReingreso && (
                <Button color="inherit" size="small" onClick={() => onReingreso(imeiEstado.reingresoId)}>
                  Editar registro
                </Button>
              )}
            >
              Este IMEI ya existe en inventario (Id {imeiEstado.reingresoId}) pero está sin stock — probablemente sea un
              reingreso por garantía, reparación o recompra. Editá ese registro en vez de cargar uno nuevo.
            </Alert>
          </Box>
        )}
      </Seccion>

      {/* ─── Precios ────────────────────────────────────────── */}
      {modoCanje ? (
        <Alert severity="info">
          El precio de este equipo se define al cargar el monto en la forma de pago "Canje", no acá.
          Además, no se registra en inventario hasta confirmar la venta.
        </Alert>
      ) : (
        <Seccion titulo="Precios" columnas={3} extra={
          <Typography sx={{ color: 'text.disabled', fontSize: '.72rem' }}>En dólares</Typography>
        }>
          <Campo label="Costo base">
            <TextField
              name="precioCosto" fullWidth className="mono" placeholder="0.00"
              value={formData.precioCosto || ''} onChange={setSoloPrecio('precioCosto')}
              slotProps={{ htmlInput: { inputMode: 'decimal', className: 'mono' } }}
            />
          </Campo>
          <Campo label="Precio mayorista">
            <TextField
              name="precioMayor" fullWidth className="mono" placeholder="0.00"
              value={formData.precioMayor || ''} onChange={setSoloPrecio('precioMayor')}
              slotProps={{ htmlInput: { inputMode: 'decimal', className: 'mono' } }}
            />
          </Campo>
          <Campo
            label="Precio público *"
            error={faltaPrecio}
            hint={faltaPrecio ? 'Obligatorio, mayor a 0' : undefined}
          >
            <TextField
              name="precioMenor" required fullWidth className="mono" placeholder="0.00"
              value={formData.precioMenor || ''} onChange={setSoloPrecio('precioMenor')}
              error={faltaPrecio}
              slotProps={{ htmlInput: { inputMode: 'decimal', className: 'mono' } }}
            />
          </Campo>
        </Seccion>
      )}

      {/* ─── Logística ──────────────────────────────────────── */}
      <Seccion titulo="Logística" columnas={4}>
        <Campo label="Sucursal" hint={isEdit ? 'Para mover stock, usá Traspaso' : undefined}>
          <Select
            name="idSucursal" size="small" displayEmpty disabled={isEdit}
            value={listaSucursales.some(s => (s.id ?? s.Id) === formData.idSucursal) ? formData.idSucursal : ''}
            onChange={handleChange}
          >
            <MenuItem value="" disabled>Elegí una sucursal</MenuItem>
            {listaSucursales.map(s => <MenuItem key={s.id || s.Id} value={s.id || s.Id}>{s.Nombre || s.nombre}</MenuItem>)}
          </Select>
        </Campo>

        <Campo label="Proveedor *" error={!formData.idProveedor} hint={
          modoCanje ? 'Equipo de canje: se asigna automáticamente a "Canje de Clientes"'
            : !formData.idProveedor ? 'Obligatorio' : undefined
        }>
          <Select
            name="idProveedor" size="small" displayEmpty error={!formData.idProveedor}
            value={formData.idProveedor || ''} onChange={handleChange}
            disabled={modoCanje}
          >
            <MenuItem value="" disabled>Elegí un proveedor</MenuItem>
            {listaProveedores.map(p => <MenuItem key={p.Id || p.id} value={p.Id || p.id}>{p.Nombre || p.nombre}</MenuItem>)}
          </Select>
        </Campo>

        {/* Antes quedaba fijo en "Nuevo" (Id 1) sin poder cambiarlo — clave para poder
            marcar un reingreso (garantía/reparación) como Usado/Reacondicionado. */}
        <Campo label="Estado">
          <Select
            name="idEstadoInventario" size="small" displayEmpty
            value={listaEstados.some(e => (e.Id ?? e.id) === formData.idEstadoInventario) ? formData.idEstadoInventario : ''}
            onChange={handleChange}
          >
            <MenuItem value="" disabled>Elegí un estado</MenuItem>
            {listaEstados.map(e => <MenuItem key={e.Id ?? e.id} value={e.Id ?? e.id}>{e.Nombre ?? e.nombre}</MenuItem>)}
          </Select>
        </Campo>

        <Campo
          label="Stock"
          hint={formData.esSerializado ? 'Los equipos serializados se cargan de a uno' : undefined}
        >
          <TextField
            name="stock" fullWidth className="mono"
            value={formData.stock || 1} onChange={setSoloEntero('stock')}
            slotProps={{ htmlInput: { inputMode: 'numeric', readOnly: Boolean(formData.esSerializado), className: 'mono' } }}
          />
        </Campo>
      </Seccion>

      {/* ─── Observaciones ──────────────────────────────────── */}
      <Seccion titulo="Observaciones" columnas={1}>
        <Campo>
          <TextField
            name="observaciones" multiline rows={3} fullWidth
            value={formData.observaciones || ''} onChange={handleChange}
            placeholder="Detalles estéticos, accesorios incluidos, condición del equipo…"
          />
        </Campo>
      </Seccion>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pb: 2 }}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon sx={{ fontSize: '16px !important' }} />}>
          {isEdit ? 'Guardar cambios' : 'Guardar ingreso'}
        </Button>
      </Box>

      <ModalRegistroDispositivo
        open={modalModeloOpen}
        onClose={() => setModalModeloOpen(false)}
        tipos={listaCategorias.map(c => ({ id: c.Id ?? c.id, nombre: c.Nombre ?? c.nombre }))}
        marcas={listaMarcas.map(m => ({ id: m.Id ?? m.id, nombre: m.Nombre ?? m.nombre }))}
        onDispositivoGuardado={(nuevoModelo) => {
          // El modal devuelve un objeto con id y nombre. Lo agregamos a listaModelos si no está.
          const modeloCompleto = { Id: nuevoModelo.id, id: nuevoModelo.id, Nombre: nuevoModelo.nombre, nombre: nuevoModelo.nombre, IdCategoriaArticulo: nuevoModelo.idTipo, IdMarcaArticulo: nuevoModelo.idMarca };
          setListaModelos(prev => [...prev, modeloCompleto]);
          setFormData(prev => ({
            ...prev,
            idModeloArticulo: nuevoModelo.id,
            nombreModelo: nuevoModelo.nombre
          }));
        }}
      />
    </Box>
  );
};

export default InventarioForm;

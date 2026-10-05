import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  TextField, MenuItem, Grid, ToggleButton, ToggleButtonGroup, FormControlLabel, Switch,
  Autocomplete, Divider, Alert, Chip, InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

import { comprasService } from '../../../services/comprasServices';
import { inventarioService } from '../../../services/inventarioServices';
import { ventasService } from '../../../services/ventasServices';
import { getMarcas } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { soloImei, esImeiValido } from '../../../utils/validators';
import Money from '../../../components/ui/Money';
import NumberField from '../../../components/ui/NumberField';
import EntityAutocomplete from '../../../components/ui/EntityAutocomplete';
import { useVenta } from '../../punto-venta/context/VentaContext';

import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ImeiScannerModal from '../../../components/modals/ImeiScannerModal';

const ID_TURNO_CAJA = 1; // seed fijo — el módulo de caja de la API todavía no está expuesto
const hoy = () => new Date().toISOString().slice(0, 10);

// Categorías que NO se muestran cuando el ítem nuevo es "no serializado".
const CATEGORIAS_EXCLUIDAS_NO_SERIAL = /smartphone|notebook|tablet/i;

// Sólo enteros positivos (para Cantidad).
const soloEnteroPositivo = (v) => String(v).replace(/\D/g, '').replace(/^0+(?=\d)/, '');

// clasificacion: 'serializado' | 'no_serializado' | 'repuesto'
const lineaVacia = () => ({
  nuevo: false,
  articulo: null,               // modo "artículo existente": Articulo { Id, Nombre, EsSerializado, EsRepuesto }
  clasificacion: 'serializado',
  idCategoria: '', idMarca: '', idModelo: '',
  cantidad: 1,
  costo: '',
  imeis: [''],
  idColor: '', idMemoria: '', idBateria: '',
});

const flagsPorClasificacion = (c) => ({
  serializado:     { EsSerializado: true,  EsRepuesto: false, EsVendible: true  },
  no_serializado:  { EsSerializado: false, EsRepuesto: false, EsVendible: true  },
  repuesto:        { EsSerializado: false, EsRepuesto: true,  EsVendible: false },
}[c]);

// Predicado sobre un Articulo según la clasificación elegida (para reconocer si ya existe
// un Producto igual al que se armaría con los datos de la línea).
const matchClasificacion = (c) => ({
  serializado:    (a) => !!a.EsSerializado,
  no_serializado: (a) => !a.EsSerializado && !a.EsRepuesto,
  repuesto:       (a) => !!a.EsRepuesto,
}[c]);

// Combo "buscador inteligente" para campos con id (categoría / marca / modelo).
const ComboId = ({ label, options, valueId, onPick, disabled }) => (
  <Autocomplete
    size="small"
    disabled={disabled}
    options={options}
    value={options.find((o) => o.id === Number(valueId)) ?? null}
    onChange={(e, v) => onPick(v ? v.id : '')}
    getOptionLabel={(o) => o?.label ?? ''}
    isOptionEqualToValue={(o, v) => o.id === v?.id}
    renderInput={(params) => <TextField {...params} label={label} />}
  />
);

export default function CompraCreateModal({ open, onClose, onGuardado }) {
  const { usuario } = useAuth();
  // El costo cargado es USD (fuente de verdad, ver compra.service.js); dolarGlobal solo
  // se usa para mostrar el equivalente en pesos.
  const { dolarGlobal } = useVenta();

  const [cat, setCat] = useState({
    proveedores: [], sucursales: [], articulos: [], categorias: [], marcas: [],
    modelos: [], colores: [], memorias: [], baterias: [], metodos: [],
  });

  const [idProveedor, setIdProveedor] = useState('');
  const fecha = hoy(); // fija: siempre el día de hoy, no editable
  const [idSucursal, setIdSucursal] = useState(usuario?.sucursal || '');
  const [garantiaLocal, setGarantiaLocal] = useState('');
  const [condicion, setCondicion] = useState('contado'); // contado | parcial | credito
  const [montoParcial, setMontoParcial] = useState('');
  const [idMetodoPago, setIdMetodoPago] = useState('');

  const [lineas, setLineas] = useState([lineaVacia()]);
  const [scannerTarget, setScannerTarget] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    const arr = (x) => (Array.isArray(x) ? x : (x?.data || []));
    Promise.all([
      comprasService.getProveedores(),
      inventarioService.getSucursales(),
      comprasService.getArticulos(),
      inventarioService.getCategorias(),
      inventarioService.getModelos(),
      getMarcas(),
      inventarioService.getColores(),
      inventarioService.getMemorias(),
      inventarioService.getBaterias(),
      ventasService.getMetodosPago(),
    ]).then(([prov, suc, arts, cats, mods, marcas, cols, mems, bats, mets]) => {
      setCat({
        proveedores: arr(prov), sucursales: arr(suc), articulos: arr(arts),
        categorias: arr(cats), marcas: arr(marcas), modelos: arr(mods),
        colores: arr(cols), memorias: arr(mems), baterias: arr(bats), metodos: arr(mets),
      });
      setIdMetodoPago(arr(mets)[0]?.Id ?? arr(mets)[0]?.id ?? '');
    }).catch((e) => setError('No se pudieron cargar los catálogos: ' + (e.message || '')));
  }, [open]);

  const total = useMemo(
    () => lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0),
    [lineas]
  );

  const esSerial = (l) => (l.nuevo ? l.clasificacion === 'serializado' : !!l.articulo?.EsSerializado);
  const esRepuesto = (l) => (l.nuevo ? l.clasificacion === 'repuesto' : !!l.articulo?.EsRepuesto);

  const setLinea = (i, patch) => setLineas((prev) => prev.map((l, idx) => {
    if (idx !== i) return l;
    const next = { ...l, ...patch };

    // Cambios que invalidan la cascada de abajo
    if (patch.clasificacion !== undefined || patch.nuevo !== undefined) {
      next.idCategoria = ''; next.idMarca = ''; next.idModelo = '';
      next.idColor = ''; next.idMemoria = ''; next.idBateria = '';
      if (patch.nuevo !== undefined) next.articulo = null;
    }
    if (patch.idCategoria !== undefined) { next.idMarca = ''; next.idModelo = ''; }
    if (patch.idMarca !== undefined) { next.idModelo = ''; }

    // Serializado: siempre 1 unidad y un solo IMEI
    const serial = next.nuevo ? next.clasificacion === 'serializado' : !!next.articulo?.EsSerializado;
    if (serial) {
      next.cantidad = 1;
      next.imeis = [next.imeis?.[0] || ''];
    }
    return next;
  }));

  // --- Opciones de cada combo de la cascada ---
  const categoriasOpts = (clasificacion) => {
    let list = cat.categorias;
    if (clasificacion === 'no_serializado') {
      list = list.filter((c) => !CATEGORIAS_EXCLUIDAS_NO_SERIAL.test(c.Nombre ?? c.nombre ?? ''));
    }
    return list.map((c) => ({ id: Number(c.Id ?? c.id), label: c.Nombre ?? c.nombre }));
  };

  const catModeloCat = (m) => Number(m.IdCategoriaArticulo ?? m.idTipo ?? m.IdCategoriaProducto);
  const catModeloMarca = (m) => Number(m.IdMarcaArticulo ?? m.idMarca ?? m.IdMarcaProducto);

  const marcasOpts = (l) => {
    if (!l.idCategoria) return [];
    const idsMarca = new Set(cat.modelos
      .filter((m) => catModeloCat(m) === Number(l.idCategoria))
      .map(catModeloMarca));
    return cat.marcas
      .filter((mk) => idsMarca.has(Number(mk.id ?? mk.Id)))
      .map((mk) => ({ id: Number(mk.id ?? mk.Id), label: mk.nombre ?? mk.Nombre }));
  };

  const modelosOpts = (l) => cat.modelos
    .filter((m) => {
      if (l.idCategoria && catModeloCat(m) !== Number(l.idCategoria)) return false;
      if (l.idMarca && catModeloMarca(m) !== Number(l.idMarca)) return false;
      return true;
    })
    .map((m) => ({ id: Number(m.Id ?? m.id), label: m.Nombre ?? m.nombre }));

  // --- Nombre del Producto nuevo: se calcula solo, no se tipea ---
  // Modelo + Color + Memoria + Batería (se omite lo que no aplica al caso: no_serializado
  // no lleva memoria/batería, repuesto no lleva ninguna spec).
  const labelDe = (lista, id) => {
    const item = lista.find((x) => Number(x.Id ?? x.id) === Number(id));
    return item?.Nombre ?? item?.nombre ?? item?.Capacidad ?? item?.capacidad ?? '';
  };

  const nombreCalculado = (l) => {
    if (!l.idModelo) return '';
    const partes = [
      labelDe(cat.modelos, l.idModelo),
      l.idColor && labelDe(cat.colores, l.idColor),
      l.idMemoria && labelDe(cat.memorias, l.idMemoria),
      l.idBateria && labelDe(cat.baterias, l.idBateria),
    ];
    return partes.filter(Boolean).join(' ');
  };

  // Si ya existe un Producto igual (mismo modelo + mismo nombre calculado + misma
  // clasificación) lo reutilizamos en vez de crear uno duplicado.
  const resolverArticuloExistente = (l) => {
    const nombreCalc = nombreCalculado(l);
    if (!nombreCalc) return null;
    const esDelTipo = matchClasificacion(l.clasificacion);
    return cat.articulos.find((a) => {
      const idMod = Number(a.IdModeloArticulo ?? a.idModeloArticulo ?? a.modelo?.Id);
      return idMod === Number(l.idModelo)
        && (a.Nombre ?? a.nombre ?? '').trim().toLowerCase() === nombreCalc.trim().toLowerCase()
        && esDelTipo(a);
    }) ?? null;
  };

  const guardar = async () => {
    setError('');
    if (!idProveedor) return setError('Elegí un proveedor.');
    if (!idSucursal) return setError('Elegí la sucursal destino.');
    if (!lineas.length) return setError('Agregá al menos un ítem.');
    if (!garantiaLocal) return setError('Indicá la fecha de garantía local (aplica a los ítems nuevos).');

    for (const [i, l] of lineas.entries()) {
      const n = i + 1;
      if (l.nuevo) {
        if (!l.idCategoria) return setError(`Ítem ${n}: elegí la categoría.`);
        if (!l.idMarca) return setError(`Ítem ${n}: elegí la marca.`);
        if (!l.idModelo) return setError(`Ítem ${n}: elegí el modelo.`);
      } else if (!l.articulo) {
        return setError(`Ítem ${n}: elegí un artículo o marcá "Artículo nuevo".`);
      }
      if (!l.costo || Number(l.costo) <= 0) return setError(`Ítem ${n}: costo inválido (sólo números positivos).`);
      if (esSerial(l)) {
        if (!esImeiValido(l.imeis[0])) return setError(`Ítem ${n}: el IMEI es obligatorio y debe tener exactamente 15 dígitos.`);
      } else if (!l.cantidad || Number(l.cantidad) < 1) {
        return setError(`Ítem ${n}: cantidad inválida (número entero positivo).`);
      }
    }

    setGuardando(true);
    try {
      const detalles = [];
      for (const l of lineas) {
        let idArticulo = l.articulo?.Id ?? l.articulo?.id;
        if (l.nuevo) {
          const existente = resolverArticuloExistente(l);
          if (existente) {
            idArticulo = existente.Id ?? existente.id;
          } else {
            const creado = await comprasService.crearArticulo({
              Nombre: nombreCalculado(l),
              ...flagsPorClasificacion(l.clasificacion),
              Activo: true,
              IdModeloArticulo: Number(l.idModelo),
            });
            idArticulo = creado?.Id ?? creado?.id ?? creado?.data?.Id;
            if (!idArticulo) throw new Error('El backend no devolvió el Id del artículo nuevo.');
          }
        }
        const serial = esSerial(l);
        const repuesto = esRepuesto(l);
        detalles.push({
          IdArticulo: Number(idArticulo),
          Cantidad: serial ? 1 : Number(l.cantidad),
          PrecioCostoUnitario: Number(Number(l.costo).toFixed(2)),
          MesesGarantiaLocal: garantiaLocal,
          ...(serial ? { IMEIs: l.imeis.map((s) => s.trim()).filter(Boolean) } : {}),
          ...(!repuesto && l.idColor ? { IdColor: Number(l.idColor) } : {}),
          ...(serial && l.idMemoria ? { IdMemoria: Number(l.idMemoria) } : {}),
          ...(serial && l.idBateria ? { IdBateria: Number(l.idBateria) } : {}),
        });
      }

      let pagos = [];
      if (condicion === 'contado') {
        pagos = [{ IdMetodoPago: Number(idMetodoPago), Monto: Number(total.toFixed(2)) }];
      } else if (condicion === 'parcial') {
        const m = Number(montoParcial);
        if (!m || m <= 0 || m >= total) { setGuardando(false); return setError('El monto parcial debe ser mayor a 0 y menor al total.'); }
        pagos = [{ IdMetodoPago: Number(idMetodoPago), Monto: Number(m.toFixed(2)) }];
      }

      const payload = {
        Fecha: new Date().toISOString(),
        IdProveedor: Number(idProveedor),
        IdSucursalDestino: Number(idSucursal),
        IdEmpleado: usuario?.userID,
        ...(pagos.length ? { IdTurnoCaja: ID_TURNO_CAJA, Pagos: pagos } : {}),
        Detalles: detalles,
      };

      const res = await comprasService.crearCompra(payload);
      if (res?.advertencias?.length) alert('Compra registrada con avisos:\n- ' + res.advertencias.join('\n- '));
      reset();
      onGuardado();
    } catch (e) {
      setError('No se pudo registrar la compra: ' + (e.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  const reset = () => {
    setIdProveedor(''); setGarantiaLocal('');
    setCondicion('contado'); setMontoParcial('');
    setLineas([lineaVacia()]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Registrar compra
        <IconButton onClick={onClose} size="small" aria-label="Cerrar"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Cabecera */}
        <Box sx={{ bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider', p: 2, borderRadius: '9px', mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Autocomplete
                size="small"
                options={cat.proveedores}
                getOptionLabel={(o) => o.Nombre ?? o.nombre ?? ''}
                isOptionEqualToValue={(o, v) => (o.Id ?? o.id) === (v?.Id ?? v?.id)}
                value={cat.proveedores.find((p) => (p.Id ?? p.id) === Number(idProveedor)) ?? null}
                onChange={(e, v) => setIdProveedor(v ? (v.Id ?? v.id) : '')}
                renderInput={(params) => <TextField {...params} label="Proveedor *" />}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField
                fullWidth size="small" type="date" label="Fecha"
                value={fecha}
                InputProps={{ readOnly: true }}
                disabled
                InputLabelProps={{ shrink: true }}
                helperText="Se registra siempre con la fecha de hoy"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField select fullWidth size="small" label="Sucursal destino *" value={idSucursal} onChange={(e) => setIdSucursal(e.target.value)}>
                {cat.sucursales.map((s) => <MenuItem key={s.Id ?? s.id} value={s.Id ?? s.id}>{s.Nombre ?? s.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 2 }}>
              <TextField fullWidth size="small" type="date" label="Garantía local" InputLabelProps={{ shrink: true }} value={garantiaLocal} onChange={(e) => setGarantiaLocal(e.target.value)} />
            </Grid>
          </Grid>
        </Box>

        {/* Ítems */}
        <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1 }}>Ítems de la compra</Box>
        {lineas.map((l, i) => {
          const serial = esSerial(l);
          const repuesto = esRepuesto(l);
          const mostrarColor = l.nuevo
            ? (l.clasificacion === 'serializado' || l.clasificacion === 'no_serializado')
            : (serial); // en modo "artículo existente" se conserva el comportamiento previo
          return (
          <Box key={i} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 2, borderRadius: '9px', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <FormControlLabel
                control={<Switch size="small" checked={l.nuevo} onChange={(e) => setLinea(i, { nuevo: e.target.checked })} />}
                label={<Typography variant="body2">Artículo nuevo</Typography>}
              />
              {lineas.length > 1 && (
                <IconButton size="small" color="error" onClick={() => setLineas((p) => p.filter((_, idx) => idx !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {l.nuevo ? (
              <>
                <ToggleButtonGroup
                  size="small" exclusive value={l.clasificacion}
                  onChange={(e, v) => v && setLinea(i, { clasificacion: v })}
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="serializado">Serializado (IMEI)</ToggleButton>
                  <ToggleButton value="no_serializado">No serializado</ToggleButton>
                  <ToggleButton value="repuesto">Repuesto</ToggleButton>
                </ToggleButtonGroup>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <ComboId label="Categoría *" options={categoriasOpts(l.clasificacion)}
                      valueId={l.idCategoria} onPick={(v) => setLinea(i, { idCategoria: v })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <ComboId label="Marca *" options={marcasOpts(l)} disabled={!l.idCategoria}
                      valueId={l.idMarca} onPick={(v) => setLinea(i, { idMarca: v })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <ComboId label="Modelo *" options={modelosOpts(l)} disabled={!l.idCategoria}
                      valueId={l.idModelo} onPick={(v) => setLinea(i, { idModelo: v })} />
                  </Grid>
                </Grid>
              </>
            ) : (
              <Autocomplete size="small" options={cat.articulos}
                getOptionLabel={(o) => o.Nombre || ''}
                isOptionEqualToValue={(o, v) => (o.Id ?? o.id) === (v?.Id ?? v?.id)}
                value={l.articulo}
                onChange={(e, v) => setLinea(i, { articulo: v })}
                renderInput={(params) => <TextField {...params} label="Artículo existente" />}
                renderOption={(props, o) => (
                  <li {...props} key={o.Id ?? o.id}>
                    {o.Nombre}
                    {o.EsSerializado && <Chip label="serie" size="small" sx={{ ml: 1, height: 18 }} />}
                    {o.EsRepuesto && <Chip label="repuesto" size="small" sx={{ ml: 1, height: 18 }} />}
                  </li>
                )}
              />
            )}

            {/* Cantidad / costo / specs */}
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField fullWidth size="small" label="Cantidad" value={l.cantidad}
                  disabled={serial}
                  inputProps={{ inputMode: 'numeric' }}
                  onChange={(e) => setLinea(i, { cantidad: soloEnteroPositivo(e.target.value) })}
                  helperText={serial ? 'Serializado: 1' : ' '} />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <NumberField fullWidth size="small" label="Costo Unit. (U$S)" value={l.costo}
                  onChange={(e) => setLinea(i, { costo: e.target.value })}
                  helperText={Number(l.costo) > 0 ? `≈ $ ${Math.round(Number(l.costo) * dolarGlobal).toLocaleString('es-AR')}` : ' '} />
              </Grid>

              {mostrarColor && (
                <Grid size={{ xs: 4, sm: 2 }}>
                  <EntityAutocomplete label="Color" options={cat.colores}
                    value={l.idColor} onChange={(id) => setLinea(i, { idColor: id })} />
                </Grid>
              )}

              {serial && (
                <>
                  <Grid size={{ xs: 4, sm: 3 }}>
                    <EntityAutocomplete label="Memoria" options={cat.memorias}
                      getLabel={(m) => m.Capacidad ?? m.capacidad ?? ''}
                      value={l.idMemoria} onChange={(id) => setLinea(i, { idMemoria: id })} />
                  </Grid>
                  <Grid size={{ xs: 4, sm: 3 }}>
                    <EntityAutocomplete label="Batería" options={cat.baterias}
                      getLabel={(b) => (b.Porcentaje ?? b.porcentaje) != null ? `${b.Porcentaje ?? b.porcentaje}%` : (b.Nombre ?? b.nombre ?? '')}
                      value={l.idBateria} onChange={(id) => setLinea(i, { idBateria: id })} />
                  </Grid>
                  <Grid size={12}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {l.imeis.map((imei, k) => (
                        <TextField 
                          key={k} 
                          size="small" 
                          label={`IMEI ${k + 1} *`} 
                          value={imei}
                          onChange={(e) => setLinea(i, { imeis: l.imeis.map((v, idx) => (idx === k ? soloImei(e.target.value) : v)) })}
                          inputProps={{ maxLength: 15, inputMode: 'numeric' }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton 
                                  color="primary" 
                                  onClick={() => setScannerTarget({ lineaIndex: i, imeiIndex: k })}
                                  title="Escanear con cámara"
                                >
                                  <QrCodeScannerIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          error={imei.length > 0 && !esImeiValido(imei)}
                          helperText={`${imei.length}/15`}
                          sx={{ width: 240 }} // Ligeramente más ancho (antes 210) para alojar el ícono
                        />
                      ))}
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Nombre del Producto nuevo: no se tipea, se calcula solo (Modelo + Color + Memoria + Batería) */}
            {l.nuevo && l.idModelo && (
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField fullWidth size="small" label="Producto (calculado)" value={nombreCalculado(l)}
                  InputProps={{ readOnly: true }} />
                {resolverArticuloExistente(l) && (
                  <Chip label="ya existe: se reutiliza" size="small" color="info" sx={{ flexShrink: 0 }} />
                )}
              </Box>
            )}
          </Box>
        );})}

        <Button size="small" onClick={() => setLineas((p) => [...p, lineaVacia()])} sx={{ textTransform: 'none' }}>
          + Agregar ítem
        </Button>

        <Divider sx={{ my: 2 }} />

        {/* Pago */}
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Condición de pago" value={condicion} onChange={(e) => setCondicion(e.target.value)}>
              <MenuItem value="contado">Contado (pago total)</MenuItem>
              <MenuItem value="parcial">Pago parcial</MenuItem>
              <MenuItem value="credito">Cuenta corriente (crédito)</MenuItem>
            </TextField>
          </Grid>
          {condicion !== 'credito' && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth size="small" label="Método de pago" value={idMetodoPago} onChange={(e) => setIdMetodoPago(e.target.value)}>
                {cat.metodos.map((m) => <MenuItem key={m.Id ?? m.id} value={m.Id ?? m.id}>{m.Nombre ?? m.nombre}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {condicion === 'parcial' && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <NumberField fullWidth size="small" label="Monto a pagar ahora" value={montoParcial}
                onChange={(e) => setMontoParcial(e.target.value)} />
            </Grid>
          )}
          <Grid size={12} sx={{ textAlign: 'right' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 1 }}>
              <Typography sx={{ fontSize: '.84rem', color: 'text.secondary', fontWeight: 600 }}>Total:</Typography>
              <Money ars={total * dolarGlobal} usd={total} size="lg" />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Registrar compra'}
        </Button>
      </DialogActions>
      <ImeiScannerModal
        open={Boolean(scannerTarget)}
        onClose={() => setScannerTarget(null)}
        onScanSuccess={(codigo) => {
          if (scannerTarget) {
            const { lineaIndex, imeiIndex } = scannerTarget;
            const imeiLimpio = soloImei(codigo.trim());
            const currentLine = lineas[lineaIndex];
            setLinea(lineaIndex, {
              imeis: currentLine.imeis.map((v, idx) => (idx === imeiIndex ? imeiLimpio : v))
            });
          }
        }}
      />
    </Dialog>
  );
}

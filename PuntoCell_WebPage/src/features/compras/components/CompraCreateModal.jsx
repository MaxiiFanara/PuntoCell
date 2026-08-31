import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton,
  TextField, MenuItem, Grid, Switch, FormControlLabel, Autocomplete, Divider, Alert, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

import { comprasService } from '../../../services/comprasServices';
import { inventarioService } from '../../../services/inventarioServices';
import { ventasService } from '../../../services/ventasServices';
import { useAuth } from '../../../context/AuthContext';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ID_TURNO_CAJA = 1; // seed fijo — el módulo de caja de la API todavía no está expuesto
const hoy = () => new Date().toISOString().slice(0, 10);

const lineaVacia = () => ({
  articulo: null,        // { Id, Nombre, EsSerializado } existente, o null
  nuevoArticulo: false,
  nombreNuevo: '',
  idModelo: '',
  esSerializado: false,
  cantidad: 1,
  costo: '',
  imeis: [''],
  idColor: '', idMemoria: '', idBateria: '',
});

export default function CompraCreateModal({ open, onClose, onGuardado }) {
  const { usuario } = useAuth();

  const [proveedores, setProveedores] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [colores, setColores] = useState([]);
  const [memorias, setMemorias] = useState([]);
  const [baterias, setBaterias] = useState([]);
  const [metodos, setMetodos] = useState([]);

  const [idProveedor, setIdProveedor] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [idSucursal, setIdSucursal] = useState(usuario?.sucursal || '');
  const [garantiaLocal, setGarantiaLocal] = useState('');
  const [condicion, setCondicion] = useState('contado'); // contado | parcial | credito
  const [montoParcial, setMontoParcial] = useState('');
  const [idMetodoPago, setIdMetodoPago] = useState('');

  const [lineas, setLineas] = useState([lineaVacia()]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    Promise.all([
      comprasService.getProveedores(),
      inventarioService.getSucursales(),
      comprasService.getArticulos(),
      inventarioService.getModelos(),
      inventarioService.getColores(),
      inventarioService.getMemorias(),
      inventarioService.getBaterias(),
      ventasService.getMetodosPago(),
    ]).then(([prov, suc, arts, mods, cols, mems, bats, mets]) => {
      const arr = (x) => (Array.isArray(x) ? x : (x?.data || []));
      setProveedores(arr(prov));
      setSucursales(arr(suc));
      setArticulos(arr(arts));
      setModelos(arr(mods));
      setColores(arr(cols));
      setMemorias(arr(mems));
      setBaterias(arr(bats));
      const m = arr(mets);
      setMetodos(m);
      setIdMetodoPago(m[0]?.Id ?? m[0]?.id ?? '');
    }).catch((e) => setError('No se pudieron cargar los catálogos: ' + (e.message || '')));
  }, [open]);

  const total = useMemo(
    () => lineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0),
    [lineas]
  );

  const setLinea = (i, patch) => setLineas((prev) => prev.map((l, idx) => {
    if (idx !== i) return l;
    const next = { ...l, ...patch };
    // Serializado => cantidad fija en 1 y un solo IMEI
    const serial = next.nuevoArticulo ? next.esSerializado : !!next.articulo?.EsSerializado;
    if (serial) {
      next.cantidad = 1;
      next.imeis = [next.imeis?.[0] || ''];
    } else if (patch.cantidad !== undefined) {
      const n = Math.max(1, Number(patch.cantidad) || 1);
      next.imeis = Array.from({ length: n }, (_, k) => next.imeis?.[k] || '');
    }
    return next;
  }));

  const esSerial = (l) => (l.nuevoArticulo ? l.esSerializado : !!l.articulo?.EsSerializado);

  const guardar = async () => {
    setError('');
    if (!idProveedor) return setError('Elegí un proveedor.');
    if (!idSucursal) return setError('Elegí la sucursal destino.');
    if (lineas.length === 0) return setError('Agregá al menos un renglón.');

    // Validaciones por renglón
    for (const [i, l] of lineas.entries()) {
      const n = i + 1;
      if (l.nuevoArticulo) {
        if (!l.nombreNuevo.trim()) return setError(`Renglón ${n}: falta el nombre del artículo nuevo.`);
        if (!l.idModelo) return setError(`Renglón ${n}: elegí el modelo del artículo nuevo.`);
      } else if (!l.articulo) {
        return setError(`Renglón ${n}: elegí un artículo (o marcá "artículo nuevo").`);
      }
      if (!l.costo || Number(l.costo) <= 0) return setError(`Renglón ${n}: costo inválido.`);
      if (esSerial(l)) {
        if (!l.imeis[0]?.trim()) return setError(`Renglón ${n}: falta el IMEI.`);
      } else if (!l.cantidad || Number(l.cantidad) < 1) {
        return setError(`Renglón ${n}: cantidad inválida.`);
      }
    }
    if (!garantiaLocal) return setError('Indicá la fecha de garantía local (aplica a los renglones nuevos).');

    setGuardando(true);
    try {
      // 1. Crear los artículos nuevos que hagan falta
      const detalles = [];
      for (const l of lineas) {
        let idArticulo = l.articulo?.Id ?? l.articulo?.id;
        if (l.nuevoArticulo) {
          const creado = await comprasService.crearArticulo({
            Nombre: l.nombreNuevo.trim(),
            EsSerializado: !!l.esSerializado,
            EsVendible: !l.esSerializado ? true : true,
            EsRepuesto: !l.esSerializado,
            Activo: true,
            IdModeloArticulo: Number(l.idModelo),
          });
          idArticulo = creado?.Id ?? creado?.id ?? creado?.data?.Id;
          if (!idArticulo) throw new Error('El backend no devolvió el Id del artículo nuevo.');
        }
        const serial = esSerial(l);
        detalles.push({
          IdArticulo: Number(idArticulo),
          Cantidad: serial ? 1 : Number(l.cantidad),
          PrecioCostoUnitario: Number(Number(l.costo).toFixed(2)),
          MesesGarantiaLocal: garantiaLocal,
          ...(serial ? { IMEIs: l.imeis.map((s) => s.trim()).filter(Boolean) } : {}),
          ...(l.idColor ? { IdColor: Number(l.idColor) } : {}),
          ...(l.idMemoria ? { IdMemoria: Number(l.idMemoria) } : {}),
          ...(l.idBateria ? { IdBateria: Number(l.idBateria) } : {}),
        });
      }

      // 2. Pagos según la condición
      let pagos = [];
      if (condicion === 'contado') {
        pagos = [{ IdMetodoPago: Number(idMetodoPago), Monto: Number(total.toFixed(2)) }];
      } else if (condicion === 'parcial') {
        const m = Number(montoParcial);
        if (!m || m <= 0 || m >= total) return setError('El monto parcial debe ser mayor a 0 y menor al total.');
        pagos = [{ IdMetodoPago: Number(idMetodoPago), Monto: Number(m.toFixed(2)) }];
      }

      const payload = {
        Fecha: new Date(fecha).toISOString(),
        IdProveedor: Number(idProveedor),
        IdSucursalDestino: Number(idSucursal),
        IdEmpleado: usuario?.userID,
        ...(pagos.length ? { IdTurnoCaja: ID_TURNO_CAJA, Pagos: pagos } : {}),
        Detalles: detalles,
      };

      const res = await comprasService.crearCompra(payload);
      if (res?.advertencias?.length) {
        alert('Compra registrada con avisos:\n- ' + res.advertencias.join('\n- '));
      }
      reset();
      onGuardado();
    } catch (e) {
      setError('No se pudo registrar la compra: ' + (e.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  const reset = () => {
    setIdProveedor(''); setFecha(hoy()); setGarantiaLocal('');
    setCondicion('contado'); setMontoParcial('');
    setLineas([lineaVacia()]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">Registrar Compra</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#f4f7fb', p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Cabecera */}
        <Box sx={{ bgcolor: 'white', border: '1px solid #e2e8f2', p: 2, borderRadius: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth size="small" label="Proveedor *" value={idProveedor}
                onChange={(e) => setIdProveedor(e.target.value)}>
                {proveedores.map((p) => (
                  <MenuItem key={p.Id ?? p.id} value={p.Id ?? p.id}>{p.Nombre ?? p.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField select fullWidth size="small" label="Sucursal destino *" value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}>
                {sucursales.map((s) => (
                  <MenuItem key={s.Id ?? s.id} value={s.Id ?? s.id}>{s.Nombre ?? s.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth size="small" type="date" label="Garantía local" InputLabelProps={{ shrink: true }}
                value={garantiaLocal} onChange={(e) => setGarantiaLocal(e.target.value)} />
            </Grid>
          </Grid>
        </Box>

        {/* Renglones */}
        <Typography variant="overline" fontWeight="bold" color="textSecondary">Renglones</Typography>
        {lineas.map((l, i) => (
          <Box key={i} sx={{ bgcolor: 'white', border: '1px solid #e2e8f2', p: 2, borderRadius: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <FormControlLabel
                control={<Switch size="small" checked={l.nuevoArticulo}
                  onChange={(e) => setLinea(i, { nuevoArticulo: e.target.checked, articulo: null })} />}
                label={<Typography variant="body2">Artículo nuevo</Typography>}
              />
              {lineas.length > 1 && (
                <IconButton size="small" color="error" onClick={() => setLineas((p) => p.filter((_, idx) => idx !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <Grid container spacing={2}>
              {!l.nuevoArticulo ? (
                <Grid item xs={12} sm={6}>
                  <Autocomplete size="small" options={articulos}
                    getOptionLabel={(o) => o.Nombre || ''}
                    isOptionEqualToValue={(o, v) => (o.Id ?? o.id) === (v?.Id ?? v?.id)}
                    value={l.articulo}
                    onChange={(e, v) => setLinea(i, { articulo: v })}
                    renderInput={(params) => <TextField {...params} label="Artículo existente" />}
                    renderOption={(props, o) => (
                      <li {...props} key={o.Id ?? o.id}>
                        {o.Nombre} {o.EsSerializado && <Chip label="serie" size="small" sx={{ ml: 1, height: 18 }} />}
                      </li>
                    )}
                  />
                </Grid>
              ) : (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Nombre del artículo" value={l.nombreNuevo}
                      onChange={(e) => setLinea(i, { nombreNuevo: e.target.value })} />
                  </Grid>
                  <Grid item xs={8} sm={3}>
                    <TextField select fullWidth size="small" label="Modelo" value={l.idModelo}
                      onChange={(e) => setLinea(i, { idModelo: e.target.value })}>
                      {modelos.map((m) => (
                        <MenuItem key={m.id ?? m.Id} value={m.id ?? m.Id}>{m.nombre ?? m.Nombre}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <FormControlLabel
                      control={<Switch size="small" checked={l.esSerializado}
                        onChange={(e) => setLinea(i, { esSerializado: e.target.checked })} />}
                      label={<Typography variant="caption">IMEI</Typography>}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={4} sm={2}>
                <TextField fullWidth size="small" type="number" label="Cantidad" value={l.cantidad}
                  disabled={esSerial(l)} onChange={(e) => setLinea(i, { cantidad: e.target.value })} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth size="small" type="number" label="Costo Unit. (U$S)" value={l.costo}
                  onChange={(e) => setLinea(i, { costo: e.target.value })} />
              </Grid>

              <Grid item xs={4} sm={2}>
                <TextField select fullWidth size="small" label="Color" value={l.idColor}
                  onChange={(e) => setLinea(i, { idColor: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {colores.map((c) => <MenuItem key={c.Id ?? c.id} value={c.Id ?? c.id}>{c.Nombre ?? c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField select fullWidth size="small" label="Memoria" value={l.idMemoria}
                  onChange={(e) => setLinea(i, { idMemoria: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {memorias.map((m) => <MenuItem key={m.Id ?? m.id} value={m.Id ?? m.id}>{m.Capacidad ?? m.capacidad}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField select fullWidth size="small" label="Batería" value={l.idBateria}
                  onChange={(e) => setLinea(i, { idBateria: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {baterias.map((b) => <MenuItem key={b.Id ?? b.id} value={b.Id ?? b.id}>{(b.Porcentaje ?? b.porcentaje) ?? b.Nombre}%</MenuItem>)}
                </TextField>
              </Grid>

              {esSerial(l) && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {l.imeis.map((imei, k) => (
                      <TextField key={k} size="small" label={`IMEI ${k + 1}`} value={imei}
                        onChange={(e) => setLinea(i, {
                          imeis: l.imeis.map((v, idx) => (idx === k ? e.target.value : v)),
                        })} sx={{ width: 200 }} />
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        ))}

        <Button size="small" onClick={() => setLineas((p) => [...p, lineaVacia()])} sx={{ textTransform: 'none' }}>
          + Agregar renglón
        </Button>

        <Divider sx={{ my: 2 }} />

        {/* Pago */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Condición de pago" value={condicion}
              onChange={(e) => setCondicion(e.target.value)}>
              <MenuItem value="contado">Contado (pago total)</MenuItem>
              <MenuItem value="parcial">Pago parcial</MenuItem>
              <MenuItem value="credito">Cuenta corriente (crédito)</MenuItem>
            </TextField>
          </Grid>
          {condicion !== 'credito' && (
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth size="small" label="Método de pago" value={idMetodoPago}
                onChange={(e) => setIdMetodoPago(e.target.value)}>
                {metodos.map((m) => <MenuItem key={m.Id ?? m.id} value={m.Id ?? m.id}>{m.Nombre ?? m.nombre}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {condicion === 'parcial' && (
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" type="number" label="Monto a pagar ahora" value={montoParcial}
                onChange={(e) => setMontoParcial(e.target.value)} />
            </Grid>
          )}
          <Grid item xs={12} sm={condicion === 'credito' ? 8 : 12} sx={{ textAlign: 'right' }}>
            <Typography variant="h6" fontFamily="monospace" fontWeight="bold" color="primary">
              Total: U$S {fmt(total)}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}
          sx={{ bgcolor: '#0e7a56', '&:hover': { bgcolor: '#0a5a3f' }, textTransform: 'none' }}>
          {guardando ? 'Guardando…' : 'Registrar Compra'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

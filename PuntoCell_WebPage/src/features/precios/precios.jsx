import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Card, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Chip, TextField, Grid, IconButton, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Switch, FormControlLabel, CircularProgress, Divider, Tooltip,
  InputAdornment, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { preciosService, mapVigentePorInventario, LISTA_MINORISTA_ID } from '../../services/preciosServices';
import { inventarioService } from '../../services/inventarioServices';
import { usePaginacion } from '../../hooks/usePaginacion';
import PaginadorTabla from '../../components/PaginadorTabla';
import PageHeader from '../../components/ui/PageHeader';
import StatusPill from '../../components/ui/StatusPill';
import Money from '../../components/ui/Money';
import NumberField from '../../components/ui/NumberField';
import { useVenta } from '../punto-venta/context/VentaContext';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mismo cálculo que la API (precios-articulos.service.js::computeFields)
const calcularPrecio = (costoBase, porcentajeRentabilidad) => {
  const CostoBase = Number(costoBase) || 0;
  const CostosVariables = Number((CostoBase * 0.26).toFixed(2));
  const CostoReal = Number((CostoBase + CostosVariables).toFixed(2));
  const pct = Number(porcentajeRentabilidad) || 0;
  const ValorFinal = Number((CostoReal + CostoReal * (pct / 100)).toFixed(2));
  return { CostoBase, CostosVariables, CostoReal, PorcentajeGanancia: pct, ValorFinal };
};

export default function PreciosScreen() {
  // CostoBase/ValorFinal son USD (fuente de verdad); dolarGlobal solo se usa para mostrar
  // el equivalente en pesos.
  const { dolarGlobal } = useVenta();
  const [tab, setTab] = useState(0);

  const [listas, setListas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [preciosMap, setPreciosMap] = useState({});
  const [cargando, setCargando] = useState(true);

  const [listaEditar, setListaEditar] = useState(null); // objeto o { nuevo:true }
  const [precioTarget, setPrecioTarget] = useState(null); // { inv, lista }

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [ls, cats, inv, precios] = await Promise.all([
        preciosService.getListas(),
        inventarioService.getCategorias(),
        inventarioService.getAll({ soloVendibles: true }),
        preciosService.getPreciosArticulos(),
      ]);
      setListas(ls || []);
      setCategorias(Array.isArray(cats) ? cats : (cats?.data || []));
      setInventario(Array.isArray(inv) ? inv : (inv?.data || []));
      setPreciosMap(mapVigentePorInventario(precios));
    } catch (e) {
      console.error('Error cargando precios:', e);
      alert('No se pudieron cargar los datos de precios: ' + (e.message || ''));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const pagListas = usePaginacion(listas);
  const pagInv = usePaginacion(inventario);

  const [listaSel, setListaSel] = useState(LISTA_MINORISTA_ID);
  const listaSelObj = useMemo(
    () => listas.find((l) => (l.Id ?? l.id) === listaSel),
    [listas, listaSel]
  );

  const nombreCategoria = (id) => categorias.find((c) => (c.Id ?? c.id) === id)?.Nombre || '—';

  if (cargando) {
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>Cargando precios…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <PageHeader
        eyebrow="Ingeniería de precios"
        title="Listas y precios de venta"
        meta={`${listas.length} ${listas.length === 1 ? 'lista' : 'listas'} · ${inventario.length} productos vendibles`}
      />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            <Tab label="Listas de Precios" sx={{ textTransform: 'none' }} />
            <Tab label="Precios por Producto" sx={{ textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* ---------- TAB 0: LISTAS ---------- */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Cada lista define un <b>% de rentabilidad</b>. El precio de venta se calcula como
                CostoReal (CostoBase × 1.26) × (1 + % / 100).
              </Typography>
              <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setListaEditar({ nuevo: true })}>
                Nueva Lista
              </Button>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">% Rentabilidad</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagListas.itemsPagina.map((l) => {
                    const id = l.Id ?? l.id;
                    return (
                      <TableRow key={id} hover>
                        <TableCell className="mono">{id}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{l.Nombre}</TableCell>
                        <TableCell align="center">
                          <StatusPill tone="flat" label={`${fmt(l.PorcentajeRentabilidad)} %`} />
                        </TableCell>
                        <TableCell>{l.IdCategoriaProducto ? nombreCategoria(l.IdCategoriaProducto) : 'Genérica'}</TableCell>
                        <TableCell align="center">
                          <StatusPill tone={l.Activo ? 'ok' : 'late'} label={l.Activo ? 'Activa' : 'Inactiva'} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => setListaEditar(l)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" disabled={id === LISTA_MINORISTA_ID}
                            onClick={async () => {
                              if (!window.confirm(`¿Eliminar la lista "${l.Nombre}"?`)) return;
                              try { await preciosService.eliminarLista(id); cargarTodo(); }
                              catch (e) { alert('No se pudo eliminar: ' + (e.message || '')); }
                            }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginadorTabla pagina={pagListas.pagina} totalPaginas={pagListas.totalPaginas}
                onChange={pagListas.setPagina} mostrar={pagListas.hayPaginacion} />
            </Box>
          </Box>
        )}

        {/* ---------- TAB 1: PRECIOS POR PRODUCTO ---------- */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
              <TextField select size="small" label="Lista de precios" value={listaSel}
                onChange={(e) => setListaSel(Number(e.target.value))} sx={{ minWidth: 260 }}>
                {listas.map((l) => (
                  <MenuItem key={l.Id ?? l.id} value={l.Id ?? l.id}>
                    {l.Nombre} ({fmt(l.PorcentajeRentabilidad)} %)
                  </MenuItem>
                ))}
              </TextField>
              <Typography variant="body2" color="text.secondary">
                {inventario.length} productos vendibles
              </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="center">IMEI</TableCell>
                    <TableCell align="right">Costo Base</TableCell>
                    <TableCell align="right">Precio Venta</TableCell>
                    <TableCell align="center">Vigente desde</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagInv.itemsPagina.map((inv) => {
                    const id = inv.Id ?? inv.id;
                    const p = preciosMap[id]?.[listaSel];
                    return (
                      <TableRow key={id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{inv.articulo?.Nombre || 'Producto'}</Typography>
                          <Typography variant="caption" color="text.secondary">Inventario #{id} · Stock {inv.Stock ?? 0}</Typography>
                        </TableCell>
                        <TableCell align="center" className="mono" sx={{ fontSize: 12 }}>{inv.IMEI || '—'}</TableCell>
                        <TableCell align="right">
                          {p ? <Money ars={p.CostoBase * dolarGlobal} usd={p.CostoBase} size="sm" /> : <span className="num">—</span>}
                        </TableCell>
                        <TableCell align="right">
                          {p
                            ? <Money ars={p.ValorFinal * dolarGlobal} usd={p.ValorFinal} size="sm" />
                            : <Typography className="num" sx={{ fontWeight: 700, color: 'error.main' }}>Sin precio</Typography>}
                        </TableCell>
                        <TableCell align="center" className="mono" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {p?.FechaDesde ? String(p.FechaDesde).slice(0, 10) : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined"
                            onClick={() => setPrecioTarget({ inv, precioActual: p })}>
                            {p ? 'Actualizar' : 'Fijar precio'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginadorTabla pagina={pagInv.pagina} totalPaginas={pagInv.totalPaginas}
                onChange={pagInv.setPagina} mostrar={pagInv.hayPaginacion} />
            </Box>
          </Box>
        )}
      </Card>

      {listaEditar && (
        <ListaDialog
          lista={listaEditar}
          categorias={categorias}
          onClose={() => setListaEditar(null)}
          onSaved={() => { setListaEditar(null); cargarTodo(); }}
        />
      )}

      {precioTarget && listaSelObj && (
        <PrecioDialog
          target={precioTarget}
          lista={listaSelObj}
          onClose={() => setPrecioTarget(null)}
          onSaved={() => { setPrecioTarget(null); cargarTodo(); }}
        />
      )}
    </Box>
  );
}

// ============================================================
function ListaDialog({ lista, categorias, onClose, onSaved }) {
  const esNuevo = !!lista.nuevo;
  const [form, setForm] = useState({
    Nombre: lista.Nombre || '',
    PorcentajeRentabilidad: lista.PorcentajeRentabilidad ?? 30,
    IdCategoriaProducto: lista.IdCategoriaProducto ?? '',
    Activo: lista.Activo ?? true,
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!form.Nombre.trim()) return alert('El nombre es obligatorio.');
    setGuardando(true);
    try {
      const payload = {
        Nombre: form.Nombre.trim(),
        PorcentajeRentabilidad: Number(form.PorcentajeRentabilidad) || 0,
        IdCategoriaProducto: form.IdCategoriaProducto === '' ? null : Number(form.IdCategoriaProducto),
        Activo: !!form.Activo,
      };
      if (esNuevo) await preciosService.crearLista(payload);
      else await preciosService.actualizarLista(lista.Id ?? lista.id, payload);
      onSaved();
    } catch (e) {
      alert('No se pudo guardar la lista: ' + (e.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {esNuevo ? 'Nueva lista de precios' : `Editar lista #${lista.Id ?? lista.id}`}
        <IconButton onClick={onClose} size="small" aria-label="Cerrar"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={7}>
            <TextField label="Nombre" fullWidth size="small" value={form.Nombre}
              onChange={(e) => setForm({ ...form, Nombre: e.target.value })} placeholder="Ej: Mayorista" />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField label="% Rentabilidad" type="number" fullWidth size="small"
              value={form.PorcentajeRentabilidad}
              onChange={(e) => setForm({ ...form, PorcentajeRentabilidad: e.target.value })}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
          </Grid>
          <Grid item xs={12}>
            <TextField select label="Categoría (opcional)" fullWidth size="small"
              value={form.IdCategoriaProducto}
              onChange={(e) => setForm({ ...form, IdCategoriaProducto: e.target.value })}
              helperText="Dejar vacío para una lista genérica (aplica a cualquier producto).">
              <MenuItem value="">Genérica</MenuItem>
              {categorias.map((c) => (
                <MenuItem key={c.Id ?? c.id} value={c.Id ?? c.id}>{c.Nombre}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={!!form.Activo} onChange={(e) => setForm({ ...form, Activo: e.target.checked })} />}
              label="Lista activa" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
function PrecioDialog({ target, lista, onClose, onSaved }) {
  const { dolarGlobal } = useVenta();
  const { inv, precioActual } = target;
  const idInventario = inv.Id ?? inv.id;
  const [costoBase, setCostoBase] = useState(precioActual ? String(precioActual.CostoBase) : '');
  const [guardando, setGuardando] = useState(false);

  const preview = calcularPrecio(costoBase, lista.PorcentajeRentabilidad);

  const guardar = async () => {
    if (!costoBase || Number(costoBase) <= 0) return alert('Ingresá un costo base válido.');
    setGuardando(true);
    try {
      // Cierra el precio vigente anterior de esta (inventario, lista) antes de crear el nuevo.
      if (precioActual?.Id) {
        await preciosService.cerrarPrecio(precioActual.Id).catch(() => {});
      }
      await preciosService.crearPrecio({
        IdInventario: idInventario,
        IdListaPrecio: lista.Id ?? lista.id,
        CostoBase: Number(costoBase),
        FechaDesde: new Date().toISOString(),
      });
      onSaved();
    } catch (e) {
      alert('No se pudo guardar el precio: ' + (e.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Precio · {inv.articulo?.Nombre || `Inventario #${idInventario}`}
        <IconButton onClick={onClose} size="small" aria-label="Cerrar"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Lista <b>{lista.Nombre}</b> · rentabilidad <b>{fmt(lista.PorcentajeRentabilidad)} %</b>
        </Alert>
        <NumberField label="Costo Base (U$S)" fullWidth size="small" autoFocus
          value={costoBase} onChange={(e) => setCostoBase(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">U$S</InputAdornment> }}
          helperText={Number(costoBase) > 0 ? `≈ $ ${Math.round(Number(costoBase) * dolarGlobal).toLocaleString('es-AR')}` : ''} />

        <Divider sx={{ my: 2 }}><Chip label="Cálculo" size="small" /></Divider>
        <Grid container spacing={1}>
          <Fila label="Costos variables (26%)" valor={preview.CostosVariables} dolarGlobal={dolarGlobal} />
          <Fila label="Costo real" valor={preview.CostoReal} dolarGlobal={dolarGlobal} />
          <Fila label={`Ganancia (${fmt(lista.PorcentajeRentabilidad)}%)`} valor={preview.ValorFinal - preview.CostoReal} dolarGlobal={dolarGlobal} />
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'pc.accentSoft', color: 'primary.main', p: 1.5, borderRadius: '9px', mt: 1 }}>
              <Typography fontWeight={600}>Precio de venta</Typography>
              <Money ars={preview.ValorFinal * dolarGlobal} usd={preview.ValorFinal} />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar precio'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Fila({ label, valor, dolarGlobal }) {
  return (
    <Grid item xs={12}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Money ars={valor * dolarGlobal} usd={valor} size="sm" />
      </Box>
    </Grid>
  );
}

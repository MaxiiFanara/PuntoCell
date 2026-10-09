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
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

import { preciosService, mapVigentePorInventario, LISTA_MINORISTA_ID } from '../../services/preciosServices';
import { inventarioService } from '../../services/inventarioServices';
import { usePaginacion } from '../../hooks/usePaginacion';
import PaginadorTabla from '../../components/PaginadorTabla';
import PageHeader from '../../components/ui/PageHeader';
import StatusPill from '../../components/ui/StatusPill';
import Money from '../../components/ui/Money';
import NumberField from '../../components/ui/NumberField';
import { useVenta } from '../punto-venta/context/VentaContext';
import { toast } from 'sonner';

const fmt = (v) => Number(v || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Mismo cálculo que la API (precios-articulos.service.js::computeFields)
const calcularPrecio = (costoBase, porcentajeRentabilidad, factorCv = 26) => {
  const CostoBase = Number(costoBase) || 0;
  const factor = Number(factorCv) / 100;
  const CostoVariables = Number((CostoBase * factor).toFixed(2));
  const CostoReal = Number((CostoBase + CostoVariables).toFixed(2));
  const pct = Number(porcentajeRentabilidad) || 0;
  const ValorFinal = Number((CostoReal + CostoReal * (pct / 100)).toFixed(2));
  return { CostoBase, CostoVariables, CostoReal, PorcentajeGanancia: pct, ValorFinal };
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
  const [todosLosPrecios, setTodosLosPrecios] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [listaEditar, setListaEditar] = useState(null); // objeto o { nuevo:true }
  const [precioTarget, setPrecioTarget] = useState(null); // { inv, lista }
  const [historialTarget, setHistorialTarget] = useState(null); // inv object

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
      setTodosLosPrecios(precios || []);
      setPreciosMap(mapVigentePorInventario(precios));
    } catch (e) {
      console.error('Error cargando precios:', e);
      toast.warning('No se pudieron cargar los datos de precios: ' + (e.message || ''));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);
  const [listaSel, setListaSel] = useState(LISTA_MINORISTA_ID);


  // --- Filtros ---
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos', 'con_precio', 'sin_precio'
  const [filtroStock, setFiltroStock] = useState(false);

  // Actualizador de Precio: Filtrado y Ordenado (Categoría ASC → Nombre ASC).
  const inventarioFiltradoYOrdenado = useMemo(() => {
    let filtrado = inventario;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtrado = filtrado.filter(inv => 
        (inv.articulo?.Nombre || '').toLowerCase().includes(q) ||
        (inv.IMEI || '').toLowerCase().includes(q) ||
        String(inv.Id ?? inv.id).includes(q)
      );
    }

    if (filtroCategoria !== '') {
      filtrado = filtrado.filter(inv => inv.articulo?.modelo?.IdCategoriaArticulo === filtroCategoria);
    }

    if (filtroEstado !== 'todos') {
      filtrado = filtrado.filter(inv => {
        const id = inv.Id ?? inv.id;
        const tienePrecio = !!preciosMap[id]?.[listaSel];
        return filtroEstado === 'con_precio' ? tienePrecio : !tienePrecio;
      });
    }

    if (filtroStock) {
      filtrado = filtrado.filter(inv => Number(inv.Stock || 0) > 0);
    }

    const catNombre = (idCat) => categorias.find((c) => (c.Id ?? c.id) === idCat)?.Nombre || '';
    return filtrado.sort((a, b) => {
      const cmpCat = catNombre(a.articulo?.modelo?.IdCategoriaArticulo)
        .localeCompare(catNombre(b.articulo?.modelo?.IdCategoriaArticulo), 'es', { sensitivity: 'base' });
      if (cmpCat !== 0) return cmpCat;
      return (a.articulo?.Nombre || '').localeCompare(b.articulo?.Nombre || '', 'es', { sensitivity: 'base' });

    });
  }, [inventario, categorias, search, filtroCategoria, filtroEstado, filtroStock, preciosMap, listaSel]);
  const pagInv = usePaginacion(inventarioFiltradoYOrdenado);

  const exportarCSV = () => {
    let csv = 'IdInventario,Articulo,IMEI,CostoBase\n';
    inventario.forEach(inv => {
      const id = inv.Id ?? inv.id;
      // Resolvemos el precio base buscando en la lista 1 (o la primera que encontremos)
      // ya que el costo base es igual para todas las listas de un mismo renglón.
      const p = preciosMap[id]?.[LISTA_MINORISTA_ID] || Object.values(preciosMap[id] || {})[0];
      const costo = p ? p.CostoBase : 0;
      const nombreLimpio = (inv.articulo?.Nombre || '').replace(/"/g, '""');
      csv += `${id},"${nombreLimpio}",${inv.IMEI || ''},${costo}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'precios_base_inventario.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pagListas = usePaginacion(listas);
  

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
        title="Actualizador de Precio"
        meta={`${listas.length} ${listas.length === 1 ? 'lista' : 'listas'} · ${inventario.length} productos vendibles`}
      />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            <Tab label="Precios por Categoría" sx={{ textTransform: 'none' }} />
            <Tab label="Precios por Producto" sx={{ textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* ---------- TAB 0: LISTAS ---------- */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Cada lista define un <b>% de rentabilidad</b> y un <b>% de costos variables</b> (impuestos, comisiones). El precio final se calcula sumando los costos y aplicando la ganancia.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />} onClick={() => setListaEditar({ nuevo: true })}>
                Registrar Lista
              </Button>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell align="center">% Rentabilidad</TableCell>
                    <TableCell align="center">% Costos Var.</TableCell>
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
                        <TableCell align="center">
                          <StatusPill tone="flat" label={`${fmt(l.FactorCostosVariables ?? 26)} %`} />
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
                              catch (e) { toast.error('No se pudo eliminar: ' + (e.message || '')); }
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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                <TextField select size="small" label="Lista de precios" value={listaSel}
                  onChange={(e) => setListaSel(Number(e.target.value))} sx={{ minWidth: 260 }}>
                  {listas.map((l) => (
                    <MenuItem key={l.Id ?? l.id} value={l.Id ?? l.id}>
                      {l.Nombre} ({fmt(l.PorcentajeRentabilidad)} %)
                    </MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="Buscar producto o IMEI" value={search}
                  onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 200, flex: 1 }} />
                <TextField select size="small" label="Categoría" value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)} sx={{ minWidth: 150 }}>
                  <MenuItem value="">Todas</MenuItem>
                  {categorias.map(c => <MenuItem key={c.Id ?? c.id} value={c.Id ?? c.id}>{c.Nombre}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Estado" value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)} sx={{ minWidth: 130 }}>
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="con_precio">Con precio</MenuItem>
                  <MenuItem value="sin_precio">Sin precio</MenuItem>
                </TextField>
                <FormControlLabel
                  sx={{ ml: 1, whiteSpace: 'nowrap' }}
                  control={<Switch size="small" checked={filtroStock} onChange={(e) => setFiltroStock(e.target.checked)} />}
                  label={<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Con stock</Typography>}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" size="small" onClick={exportarCSV}>
                  Exportar CSV
                </Button>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mostrando {inventarioFiltradoYOrdenado.length} productos
            </Typography>

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
                          {p ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                              {p.FijadoManual && (
                                <Tooltip title="Precio fijado manualmente">
                                  <LockIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                </Tooltip>
                              )}
                              <Money ars={p.ValorFinal * dolarGlobal} usd={p.ValorFinal} size="sm" />
                            </Box>
                          ) : (
                            <Typography className="num" sx={{ fontWeight: 700, color: 'error.main' }}>Sin precio</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center" className="mono" sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {p?.FechaDesde ? String(p.FechaDesde).slice(0, 10) : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button size="small" variant="outlined"
                              onClick={() => setPrecioTarget({ inv, precioActual: p })}>
                              {p ? 'Actualizar' : 'Fijar precio'}
                            </Button>
                            <Button size="small" color="secondary" variant="text"
                              onClick={() => setHistorialTarget(inv)}>
                              Historial
                            </Button>
                          </Box>
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

      {historialTarget && (
        <HistorialDialog
          inv={historialTarget}
          todosLosPrecios={todosLosPrecios}
          listas={listas}
          onClose={() => setHistorialTarget(null)}
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
    FactorCostosVariables: lista.FactorCostosVariables ?? 26,
    IdCategoriaProducto: lista.IdCategoriaProducto ?? '',
    Activo: lista.Activo ?? true,
  });
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!form.Nombre.trim()) return toast.warning('El nombre es obligatorio.');
    setGuardando(true);
    try {
      const payload = {
        Nombre: form.Nombre.trim(),
        PorcentajeRentabilidad: Number(form.PorcentajeRentabilidad) || 0,
        FactorCostosVariables: Number(form.FactorCostosVariables) || 0,
        IdCategoriaProducto: form.IdCategoriaProducto === '' ? null : Number(form.IdCategoriaProducto),
        Activo: !!form.Activo,
      };
      if (esNuevo) await preciosService.crearLista(payload);
      else await preciosService.actualizarLista(lista.Id ?? lista.id, payload);
      onSaved();
    } catch (e) {
      toast.error('No se pudo guardar la lista: ' + (e.message || ''));
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
          <Grid item xs={12} sm={4}>
            <TextField label="Nombre" fullWidth size="small" value={form.Nombre}
              onChange={(e) => setForm({ ...form, Nombre: e.target.value })} placeholder="Ej: Mayorista" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="% Rentabilidad" type="number" fullWidth size="small"
              value={form.PorcentajeRentabilidad}
              onChange={(e) => setForm({ ...form, PorcentajeRentabilidad: e.target.value })}
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="% Costos Var." type="number" fullWidth size="small"
              value={form.FactorCostosVariables}
              onChange={(e) => setForm({ ...form, FactorCostosVariables: e.target.value })}
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
  const [fijadoManual, setFijadoManual] = useState(precioActual ? !!precioActual.FijadoManual : false);
  const [guardando, setGuardando] = useState(false);

  const preview = calcularPrecio(costoBase, lista.PorcentajeRentabilidad, lista.FactorCostosVariables);

  const guardar = async () => {
    if (!costoBase || Number(costoBase) <= 0) return toast.warning('Ingresá un costo base válido.');
    setGuardando(true);
    try {
      await preciosService.actualizarPreciosMasivo([{
        IdInventario: idInventario,
        CostoBase: Number(costoBase),
        FijadoManual: fijadoManual,
      }]);
      onSaved();
    } catch (e) {
      toast.error('No se pudo guardar el precio: ' + (e.message || ''));
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <NumberField label="Costo Base (U$S)" fullWidth size="small" autoFocus
            value={costoBase} onChange={(e) => setCostoBase(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">U$S</InputAdornment> }}
            helperText={Number(costoBase) > 0 ? `≈ $ ${Math.round(Number(costoBase) * dolarGlobal).toLocaleString('es-AR')}` : ''} />
            
          <Tooltip title={fijadoManual ? "Desvincular precio (actualizará con la categoría)" : "Fijar manual (ignorar cambios de categoría)"}>
            <IconButton 
              color={fijadoManual ? 'warning' : 'default'} 
              onClick={() => setFijadoManual(!fijadoManual)}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              {fijadoManual ? <LockIcon /> : <LockOpenIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Divider sx={{ my: 2 }}><Chip label="Cálculo" size="small" /></Divider>
        <Grid container spacing={1}>
          <Fila label={`Costos variables (${fmt(lista.FactorCostosVariables ?? 26)}%)`} valor={preview.CostoVariables} dolarGlobal={dolarGlobal} />
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


// ============================================================
function HistorialDialog({ inv, todosLosPrecios, listas, onClose }) {
  const { dolarGlobal } = useVenta();
  const idInventario = inv.Id ?? inv.id;
  
  const historial = useMemo(() => {
    return todosLosPrecios
      .filter(p => p.IdInventario === idInventario)
      .sort((a, b) => new Date(b.FechaDesde) - new Date(a.FechaDesde));
  }, [todosLosPrecios, idInventario]);

  const nombreLista = (id) => listas.find(l => (l.Id ?? l.id) === id)?.Nombre || `Lista #${id}`;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Historial de Precios · {inv.articulo?.Nombre || `Inventario #${idInventario}`}
        <IconButton onClick={onClose} size="small" aria-label="Cerrar"><CloseIcon sx={{ fontSize: 17 }} /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {historial.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            No hay registros de precios para este producto.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha Desde</TableCell>
                <TableCell>Fecha Hasta</TableCell>
                <TableCell>Lista</TableCell>
                <TableCell align="right">Costo Base</TableCell>
                <TableCell align="right">Ganancia</TableCell>
                <TableCell align="right">Valor Final</TableCell>
                <TableCell align="center">Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historial.map((p) => {
                const vigente = !p.FechaHasta || new Date(p.FechaHasta).getTime() > Date.now();
                return (
                  <TableRow key={p.Id ?? p.id} hover sx={{ opacity: vigente ? 1 : 0.6 }}>
                    <TableCell className="mono" sx={{ fontSize: 12 }}>
                      {new Date(p.FechaDesde).toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="mono" sx={{ fontSize: 12 }}>
                      {p.FechaHasta ? new Date(p.FechaHasta).toLocaleString('es-AR') : '—'}
                    </TableCell>
                    <TableCell>
                      {nombreLista(p.IdListaPrecio)}
                    </TableCell>
                    <TableCell align="right">
                      <Money ars={p.CostoBase * dolarGlobal} usd={p.CostoBase} size="sm" />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{fmt(p.PorcentajeGanancia)} %</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Money ars={p.ValorFinal * dolarGlobal} usd={p.ValorFinal} size="sm" />
                    </TableCell>
                    <TableCell align="center">
                      <StatusPill tone={vigente ? 'ok' : 'flat'} label={vigente ? 'Vigente' : 'Cerrado'} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

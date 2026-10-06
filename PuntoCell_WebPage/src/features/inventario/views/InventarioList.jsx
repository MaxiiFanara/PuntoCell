import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, MenuItem, Paper, Select, Switch, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup,
  Tooltip, Typography, InputAdornment, // 1. Agregado InputAdornment
} from '@mui/material';
import {
  Search, Visibility, LocalShipping, Lock, Store, Close, PointOfSale, QrCodeScanner, // 1. Agregado QrCodeScanner
} from '@mui/icons-material';
import { inventarioService } from '../../../services/inventarioServices';
import { useVenta } from '../../punto-venta/context/VentaContext';
import { useAuth } from '../../../context/AuthContext';
import { capitalizar } from '../../../utils/format';

import PageHeader from '../../../components/ui/PageHeader';
import KpiCard from '../../../components/ui/KpiCard';
import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';
import FilterBar, { FilterField } from '../../../components/ui/FilterBar';
import TablePager from '../../../components/ui/TablePager';
import ImeiScannerModal from '../../../components/modals/ImeiScannerModal'; // 1. Importación del modal
import { toast } from 'sonner';

const FILAS_POR_PAGINA = 10;

const tonoStock = (stock) => (stock === 0 ? 'late' : stock <= 2 ? 'due' : 'ok');

const InventarioList = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { dolarGlobal: DOLAR_HOY } = useVenta();

  const miSucursalReal = usuario?.sucursal || 1;
  const [sucursales, setSucursales] = useState([]);
  const [sucursalActual, setSucursalActual] = useState(miSucursalReal);
  const esMiStock = sucursalActual === miSucursalReal;
  const [mostrarAgotados, setMostrarAgotados] = useState(false);
  const [esMayorista, setEsMayorista] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [openModal, setOpenModal] = useState(false);
  const [productoTransferir, setProductoTransferir] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  
  const [scannerAbierto, setScannerAbierto] = useState(false); // 2. Estado del escáner

  useEffect(() => {
    inventarioService.getSucursales()
      .then((res) => setSucursales(Array.isArray(res) ? res : (res?.data || [])))
      .catch(() => setSucursales([]));
  }, []);

  const nombreSucursal = (id) => {
    const s = sucursales.find((suc) => (suc.Id ?? suc.id) === id);
    return s ? capitalizar(s.Nombre ?? s.nombre) : '—';
  };

  const cargarInventario = useCallback(async () => {
    try {
      setCargando(true);
      const paramsFiltro = {
        vendibles: { soloVendibles: true },
        repuestos: { soloRepuestos: true },
        canje: { soloCanje: true },
        todos: {},
      }[filtroTipo];
      const datosBackend = await inventarioService.getConPrecios({ IdSucursal: sucursalActual, ...paramsFiltro });

      const inventarioAdaptado = datosBackend.map(row => {
        const art = row.articulo || row.Articulo || {};
        const bat = row.bateria || row.Bateria;
        const batPct = bat && bat.Porcentaje != null ? Number(bat.Porcentaje) : null;
        return {
          id: row.Id || row.id,
          idArticulo: art.Id || art.id,
          producto: art.Nombre || 'Equipo sin nombre',
          modelo: art.modelo?.Nombre || row.modelo?.Nombre || '',
          imei: row.IMEI || null,
          color: row.color?.Nombre || row.Color?.Nombre || null,
          memoria: row.memoria?.Capacidad || row.Memoria?.Capacidad || null,
          bateria: Number.isFinite(batPct) ? `${batPct}%` : null,
          stock: row.Stock || 0,
          precioMenor: row.PrecioVenta || 0,
          precioMayor: row.PrecioMayorista || 0,
          esSerializado: art.EsSerializado || false,
        };
      });
      setInventario(inventarioAdaptado);
    } catch (error) {
      console.error("Error al cargar el inventario real:", error);
    } finally {
      setCargando(false);
    }
  }, [sucursalActual, filtroTipo]);

  useEffect(() => { cargarInventario(); }, [cargarInventario]);

  const inventarioFiltrado = inventario.filter(item => {
    const coincideBusqueda = item.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
                             (item.imei && item.imei.includes(busqueda));
    const coincideStock = mostrarAgotados ? item.stock === 0 : item.stock > 0;
    return coincideBusqueda && coincideStock;
  });

  useEffect(() => { setPagina(1); }, [busqueda, mostrarAgotados, sucursalActual, filtroTipo]);

  const resumen = useMemo(() => ({
    articulos: inventario.length,
    unidades: inventario.reduce((a, i) => a + i.stock, 0),
    agotados: inventario.filter((i) => i.stock === 0).length,
    criticos: inventario.filter((i) => i.stock > 0 && i.stock <= 2).length,
    serializados: inventario.filter((i) => i.esSerializado).length,
  }), [inventario]);

  const totalPaginas = Math.max(1, Math.ceil(inventarioFiltrado.length / FILAS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const desdeFila = inventarioFiltrado.length ? (paginaSegura - 1) * FILAS_POR_PAGINA + 1 : 0;
  const hastaFila = Math.min(paginaSegura * FILAS_POR_PAGINA, inventarioFiltrado.length);
  const inventarioPaginado = inventarioFiltrado.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA);

  const abrirTransferencia = (item) => {
    setProductoTransferir({ ...item, cantidadPedir: 1 });
    setOpenModal(true);
  };

  const confirmarTraspaso = async () => {
    try {
      const payload = {
        IdInventario: productoTransferir.id,
        IdArticulo: productoTransferir.idArticulo,
        IdSucursalOrigen: sucursalActual,
        IdSucursalDestino: miSucursalReal,
        Cantidad: productoTransferir.esSerializado ? 1 : productoTransferir.cantidadPedir,
        IdEmpleado: usuario?.userID,
      };
      await inventarioService.ejecutarTraspaso(payload);
      toast.success(`✅ ¡Traspaso completado! Se enviaron ${payload.Cantidad} unidades.`);
      setOpenModal(false);
      setProductoTransferir(null);
      await cargarInventario();
    } catch (error) {
      console.error("Error en traspaso:", error);
      toast.error(`❌ No se pudo hacer el traspaso: ${error.message || 'Error desconocido'}`);
    }
  };

  const chips = [];
  if (busqueda) chips.push({ campo: 'busqueda', texto: busqueda });
  if (filtroTipo !== 'todos') chips.push({ campo: 'filtroTipo', texto: capitalizar(filtroTipo) });
  if (mostrarAgotados) chips.push({ campo: 'mostrarAgotados', texto: 'Solo agotados' });
  if (esMayorista) chips.push({ campo: 'esMayorista', texto: 'Precio mayorista' });

  const quitarChip = (campo) => {
    if (campo === 'busqueda') setBusqueda('');
    if (campo === 'filtroTipo') setFiltroTipo('todos');
    if (campo === 'mostrarAgotados') setMostrarAgotados(false);
    if (campo === 'esMayorista') setEsMayorista(false);
  };

  const mensajeTabla = cargando
    ? 'Cargando inventario…'
    : inventarioFiltrado.length === 0
      ? (mostrarAgotados ? 'No hay productos agotados.' : 'No se encontraron productos.')
      : null;

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Stock"
        title="Inventario"
        meta={`Sucursal ${nombreSucursal(sucursalActual)} · ${resumen.articulos} ${resumen.articulos === 1 ? 'artículo' : 'artículos'}`}
        action={
          <Button variant="outlined" startIcon={<PointOfSale sx={{ fontSize: '16px !important' }} />} onClick={() => navigate('/app/punto-venta')}>
            Ir a caja
          </Button>
        }
      />

      {!esMiStock && (
        <Paper sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: '10px 15px' }}>
          <Lock sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography sx={{ fontSize: '.78rem', color: 'text.secondary' }}>
            Estás viendo el stock de <b>{nombreSucursal(sucursalActual)}</b> en modo lectura. Solo podés solicitar traspasos.
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 1.5 }}>
        <KpiCard eyebrow="Artículos"    tone="accent" loading={cargando} value={resumen.articulos}
          sub={`${resumen.serializados} serializados`} />
        <KpiCard eyebrow="Unidades"     tone="ok"     loading={cargando} value={resumen.unidades}
          sub="Suma de stock" />
        <KpiCard eyebrow="Stock crítico" tone="warn"  loading={cargando} value={resumen.criticos}
          sub="2 unidades o menos"
          badge={resumen.criticos > 0 ? <StatusPill tone="due" label="Reponer" /> : null} />
        <KpiCard eyebrow="Agotados"     tone="mute"   loading={cargando} value={resumen.agotados}
          sub="Sin unidades disponibles" />
      </Box>

      <FilterBar
        columns="minmax(180px,1.6fr) minmax(140px,1fr) auto auto"
        chips={chips.map((c) => (
          <StatusPill
            key={c.campo}
            tone="flat"
            label={c.texto}
            sx={{ pr: '5px' }}
            meta={
              <IconButton size="small" aria-label={`Quitar filtro ${c.campo}`} onClick={() => quitarChip(c.campo)}
                sx={{ width: 15, height: 15, p: 0, color: 'inherit', opacity: .7, '&:hover': { opacity: 1 } }}>
                <Close sx={{ fontSize: 11 }} />
              </IconButton>
            }
          />
        ))}
      >
        <FilterField label="Buscar">
          <TextField
            fullWidth placeholder="Equipo, modelo o IMEI"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <Search sx={{ fontSize: 15, color: 'text.disabled', mr: .75 }} />,
                // 3. Botón inyectado para activar la cámara
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" color="primary" onClick={() => setScannerAbierto(true)}>
                      <QrCodeScanner sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
          />
        </FilterField>

        <FilterField label="Sucursal">
          <Select size="small" fullWidth value={sucursalActual} onChange={(e) => setSucursalActual(e.target.value)}
            startAdornment={<Store sx={{ fontSize: 15, color: 'text.disabled', mr: .75 }} />}>
            {sucursales.map((s) => (
              <MenuItem key={s.Id ?? s.id} value={s.Id ?? s.id}>{capitalizar(s.Nombre ?? s.nombre)}</MenuItem>
            ))}
          </Select>
        </FilterField>

        <FilterField label="Tipo">
          <ToggleButtonGroup size="small" exclusive value={filtroTipo}
            onChange={(e, valor) => setFiltroTipo(valor || 'todos')}>
            <ToggleButton value="todos">Todos</ToggleButton>
            <ToggleButton value="vendibles">Vendibles</ToggleButton>
            <ToggleButton value="repuestos">Repuestos</ToggleButton>
            <ToggleButton value="canje">Canje</ToggleButton>
          </ToggleButtonGroup>
        </FilterField>

        <FilterField label="Agotados">
          <Box component="label" sx={{
            display: 'flex', alignItems: 'center', gap: .75, height: 32, px: 1.25, cursor: 'pointer',
            border: 1, borderColor: 'divider', borderRadius: '7px', bgcolor: 'pc.surfaceMuted', whiteSpace: 'nowrap',
          }}>
            <Switch size="small" checked={mostrarAgotados} onChange={(e) => setMostrarAgotados(e.target.checked)} />
            <Typography sx={{ fontSize: '.75rem', color: 'text.secondary' }}>Ver solo agotados</Typography>
          </Box>
        </FilterField>

        <FilterField label="Precio">
          <Box component="label" sx={{
            display: 'flex', alignItems: 'center', gap: .75, height: 32, px: 1.25, cursor: 'pointer',
            border: 1, borderColor: 'divider', borderRadius: '7px',
            bgcolor: esMayorista ? 'pc.accentSoft' : 'pc.surfaceMuted', whiteSpace: 'nowrap',
          }}>
            <Switch size="small" checked={esMayorista} onChange={(e) => setEsMayorista(e.target.checked)} />
            <Typography sx={{ fontSize: '.75rem', color: esMayorista ? 'primary.main' : 'text.secondary', fontWeight: esMayorista ? 600 : 400 }}>
              Precio mayorista
            </Typography>
          </Box>
        </FilterField>
      </FilterBar>

      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell>Dispositivo</TableCell>
                <TableCell sx={{ width: 150 }}>IMEI</TableCell>
                <TableCell>Características</TableCell>
                <TableCell sx={{ width: 110 }}>Stock</TableCell>
                <TableCell align="right" sx={{ width: 150 }}>{esMayorista ? 'Precio mayorista' : 'Precio venta'}</TableCell>
                <TableCell align="right" sx={{ width: 90 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {mensajeTabla ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ height: 140, textAlign: 'center', color: 'text.disabled' }}>
                    {mensajeTabla}
                  </TableCell>
                </TableRow>
              ) : inventarioPaginado.map((item) => (
                <TableRow key={item.id} hover sx={{ opacity: item.stock === 0 ? 0.55 : 1 }}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>
                      {item.producto}
                    </Typography>
                    {item.modelo && (
                      <Typography sx={{ color: 'text.disabled', fontSize: '.69rem' }}>{item.modelo}</Typography>
                    )}
                  </TableCell>
                  <TableCell className="mono" sx={{ color: 'text.secondary', fontSize: '.72rem' }}>
                    {item.imei || '—'}
                  </TableCell>
                  <TableCell>
                    {(item.color || item.memoria || item.bateria) ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                        {item.color && <StatusPill tone="neutral" label={`🎨 ${capitalizar(item.color)}`} />}
                        {item.memoria && <StatusPill tone="neutral" label={`💾 ${item.memoria}`} />}
                        {item.bateria && <StatusPill tone="ok" label={`🔋 ${item.bateria}`} />}
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '.78rem', color: 'text.disabled' }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={tonoStock(item.stock)} label={`${item.stock} un.`} />
                  </TableCell>
                  <TableCell align="right">
                    <Money
                      ars={(esMayorista ? item.precioMayor : item.precioMenor) * DOLAR_HOY}
                      usd={esMayorista ? item.precioMayor : item.precioMenor}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'inline-flex', gap: .5 }}>
                      {esMiStock ? (
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => navigate(`/app/inventario/detalle/${item.id}`)}>
                            <Visibility sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={<LocalShipping sx={{ fontSize: '15px !important' }} />}
                          onClick={() => abrirTransferencia(item)}>
                          Traspaso
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {!cargando && inventarioFiltrado.length > 0 && (
          <TablePager
            page={paginaSegura}
            pageCount={totalPaginas}
            from={desdeFila}
            to={hastaFila}
            total={inventarioFiltrado.length}
            unidad={inventarioFiltrado.length === 1 ? 'artículo' : 'artículos'}
            onChange={setPagina}
          />
        )}
      </Paper>

      {/* ─── Traspaso ──────────────────────────────────────────── */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <Box>
            Solicitar traspaso
            <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
              De {nombreSucursal(sucursalActual)} a {nombreSucursal(miSucursalReal)}
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setOpenModal(false)} aria-label="Cerrar">
            <Close sx={{ fontSize: 17 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Box sx={{ p: '11px 13px', borderRadius: '9px', bgcolor: 'pc.accentSoft', color: 'primary.main' }}>
            <Box sx={{ typography: 'eyebrow', color: 'inherit', opacity: .75 }}>Producto</Box>
            <Typography sx={{ fontWeight: 600, fontSize: '.9rem', letterSpacing: '-.015em' }}>
              {productoTransferir?.producto}
            </Typography>
          </Box>

          {productoTransferir?.esSerializado ? (
            <Typography sx={{ color: 'text.secondary', fontSize: '.78rem' }}>
              Es un equipo serializado: se transfiere la unidad completa.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: .5 }}>
              <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Cantidad a transferir</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button variant="outlined" sx={{ minWidth: 32, px: 0 }}
                  onClick={() => setProductoTransferir({ ...productoTransferir, cantidadPedir: Math.max(1, productoTransferir.cantidadPedir - 1) })}>
                  −
                </Button>
                <TextField
                  value={productoTransferir?.cantidadPedir ?? 1}
                  slotProps={{ input: { className: 'mono', readOnly: true }, htmlInput: { style: { textAlign: 'center' } } }}
                  sx={{ width: 76 }}
                />
                <Button variant="outlined" sx={{ minWidth: 32, px: 0 }}
                  onClick={() => setProductoTransferir({ ...productoTransferir, cantidadPedir: Math.min(productoTransferir.stock, productoTransferir.cantidadPedir + 1) })}>
                  +
                </Button>
                <Typography className="num" sx={{ ml: 'auto', color: 'text.disabled', fontSize: '.72rem' }}>
                  Disponible {productoTransferir?.stock}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarTraspaso}>Confirmar traspaso</Button>
        </DialogActions>
      </Dialog>

      {/* 4. Inyección del Escáner */}
      <ImeiScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onScanSuccess={(codigoEscaneado) => {
          setBusqueda(codigoEscaneado); // Pega el código escaneado en el buscador
        }}
      />
    </Box>
  );
};

export default InventarioList;
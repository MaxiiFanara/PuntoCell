import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Switch, FormControlLabel, Select, MenuItem,
  CircularProgress, Tooltip, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import {
  Search, Add, Edit, Visibility, LocalShipping,
  Store, Lock, PointOfSale, Sell, Build, SwapHoriz
} from '@mui/icons-material';
import { inventarioService } from '../../../services/inventarioServices';
import { useVenta } from '../../punto-venta/context/VentaContext';
import { useAuth } from '../../../context/AuthContext';
import { capitalizar } from '../../../utils/format';

const FILAS_POR_PAGINA = 10;

const InventarioList = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  // Cotización real y compartida: se recalcula sola si se edita desde la navbar.
  const { dolarGlobal: DOLAR_HOY } = useVenta();

  // Sucursal del empleado logueado; determina si el stock visto es propio o ajeno (lectura)
  const miSucursalReal = usuario?.sucursal || 1;
  const [sucursales, setSucursales] = useState([]);
  const [sucursalActual, setSucursalActual] = useState(miSucursalReal);
  const esMiStock = sucursalActual === miSucursalReal;
  const [mostrarAgotados, setMostrarAgotados] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // Filtro de tipo de producto: 'todos' | 'vendibles' | 'repuestos' | 'canje'
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [openModal, setOpenModal] = useState(false);
  const [productoTransferir, setProductoTransferir] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  // Sucursales tal cual están en la base (antes había nombres hardcodeados en el front)
  useEffect(() => {
    inventarioService.getSucursales()
      .then((res) => setSucursales(Array.isArray(res) ? res : (res?.data || [])))
      .catch(() => setSucursales([]));
  }, []);

  const nombreSucursal = (id) => {
    const s = sucursales.find((suc) => (suc.Id ?? suc.id) === id);
    return s ? capitalizar(s.Nombre ?? s.nombre) : '—';
  };

  useEffect(() => {
    const cargarInventario = async () => {
      try {
        setCargando(true);
        const paramsFiltro = {
          vendibles: { soloVendibles: true },
          repuestos: { soloRepuestos: true },
          canje: { soloCanje: true },
          todos: {},
        }[filtroTipo];
        const res = await inventarioService.getAll({ IdSucursal: sucursalActual, ...paramsFiltro });
        const datosBackend = res.data || res || [];

        const inventarioAdaptado = datosBackend.map(row => {
          const art = row.articulo || row.Articulo || {};
          return {
            id: row.Id || row.id,
            idArticulo: art.Id || art.id,
            producto: art.Nombre || 'Equipo sin nombre',
            // modelo/color/memoria solo vienen en el detalle (getById), no en este listado
            modelo: art.modelo?.Nombre || '',
            imei: row.IMEI || null,
            color: null,
            memoria: null,
            stock: row.Stock || 0,
            precioMenor: row.PrecioMenor || row.PrecioCosto || 0,
            esSerializado: art.EsSerializado || false
          };
        });
        setInventario(inventarioAdaptado);
      } catch (error) {
        console.error("Error al cargar el inventario real:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarInventario();
  }, [sucursalActual, filtroTipo]);

  const inventarioFiltrado = inventario.filter(item => {
    const coincideBusqueda = item.producto.toLowerCase().includes(busqueda.toLowerCase()) ||
                             (item.imei && item.imei.includes(busqueda));
    const coincideStock = mostrarAgotados ? item.stock === 0 : item.stock > 0;
    return coincideBusqueda && coincideStock;
  });

  // Volvemos a la página 1 cada vez que cambia el resultado filtrado, para no
  // quedar mostrando una página vacía.
  useEffect(() => { setPagina(1); }, [busqueda, mostrarAgotados, sucursalActual, filtroTipo]);

  const totalPaginas = Math.max(1, Math.ceil(inventarioFiltrado.length / FILAS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inventarioPaginado = inventarioFiltrado.slice((paginaSegura - 1) * FILAS_POR_PAGINA, paginaSegura * FILAS_POR_PAGINA);

  const abrirTransferencia = (item) => {
    setProductoTransferir({ ...item, cantidadPedir: 1 });
    setOpenModal(true);
  };

  const confirmarTraspaso = async () => {
    try {
      // Destino = mi propia sucursal (adonde quiero traer el stock), no una asumida a mano.
      const payload = {
        IdArticulo: productoTransferir.idArticulo,
        IdSucursalOrigen: sucursalActual,
        IdSucursalDestino: miSucursalReal,
        Cantidad: productoTransferir.cantidadPedir,
        IdEmpleado: 1
      };
      await inventarioService.ejecutarTraspaso(payload);
      alert(`✅ ¡Traspaso completado! Se enviaron ${payload.Cantidad} unidades.`);
      setOpenModal(false);
      // Acá deberías trigger un refetch
    } catch (error) {
      console.error("Error en traspaso:", error);
      alert("❌ Hubo un error al procesar la transferencia.");
    }
  };

  if (cargando) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Header y selector de sucursal */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, mb: 3, border: '1px solid #e2e8f0', borderTop: '4px solid', borderTopColor: esMiStock ? 'primary.main' : 'warning.main', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', mb: 0.5, color: esMiStock ? 'primary.main' : 'warning.main', display: 'flex', alignItems: 'center' }}>
            {esMiStock ? <><Store fontSize="small" sx={{ mr: 0.5 }}/> Estás en tu sucursal</> : <><Lock fontSize="small" sx={{ mr: 0.5 }}/> Modo Lectura: Sucursal Ajena</>}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: esMiStock ? 'text.primary' : '#ea580c' }}>
            {nombreSucursal(sucursalActual)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#f8fafc', p: 1, borderRadius: 2, border: '1px solid #e2e8f0', width: { xs: '100%', sm: 'auto' } }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'text.secondary', whiteSpace: 'nowrap' }}>Ver Stock de:</Typography>
          <Select
            size="small"
            value={sucursalActual}
            onChange={(e) => setSucursalActual(e.target.value)}
            sx={{ bgcolor: 'white', fontWeight: 'bold', flex: 1 }}
          >
            {sucursales.map((s) => (
              <MenuItem key={s.Id ?? s.id} value={s.Id ?? s.id}>{capitalizar(s.Nombre ?? s.nombre)}</MenuItem>
            ))}
          </Select>
        </Box>
      </Paper>

      {/* Barra de búsqueda y botones */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, flex: 1 }}>
          <TextField 
            placeholder="Buscar equipo, modelo, IMEI..." 
            size="small" 
            fullWidth
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ color: 'text.disabled', mr: 1 }} /> }}
            sx={{ bgcolor: 'background.paper' }}
          />
          <Box sx={{ bgcolor: 'background.paper', px: 2, py: 0.75, borderRadius: 2, border: '1px solid #e2e8f0' }}>
            <FormControlLabel
              control={<Switch size="small" checked={mostrarAgotados} onChange={(e) => setMostrarAgotados(e.target.checked)} />}
              label={<Typography sx={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'text.secondary' }}>Ver Agotados</Typography>}
            />
          </Box>

          <ToggleButtonGroup
            size="small"
            value={filtroTipo}
            exclusive
            onChange={(e, valor) => setFiltroTipo(valor || 'todos')}
            sx={{ bgcolor: 'background.paper' }}
          >
            <ToggleButton value="todos" sx={{ fontWeight: 'bold', px: 1.5 }}>Todos</ToggleButton>
            <ToggleButton value="vendibles" sx={{ fontWeight: 'bold', px: 1.5 }}>
              <Tooltip title="Listar dispositivos vendibles"><Box sx={{ display: 'flex', alignItems: 'center' }}><Sell fontSize="small" sx={{ mr: 0.5 }} /> Vendibles</Box></Tooltip>
            </ToggleButton>
            <ToggleButton value="repuestos" sx={{ fontWeight: 'bold', px: 1.5 }}>
              <Tooltip title="Listar dispositivos repuestos"><Box sx={{ display: 'flex', alignItems: 'center' }}><Build fontSize="small" sx={{ mr: 0.5 }} /> Repuestos</Box></Tooltip>
            </ToggleButton>
            <ToggleButton value="canje" sx={{ fontWeight: 'bold', px: 1.5 }}>
              <Tooltip title="Listar dispositivos plan canje"><Box sx={{ display: 'flex', alignItems: 'center' }}><SwapHoriz fontSize="small" sx={{ mr: 0.5 }} /> Plan Canje</Box></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
          <Button 
            variant="outlined" color="success" startIcon={<PointOfSale />}
            onClick={() => navigate('/app/punto-venta')} 
            sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}
          >
            Ir a Caja
          </Button>
          {(esMiStock) && (
            <Button 
              variant="contained" color="primary" startIcon={<Add />}
              onClick={() => navigate('/app/inventario/nuevo')} 
              sx={{ fontWeight: 'bold', boxShadow: 1 }}
            >
              Registrar Ingreso
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabla principal */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Dispositivo / IMEI</TableCell>
              <TableCell>Características</TableCell>
              <TableCell align="center">Stock</TableCell>
              <TableCell>Precio Venta</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventarioFiltrado.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No se encontraron productos en la base de datos.
                </TableCell>
              </TableRow>
            ) : (
              inventarioPaginado.map((item) => {
                const precioArs = item.precioMenor * DOLAR_HOY;
                const opacidad = item.stock === 0 ? 0.5 : 1;
                
                return (
                  <TableRow key={item.id} hover sx={{ opacity: opacidad, '&:last-child td, &:last-child th': { border: 0 } }}>
                    
                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold', color: 'text.primary', lineHeight: 1.2 }}>{item.producto}</Typography>
                      {item.imei && <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', fontFamily: 'monospace', mt: 0.5, textTransform: 'uppercase', letterSpacing: '-0.025em' }}>{item.imei}</Typography>}
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}>{item.modelo}</Typography>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                        {item.color && <Box component="span" sx={{ px: 1, py: 0.25, fontSize: '0.75rem', fontWeight: 'bold', bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 1 }}>🎨 {item.color}</Box>}
                        {item.memoria && <Box component="span" sx={{ px: 1, py: 0.25, fontSize: '0.75rem', fontWeight: 'bold', bgcolor: '#1e293b', color: 'white', borderRadius: 1 }}>💾 {item.memoria}</Box>}
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Box component="span" sx={{ display: 'inline-block', px: 1.5, py: 0.5, fontSize: '0.75rem', fontWeight: 'bold', borderRadius: 5, bgcolor: item.stock <= 2 ? '#ef4444' : '#f1f5f9', color: item.stock <= 2 ? 'white' : '#1e293b', border: item.stock > 2 ? '1px solid #e2e8f0' : 'none' }}>
                        {item.stock} un.
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 'bold', color: '#16a34a', fontSize: '1.125rem' }}>U$S {item.precioMenor.toLocaleString()}</Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>AR$ {precioArs.toLocaleString()}</Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Box sx={{ display: 'inline-flex', gap: 0.5 }}>
                        {esMiStock ? (
                          <>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => navigate(`/app/inventario/editar/${item.id}`)} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, color: 'primary.main' }}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Ver Detalle">
                              <IconButton size="small" onClick={() => navigate(`/app/inventario/detalle/${item.id}`)} sx={{ border: '1px solid #e2e8f0', borderRadius: 1.5, color: 'text.secondary' }}>
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip title="Solicitar Traspaso">
                            <Button variant="contained" size="small" sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' }, minWidth: 40, p: '4px 8px' }} onClick={() => abrirTransferencia(item)}>
                              <LocalShipping fontSize="small" />
                            </Button>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {inventarioFiltrado.length > FILAS_POR_PAGINA && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              count={totalPaginas}
              page={paginaSegura}
              onChange={(_, p) => setPagina(p)}
              color="primary"
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </TableContainer>

      {/* Modal de transferencia */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f97316', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <LocalShipping sx={{ mr: 1 }} /> Solicitar Transferencia
        </DialogTitle>
        <DialogContent sx={{ pt: 3, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 0.5 }}>Vas a solicitar el producto:</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>{productoTransferir?.producto}</Typography>
          
          {productoTransferir?.esSerializado ? (
            <Box sx={{ bgcolor: '#eff6ff', color: '#1e40af', p: 1.5, borderRadius: 2, fontSize: '0.875rem', border: '1px solid #bfdbfe' }}>
              <strong>Producto Único:</strong> Se transferirá la unidad completa (Stock: 1).
            </Box>
          ) : (
            <Box sx={{ textAlign: 'left' }}>
              <Typography sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: 'text.primary' }}>Cantidad a transferir</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Button variant="outlined" onClick={() => setProductoTransferir({...productoTransferir, cantidadPedir: Math.max(1, productoTransferir.cantidadPedir - 1)})}>-</Button>
                <TextField 
                  value={productoTransferir?.cantidadPedir} 
                  inputProps={{ style: { textAlign: 'center', fontWeight: 'bold' } }}
                  sx={{ mx: 1, width: 80 }}
                />
                <Button variant="outlined" onClick={() => setProductoTransferir({...productoTransferir, cantidadPedir: Math.min(productoTransferir.stock, productoTransferir.cantidadPedir + 1)})}>+</Button>
              </Box>
              <Typography sx={{ textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
                Stock máximo: <strong>{productoTransferir?.stock}</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setOpenModal(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" onClick={confirmarTraspaso} sx={{ bgcolor: '#f97316', fontWeight: 'bold', '&:hover': { bgcolor: '#ea580c' } }}>
            Confirmar Traspaso
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventarioList;
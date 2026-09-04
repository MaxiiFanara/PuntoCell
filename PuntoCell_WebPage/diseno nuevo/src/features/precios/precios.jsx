import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, Drawer, TextField, Divider, IconButton, InputAdornment, Tooltip,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';

import PageHeader from '../../components/ui/PageHeader';
import StatusPill from '../../components/ui/StatusPill';
import Money from '../../components/ui/Money';

const formatoMoneda = (v) => Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// --- DATOS MOCK INICIALES ---
const initialProductos = [
  { id: 1, modelo: 'Apple iPhone 13 128GB', categoria: 'Smartphones', costoUSD: 560.00, fijosPct: 3, pasarelaPct: 6.5, logisticaARS: 2500, margenNeto: 15, precioManualARS: null },
  { id: 2, modelo: 'Funda Silicona Original', categoria: 'Accesorios', costoUSD: 8.50, fijosPct: 5, pasarelaPct: 6.5, logisticaARS: 0, margenNeto: 45, precioManualARS: null },
  { id: 3, modelo: 'Vidrio Templado 9D', categoria: 'Accesorios', costoUSD: 2.50, fijosPct: 5, pasarelaPct: 6.5, logisticaARS: 0, margenNeto: 45, precioManualARS: null },
  { id: 4, modelo: 'Módulo Pantalla S23 Ultra', categoria: 'Repuestos', costoUSD: 125.00, fijosPct: 2, pasarelaPct: 0, logisticaARS: 1500, margenNeto: 35, precioManualARS: null },
];

const initialReglas = [
  { id: 1, nombre: 'Estrategia Smartphones', categoria: 'Smartphones', fijosPct: 3, pasarelaPct: 6.5, logisticaARS: 2500, margenNeto: 18 },
  { id: 2, nombre: 'Accesorios Alta Rotación', categoria: 'Accesorios', fijosPct: 5, pasarelaPct: 6.5, logisticaARS: 0, margenNeto: 60 },
  { id: 3, nombre: 'Repuestos Taller', categoria: 'Repuestos', fijosPct: 2, pasarelaPct: 0, logisticaARS: 1500, margenNeto: 40 },
];

// --- MOTOR FINANCIERO ---
const calcularRentabilidad = (prod, dolar) => {
  const costoBaseARS = prod.costoUSD * dolar;
  const costoFijoARS = costoBaseARS * (prod.fijosPct / 100);
  const costoLandedARS = costoBaseARS + costoFijoARS + prod.logisticaARS;

  const factorDivision = 1 - ((prod.pasarelaPct + prod.margenNeto) / 100);
  let precioSugeridoARS = factorDivision > 0 ? costoLandedARS / factorDivision : 0;

  const precioFinalARS = prod.precioManualARS || precioSugeridoARS;

  const comisionPasarelaARS = precioFinalARS * (prod.pasarelaPct / 100);
  const gananciaNetaARS = precioFinalARS - costoLandedARS - comisionPasarelaARS;

  const pctCosto = precioFinalARS > 0 ? (costoLandedARS / precioFinalARS) * 100 : 0;
  const pctComision = precioFinalARS > 0 ? (comisionPasarelaARS / precioFinalARS) * 100 : 0;
  const pctGanancia = precioFinalARS > 0 ? (gananciaNetaARS / precioFinalARS) * 100 : 0;

  return {
    costoBaseARS, costoLandedARS, comisionPasarelaARS, gananciaNetaARS,
    precioFinalARS, pctCosto, pctComision, pctGanancia,
    margenRealPct: precioFinalARS > 0 ? (gananciaNetaARS / precioFinalARS) * 100 : 0
  };
};

export default function PricingAvanzado() {
  const [tabIndex, setTabIndex] = useState(0);
  const [cotizacionUSD, setCotizacionUSD] = useState(1450);

  const [productos, setProductos] = useState(initialProductos);
  const [simuladorTarget, setSimuladorTarget] = useState(null);

  const [reglasMasivas, setReglasMasivas] = useState(initialReglas);
  const [reglaEditando, setReglaEditando] = useState(null); // null = cerrado, { ... } = abierto (editar o nueva)

  // --- HANDLERS REGLAS MASIVAS ---
  const handleAplicarReglaMasiva = (regla) => {
    if(window.confirm(`¿Estás seguro de aplicar la regla "${regla.nombre}" a todos los productos de la categoría ${regla.categoria}? Se sobreescribirán los precios manuales.`)) {
      const actualizados = productos.map(p => {
        if (p.categoria === regla.categoria) {
          return {
            ...p,
            fijosPct: regla.fijosPct,
            pasarelaPct: regla.pasarelaPct,
            logisticaARS: regla.logisticaARS,
            margenNeto: regla.margenNeto,
            precioManualARS: null
          };
        }
        return p;
      });
      setProductos(actualizados);
    }
  };

  const handleGuardarRegla = (reglaForm) => {
    if (reglaForm.id) {
      // Editar existente
      setReglasMasivas(reglasMasivas.map(r => r.id === reglaForm.id ? reglaForm : r));
    } else {
      // Crear nueva
      const nuevaRegla = { ...reglaForm, id: Date.now() };
      setReglasMasivas([...reglasMasivas, nuevaRegla]);
    }
    setReglaEditando(null);
  };

  const handleAbrirNuevaRegla = () => {
    setReglaEditando({ nombre: '', categoria: '', fijosPct: 0, pasarelaPct: 0, logisticaARS: 0, margenNeto: 0 });
  };

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <PageHeader
        eyebrow="Ingeniería de precios"
        title="Matriz de rentabilidad"
        meta={`${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} en la matriz`}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: '6px 12px',
              borderRadius: '9px', border: 1, borderColor: 'divider', bgcolor: 'background.paper',
            }}>
              <Box sx={{ typography: 'eyebrow', color: 'text.disabled', whiteSpace: 'nowrap' }}>
                Tipo de cambio (ARS)
              </Box>
              <TextField
                variant="standard" type="number"
                value={cotizacionUSD} onChange={(e) => setCotizacionUSD(Number(e.target.value))}
                className="mono"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                sx={{ width: 84 }}
              />
            </Box>
            <StatusPill tone="due" label="Datos de ejemplo" />
          </Box>
        }
      />

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
            <Tab label="Listado y ajustes individuales" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label="Aplicación masiva de reglas" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>
        </Box>

        {/* PESTAÑA 0: LISTADO INDIVIDUAL */}
        {tabIndex === 0 && (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Producto / Categoría</TableCell>
                  <TableCell align="right">Costo (USD)</TableCell>
                  <TableCell align="center">Pasarela / Imp.</TableCell>
                  <TableCell align="center">Margen neto</TableCell>
                  <TableCell align="right">Ganancia</TableCell>
                  <TableCell align="right">Precio de venta</TableCell>
                  <TableCell align="center">Simular</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productos.map(prod => {
                  const finanzas = calcularRentabilidad(prod, cotizacionUSD);
                  const gananciaCritica = finanzas.margenRealPct < 10;

                  return (
                    <TableRow key={prod.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{prod.modelo}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '.72rem' }}>{prod.categoria}</Typography>
                      </TableCell>

                      <TableCell align="right" className="num" sx={{ fontWeight: 600 }}>
                        U$S {formatoMoneda(prod.costoUSD)}
                      </TableCell>

                      <TableCell align="center">
                        <StatusPill tone="due" label={`${prod.pasarelaPct}%`} dot={false} />
                      </TableCell>

                      <TableCell align="center">
                        <StatusPill tone={gananciaCritica ? 'late' : 'ok'} label={`${finanzas.margenRealPct.toFixed(1)}%`} />
                      </TableCell>

                      <TableCell align="right" className="num" sx={{ fontWeight: 600, color: gananciaCritica ? 'error.main' : 'success.main' }}>
                        $ {formatoMoneda(finanzas.gananciaNetaARS)}
                      </TableCell>

                      <TableCell align="right">
                        <Typography className="num" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '.9rem' }}>
                          $ {formatoMoneda(finanzas.precioFinalARS)}
                        </Typography>
                        {prod.precioManualARS && (
                          <Typography sx={{ color: 'text.disabled', fontSize: '.69rem', display: 'block' }}>Precio Forzado</Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <IconButton color="primary" onClick={() => setSimuladorTarget(prod)}>
                          <CalculateIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* PESTAÑA 1: REGLAS MASIVAS */}
        {tabIndex === 1 && (
          <Box sx={{ p: '20px 24px' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2} flexWrap="wrap">
              <Typography sx={{ color: 'text.secondary' }}>
                Configura plantillas financieras y aplícalas a categorías completas de tu inventario.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAbrirNuevaRegla}>
                Nueva Plantilla
              </Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: 2 }}>
              {reglasMasivas.map(regla => (
                <Paper key={regla.id} sx={{ p: 2.5, boxShadow: 'none' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>{regla.nombre}</Typography>
                      <StatusPill tone="neutral" dot={false} label={`Aplica a: ${regla.categoria}`} sx={{ mt: 0.5 }} />
                    </Box>
                    <IconButton size="small" onClick={() => setReglaEditando(regla)}>
                      <SettingsIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </IconButton>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Costos Fijos:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{regla.fijosPct}%</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Logística (Flete):</Typography>
                    <Money ars={regla.logisticaARS} size="sm" />
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Comisión Pasarela:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{regla.pasarelaPct}%</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} p={1} sx={{ bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>Margen Neto Limpio:</Typography>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>{regla.margenNeto}%</Typography>
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<AutoFixHighIcon />}
                    onClick={() => handleAplicarReglaMasiva(regla)}
                    sx={{ mt: 1 }}
                  >
                    Aplicar a todo {regla.categoria}
                  </Button>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* DRAWER SIMULADOR FINANCIERO INDIVIDUAL */}
      <SimuladorPanel
        producto={simuladorTarget}
        cotizacionUSD={cotizacionUSD}
        onClose={() => setSimuladorTarget(null)}
        onGuardar={(prodActualizado) => {
          setProductos(productos.map(p => p.id === prodActualizado.id ? prodActualizado : p));
          setSimuladorTarget(null);
        }}
      />

      {/* MODAL EDITOR DE REGLAS MASIVAS */}
      {reglaEditando && (
        <ReglaEditorDialog
          open={!!reglaEditando}
          regla={reglaEditando}
          onClose={() => setReglaEditando(null)}
          onGuardar={handleGuardarRegla}
        />
      )}
    </Box>
  );
}

// ==========================================
// COMPONENTE: MODAL EDITOR DE REGLAS
// ==========================================
function ReglaEditorDialog({ open, regla, onClose, onGuardar }) {
  const [form, setForm] = useState(regla);

  const handleChange = (campo, valor) => {
    setForm({ ...form, [campo]: valor });
  };

  const handleSubit = () => {
    if (!form.nombre || !form.categoria) return alert('El nombre y la categoría son obligatorios');
    onGuardar(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700 }}>{form.id ? 'Editar Plantilla Financiera' : 'Crear Nueva Plantilla'}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: '18px !important' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' }, gap: 2.5 }}>
          <TextField label="Nombre de la Regla" fullWidth value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Fundas Premium" />
          <TextField label="Categoría Objetivo" fullWidth value={form.categoria} onChange={e => handleChange('categoria', e.target.value)} placeholder="Ej: Accesorios" helperText="Debe coincidir con la categoría de los productos." />

          <Divider sx={{ gridColumn: '1 / -1' }} />

          <TextField label="Costos Fijos / Locales (%)" type="number" fullWidth value={form.fijosPct} onChange={e => handleChange('fijosPct', Number(e.target.value))} />
          <TextField label="Logística Fija (ARS)" type="number" fullWidth value={form.logisticaARS} onChange={e => handleChange('logisticaARS', Number(e.target.value))} />
          <TextField label="Comisión Tarjeta (%)" type="number" fullWidth value={form.pasarelaPct} onChange={e => handleChange('pasarelaPct', Number(e.target.value))} />
          <TextField label="Margen Neto Deseado (%)" type="number" fullWidth value={form.margenNeto} onChange={e => handleChange('margenNeto', Number(e.target.value))} color="success" focused />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubit}>Guardar Plantilla</Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// COMPONENTE: PANEL SIMULADOR LATERAL
// ==========================================
function SimuladorPanel({ producto, cotizacionUSD, onClose, onGuardar }) {
  const [fijosPct, setFijosPct] = useState(0);
  const [pasarelaPct, setPasarelaPct] = useState(0);
  const [logisticaARS, setLogisticaARS] = useState(0);
  const [margenNeto, setMargenNeto] = useState(0);
  const [precioManualARS, setPrecioManualARS] = useState('');

  useEffect(() => {
    if (producto) {
      setFijosPct(producto.fijosPct);
      setPasarelaPct(producto.pasarelaPct);
      setLogisticaARS(producto.logisticaARS);
      setMargenNeto(producto.margenNeto);
      setPrecioManualARS(producto.precioManualARS || '');
    }
  }, [producto]);

  if (!producto) return null;

  const prodSimulado = { ...producto, fijosPct, pasarelaPct, logisticaARS, margenNeto, precioManualARS: Number(precioManualARS) || null };
  const finanzas = calcularRentabilidad(prodSimulado, cotizacionUSD);

  return (
    <Drawer anchor="right" open={!!producto} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 450 }, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>

        {/* Cabecera del Drawer */}
        <Box sx={{
          p: 2.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5,
        }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ typography: 'eyebrow', color: 'primary.main' }}>Modo Simulación</Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{producto.modelo}</Typography>
            <Typography className="num" sx={{ color: 'text.secondary', fontSize: '.78rem', mt: 0.5 }}>
              Costo Proveedor: U$S {formatoMoneda(producto.costoUSD)}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ p: 2.5, overflowY: 'auto', flex: 1 }}>

          {/* SECCIÓN 1: COSTOS EXTRA */}
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1.5 }}>Estructura de costos y comisiones</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1.75, mb: 4 }}>
            <TextField
              label="Costos Fijos (%)" type="number" fullWidth
              value={fijosPct} onChange={e => setFijosPct(Number(e.target.value))}
            />
            <TextField
              label="Logística Fija (ARS)" type="number" fullWidth
              value={logisticaARS} onChange={e => setLogisticaARS(Number(e.target.value))}
            />
            <TextField
              label="Comisión Tarjeta / MercadoPago (%)" type="number" fullWidth
              value={pasarelaPct} onChange={e => setPasarelaPct(Number(e.target.value))}
              helperText="Se descuenta del precio final de venta."
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>

          {/* SECCIÓN 2: ESTRATEGIA DE RENTABILIDAD */}
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1.5 }}>Estrategia de rentabilidad</Box>
          <Paper sx={{ p: 2, mb: 4, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Margen Neto Deseado (%)" type="number" fullWidth
              value={margenNeto} onChange={e => { setMargenNeto(Number(e.target.value)); setPrecioManualARS(''); }}
              color="success" focused
            />
            <Divider>
              <Chip label="O INGENIERÍA INVERSA" size="small" sx={{ fontSize: 10, color: 'text.disabled' }} />
            </Divider>
            <TextField
              label="Forzar Precio de Vitrina (ARS)" type="number" fullWidth
              value={precioManualARS} onChange={e => setPrecioManualARS(e.target.value)}
              helperText="Si fijas un precio, el Margen Neto se recalculará automáticamente."
            />
          </Paper>

          {/* SECCIÓN 3: RESULTADOS EN VIVO */}
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 1.5 }}>Desglose financiero resultante</Box>

          <Box sx={{ mb: 2, display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <Tooltip title={`Costo Producto + Estructura: ${finanzas.pctCosto.toFixed(1)}%`} placement="top">
              <Box sx={{ width: `${finanzas.pctCosto}%`, bgcolor: 'text.disabled' }} />
            </Tooltip>
            <Tooltip title={`Comisiones Pasarela: ${finanzas.pctComision.toFixed(1)}%`} placement="top">
              <Box sx={{ width: `${finanzas.pctComision}%`, bgcolor: 'warning.main' }} />
            </Tooltip>
            <Tooltip title={`Ganancia Neta: ${finanzas.pctGanancia.toFixed(1)}%`} placement="top">
              <Box sx={{ width: `${finanzas.pctGanancia}%`, bgcolor: 'success.main' }} />
            </Tooltip>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 700 }}>■ Costos Base</Typography>
            <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>■ Comisiones</Typography>
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>■ Ganancia Neta</Typography>
          </Box>

          <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: '10px', border: 1, borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Costo Base Pesificado:</Typography>
              <Typography variant="body2" className="num">$ {formatoMoneda(finanzas.costoBaseARS)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Logística y Estructura Fija:</Typography>
              <Typography variant="body2" className="num">+ $ {formatoMoneda(finanzas.costoLandedARS - finanzas.costoBaseARS)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Comisiones y Retenciones:</Typography>
              <Typography variant="body2" className="num" sx={{ color: 'error.main' }}>- $ {formatoMoneda(finanzas.comisionPasarelaARS)}</Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>Ganancia Neta Limpia:</Typography>
              <Typography variant="body2" className="num" sx={{ fontWeight: 700, color: 'success.main' }}>
                $ {formatoMoneda(finanzas.gananciaNetaARS)} ({finanzas.margenRealPct.toFixed(1)}%)
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} p={1.5} sx={{ bgcolor: 'pc.accentSoft', borderRadius: '9px' }}>
              <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>Precio Venta Público:</Typography>
              <Typography variant="h6" className="num" sx={{ color: 'primary.main', fontWeight: 700 }}>
                $ {formatoMoneda(finanzas.precioFinalARS)}
              </Typography>
            </Box>
          </Box>

        </Box>

        {/* Footer Acciones */}
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="contained" fullWidth startIcon={<TrendingUpIcon />}
            onClick={() => onGuardar(prodSimulado)}
            sx={{ py: 1.5 }}
          >
            Aplicar y Actualizar Precios
          </Button>
        </Box>

      </Box>
    </Drawer>
  );
}

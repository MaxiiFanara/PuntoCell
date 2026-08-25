import React, { useState } from 'react';
import { 
  Box, Typography, Card, Button, Table, TableHead, TableBody, TableRow, TableCell, 
  Chip, Drawer, TextField, Grid, Divider, IconButton, InputAdornment, Tooltip, 
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';

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
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto', bgcolor: '#f4f7fb', minHeight: '100vh' }}>
      
      {/* CABECERA GERENCIAL */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="overline" sx={{ color: '#8695ad', fontWeight: 700, letterSpacing: 1 }}>Ingeniería de Precios</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f1729' }}>Matriz de Rentabilidad</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ bgcolor: 'white', p: 1, px: 2, borderRadius: 2, border: '1px solid #e2e8f2', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="textSecondary" fontWeight="bold">TIPO DE CAMBIO (ARS)</Typography>
            <TextField 
              size="small" variant="standard" type="number" 
              value={cotizacionUSD} onChange={(e) => setCotizacionUSD(Number(e.target.value))}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, sx: { fontWeight: 'bold', fontFamily: 'monospace', fontSize: 16 } }}
              sx={{ width: 90 }}
            />
          </Box>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#ffffff' }}>
          <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)}>
            <Tab label="Listado y Ajustes Individuales" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
            <Tab label="Aplicación Masiva de Reglas" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* PESTAÑA 0: LISTADO INDIVIDUAL */}
        {tabIndex === 0 && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafd' }}>
                <TableRow>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>Producto / Categoría</TableCell>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="right">Costo (USD)</TableCell>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Pasarela/Imp.</TableCell>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Margen Neto</TableCell>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="right">Ganancia (ARS)</TableCell>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="right">Precio Venta (ARS)</TableCell>
                  <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Simular</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productos.map(prod => {
                  const finanzas = calcularRentabilidad(prod, cotizacionUSD);
                  const gananciaCritica = finanzas.margenRealPct < 10;

                  return (
                    <TableRow key={prod.id} hover>
                      <TableCell>
                        <Typography fontWeight="bold" sx={{ color: '#0f1729' }}>{prod.modelo}</Typography>
                        <Typography variant="caption" sx={{ color: '#52607a' }}>{prod.categoria}</Typography>
                      </TableCell>
                      
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        U$S {formatoMoneda(prod.costoUSD)}
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip size="small" label={`${prod.pasarelaPct}%`} sx={{ bgcolor: '#fdf1de', color: '#9c5f07', fontWeight: 'bold', borderRadius: 1 }} />
                      </TableCell>

                      <TableCell align="center">
                        <Chip 
                          size="small" 
                          label={`${finanzas.margenRealPct.toFixed(1)}%`} 
                          sx={{ 
                            bgcolor: gananciaCritica ? '#fdeceb' : '#e2f4ed', 
                            color: gananciaCritica ? '#c0392f' : '#0e7a56', 
                            fontWeight: 'bold', borderRadius: 1 
                          }} 
                        />
                      </TableCell>

                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: gananciaCritica ? '#c0392f' : '#0e7a56', fontWeight: 600 }}>
                        $ {formatoMoneda(finanzas.gananciaNetaARS)}
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontWeight="bold" color="primary" fontFamily="monospace" fontSize={15}>
                          $ {formatoMoneda(finanzas.precioFinalARS)}
                        </Typography>
                        {prod.precioManualARS && <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>Precio Forzado</Typography>}
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
          </Box>
        )}

        {/* PESTAÑA 1: REGLAS MASIVAS */}
        {tabIndex === 1 && (
          <Box sx={{ p: 4, bgcolor: '#ffffff' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
              <Typography variant="body1" color="textSecondary">
                Configura plantillas financieras y aplícalas a categorías completas de tu inventario.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAbrirNuevaRegla} sx={{ bgcolor: '#0f1729', textTransform: 'none' }}>
                Nueva Plantilla
              </Button>
            </Box>

            <Grid container spacing={3}>
              {reglasMasivas.map(regla => (
                <Grid item xs={12} md={4} key={regla.id}>
                  <Card sx={{ p: 3, border: '1px solid #e2e8f2', boxShadow: 'none', borderRadius: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary">{regla.nombre}</Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ bgcolor: '#eef2f8', px: 1, py: 0.5, borderRadius: 1 }}>
                          Aplica a: <b>{regla.categoria}</b>
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setReglaEditando(regla)}>
                        <SettingsIcon fontSize="small" sx={{ color: '#8695ad' }}/>
                      </IconButton>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="textSecondary">Costos Fijos:</Typography>
                      <Typography variant="body2" fontWeight="bold">{regla.fijosPct}%</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="textSecondary">Logística (Flete):</Typography>
                      <Typography variant="body2" fontWeight="bold">$ {formatoMoneda(regla.logisticaARS)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" color="textSecondary">Comisión Pasarela:</Typography>
                      <Typography variant="body2" fontWeight="bold">{regla.pasarelaPct}%</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={2} p={1} sx={{ bgcolor: '#e2f4ed', borderRadius: 1 }}>
                      <Typography variant="body2" color="#0e7a56" fontWeight="bold">Margen Neto Limpio:</Typography>
                      <Typography variant="body2" color="#0e7a56" fontWeight="bold">{regla.margenNeto}%</Typography>
                    </Box>

                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<AutoFixHighIcon />}
                      onClick={() => handleAplicarReglaMasiva(regla)}
                      sx={{ mt: 1, textTransform: 'none', borderColor: '#2456d6', color: '#2456d6' }}
                    >
                      Aplicar a todo {regla.categoria}
                    </Button>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Card>

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
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">{form.id ? 'Editar Plantilla Financiera' : 'Crear Nueva Plantilla'}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField label="Nombre de la Regla" fullWidth size="small" value={form.nombre} onChange={e => handleChange('nombre', e.target.value)} placeholder="Ej: Fundas Premium" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Categoría Objetivo" fullWidth size="small" value={form.categoria} onChange={e => handleChange('categoria', e.target.value)} placeholder="Ej: Accesorios" helperText="Debe coincidir con la categoría de los productos." />
          </Grid>
          <Grid item xs={12}><Divider /></Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Costos Fijos / Locales (%)" type="number" fullWidth size="small" value={form.fijosPct} onChange={e => handleChange('fijosPct', Number(e.target.value))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Logística Fija (ARS)" type="number" fullWidth size="small" value={form.logisticaARS} onChange={e => handleChange('logisticaARS', Number(e.target.value))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Comisión Tarjeta (%)" type="number" fullWidth size="small" value={form.pasarelaPct} onChange={e => handleChange('pasarelaPct', Number(e.target.value))} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Margen Neto Deseado (%)" type="number" fullWidth size="small" value={form.margenNeto} onChange={e => handleChange('margenNeto', Number(e.target.value))} color="success" focused />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleSubit} sx={{ bgcolor: '#2456d6', textTransform: 'none' }}>Guardar Plantilla</Button>
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

  React.useEffect(() => {
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
      <Box sx={{ width: { xs: '100vw', sm: 450 }, p: 0, display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#f4f7fb' }}>
        
        {/* Cabecera del Drawer */}
        <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '1px solid #e2e8f2', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="primary" fontWeight="bold">Modo Simulación</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{producto.modelo}</Typography>
            <Typography variant="body2" color="textSecondary" mt={0.5} fontFamily="monospace">Costo Proveedor: U$S {formatoMoneda(producto.costoUSD)}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
          
          {/* SECCIÓN 1: COSTOS EXTRA */}
          <Typography variant="caption" color="textSecondary" fontWeight="bold" sx={{ mb: 2, display: 'block' }}>ESTRUCTURA DE COSTOS Y COMISIONES</Typography>
          <Grid container spacing={2} mb={4}>
            <Grid item xs={6}>
              <TextField 
                label="Costos Fijos (%)" type="number" fullWidth size="small" 
                value={fijosPct} onChange={e => setFijosPct(Number(e.target.value))} 
                sx={{ bgcolor: 'white' }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField 
                label="Logística Fija (ARS)" type="number" fullWidth size="small" 
                value={logisticaARS} onChange={e => setLogisticaARS(Number(e.target.value))} 
                sx={{ bgcolor: 'white' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Comisión Tarjeta / MercadoPago (%)" type="number" fullWidth size="small" 
                value={pasarelaPct} onChange={e => setPasarelaPct(Number(e.target.value))} 
                sx={{ bgcolor: 'white' }}
                helperText="Se descuenta del precio final de venta."
              />
            </Grid>
          </Grid>

          {/* SECCIÓN 2: ESTRATEGIA DE RENTABILIDAD */}
          <Typography variant="caption" color="textSecondary" fontWeight="bold" sx={{ mb: 2, display: 'block' }}>ESTRATEGIA DE RENTABILIDAD</Typography>
          <Card sx={{ p: 2, mb: 4, boxShadow: 'none', border: '1px solid #e2e8f2' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  label="Margen Neto Deseado (%)" type="number" fullWidth size="small" 
                  value={margenNeto} onChange={e => { setMargenNeto(Number(e.target.value)); setPrecioManualARS(''); }} 
                  sx={{ bgcolor: 'white' }} color="success" focused
                />
              </Grid>
              <Grid item xs={12}>
                <Divider><Chip label="O INGENIERÍA INVERSA" size="small" sx={{ fontSize: 10, color: '#8695ad' }}/></Divider>
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  label="Forzar Precio de Vitrina (ARS)" type="number" fullWidth size="small" 
                  value={precioManualARS} onChange={e => setPrecioManualARS(e.target.value)} 
                  sx={{ bgcolor: 'white' }}
                  helperText="Si fijas un precio, el Margen Neto se recalculará automáticamente."
                />
              </Grid>
            </Grid>
          </Card>

          {/* SECCIÓN 3: RESULTADOS EN VIVO */}
          <Typography variant="caption" color="textSecondary" fontWeight="bold" sx={{ mb: 2, display: 'block' }}>DESGLOSE FINANCIERO RESULTANTE</Typography>
          
          <Box sx={{ mb: 2, display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            <Tooltip title={`Costo Producto + Estructura: ${finanzas.pctCosto.toFixed(1)}%`} placement="top">
              <Box sx={{ width: `${finanzas.pctCosto}%`, bgcolor: '#8695ad' }} />
            </Tooltip>
            <Tooltip title={`Comisiones Pasarela: ${finanzas.pctComision.toFixed(1)}%`} placement="top">
              <Box sx={{ width: `${finanzas.pctComision}%`, bgcolor: '#dda355' }} />
            </Tooltip>
            <Tooltip title={`Ganancia Neta: ${finanzas.pctGanancia.toFixed(1)}%`} placement="top">
              <Box sx={{ width: `${finanzas.pctGanancia}%`, bgcolor: '#0e7a56' }} />
            </Tooltip>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
             <Typography variant="caption" color="#8695ad" fontWeight="bold">■ Costos Base</Typography>
             <Typography variant="caption" color="#dda355" fontWeight="bold">■ Comisiones</Typography>
             <Typography variant="caption" color="#0e7a56" fontWeight="bold">■ Ganancia Neta</Typography>
          </Box>

          <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, border: '1px solid #e2e8f2' }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">Costo Base Pesificado:</Typography>
              <Typography variant="body2" fontFamily="monospace">$ {formatoMoneda(finanzas.costoBaseARS)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">Logística y Estructura Fija:</Typography>
              <Typography variant="body2" fontFamily="monospace">+ $ {formatoMoneda(finanzas.costoLandedARS - finanzas.costoBaseARS)}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" color="textSecondary">Comisiones y Retenciones:</Typography>
              <Typography variant="body2" color="error" fontFamily="monospace">- $ {formatoMoneda(finanzas.comisionPasarelaARS)}</Typography>
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" fontWeight="bold" color="success.main">Ganancia Neta Limpia:</Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main" fontFamily="monospace">$ {formatoMoneda(finanzas.gananciaNetaARS)} ({finanzas.margenRealPct.toFixed(1)}%)</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} p={1.5} sx={{ bgcolor: '#e9f0fe', borderRadius: 2 }}>
              <Typography fontWeight="bold" color="primary">Precio Venta Público:</Typography>
              <Typography variant="h6" color="primary" fontWeight="bold" fontFamily="monospace">$ {formatoMoneda(finanzas.precioFinalARS)}</Typography>
            </Box>
          </Box>

        </Box>

        {/* Footer Acciones */}
        <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #e2e8f2' }}>
          <Button 
            variant="contained" fullWidth startIcon={<TrendingUpIcon />}
            onClick={() => onGuardar(prodSimulado)}
            sx={{ py: 1.5, fontWeight: 'bold', bgcolor: '#2456d6', textTransform: 'none' }}
          >
            Aplicar y Actualizar Precios
          </Button>
        </Box>

      </Box>
    </Drawer>
  );
}
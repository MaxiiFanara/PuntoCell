import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, IconButton, TextField, Select, MenuItem, Grid, Switch, Table, TableHead, TableBody, TableRow, TableCell, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SmartphoneIcon from '@mui/icons-material/Smartphone';

const formatoMoneda = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CompraCreateModal({ open, onClose, onGuardar }) {
  // Estado Cabecera
  const [proveedor, setProveedor] = useState('');
  const [factura, setFactura] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [dolar, setDolar] = useState(1050);
  const [condicion, setCondicion] = useState('Pagada');

  // Estado Formulario Producto
  const [esSerializado, setEsSerializado] = useState(true);
  const [prodForm, setProdForm] = useState({ modelo: '', imei: '', color: '', memoria: '', bateria: '100%', estado: 'nuevo', costo: '', mayorista: '', publico: '', cant: 1, obs: '' });
  
  // Estado Carrito
  const [carrito, setCarrito] = useState([]);

  const handleChangeProd = (field, value) => {
    setProdForm(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleSerial = (e) => {
    setEsSerializado(e.target.checked);
    setProdForm(prev => ({ ...prev, cant: e.target.checked ? 1 : prev.cant }));
  };

  const handleAddCarrito = () => {
    if (!prodForm.modelo || !prodForm.costo) return alert('Modelo y Costo son obligatorios.');
    if (esSerializado && !prodForm.imei) return alert('Ingrese el IMEI del equipo.');

    setCarrito([...carrito, { ...prodForm, esSerial: esSerializado }]);
    setProdForm({ modelo: '', imei: '', color: '', memoria: '', bateria: '100%', estado: 'nuevo', costo: '', mayorista: '', publico: '', cant: esSerializado ? 1 : 1, obs: '' });
  };

  const handleGuardarFinal = () => {
    if (!proveedor) return alert('Seleccione Proveedor.');
    if (carrito.length === 0) return alert('El carrito está vacío.');

    const totalUSD = carrito.reduce((acc, item) => acc + (Number(item.cant) * Number(item.costo)), 0);
    const [year, month, day] = fecha.split('-');

    onGuardar({
      fecha: `${day}/${month}/${year}`,
      factura: factura || 'S/N',
      proveedor, totalUSD, totalARS: totalUSD * dolar, condicion, items: carrito
    });
    
    setCarrito([]); // Limpiar tras guardar
    onClose();
  };

  const totalCarritoUSD = carrito.reduce((acc, item) => acc + (Number(item.cant) * Number(item.costo)), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f2' }}>
        <Typography fontWeight="bold">Registrar Factura de Compra</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: '#f4f7fb', p: 3 }}>
        {/* Cabecera Factura */}
        <Box sx={{ bgcolor: '#f8fafd', border: '1px dashed #e2e8f2', p: 2, borderRadius: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="caption" color="textSecondary" fontWeight="bold">Proveedor **</Typography>
              <Select fullWidth size="small" value={proveedor} onChange={(e) => setProveedor(e.target.value)} sx={{ bgcolor: 'white' }}>
                <MenuItem value="Distribuidora Celular Sur">Distribuidora Celular Sur</MenuItem>
                <MenuItem value="Importador Mayorista SA">Importador Mayorista SA</MenuItem>
                <MenuItem value="Accesorios Tech">Accesorios Tech</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="textSecondary" fontWeight="bold">Nº Factura</Typography>
              <TextField fullWidth size="small" placeholder="0001-456" value={factura} onChange={(e) => setFactura(e.target.value)} sx={{ bgcolor: 'white' }}/>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="caption" color="textSecondary" fontWeight="bold">Fecha</Typography>
              <TextField fullWidth size="small" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} sx={{ bgcolor: 'white' }}/>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Typography variant="caption" color="textSecondary" fontWeight="bold">Dólar (ARS)</Typography>
              <TextField fullWidth size="small" type="number" value={dolar} onChange={(e) => setDolar(e.target.value)} sx={{ bgcolor: 'white' }}/>
            </Grid>
          </Grid>
        </Box>

        {/* Zona de Carga de Producto */}
        <Box sx={{ bgcolor: 'white', border: '1px solid #e2e8f2', p: 3, borderRadius: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" color="textSecondary" fontWeight="bold">1. DETALLES DEL PRODUCTO</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Switch checked={esSerializado} onChange={handleToggleSerial} color="primary" />
              <Typography variant="body2" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                {esSerializado ? <><SmartphoneIcon fontSize="small" color="primary"/> Equipo Serializado</> : '🔌 Accesorio / Repuesto'}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={8}>
              <TextField label="Modelo" fullWidth size="small" placeholder="Ej: iPhone 13" value={prodForm.modelo} onChange={e => handleChangeProd('modelo', e.target.value)} />
            </Grid>
            {esSerializado && (
              <Grid item xs={12} sm={4}>
                <TextField label="IMEI / Serial" fullWidth size="small" value={prodForm.imei} onChange={e => handleChangeProd('imei', e.target.value)} />
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <TextField label="Color" fullWidth size="small" value={prodForm.color} onChange={e => handleChangeProd('color', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Select fullWidth size="small" displayEmpty value={prodForm.memoria} onChange={e => handleChangeProd('memoria', e.target.value)}>
                <MenuItem value=""><em>Memoria (Opcional)</em></MenuItem>
                <MenuItem value="64 GB">64 GB</MenuItem>
                <MenuItem value="128 GB">128 GB</MenuItem>
                <MenuItem value="256 GB">256 GB</MenuItem>
              </Select>
            </Grid>
            {esSerializado && (
              <Grid item xs={12} sm={4}>
                <Select fullWidth size="small" value={prodForm.bateria} onChange={e => handleChangeProd('bateria', e.target.value)}>
                  <MenuItem value="100%">Bat: 100% (Nuevo)</MenuItem>
                  <MenuItem value="90% - 99%">Bat: 90% - 99%</MenuItem>
                  <MenuItem value="80% - 89%">Bat: 80% - 89%</MenuItem>
                </Select>
              </Grid>
            )}
          </Grid>

          <Typography variant="subtitle2" color="textSecondary" fontWeight="bold" mb={2}>2. PRECIOS Y COSTOS (USD)</Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={4}><TextField label="Costo Base" type="number" fullWidth size="small" value={prodForm.costo} onChange={e => handleChangeProd('costo', e.target.value)}/></Grid>
            <Grid item xs={4}><TextField label="Precio Mayorista" type="number" fullWidth size="small" value={prodForm.mayorista} onChange={e => handleChangeProd('mayorista', e.target.value)}/></Grid>
            <Grid item xs={4}><TextField label="Precio Público" type="number" fullWidth size="small" value={prodForm.publico} onChange={e => handleChangeProd('publico', e.target.value)} color="error" focused/></Grid>
          </Grid>

          <Typography variant="subtitle2" color="textSecondary" fontWeight="bold" mb={2}>3. LOGÍSTICA & ESTADO</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Select fullWidth size="small" value={prodForm.estado} onChange={e => handleChangeProd('estado', e.target.value)}>
                <MenuItem value="nuevo">Estado: Nuevo</MenuItem>
                <MenuItem value="usado">Estado: Usado</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={4}>
              <TextField label="Cantidad" type="number" fullWidth size="small" value={prodForm.cant} onChange={e => handleChangeProd('cant', e.target.value)} disabled={esSerializado} helperText={esSerializado ? "Fijo en 1" : ""}/>
            </Grid>
            <Grid item xs={12} textAlign="right">
              <Button variant="contained" onClick={handleAddCarrito} sx={{ bgcolor: '#2456d6', textTransform: 'none' }}>Añadir al Carrito de Compra</Button>
            </Grid>
          </Grid>
        </Box>

        {/* Resumen Carrito */}
        <Typography variant="overline" fontWeight="bold" color="textSecondary">RESUMEN DE FACTURA</Typography>
        <Box sx={{ bgcolor: 'white', border: '1px solid #e2e8f2', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafd' }}>
              <TableRow>
                <TableCell>Modelo / Serie</TableCell>
                <TableCell align="center">Cant.</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carrito.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ color: '#8695ad', py: 3 }}>No hay productos cargados.</TableCell></TableRow>
              ) : (
                carrito.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Typography fontWeight="bold">{item.modelo}</Typography>
                      {item.esSerial && <Typography variant="caption" color="textSecondary" fontFamily="monospace">IMEI: {item.imei}</Typography>}
                    </TableCell>
                    <TableCell align="center">{item.cant}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>U$S {formatoMoneda(item.cant * item.costo)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
        
        {/* Totales y Finalizar */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={3}>
          <Box width={200}>
            <Typography variant="caption" color="textSecondary" fontWeight="bold">Estado de Pago</Typography>
            <Select fullWidth size="small" value={condicion} onChange={e => setCondicion(e.target.value)} sx={{ bgcolor: 'white' }}>
              <MenuItem value="Pagada">Pagada (Contado)</MenuItem>
              <MenuItem value="Adeudada">Cuenta Corriente (Adeudada)</MenuItem>
            </Select>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="textSecondary">Total ARS: <span style={{ fontFamily: 'monospace' }}>$ {formatoMoneda(totalCarritoUSD * dolar)}</span></Typography>
            <Typography variant="h5" color="primary" fontWeight="bold" fontFamily="monospace">U$S {formatoMoneda(totalCarritoUSD)}</Typography>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f2' }}>
        <Button onClick={onClose} sx={{ color: '#52607a', textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardarFinal} sx={{ bgcolor: '#0e7a56', '&:hover': { bgcolor: '#0a5a3f' }, textTransform: 'none' }}>Guardar Factura</Button>
      </DialogActions>
    </Dialog>
  );
}
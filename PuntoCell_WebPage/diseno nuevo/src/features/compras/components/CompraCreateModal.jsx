import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Select, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import Money from '../../../components/ui/Money';
import { useVenta } from '../../punto-venta/context/VentaContext';

const PROD_VACIO = {
  modelo: '', imei: '', color: '', memoria: '', bateria: '100%',
  estado: 'nuevo', costo: '', mayorista: '', publico: '', cant: 1, obs: '',
};

const Campo = ({ label, children, hint, span = 1 }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, gridColumn: span > 1 ? `span ${span}` : undefined }}>
    {label && <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{label}</Box>}
    {children}
    {hint && <Typography sx={{ fontSize: '.69rem', color: 'text.disabled' }}>{hint}</Typography>}
  </Box>
);

const Bloque = ({ titulo, extra, children, columnas = 3 }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, p: '12px 13px', borderRadius: '9px', bgcolor: 'pc.surfaceMuted', border: 1, borderColor: 'divider' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25 }}>
      <Box sx={{ typography: 'eyebrow', color: 'text.secondary' }}>{titulo}</Box>
      {extra}
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${columnas}, minmax(0,1fr))` }, gap: 1.25 }}>
      {children}
    </Box>
  </Box>
);

export default function CompraCreateModal({ open, onClose, onGuardar }) {
  // La cotización arranca en la vigente del sistema (la de la topbar), no en un
  // valor fijo: quedaba en 1050 y calculaba mal el total en pesos de cada factura.
  const { dolarGlobal } = useVenta();

  const [proveedor, setProveedor] = useState('');
  const [factura, setFactura] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  // Se deriva en vez de sincronizarse: mientras el usuario no lo edite manda la
  // cotización del sistema, incluso si llega después de montar el modal.
  const [dolarManual, setDolarManual] = useState(null);
  const dolar = dolarManual ?? dolarGlobal ?? 0;
  const [condicion, setCondicion] = useState('Pagada');

  const [esSerializado, setEsSerializado] = useState(true);
  const [prodForm, setProdForm] = useState(PROD_VACIO);
  const [carrito, setCarrito] = useState([]);

  const handleChangeProd = (field, value) => setProdForm(prev => ({ ...prev, [field]: value }));

  const handleToggleSerial = (e) => {
    setEsSerializado(e.target.checked);
    setProdForm(prev => ({ ...prev, cant: e.target.checked ? 1 : prev.cant }));
  };

  const handleAddCarrito = () => {
    if (!prodForm.modelo || !prodForm.costo) return alert('Modelo y Costo son obligatorios.');
    if (esSerializado && !prodForm.imei) return alert('Ingrese el IMEI del equipo.');

    setCarrito([...carrito, { ...prodForm, esSerial: esSerializado }]);
    setProdForm({ ...PROD_VACIO, cant: 1 });
  };

  const quitarDelCarrito = (index) => setCarrito(carrito.filter((_, i) => i !== index));

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
  const totalCarritoARS = totalCarritoUSD * dolar;
  const unidades = carrito.reduce((a, i) => a + (Number(i.cant) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
        <Box>
          Registrar factura de compra
          <Box sx={{ display: 'block', color: 'text.disabled', fontSize: '.72rem', fontWeight: 400, mt: '-1px' }}>
            {carrito.length === 0
              ? 'Sin productos cargados'
              : `${carrito.length} ${carrito.length === 1 ? 'ítem' : 'ítems'} · ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`}
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Cerrar">
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>

        {/* ─── Cabecera de la factura ───────────────────────── */}
        <Bloque titulo="Datos de la factura" columnas={4}>
          <Campo label="Proveedor *">
            <Select fullWidth size="small" displayEmpty value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
              <MenuItem value="" disabled>Elegí un proveedor</MenuItem>
              <MenuItem value="Distribuidora Celular Sur">Distribuidora Celular Sur</MenuItem>
              <MenuItem value="Importador Mayorista SA">Importador Mayorista SA</MenuItem>
              <MenuItem value="Accesorios Tech">Accesorios Tech</MenuItem>
            </Select>
          </Campo>
          <Campo label="N° de factura">
            <TextField fullWidth className="mono" placeholder="0001-456"
              value={factura} onChange={(e) => setFactura(e.target.value)}
              slotProps={{ htmlInput: { className: 'mono' } }} />
          </Campo>
          <Campo label="Fecha">
            <TextField fullWidth type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>
          <Campo label="Dólar aplicado">
            <TextField fullWidth type="number" className="mono"
              value={dolar} onChange={(e) => setDolarManual(e.target.value)}
              slotProps={{ htmlInput: { className: 'mono' } }} />
          </Campo>
        </Bloque>

        {/* ─── Carga de producto ────────────────────────────── */}
        <Bloque
          titulo="Producto"
          columnas={4}
          extra={
            <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
              <Typography sx={{ fontSize: '.72rem', color: 'text.secondary' }}>
                {esSerializado ? 'Equipo serializado' : 'Accesorio o repuesto'}
              </Typography>
              <Switch size="small" checked={esSerializado} onChange={handleToggleSerial} />
            </Box>
          }
        >
          <Campo label="Modelo *" span={esSerializado ? 2 : 3}>
            <TextField fullWidth placeholder="Ej: iPhone 13"
              value={prodForm.modelo} onChange={e => handleChangeProd('modelo', e.target.value)} />
          </Campo>

          {esSerializado && (
            <Campo label="IMEI / Serial *" span={2}>
              <TextField fullWidth className="mono"
                value={prodForm.imei} onChange={e => handleChangeProd('imei', e.target.value)}
                slotProps={{ htmlInput: { className: 'mono' } }} />
            </Campo>
          )}

          <Campo label="Color">
            <TextField fullWidth value={prodForm.color} onChange={e => handleChangeProd('color', e.target.value)} />
          </Campo>

          <Campo label="Memoria">
            <Select fullWidth size="small" displayEmpty value={prodForm.memoria}
              onChange={e => handleChangeProd('memoria', e.target.value)}>
              <MenuItem value="">Sin especificar</MenuItem>
              <MenuItem value="64 GB">64 GB</MenuItem>
              <MenuItem value="128 GB">128 GB</MenuItem>
              <MenuItem value="256 GB">256 GB</MenuItem>
            </Select>
          </Campo>

          {esSerializado && (
            <Campo label="Batería">
              <Select fullWidth size="small" value={prodForm.bateria}
                onChange={e => handleChangeProd('bateria', e.target.value)}>
                <MenuItem value="100%">100% (nuevo)</MenuItem>
                <MenuItem value="90% - 99%">90% – 99%</MenuItem>
                <MenuItem value="80% - 89%">80% – 89%</MenuItem>
              </Select>
            </Campo>
          )}

          <Campo label="Estado">
            <Select fullWidth size="small" value={prodForm.estado}
              onChange={e => handleChangeProd('estado', e.target.value)}>
              <MenuItem value="nuevo">Nuevo</MenuItem>
              <MenuItem value="usado">Usado</MenuItem>
            </Select>
          </Campo>

          <Campo label="Costo base (U$S) *">
            <TextField fullWidth type="number" className="mono"
              value={prodForm.costo} onChange={e => handleChangeProd('costo', e.target.value)}
              slotProps={{ htmlInput: { className: 'mono' } }} />
          </Campo>
          <Campo label="Precio mayorista (U$S)">
            <TextField fullWidth type="number" className="mono"
              value={prodForm.mayorista} onChange={e => handleChangeProd('mayorista', e.target.value)}
              slotProps={{ htmlInput: { className: 'mono' } }} />
          </Campo>
          <Campo label="Precio público (U$S)">
            <TextField fullWidth type="number" className="mono"
              value={prodForm.publico} onChange={e => handleChangeProd('publico', e.target.value)}
              slotProps={{ htmlInput: { className: 'mono' } }} />
          </Campo>
          <Campo
            label="Cantidad"
            hint={esSerializado ? 'Los serializados van de a uno' : undefined}
          >
            <TextField fullWidth type="number" className="mono"
              value={prodForm.cant} onChange={e => handleChangeProd('cant', e.target.value)}
              disabled={esSerializado}
              slotProps={{ htmlInput: { className: 'mono' } }} />
          </Campo>

          <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={handleAddCarrito}
              startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}>
              Añadir a la factura
            </Button>
          </Box>
        </Bloque>

        {/* ─── Resumen ──────────────────────────────────────── */}
        <Box>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled', mb: 0.75 }}>Resumen de la factura</Box>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '9px', overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 420 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right" sx={{ width: 64 }}>Cant.</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>Subtotal</TableCell>
                    <TableCell sx={{ width: 52 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrito.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ height: 100, textAlign: 'center', color: 'text.disabled' }}>
                        Todavía no cargaste ningún producto.
                      </TableCell>
                    </TableRow>
                  ) : carrito.map((item, i) => (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>
                          {item.modelo}
                        </Typography>
                        {item.esSerial && item.imei && (
                          <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.65rem' }}>
                            IMEI {item.imei}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" className="num">{item.cant}</TableCell>
                      <TableCell align="right">
                        <Money ars={item.cant * item.costo * dolar} usd={item.cant * item.costo} />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => quitarDelCarrito(i)} aria-label="Quitar producto"
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Campo label="Estado de pago">
            <Select size="small" value={condicion} onChange={e => setCondicion(e.target.value)} sx={{ minWidth: 210 }}>
              <MenuItem value="Pagada">Pagada (contado)</MenuItem>
              <MenuItem value="Adeudada">Cuenta corriente (adeudada)</MenuItem>
            </Select>
          </Campo>

          <Box sx={{
            p: '11px 13px', borderRadius: '9px', bgcolor: 'pc.accentSoft', color: 'primary.main',
            textAlign: 'right', minWidth: 190,
          }}>
            <Box sx={{ typography: 'eyebrow', color: 'inherit', opacity: .75 }}>Total de la factura</Box>
            <Box className="num" sx={{ fontSize: '1.44rem', fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1.1 }}>
              $ {Math.round(totalCarritoARS).toLocaleString('es-AR')}
            </Box>
            <Box className="num" sx={{ fontSize: '.72rem', opacity: .75 }}>
              U$S {totalCarritoUSD.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardarFinal} disabled={carrito.length === 0 || !proveedor}>
          Guardar factura
        </Button>
      </DialogActions>
    </Dialog>
  );
}

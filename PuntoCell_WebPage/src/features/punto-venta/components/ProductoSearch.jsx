import { useState, useEffect, useRef } from 'react';
import { Autocomplete, Box, Button, TextField, Typography, InputAdornment, IconButton, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useVenta } from '../context/VentaContext';
import ImeiScannerModal from '../../../components/modals/ImeiScannerModal';

export const ProductoSearch = ({ inventario = [], onTerminoChange }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [scannerAbierto, setScannerAbierto] = useState(false);
  
  const [toast, setToast] = useState({ open: false, msg: '', severity: 'warning' });
  
  const { agregarAlCarrito, esMayorista, dolarGlobal, resolverPrecios, carrito } = useVenta();

  const carritoRef = useRef(carrito);
  const inventarioRef = useRef(inventario);
  const procesandoRef = useRef(false);

  useEffect(() => { carritoRef.current = carrito; }, [carrito]);
  useEffect(() => { inventarioRef.current = inventario; }, [inventario]);

  const precioDe = (item) => {
    const { minorista, mayorista } = resolverPrecios(item?.Id ?? item?.id);
    return esMayorista ? (mayorista || minorista || 0) : (minorista || 0);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onTerminoChange(inputValue.trim().length > 0 ? inputValue : '');
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  const inventarioDisponible = (inventario || []).filter(item => Number(item.Stock ?? 0) > 0);

  const opciones = inventarioDisponible.map(item => {
    const nombre = item.articulo?.Nombre || 'Sin nombre';
    const precio = precioDe(item);
    const stock = item.Stock ?? 0;
    const serial = !!(item.articulo?.EsSerializado || item.IMEI);
    const detalle = serial
      ? [item.IMEI ? `IMEI ${item.IMEI}` : null, item.estado?.Nombre, item.color?.Nombre, item.memoria?.Capacidad].filter(Boolean).join(' · ')
      : `stock ${stock}`;
    return {
      label: nombre,
      datos: item,
      nombreLimpio: nombre,
      precioLimpio: precio,
      detalle,
      serial,
      id: item.Id || Math.random(),
    };
  });

  const mostrarAlerta = (msg, severity = 'warning') => {
    setToast({ open: true, msg, severity });
  };

  const handleCerrarToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const procesarIngresoDeCodigo = (codigo) => {
    if (!codigo || procesandoRef.current) return;
    procesandoRef.current = true;

    const codigoLimpio = String(codigo).replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase();

    setInputValue(codigoLimpio);
    onTerminoChange(codigoLimpio);

    let intentos = 0;
    const intervalo = setInterval(() => {
      intentos++;

      const encontrado = (inventarioRef.current || []).find(item => {
        const nombre = String(item.articulo?.Nombre || item.nombre || '').toLowerCase();
        const imei = String(item.IMEI || item.imei || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const barras = String(item.articulo?.CodigoBarras || item.articulo?.codigoBarras || item.codigoBarras || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        return (
          nombre.includes(codigoLimpio) || 
          (imei === codigoLimpio && imei !== '') || 
          (barras === codigoLimpio && barras !== '')
        );
      });

      if (encontrado) {
        clearInterval(intervalo);
        procesandoRef.current = false;
        
        // 🔥 VALIDACIÓN INFALIBLE POR ID: Verificamos si el ID del producto ya está en el carrito
        const idEncontrado = encontrado.Id || encontrado.id;
        const yaEstaEnCarrito = (carritoRef.current || []).some(c => (c.Id || c.id) === idEncontrado);

        if (yaEstaEnCarrito) {
          mostrarAlerta('El equipo ya se encuentra cargado en el carrito de esta venta.', 'warning');
        } else if (Number(encontrado.Stock ?? 0) <= 0) {
          mostrarAlerta('El producto se encontró, pero figura sin stock disponible en esta sucursal.', 'error');
        } else {
          agregarAlCarrito(encontrado);
        }
        
        setInputValue('');
        onTerminoChange('');
        setSelectedProduct(null);
      } 
      else if (intentos >= 10) {
        clearInterval(intervalo);
        procesandoRef.current = false;
        mostrarAlerta(`El código "${codigoLimpio}" no se encuentra registrado en esta sucursal.`, 'error');
        setInputValue('');
        onTerminoChange('');
      }
    }, 100);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    procesarIngresoDeCodigo(inputValue.trim());
  };

  const handleAgregar = () => {
    if (!selectedProduct) return;

    // Validamos también al agregar manualmente con el botón
    const idSeleccionado = selectedProduct.Id || selectedProduct.id;
    const yaEstaEnCarrito = (carrito || []).some(c => (c.Id || c.id) === idSeleccionado);

    if (yaEstaEnCarrito) {
      mostrarAlerta('El equipo ya se encuentra cargado en el carrito de esta venta.', 'warning');
    } else {
      agregarAlCarrito(selectedProduct);
    }
    
    setSelectedProduct(null);
    setInputValue('');
  };

  const precioUsd = selectedProduct ? precioDe(selectedProduct) : 0;
  const precioArs = precioUsd * (dolarGlobal || 0);

  return (
    <>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) 150px auto' },
        gap: 1.25,
        alignItems: 'end',
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Producto o IMEI</Box>
          <Autocomplete
            freeSolo
            options={opciones}
            inputValue={inputValue}
            onInputChange={(e, value) => setInputValue(value)}
            onChange={(e, option) => option && setSelectedProduct(option.datos)}
            renderOption={(props, option) => {
              const { key: _key, ...rest } = props;
              return (
                <li key={option.id} {...rest}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '.8125rem' }}>
                      {option.nombreLimpio}{option.serial && ' 📱'}
                    </Typography>
                    <Typography className="mono" sx={{ color: 'text.disabled', fontSize: '.69rem' }}>
                      U$S {option.precioLimpio} · {option.detalle}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Escribí el nombre o escaneá el IMEI"
                fullWidth
                onKeyDown={handleKeyDown}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {params.InputProps.endAdornment}
                      <InputAdornment position="end">
                        <IconButton color="primary" onClick={() => setScannerAbierto(true)} sx={{ mr: 1 }}>
                          <QrCodeScannerIcon />
                        </IconButton>
                      </InputAdornment>
                    </>
                  )
                }}
              />
            )}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
          <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Precio unitario</Box>
          <Box sx={{
            height: 32, px: 1.25, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            border: 1, borderColor: 'divider', borderRadius: '7px', bgcolor: 'pc.surfaceMuted',
          }}>
            {precioUsd ? (
              <>
                <Box className="num" sx={{ fontSize: '.78rem', fontWeight: 600, lineHeight: 1.1 }}>
                  U$S {precioUsd}
                </Box>
                <Box className="num" sx={{ fontSize: '.63rem', color: 'text.disabled', lineHeight: 1.1 }}>
                  $ {Math.round(precioArs).toLocaleString('es-AR')}
                </Box>
              </>
            ) : (
              <Box sx={{ fontSize: '.78rem', color: 'text.disabled' }}>—</Box>
            )}
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={handleAgregar}
          disabled={!selectedProduct}
          startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
        >
          Agregar
        </Button>
      </Box>

      <ImeiScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onScanSuccess={(codigoEscaneado) => {
          procesarIngresoDeCodigo(codigoEscaneado);
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCerrarToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }} 
      >
        <Alert 
          onClose={handleCerrarToast} 
          severity={toast.severity} 
          variant="filled" 
          sx={{ width: '100%', boxShadow: 3, fontWeight: 500 }}
        >
          {toast.msg}
        </Alert>
      </Snackbar>
    </>
  );
};
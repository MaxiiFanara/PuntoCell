import { useState, useEffect } from 'react';
import { Autocomplete, Box, Button, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useVenta } from '../context/VentaContext';

export const ProductoSearch = ({ inventario = [], onTerminoChange }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const { agregarAlCarrito, esMayorista, dolarGlobal, resolverPrecios } = useVenta();

  // Precio de venta de un renglón de inventario según el modo (mayorista/minorista).
  // Se resuelve del PrecioArticulo vigente (VentaContext.resolverPrecios), NO de campos
  // sueltos en el item — el modelo de precios vive en ListaPrecio/PrecioArticulo.
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

  // Solo mostrar/permitir agregar productos con Stock > 0: una fila en 0 ya fue vendida (o no
  // tiene stock) y no debería poder agregarse de nuevo al carrito, sobre todo tratándose de un
  // producto serializado (IMEI) que es de a una sola unidad.
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

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const codigo = inputValue.trim();
    if (!codigo) return;

    const encontrado = inventarioDisponible.find(item => {
      const nombre = (item.articulo?.Nombre || '').toLowerCase();
      const imei = (item.IMEI || '');
      return nombre.includes(codigo.toLowerCase()) || imei === codigo;
    });

    if (encontrado) {
      agregarAlCarrito(encontrado);
      setInputValue('');
      setSelectedProduct(null);
    } else {
      alert('⚠️ El IMEI o producto no se encuentra en el stock de esta sucursal.');
    }
  };

  const handleAgregar = () => {
    if (!selectedProduct) return;
    agregarAlCarrito(selectedProduct);
    setSelectedProduct(null);
    setInputValue('');
  };

  const precioUsd = selectedProduct ? precioDe(selectedProduct) : 0;
  const precioArs = precioUsd * (dolarGlobal || 0);

  return (
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
                $ {Math.round(precioArs).toLocaleString('es-AR')}
              </Box>
              <Box className="num" sx={{ fontSize: '.63rem', color: 'text.disabled', lineHeight: 1.1 }}>
                U$S {precioUsd}
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
  );
};

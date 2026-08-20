import { useState, useEffect } from 'react'; 
import {
  Autocomplete, TextField, Button,
  Box, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useVenta } from '../context/VentaContext';

export const ProductoSearch = ({ inventario = [], onTerminoChange }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const { agregarAlCarrito, esMayorista } = useVenta();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (inputValue.trim().length > 0) {
        onTerminoChange(inputValue);
      } else {
        onTerminoChange(""); 
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [inputValue]);

  // Solo mostrar/permitir agregar productos con Stock > 0: una fila en 0 ya fue vendida (o no
  // tiene stock) y no debería poder agregarse de nuevo al carrito, sobre todo tratándose de un
  // producto serializado (IMEI) que es de a una sola unidad.
  const inventarioDisponible = (inventario || []).filter(item => Number(item.Stock ?? 0) > 0);

  const opciones = inventarioDisponible.map(item => {
    const nombre = item.articulo?.Nombre || 'Sin nombre';
    const precio = esMayorista ? (item.PrecioMayor || item.PrecioMenor || 0) : (item.PrecioMenor || 0);
    const stock = item.Stock ?? 0;
    const idUnico = item.Id || Math.random();

    return {
      label: `${nombre} - U$S ${precio} (Stock: ${stock})`,
      value: nombre,
      datos: item,
      nombreLimpio: nombre,
      precioLimpio: precio,
      stockLimpio: stock,
      id: idUnico
    };
  });

  const handleSelect = (event, option) => {
    if (option) setSelectedProduct(option.datos);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const codigo = inputValue.trim();
      if (!codigo) return;

      const encontrado = inventarioDisponible.find(item => {
        const nombre = (item.articulo?.Nombre || "").toLowerCase();
        const imei = (item.IMEI || "");
        return nombre.includes(codigo.toLowerCase()) || imei === codigo;
      });

      if (encontrado) {
        agregarAlCarrito(encontrado);
        setInputValue('');
        setSelectedProduct(null);
      } else {
        alert("⚠️ El IMEI o producto no se encuentra en el stock de esta sucursal.");
      }
    }
  };

  const handleAgregar = () => {
    if (selectedProduct) {
      agregarAlCarrito(selectedProduct);
      setSelectedProduct(null);
      setInputValue('');
    }
  };

  const precioBase = selectedProduct?.PrecioMenor || 0;
  const precioMayor = selectedProduct?.PrecioMayor || precioBase;
  const precioMostrado = esMayorista ? precioMayor : precioBase;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-end' }}>
      <Box sx={{ flex: 1, width: '100%' }}>
        <Autocomplete
          freeSolo
          options={opciones}
          inputValue={inputValue}
          onInputChange={(e, value) => setInputValue(value)}
          onChange={handleSelect}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {option.nombreLimpio}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  U$S {option.precioLimpio} | Stock: {option.stockLimpio}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Buscar Producto"
              placeholder="Escribí nombre, modelo o escaneá IMEI..."
              fullWidth
              size="small"
              onKeyDown={handleKeyDown}
              sx={{ bgcolor: 'white' }}
            />
          )}
        />
      </Box>

      <TextField 
        label="Precio Unit." 
        value={precioMostrado ? `U$S ${precioMostrado}` : ''} 
        InputProps={{ readOnly: true }} 
        size="small" 
        sx={{ width: { xs: '100%', md: 160 }, bgcolor: 'white' }} 
      />

      <Button 
        variant="contained" 
        onClick={handleAgregar} 
        disabled={!selectedProduct} 
        startIcon={<AddIcon />} 
        sx={{ bgcolor: '#1976d2', borderRadius: 2, height: 40 }}
      >
        AGREGAR
      </Button>
    </Box>
  );
};
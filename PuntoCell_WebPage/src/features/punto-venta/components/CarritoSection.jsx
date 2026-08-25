import { useState } from 'react';
import {
  Card, CardContent, Table, TableBody, TableCell, TableHead,
  TableRow, IconButton, Box, Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useVenta } from '../context/VentaContext';
import { ProductoSearch } from './ProductoSearch';

export const CarritoSection = ({ onBuscar }) => {
  const { carrito, eliminarDelCarrito } = useVenta();
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  const handleEjecutarBusqueda = async (termino) => {
    if (!termino) {
      setResultadosBusqueda([]);
      return;
    }
    const data = await onBuscar(termino);
    setResultadosBusqueda(data || []);
  };

  return (
    <Card elevation={3} sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      
      <Box sx={{ bgcolor: 'grey.700', color: 'white', px: 3, py: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <ShoppingCartIcon /> Carrito de Compras
        </Typography>
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, '&:last-child': { pb: 3 } }}>
        
        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 3, flexShrink: 0 }}>
          <ProductoSearch 
            inventario={resultadosBusqueda} 
            onTerminoChange={handleEjecutarBusqueda} 
          />
        </Box>

        <Box sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 3, flex: 1, overflow: 'auto', bgcolor: 'white' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Precio</TableCell>
                <TableCell align="center" sx={{ width: 80 }}>Cant.</TableCell>
                <TableCell align="right" sx={{ width: 100 }}>Subtotal</TableCell>
                <TableCell sx={{ width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {carrito.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                    No hay productos en el carrito
                  </TableCell>
                </TableRow>
              ) : (
                carrito.map((item, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{ '&:nth-of-type(even)': { bgcolor: 'grey.50' } }}
                  >
                    <TableCell>{item.NombreProducto}</TableCell>
                    <TableCell align="right">
                      U$S {item.PrecioUnitario.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <Box component="span" sx={{ fontWeight: 'bold', bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 1 }}>
                        {item.Cantidad}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      U$S {item.Subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => eliminarDelCarrito(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </CardContent>
    </Card>
  );
};
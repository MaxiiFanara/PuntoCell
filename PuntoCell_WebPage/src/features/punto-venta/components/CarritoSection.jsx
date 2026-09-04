import { useState } from 'react';
import {
  Box, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useVenta } from '../context/VentaContext';
import { ProductoSearch } from './ProductoSearch';
import Money from '../../../components/ui/Money';

export const CarritoSection = ({ onBuscar }) => {
  const { carrito, eliminarDelCarrito, dolarGlobal } = useVenta();
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  const handleEjecutarBusqueda = async (termino) => {
    if (!termino) {
      setResultadosBusqueda([]);
      return;
    }
    const data = await onBuscar(termino);
    setResultadosBusqueda(data || []);
  };

  const ars = (usd) => usd * (dolarGlobal || 0);
  const unidades = carrito.reduce((a, i) => a + (Number(i.Cantidad) || 0), 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>

      {/* Buscador: es la acción principal de la pantalla, va arriba y solo. */}
      <Paper sx={{ p: '13px 15px' }}>
        <ProductoSearch inventario={resultadosBusqueda} onTerminoChange={handleEjecutarBusqueda} />
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
          p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
        }}>
          <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>Carrito</Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: '.72rem' }}>
            {carrito.length} {carrito.length === 1 ? 'ítem' : 'ítems'} · {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
          </Typography>
        </Box>

        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="right" sx={{ width: 130 }}>P. unitario</TableCell>
                <TableCell align="center" sx={{ width: 70 }}>Cant.</TableCell>
                <TableCell align="right" sx={{ width: 140 }}>Subtotal</TableCell>
                <TableCell sx={{ width: 52 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {carrito.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ height: 160, textAlign: 'center', color: 'text.disabled' }}>
                    El carrito está vacío. Buscá un producto o escaneá un IMEI para empezar.
                  </TableCell>
                </TableRow>
              ) : (
                carrito.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 600, letterSpacing: '-.01em' }}>
                      {item.NombreProducto}
                      {item.IMEI && (
                        <Box className="mono" sx={{ color: 'text.disabled', fontSize: '.65rem', fontWeight: 400 }}>
                          IMEI {item.IMEI}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Money ars={ars(item.PrecioUnitario)} usd={item.PrecioUnitario} size="sm" />
                    </TableCell>
                    <TableCell align="center" className="num" sx={{ fontWeight: 600 }}>
                      {item.Cantidad}
                    </TableCell>
                    <TableCell align="right">
                      <Money ars={ars(item.Subtotal)} usd={item.Subtotal} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Quitar del carrito">
                        <IconButton
                          size="small"
                          onClick={() => eliminarDelCarrito(index)}
                          aria-label={`Quitar ${item.NombreProducto}`}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

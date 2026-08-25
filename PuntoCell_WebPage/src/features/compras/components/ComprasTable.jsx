import React from 'react';
import { Card, Box, TextField, Select, MenuItem, Button, Table, TableHead, TableBody, TableRow, TableCell, Chip } from '@mui/material';

const formatoMoneda = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ComprasTable({ compras, onVerDetalle }) {
  return (
    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px -3px rgba(15,23,41,.08)' }}>
      {/* Filtros */}
      <Box sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid #eef2f8', bgcolor: '#f8fafd', flexWrap: 'wrap', alignItems: 'center' }}>
        
        <TextField 
          size="small" 
          placeholder="Buscar proveedor o factura..." 
          sx={{ bgcolor: 'white', minWidth: 250 }} 
        />
        
        <Select size="small" defaultValue="Todos" sx={{ bgcolor: 'white', minWidth: 150 }}>
          <MenuItem value="Todos">Todos los estados</MenuItem>
          <MenuItem value="Pagadas">Pagadas</MenuItem>
          <MenuItem value="Adeudadas">Adeudadas</MenuItem>
        </Select>

        {/* Filtros de Fecha */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField 
            type="date" 
            size="small"
            title="Desde"
            sx={{ bgcolor: 'white', width: 140 }} 
          />
          <Box sx={{ color: '#8695ad', fontWeight: 'bold' }}>—</Box>
          <TextField 
            type="date" 
            size="small"
            title="Hasta"
            sx={{ bgcolor: 'white', width: 140 }} 
          />
        </Box>

        <Button 
          variant="outlined" 
          sx={{ borderColor: '#e2e8f2', color: '#52607a', textTransform: 'none', '&:hover': { bgcolor: 'white' } }}
        >
          Limpiar
        </Button>

        <Button 
          variant="contained" 
          sx={{ bgcolor: '#2456d6', textTransform: 'none', ml: 'auto' }}
        >
          Filtrar
        </Button>
        
      </Box>

      {/* Tabla */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafd' }}>
            <TableRow>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>ID / Comprobante</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }}>Proveedor</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="right">Total (USD / ARS)</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Estado</TableCell>
              <TableCell sx={{ color: '#8695ad', fontWeight: 'bold' }} align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {compras.map((compra) => (
              <TableRow key={compra.id} hover>
                <TableCell>
                  <Box sx={{ fontWeight: 600 }}>{compra.factura}</Box>
                  <Box sx={{ fontSize: 11, color: '#8695ad', fontFamily: 'monospace' }}>#{compra.id}</Box>
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{compra.fecha}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{compra.proveedor}</TableCell>
                <TableCell align="right">
                  <Box sx={{ fontWeight: 700, fontFamily: 'monospace' }}>U$S {formatoMoneda(compra.totalUSD)}</Box>
                  <Box sx={{ fontSize: 11, color: '#52607a', fontFamily: 'monospace' }}>ARS $ {formatoMoneda(compra.totalARS)}</Box>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={compra.condicion} 
                    size="small"
                    sx={{ 
                      bgcolor: compra.condicion === 'Pagada' ? '#e2f4ed' : '#fdf1de', 
                      color: compra.condicion === 'Pagada' ? '#0e7a56' : '#9c5f07',
                      fontWeight: 700, borderRadius: '4px'
                    }} 
                  />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => onVerDetalle(compra)} sx={{ textTransform: 'none', color: '#52607a' }}>Ver Detalle</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}
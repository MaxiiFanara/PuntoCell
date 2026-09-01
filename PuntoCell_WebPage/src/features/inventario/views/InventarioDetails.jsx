import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, CircularProgress, Box, Typography, Paper } from '@mui/material';
import {
  Info, ArrowBack, Smartphone, MonetizationOn, Storefront,
  CalendarToday, ShoppingCart, Receipt, BatteryChargingFull, Sync, Warning
} from '@mui/icons-material';
import { inventarioService } from '../../../services/inventarioServices';
import { preciosService, mapVigentePorInventario, idsListasMayoristas, resolverPrecioInventario } from '../../../services/preciosServices';

const InventarioDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [ventaAsociada, setVentaAsociada] = useState(null);
  const [cargando, setCargando] = useState(true);
  const isAdmin = true;

  useEffect(() => {
    const fetchDetalle = async () => {
      try {
        setCargando(true);
        const [res, preciosArticulos, listas] = await Promise.all([
          inventarioService.getById(id),
          preciosService.getPreciosArticulos().catch(() => []),
          preciosService.getListas().catch(() => []),
        ]);
        const data = res.data || res;
        const art = data.articulo || data.Articulo || {};
        const idInv = data.Id || data.id;

        // Precio de venta vigente (modelo nuevo: PrecioArticulo), por cualquier lista.
        const mapa = mapVigentePorInventario(preciosArticulos);
        const listasMay = idsListasMayoristas(listas);
        const { minorista, mayorista, costoBase } = resolverPrecioInventario(mapa, idInv, listasMay);
        const nombreLista = (lid) => (listas.find((l) => (l.Id ?? l.id) === lid)?.Nombre) || `Lista #${lid}`;
        const otras = Object.entries(mapa[idInv] || {})
          .filter(([lid]) => listasMay.includes(Number(lid)))
          .map(([lid, p]) => ({ lista: nombreLista(Number(lid)), valorFinal: Number(p.ValorFinal) || 0 }));

        setItem({
          id: idInv,
          producto: art.Nombre || 'Equipo sin nombre',
          modelo: art.modelo?.Nombre || '---',
          imei: data.IMEI || null,
          color: data.color?.Nombre || 'N/A',
          memoria: data.memoria?.Capacidad || 'N/A',
          bateria: null,
          ciclos: null,
          observaciones: data.Observaciones,
          costoBase,
          precioMenor: minorista || mayorista || 0,
          preciosOtrasListas: otras,
          sucursal: data.sucursal?.Nombre || 'Sin asignar',
          stock: data.Stock || 0,
          createdAt: data.CreatedAt ? new Date(data.CreatedAt).toLocaleString() : '---'
        });
      } catch (error) {
        console.error("Error al cargar detalle:", error);
      } finally {
        setCargando(false);
      }
    };
    if (id) fetchDetalle();
  }, [id]);

  if (cargando) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <CircularProgress />
      <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 'bold' }}>Buscando en Punto Cell...</Typography>
    </Box>
  );

  if (!item) return <Box sx={{ p: 5, textAlign: 'center', color: 'error.main', fontWeight: 'bold', mt: 10 }}>Error: Producto no encontrado.</Box>;

  const colorBateria = item.bateria > 80 ? "success" : item.bateria > 50 ? "warning" : "error";

  const labelStyles = { fontSize: '0.625rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: '1024px', mx: 'auto', mb: 5 }}>

        <Paper elevation={2} sx={{ borderRadius: 4, overflow: 'hidden', border: 'none' }}>
          <Box sx={{ bgcolor: '#0f172a', color: 'white', px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info /> Ficha Técnica #{item.id}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained" size="small" startIcon={<ArrowBack />}
                onClick={() => navigate('/app/inventario')}
                sx={{ bgcolor: 'white', color: '#0f172a', fontWeight: 'bold', '&:hover': { bgcolor: '#e2e8f0' } }}
              >
                Volver
              </Button>
            </Box>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* 1. SECCIÓN DISPOSITIVO */}
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.75rem', mb: 2, borderBottom: '1px solid #f1f5f9', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Smartphone fontSize="small" /> Dispositivo / Hardware
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'flex-start' }}>
                <Box sx={{ display: { xs: 'none', md: 'block' }, bgcolor: '#f8fafc', borderRadius: 4, p: 4, color: '#cbd5e1', border: '1px solid #f1f5f9' }}>
                  <Smartphone sx={{ fontSize: 80 }} />
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, flex: 1, width: '100%' }}>
                  <Box sx={{ gridColumn: { md: 'span 2' } }}>
                    <Typography sx={labelStyles}>Nombre del Equipo</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary' }}>{item.producto}</Typography>
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{item.modelo}</Typography>
                  </Box>
                  
                  <Box sx={{ gridColumn: { md: 'span 2' } }}>
                    <Typography sx={labelStyles}>IMEI Registrado</Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontFamily: 'monospace', color: 'primary.main', fontWeight: 'bold', mt: 0.5, letterSpacing: '-0.025em' }}>
                      {item.imei || "--- NO POSEE ---"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography sx={labelStyles}>Color</Typography>
                    <Box component="span" sx={{ px: 1.5, py: 0.5, bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 1, fontSize: '0.875rem', fontWeight: 'bold', color: 'text.primary' }}>🎨 {item.color}</Box>
                  </Box>
                  
                  <Box>
                    <Typography sx={labelStyles}>Memoria</Typography>
                    <Box component="span" sx={{ px: 1.5, py: 0.5, bgcolor: '#1e293b', color: 'white', borderRadius: 1, fontSize: '0.875rem', fontWeight: 'bold' }}>💾 {item.memoria}</Box>
                  </Box>
                  
                  <Box>
                    <Typography sx={labelStyles}>Salud Batería</Typography>
                    {item.bateria !== null ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BatteryChargingFull color={colorBateria} />
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{item.bateria}%</Typography>
                      </Box>
                    ) : <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>N/A</Typography>}
                  </Box>
                  
                  <Box>
                    <Typography sx={labelStyles}>Ciclos de Carga</Typography>
                    {item.ciclos !== null ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.primary', fontWeight: 'bold' }}>
                        <Sync fontSize="small" sx={{ color: 'text.disabled' }} /> {item.ciclos} cy
                      </Box>
                    ) : <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>N/A</Typography>}
                  </Box>
                </Box>
              </Box>

              {item.observaciones && (
                <Box sx={{ mt: 3, bgcolor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 3, p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Warning sx={{ color: '#f59e0b' }} fontSize="small" />
                    <Typography sx={{ fontSize: '0.625rem', fontWeight: 'bold', color: '#b45309', textTransform: 'uppercase' }}>Detalles Estéticos / Técnicos</Typography>
                  </Box>
                  <Typography sx={{ color: 'text.primary', fontSize: '0.875rem', fontStyle: 'italic' }}>"{item.observaciones}"</Typography>
                </Box>
              )}
            </Box>

            {/* 2. SECCIÓN LISTA DE PRECIOS */}
            <Box sx={{ bgcolor: '#f8fafc', borderRadius: 4, border: '1px solid #e2e8f0', p: 3, mb: 4 }}>
              <Typography sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.75rem', mb: 2, borderBottom: '1px solid #e2e8f0', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MonetizationOn fontSize="small" /> Valores de Mercado
              </Typography>
              
              {item.precioMenor === 0 && item.preciosOtrasListas.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.875rem' }}>
                  Sin precio de venta vigente. Cargá uno desde la pantalla de Precios.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, textAlign: 'center' }}>
                  {isAdmin && (
                    <Box>
                      <Typography sx={labelStyles}>Costo Base</Typography>
                      <Typography sx={{ color: 'text.secondary', fontWeight: 'bold', fontSize: '1.25rem', mt: 0.5 }}>U$S {item.costoBase.toLocaleString()}</Typography>
                    </Box>
                  )}
                  {item.preciosOtrasListas.map((p) => (
                    <Box key={p.lista}>
                      <Typography sx={labelStyles}>{p.lista}</Typography>
                      <Typography sx={{ color: 'text.primary', fontWeight: 'bold', fontSize: '1.25rem', mt: 0.5 }}>U$S {p.valorFinal.toLocaleString()}</Typography>
                    </Box>
                  ))}
                  <Box>
                    <Typography sx={{ ...labelStyles, color: '#10b981', fontStyle: 'italic' }}>Precio Público (Minorista)</Typography>
                    <Typography sx={{ color: '#059669', fontWeight: 900, fontSize: '1.875rem', mt: 0.5 }}>U$S {item.precioMenor.toLocaleString()}</Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* 3. SECCIÓN UBICACIÓN */}
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ bgcolor: '#eff6ff', p: 1.5, borderRadius: 2, color: 'primary.main' }}><Storefront /></Box>
                  <Box>
                    <Typography sx={labelStyles}>Ubicación Actual</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '1.125rem' }}>{item.sucursal}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, fontWeight: 'bold', bgcolor: item.stock > 0 ? '#d1fae5' : '#fee2e2', color: item.stock > 0 ? '#065f46' : '#991b1b' }}>
                    {item.stock} UN.
                  </Box>
                  <Box>
                    <Typography sx={labelStyles}>Estado del Stock</Typography>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{item.stock > 0 ? "Disponible para venta" : "Sin unidades"}</Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ textAlign: 'right', mt: 5, fontSize: '0.625rem', color: 'text.secondary', fontStyle: 'italic', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, borderTop: '1px solid #f1f5f9', pt: 2 }}>
                <CalendarToday fontSize="inherit" /> Registrado: {item.createdAt}
              </Box>
            </Box>

          </Box>
        </Paper>

        {/* --- SECCIÓN VENTA --- */}
        {item.stock === 0 && ventaAsociada && (
          <Box sx={{ mt: 3, bgcolor: 'background.paper', borderLeft: '4px solid #f97316', boxShadow: 1, borderRadius: 3, p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ bgcolor: '#fff7ed', p: 1.5, borderRadius: '50%', color: '#f97316' }}>
              <ShoppingCart fontSize="large" />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 'bold', color: 'text.primary' }}>Producto Vendido</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                Vendido el <strong>{ventaAsociada.fecha}</strong> a <strong>{ventaAsociada.clienteNombre}</strong>.
              </Typography>
            </Box>
            <Button 
              variant="contained" size="small" startIcon={<Receipt />} 
              onClick={() => navigate(`/app/ventas/detalle/${ventaAsociada.idTicket}`)}
              sx={{ bgcolor: '#1e293b', fontWeight: 'bold' }}
            >
              VER TICKET
            </Button>
          </Box>
        )}

      </Box>
    </Box>
  );
};

export default InventarioDetails;
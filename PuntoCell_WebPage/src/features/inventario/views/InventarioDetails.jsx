import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { inventarioService } from '../../../services/inventarioServices';
import { preciosService, mapVigentePorInventario, idsListasMayoristas, resolverPrecioInventario } from '../../../services/preciosServices';
import { useVenta } from '../../punto-venta/context/VentaContext';

import StatusPill from '../../../components/ui/StatusPill';
import Money from '../../../components/ui/Money';

const tonoStock = (stock) => (stock === 0 ? 'late' : stock <= 2 ? 'due' : 'ok');

const Spec = ({ children, mono }) => (
  <Box
    component="span"
    className={mono ? 'mono' : undefined}
    sx={{
      display: 'inline-flex', alignItems: 'center', height: 19, px: '7px',
      borderRadius: '5px', bgcolor: 'pc.surfaceMuted',
      border: 1, borderColor: 'pc.dividerSoft',
      color: mono ? 'text.disabled' : 'text.secondary',
      fontSize: '.65rem', fontWeight: 500, whiteSpace: 'nowrap',
    }}
  >
    {children}
  </Box>
);

const Tarjeta = ({ titulo, extra, children }) => (
  <Paper sx={{ overflow: 'hidden' }}>
    {titulo && (
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
        p: '12px 15px', borderBottom: 1, borderColor: 'pc.dividerSoft',
      }}>
        <Typography sx={{ fontWeight: 600, fontSize: '.84rem', letterSpacing: '-.01em' }}>{titulo}</Typography>
        {extra}
      </Box>
    )}
    {children}
  </Paper>
);

const Fila = ({ label, children, primero }) => (
  <Box sx={{
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1.5,
    p: '9px 15px', fontSize: '.78rem',
    borderTop: primero ? 0 : 1, borderColor: 'pc.dividerSoft',
  }}>
    <Box sx={{ color: 'text.disabled' }}>{label}</Box>
    {children}
  </Box>
);

const InventarioDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dolarGlobal } = useVenta();

  const [item, setItem] = useState(null);
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
          modelo: art.modelo?.Nombre || '',
          imei: data.IMEI || null,
          color: data.color?.Nombre || null,
          memoria: data.memoria?.Capacidad || null,
          bateria: null,
          observaciones: data.Observaciones,
          costoBase,
          precioMenor: minorista || mayorista || 0,
          precioMayor: mayorista || 0,
          preciosOtrasListas: otras,
          sucursal: data.sucursal?.Nombre || 'Sin asignar',
          stock: data.Stock || 0,
          createdAt: data.CreatedAt ? new Date(data.CreatedAt).toLocaleString('es-AR') : '—',
        });
      } catch (error) {
        console.error("Error al cargar detalle:", error);
      } finally {
        setCargando(false);
      }
    };
    if (id) fetchDetalle();
  }, [id]);

  if (cargando) {
    return <Box sx={{ p: 5, textAlign: 'center', color: 'text.disabled' }}>Cargando ficha…</Box>;
  }
  if (!item) {
    return <Box sx={{ p: 5, textAlign: 'center', color: 'error.main' }}>No se encontró el producto.</Box>;
  }

  const ars = (usd) => (dolarGlobal > 0 ? usd * dolarGlobal : 0);
  const sinPrecio = item.precioMenor === 0 && item.preciosOtrasListas.length === 0;

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>

      <Button
        onClick={() => navigate('/app/inventario')}
        startIcon={<ArrowBack sx={{ fontSize: '16px !important' }} />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Inventario
      </Button>

      {/* ─── Encabezado ─────────────────────────────────────── */}
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Ficha de inventario</Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.375, mt: '2px' }}>
          <Typography variant="h4" component="h1">{item.producto}</Typography>
          <StatusPill tone={tonoStock(item.stock)} label={`${item.stock} un.`} />
        </Box>
        <Typography className="mono" sx={{ mt: '1px', fontSize: '.78rem', color: 'text.secondary' }}>
          #{item.id}{item.modelo && ` · ${item.modelo}`}
        </Typography>
      </Box>

      {/* ─── Franja de datos ────────────────────────────────── */}
      <Paper sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' },
        overflow: 'hidden',
      }}>
        {[
          { label: 'IMEI',      val: item.imei || 'No posee', mono: true },
          { label: 'Ubicación', val: item.sucursal },
          { label: 'Stock',     val: item.stock > 0 ? 'Disponible para venta' : 'Sin unidades' },
          { label: 'Registrado', val: item.createdAt, mono: true },
        ].map((m, i) => (
          <Box key={m.label} sx={{
            p: '12px 15px',
            borderLeft: { xs: i % 2 === 0 ? 0 : 1, md: i === 0 ? 0 : 1 },
            borderColor: 'pc.dividerSoft',
          }}>
            <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>{m.label}</Box>
            <Typography className={m.mono ? 'mono' : undefined}
              sx={{ fontWeight: 600, fontSize: '.84rem', mt: '3px', letterSpacing: '-.01em' }}>
              {m.val}
            </Typography>
          </Box>
        ))}
      </Paper>

      {/* ─── Cuerpo ─────────────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) 320px' }, gap: 2, alignItems: 'start' }}>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>
          <Tarjeta titulo="Características">
            <Box sx={{ p: '13px 15px', display: 'flex', alignItems: 'center', gap: 0.625, flexWrap: 'wrap' }}>
              {item.modelo && <Spec>{item.modelo}</Spec>}
              {item.color && <Spec>{item.color}</Spec>}
              {item.memoria && <Spec>{item.memoria}</Spec>}
              {item.bateria != null && <Spec>Batería {item.bateria}%</Spec>}
              {item.imei && <Spec mono>IMEI {item.imei}</Spec>}
              {!item.modelo && !item.color && !item.memoria && !item.imei && (
                <Typography sx={{ color: 'text.disabled', fontSize: '.78rem' }}>
                  Sin características cargadas.
                </Typography>
              )}
            </Box>
          </Tarjeta>

          {item.observaciones && (
            <Tarjeta titulo="Observaciones">
              <Typography sx={{ p: '12px 15px', color: 'text.secondary', fontSize: '.78rem', lineHeight: 1.55 }}>
                {item.observaciones}
              </Typography>
            </Tarjeta>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}>
          <Tarjeta titulo="Precios">
            {sinPrecio ? (
              <Typography sx={{ p: '13px 15px', color: 'text.disabled', fontSize: '.78rem', lineHeight: 1.55 }}>
                Sin precio de venta vigente. Cargá uno desde la pantalla de Precios.
              </Typography>
            ) : (
              <>
                <Box sx={{ p: '13px 15px 11px' }}>
                  <Box sx={{ typography: 'eyebrow', color: 'text.disabled' }}>Precio público (minorista)</Box>
                  <Money ars={ars(item.precioMenor)} usd={item.precioMenor} align="left" size="lg" />
                </Box>
                {isAdmin && (
                  <Fila label="Costo base">
                    <Money ars={ars(item.costoBase)} usd={item.costoBase} size="sm" />
                  </Fila>
                )}
                {item.preciosOtrasListas.map((p) => (
                  <Fila key={p.lista} label={p.lista}>
                    <Money ars={ars(p.valorFinal)} usd={p.valorFinal} size="sm" />
                  </Fila>
                ))}
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Ubicación y stock">
            <Fila label="Sucursal" primero>
              <Box sx={{ fontWeight: 600 }}>{item.sucursal}</Box>
            </Fila>
            <Fila label="Unidades">
              <StatusPill tone={tonoStock(item.stock)} label={`${item.stock} un.`} />
            </Fila>
            <Fila label="Registrado">
              <Box className="mono" sx={{ fontWeight: 600 }}>{item.createdAt}</Box>
            </Fila>
          </Tarjeta>
        </Box>
      </Box>
    </Box>
  );
};

export default InventarioDetails;

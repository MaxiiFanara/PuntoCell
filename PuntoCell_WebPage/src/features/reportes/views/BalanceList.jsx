import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip } from '@mui/material';

// Importaciones DIRECTAS Y SEGURAS de iconos (Sin desestructuración masiva para evitar fallos de Vite)
import AccountBalance from '@mui/icons-material/AccountBalance';
import FilterAlt from '@mui/icons-material/FilterAlt';
import Wallet from '@mui/icons-material/Wallet';
import Payments from '@mui/icons-material/Payments';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import CreditCard from '@mui/icons-material/CreditCard';
import Receipt from '@mui/icons-material/Receipt';
import Visibility from '@mui/icons-material/Visibility';
import Event from '@mui/icons-material/Event';

const BalanceList = () => {
  const navigate = useNavigate();

  // --- ESTADOS: FECHAS ---
  const [fechas, setFechas] = useState({
    desde: '2026-05-01',
    hasta: '2026-05-15'
  });

  // --- MOCK DATA: KPIs Principales (En el futuro esto vendrá de tu API) ---
  const kpis = {
    gananciaNeta: 4250.50,
    facturacionTotal: 12500.00,
    ticketPromedio: 125.00,
    margenGlobal: 34
  };

  const metodosPago = {
    efectivo: 4500.00,
    transferencia: 6000.00,
    tarjeta: 2000.00
  };

  // --- MOCK DATA: Tabla Principal de Balance Diario ---
  const [balanceDiario] = useState([
    { id: 1, fecha: '15/05/2026', cantVentas: 12, totalIngreso: 1500, totalCosto: 950, gananciaNeta: 550, margen: 36, ticketPromedio: 125 },
    { id: 2, fecha: '14/05/2026', cantVentas: 8, totalIngreso: 900, totalCosto: 600, gananciaNeta: 300, margen: 33, ticketPromedio: 112 },
    { id: 3, fecha: '13/05/2026', cantVentas: 15, totalIngreso: 2100, totalCosto: 1400, gananciaNeta: 700, margen: 33, ticketPromedio: 140 },
    { id: 4, fecha: '12/05/2026', cantVentas: 4, totalIngreso: 400, totalCosto: 350, gananciaNeta: 50, margen: 12, ticketPromedio: 100 } // Ejemplo de margen bajo
  ]);

  // --- MOCK DATA & ESTADOS DEL MODAL DE DETALLE DE VENTAS ---
  const [modalOpen, setModalOpen] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [cargandoModal, setCargandoModal] = useState(false);
  const [ventasDia, setVentasDia] = useState([]);

  // --- MANEJADORES ---
  const handleFiltro = (e) => {
    e.preventDefault();
    console.log("Filtrando con fechas:", fechas);
    // Aquí llamarías a: cargarBalance(fechas.desde, fechas.hasta);
  };

  const abrirDetalleVentas = (fecha) => {
    setFechaSeleccionada(fecha);
    setModalOpen(true);
    setCargandoModal(true);

    // Simulamos que pedimos el detalle al backend
    setTimeout(() => {
      setVentasDia([
        { id: 4582, hora: '10:15', comprobante: 'T-4582', cliente: 'Juan Pérez', empleado: 'Simón', total: 350 },
        { id: 4583, hora: '14:30', comprobante: 'T-4583', cliente: 'Ana Lopez', empleado: 'Carlos', total: 1150 },
      ]);
      setCargandoModal(false);
    }, 600);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      
      {/* 1. HEADER Y FILTROS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 max-w-7xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <AccountBalance fontSize="large" className="text-blue-600" /> Balance Diario
          </h2>
          <p className="text-slate-500 mt-1">Análisis de rentabilidad y flujo de caja.</p>
        </div>

        {/* Formulario responsivo: flex-col en móvil, sm:flex-row en pantallas más grandes */}
        <form onSubmit={handleFiltro} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full lg:w-auto">
          <TextField 
            label="Desde" type="date" size="small" fullWidth
            value={fechas.desde} onChange={(e) => setFechas({...fechas, desde: e.target.value})}
            InputLabelProps={{ shrink: true }} className="sm:w-36"
          />
          <TextField 
            label="Hasta" type="date" size="small" fullWidth
            value={fechas.hasta} onChange={(e) => setFechas({...fechas, hasta: e.target.value})}
            InputLabelProps={{ shrink: true }} className="sm:w-36"
          />
          <Button 
            type="submit" variant="contained" color="primary" 
            startIcon={<FilterAlt />} className="bg-blue-600 font-bold px-6 shadow-none py-2"
          >
            Buscar
          </Button>
        </form>
      </div>

      <div className="max-w-7xl mx-auto">
        
        {/* 2. TARJETAS KPI (4 COLUMNAS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center">
            <span className="text-xs uppercase font-bold tracking-wider opacity-80 mb-1">Ganancia Neta (Periodo)</span>
            <h3 className="text-3xl font-bold">U$S {kpis.gananciaNeta.toLocaleString()}</h3>
          </div>
          <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center">
            <span className="text-xs uppercase font-bold tracking-wider opacity-80 mb-1">Facturación Total</span>
            <h3 className="text-3xl font-bold">U$S {kpis.facturacionTotal.toLocaleString()}</h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Ticket Promedio</span>
            <h3 className="text-3xl font-bold text-slate-700">U$S {kpis.ticketPromedio.toLocaleString()}</h3>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Margen Global</span>
            <h3 className="text-3xl font-bold text-emerald-500">{kpis.margenGlobal}%</h3>
          </div>
        </div>

        {/* 3. MÉTODOS DE PAGO (3 COLUMNAS) */}
        <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 mb-8 overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
            <Wallet className="text-slate-400" fontSize="small" />
            <h6 className="font-bold text-slate-700 text-sm m-0">Ingresos por Método de Pago (Periodo)</h6>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-4">
            <div className="text-center py-2">
              <div className="text-xs font-bold uppercase text-slate-400 flex items-center justify-center gap-1 mb-1">
                <Payments fontSize="small" className="text-emerald-500" /> Efectivo
              </div>
              <h4 className="text-xl font-bold text-emerald-600">U$S {metodosPago.efectivo.toLocaleString()}</h4>
            </div>
            <div className="text-center py-2">
              <div className="text-xs font-bold uppercase text-slate-400 flex items-center justify-center gap-1 mb-1">
                <AccountBalanceWallet fontSize="small" className="text-blue-500" /> Transferencia
              </div>
              <h4 className="text-xl font-bold text-blue-600">U$S {metodosPago.transferencia.toLocaleString()}</h4>
            </div>
            <div className="text-center py-2">
              <div className="text-xs font-bold uppercase text-slate-400 flex items-center justify-center gap-1 mb-1">
                <CreditCard fontSize="small" className="text-orange-500" /> Tarjeta (Créd./Déb.)
              </div>
              <h4 className="text-xl font-bold text-orange-500">U$S {metodosPago.tarjeta.toLocaleString()}</h4>
            </div>
          </div>
        </div>

        {/* 4. TABLA DETALLADA POR DÍA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold text-center">Ventas</th>
                  <th className="p-4 font-bold text-right text-blue-300">Ingresos (Venta)</th>
                  <th className="p-4 font-bold text-right text-red-300">Costos (Mercadería)</th>
                  <th className="p-4 font-bold text-right text-emerald-300">Ganancia Neta</th>
                  <th className="p-4 font-bold text-center border-l border-slate-700">Rentabilidad</th>
                  <th className="p-4 font-bold text-center">Ticket Prom.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {balanceDiario.length === 0 ? (
                  <tr><td colSpan="7" className="p-10 text-center text-slate-500">No hay movimientos en estas fechas.</td></tr>
                ) : (
                  balanceDiario.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-600 flex items-center gap-2">
                        <Event fontSize="small" className="text-slate-400" /> {row.fecha}
                      </td>
                      <td className="p-4 text-center">
                        <Chip 
                          label={`${row.cantVentas} ops.`} 
                          onClick={() => abrirDetalleVentas(row.fecha)}
                          className="bg-blue-50 text-blue-700 font-bold border border-blue-200 hover:bg-blue-100 cursor-pointer"
                          icon={<Receipt fontSize="small" />}
                        />
                      </td>
                      <td className="p-4 text-right font-bold text-blue-600">U$S {row.totalIngreso.toLocaleString()}</td>
                      <td className="p-4 text-right text-slate-500">- U$S {row.totalCosto.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                          U$S {row.gananciaNeta.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center border-l border-slate-100">
                        <span className={`font-bold ${row.margen > 20 ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {row.margen}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm text-slate-500">U$S {row.ticketPromedio.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 5. MODAL: DETALLE DE TICKETS DEL DÍA */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle className="bg-blue-600 text-white font-bold flex items-center gap-2">
          <Receipt /> Detalle de Operaciones
        </DialogTitle>
        <DialogContent className="p-0">
          <div className="bg-slate-100 p-3 text-center border-b border-slate-200">
            <h6 className="m-0 text-slate-600 font-bold uppercase tracking-widest text-sm">Fecha: {fechaSeleccionada}</h6>
          </div>
          
          {cargandoModal ? (
            <div className="p-10 text-center text-slate-500">Cargando comprobantes...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 pl-6">Hora</th>
                    <th className="p-3">Ticket</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Vendedor</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3 text-right pr-6">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ventasDia.length === 0 ? (
                    <tr><td colSpan="6" className="p-6 text-center text-slate-400">Sin ventas.</td></tr>
                  ) : (
                    ventasDia.map(venta => (
                      <tr key={venta.id} className="hover:bg-slate-50">
                        <td className="p-3 pl-6 font-mono text-slate-500 text-sm">{venta.hora}</td>
                        <td className="p-3 font-bold text-slate-800">{venta.comprobante}</td>
                        <td className="p-3 text-slate-700">{venta.cliente}</td>
                        <td className="p-3 text-sm text-slate-500">{venta.empleado}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">U$S {venta.total.toLocaleString()}</td>
                        <td className="p-3 text-right pr-6">
                          <IconButton 
                            size="small" color="primary" 
                            onClick={() => navigate(`/app/ventas/detalle/${venta.id}`)}
                            className="bg-blue-50 hover:bg-blue-100"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>            
          )}
        </DialogContent>
        <DialogActions className="bg-slate-50 p-3">
          <Button onClick={() => setModalOpen(false)} color="inherit" className="font-bold">Cerrar</Button>
        </DialogActions>
      </Dialog>

    </div>
  );
};

export default BalanceList;
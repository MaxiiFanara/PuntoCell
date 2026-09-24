import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Select, MenuItem, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  CircularProgress, FormControl
} from '@mui/material';
import { Download, FileDownload, PictureAsPdf } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../../../components/ui/PageHeader';
import { getSucursales, fetchApi } from '../../../services/api';

// ==========================================
// 1. CONFIGURACIÓN DE REPORTES DISPONIBLES
// ==========================================
const REPORT_MODULES = {
  ventas: {
    label: 'Ventas',
    types: [
      { id: 'facturacion', label: 'Evolución de Facturación' },
      { id: 'forma-pago', label: 'Medios de Pago' },
      { id: 'vendedor', label: 'Ranking por Vendedor' },
      { id: 'pareto', label: 'Pareto de Productos' },
      { id: 'detalle', label: 'Detalle de Operaciones' }
    ]
  },
  compras: {
    label: 'Compras',
    types: [
      { id: 'gasto', label: 'Evolución de Gastos' },
      { id: 'proveedores', label: 'Análisis por Proveedor' },
      { id: 'detalle', label: 'Detalle de Compras' }
    ]
  },
  inventario: {
    label: 'Inventario',
    types: [
      { id: 'valorizacion', label: 'Valorización de Stock' },
      { id: 'stock-bajo', label: 'Alertas de Stock Bajo' },
      { id: 'sin-rotacion', label: 'Productos sin Rotación' },
      { id: 'movimientos', label: 'Historial de Movimientos' }
    ]
  },
  reparaciones: {
    label: 'Reparaciones',
    types: [
      { id: 'productividad', label: 'Productividad General' },
      { id: 'fallas', label: 'Ranking de Fallas' },
      { id: 'tiempos', label: 'Tiempos Promedio' }
    ]
  },
  // 🔥 NUEVOS MÓDULOS AGREGADOS 🔥
  finanzas: {
    label: 'Finanzas',
    types: [
      { id: 'flujo-caja', label: 'Flujo de Caja' },
      { id: 'rentabilidad', label: 'Rentabilidad Neta' },
      { id: 'ingresos-egresos', label: 'Ingresos vs Egresos' }
    ]
  },
  caja: {
    label: 'Caja',
    types: [
      { id: 'cierres', label: 'Historial de Cierres' },
      { id: 'arqueos', label: 'Diferencias de Arqueo' },
      { id: 'movimientos', label: 'Movimientos Manuales' }
    ]
  }
};

// ==========================================
// 2. DICCIONARIO DE TRADUCCIÓN DE COLUMNAS
// ==========================================
const COLUMN_TRANSLATIONS = {
  id: 'ID',
  period: 'Período',
  supplierId: 'ID Proveedor',
  supplier: 'Proveedor',
  branchId: 'ID Suc.',
  branch: 'Sucursal',
  employeeId: 'ID Emp.',
  employee: 'Empleado / Técnico',
  customerId: 'ID Cliente',
  customer: 'Cliente',
  status: 'Estado',
  totalAmount: 'Monto Total',
  totalCost: 'Costo Total',
  detailsCount: 'Cant. Detalles',
  paymentMethods: 'Medios de Pago',
  totalCount: 'Operaciones',
  totalQuantity: 'Unidades',
  movementType: 'Tipo Movimiento',
  name: 'Producto / Descripción',
  stock: 'Stock Actual',
  lastMovement: 'Último Movimiento',
  daysWithoutMovement: 'Días sin Mover',
  unitCost: 'Costo Unit.',
  avgDays: 'Tiempo Prom. (Días)',
  
  // 🔥 Traducciones para Finanzas y Caja 🔥
  turnId: 'ID Turno',
  cashier: 'Cajero Responsable',
  openingDate: 'Apertura',
  closingDate: 'Cierre',
  expectedAmount: 'Monto Esperado',
  actualAmount: 'Monto Real',
  cashDifference: 'Diferencia (Arqueo)',
  totalIncome: 'Ingresos Totales',
  totalExpense: 'Egresos Totales',
  netProfit: 'Rentabilidad Neta',
  description: 'Descripción',
  method: 'Método'
};

const translateCol = (col) => {
  if (COLUMN_TRANSLATIONS[col]) return COLUMN_TRANSLATIONS[col];
  return col.replace(/([A-Z])/g, ' $1').trim().toUpperCase(); 
};

const esColumnaVisible = (col) => {
  const lower = col.toLowerCase();
  return lower !== 'id' && !lower.endsWith('id');
};

const formatearValor = (val, colName = '') => {
  if (val === null || val === undefined) return '—';
  
  if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) {
    return dayjs(val).format('DD/MM/YYYY HH:mm');
  }

  if (typeof val === 'number') {
    const isCurrency = /(monto|total|cost|price|revenue|facturacion|amount|income|expense|profit|difference|esperado|real)/i.test(colName) && !/(count|quantity|cantidad)/i.test(colName);
    const formato = val.toLocaleString('es-AR', {
      minimumFractionDigits: Number.isInteger(val) && !isCurrency ? 0 : 2,
      maximumFractionDigits: 2
    });
    return isCurrency ? `$ ${formato}` : formato;
  }
  
  return String(val);
};

export default function ReportesScreen() {
  const [moduloSeleccionado, setModuloSeleccionado] = useState('ventas');
  const [tipoReporte, setTipoReporte] = useState('facturacion');
  
  const [sucursalesLista, setSucursalesLista] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  
  const [fechaDesde, setFechaDesde] = useState(dayjs().subtract(30, 'day'));
  const [fechaHasta, setFechaHasta] = useState(dayjs());
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  
  useEffect(() => {
    getSucursales()
      .then((data) => setSucursalesLista(data))
      .catch((err) => console.error("Error al cargar sucursales en reportes:", err));
  }, []);

  useEffect(() => {
    setTipoReporte(REPORT_MODULES[moduloSeleccionado].types[0].id);
  }, [moduloSeleccionado]);

  const columnasVisibles = reportData.length > 0 ? Object.keys(reportData[0]).filter(esColumnaVisible) : [];

  const calcularFilaTotales = (datos) => {
    if (!datos.length) return [];
    
    return columnasVisibles.map((col, index) => {
      if (index === 0) return 'TOTALES';
      if (typeof datos[0][col] === 'number') {
        const sum = datos.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
        return formatearValor(sum, col);
      }
      return '—';
    });
  };

  const generarReporte = async () => {
    setLoading(true);
    setReportData([]);
    try {
      const params = new URLSearchParams({
        reportType: tipoReporte,
        from: fechaDesde.format('YYYY-MM-DD'),
        to: fechaHasta.format('YYYY-MM-DD')
      });

      if (sucursalSeleccionada) {
        params.append('idSucursal', sucursalSeleccionada);
      }
      
      const url = `/reportes/${moduloSeleccionado}?${params.toString()}`;
      const result = await fetchApi(url);

      let filas = [];
      if (Array.isArray(result)) filas = result;
      else if (Array.isArray(result?.data)) filas = result.data;
      else if (Array.isArray(result?.data?.rows)) filas = result.data.rows;
      else if (Array.isArray(result?.rows)) filas = result.rows;

      if (filas.length === 0) {
        alert(`El reporte se generó con éxito, pero no hay datos registrados para el tipo "${tipoReporte}" en este rango de fechas.`);
      }

      setReportData(filas);
    } catch (error) {
      console.error("Error al generar reporte:", error);
      alert(`Hubo un error al conectar con el servidor: ${error.message || 'La ruta de este reporte aún no existe en el backend.'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (!reportData.length) return alert('No hay datos para exportar.');
    
    const totales = calcularFilaTotales(reportData);

    const csvContent = [
      columnasVisibles.map(translateCol).join(','), 
      ...reportData.map(row => columnasVisibles.map(col => {
        let val = row[col];
        if (typeof val === 'number') val = val.toFixed(2);
        return `"${val !== null ? val : ''}"`;
      }).join(',')),
      totales.map(val => `"${val.replace(/\$/g, '').trim()}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${moduloSeleccionado}_${tipoReporte}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
  };

  const exportarPDF = () => {
    if (!reportData.length) return alert('No hay datos para exportar.');

    const doc = new jsPDF('l', 'mm', 'a4');
    const tituloModulo = REPORT_MODULES[moduloSeleccionado].label;
    const tituloReporte = REPORT_MODULES[moduloSeleccionado].types.find(t => t.id === tipoReporte)?.label;
    
    const nombreSucursal = sucursalSeleccionada 
      ? sucursalesLista.find(s => String(s.id) === String(sucursalSeleccionada))?.nombre 
      : 'Todas las Sucursales Consolidadas';
    
    doc.setFontSize(16);
    doc.setTextColor(18, 104, 78);
    doc.text(`Punto Cell - Reporte de ${tituloModulo}`, 14, 15);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Reporte: ${tituloReporte}`, 14, 23);
    doc.text(`Sucursal: ${nombreSucursal}`, 14, 29); 
    doc.text(`Período: ${fechaDesde.format('DD/MM/YYYY')} al ${fechaHasta.format('DD/MM/YYYY')}`, 14, 35);
    doc.text(`Generado el: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 41);

    const head = [columnasVisibles.map(translateCol)];
    
    const body = reportData.map(row => columnasVisibles.map(col => formatearValor(row[col], col)));

    const totales = calcularFilaTotales(reportData);
    body.push(totales);

    autoTable(doc, {
      startY: 48,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [18, 104, 78], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [246, 245, 242] },
      didParseCell: function (data) {
        if (data.section === 'body' && data.row.index === reportData.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    });

    doc.save(`Reporte_${moduloSeleccionado}_${tipoReporte}_${dayjs().format('YYYYMMDD')}.pdf`);
  };

  const renderTableHeaders = () => {
    if (!columnasVisibles.length) return null;
    return (
      <TableRow>
        {columnasVisibles.map((col) => (
          <TableCell key={col} sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
            {translateCol(col)}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderTableRows = () => {
    if (!reportData.length) return null;
    return reportData.map((row, index) => (
      <TableRow key={index} hover>
        {columnasVisibles.map((col) => (
          <TableCell key={col}>
            {formatearValor(row[col], col)}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const renderTableFooter = () => {
    if (!reportData.length) return null;
    const totales = calcularFilaTotales(reportData);
    
    return (
      <TableFooter>
        <TableRow>
          {totales.map((val, index) => (
            <TableCell 
              key={index} 
              sx={{ 
                position: 'sticky', bottom: 0, bgcolor: 'pc.surfaceMuted', 
                fontWeight: 800, borderTop: '2px solid', borderColor: 'divider',
                color: val !== '—' && val !== 'TOTALES' ? 'primary.main' : 'text.primary'
              }}
            >
              {val}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
        <PageHeader eyebrow="Gestión" title="Centro de Reportes" meta="Generá, visualizá y exportá datos de la operación." />
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<FileDownload />} onClick={exportarCSV} disabled={!reportData.length}>
            Exportar CSV
          </Button>
          <Button variant="contained" color="error" startIcon={<PictureAsPdf />} disabled={!reportData.length} onClick={exportarPDF}>
            Descargar PDF
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0, flexDirection: { xs: 'column', lg: 'row' } }}>
        <Paper sx={{ 
          p: 3, width: { xs: '100%', lg: 320 }, flexShrink: 0, display: 'flex', flexDirection: 'column', 
          gap: 2.5, borderRadius: '12px', boxShadow: (t) => t.vars.palette.pc.lift, height: 'fit-content', maxHeight: '100%', overflowY: 'auto'
        }}>
          <Typography variant="subtitle1" fontWeight="bold">Configuración del Reporte</Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Sucursal</Typography>
            <FormControl size="small" fullWidth>
              <Select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                displayEmpty
              >
                <MenuItem value="" sx={{ fontStyle: 'italic' }}>Todas las sucursales</MenuItem>
                {sucursalesLista.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Módulo</Typography>
            <Select size="small" value={moduloSeleccionado} onChange={(e) => setModuloSeleccionado(e.target.value)}>
              {Object.entries(REPORT_MODULES).map(([key, mod]) => <MenuItem key={key} value={key}>{mod.label}</MenuItem>)}
            </Select>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Tipo de Reporte</Typography>
            <Select size="small" value={tipoReporte} onChange={(e) => setTipoReporte(e.target.value)}>
              {REPORT_MODULES[moduloSeleccionado].types.map((type) => <MenuItem key={type.id} value={type.id}>{type.label}</MenuItem>)}
            </Select>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Rango de Fechas</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker label="Desde" value={fechaDesde} onChange={(newValue) => setFechaDesde(newValue)} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              <DatePicker label="Hasta" value={fechaHasta} onChange={(newValue) => setFechaHasta(newValue)} format="DD/MM/YYYY" slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            </LocalizationProvider>
          </Box>

          <Button variant="contained" fullWidth size="large" sx={{ mt: 'auto' }} onClick={generarReporte} disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Generar Reporte'}
          </Button>
        </Paper>

        <Paper sx={{ flex: 1, minWidth: 0, borderRadius: '12px', boxShadow: (t) => t.vars.palette.pc.lift, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {reportData.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
              {loading ? <CircularProgress /> : (
                <>
                  <Download sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1">Configurá los filtros y hacé clic en "Generar Reporte".</Typography>
                </>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Table stickyHeader size="small" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>{renderTableHeaders()}</TableHead>
                <TableBody>{renderTableRows()}</TableBody>
                {renderTableFooter()}
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
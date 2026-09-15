import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Select, MenuItem, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableFooter,
  CircularProgress
} from '@mui/material';
import { Download, FileDownload, PictureAsPdf } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../../../components/ui/PageHeader';

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
  totalAmount: 'Monto Total ($)',
  totalCost: 'Costo Total ($)',
  detailsCount: 'Cant. Detalles',
  paymentMethods: 'Medios de Pago',
  totalCount: 'Operaciones',
  totalQuantity: 'Unidades',
  movementType: 'Tipo Movimiento',
  name: 'Producto / Descripción',
  stock: 'Stock Actual',
  lastMovement: 'Último Movimiento',
  daysWithoutMovement: 'Días sin Mover',
  unitCost: 'Costo Unit. ($)',
  avgDays: 'Tiempo Prom. (Días)'
};

// Función helper para traducir (si no existe, separa el camelCase)
const translateCol = (col) => {
  if (COLUMN_TRANSLATIONS[col]) return COLUMN_TRANSLATIONS[col];
  return col.replace(/([A-Z])/g, ' $1').trim().toUpperCase(); 
};

export default function ReportesScreen() {
  const [moduloSeleccionado, setModuloSeleccionado] = useState('ventas');
  const [tipoReporte, setTipoReporte] = useState('facturacion');
  
  const [fechaDesde, setFechaDesde] = useState(dayjs().subtract(30, 'day'));
  const [fechaHasta, setFechaHasta] = useState(dayjs());
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  
  useEffect(() => {
    setTipoReporte(REPORT_MODULES[moduloSeleccionado].types[0].id);
  }, [moduloSeleccionado]);

  // ==========================================
  // LÓGICA DE TOTALES (Reutilizable)
  // ==========================================
  const calcularFilaTotales = (datos) => {
    if (!datos.length) return [];
    const headers = Object.keys(datos[0]);
    
    return headers.map((col, index) => {
      if (index === 0) return 'TOTALES';
      const isId = col.toLowerCase().endsWith('id') || col.toLowerCase() === 'id';
      if (typeof datos[0][col] === 'number' && !isId) {
        const sum = datos.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
        return Number.isInteger(sum) ? sum : Number(sum.toFixed(2));
      }
      return '-';
    });
  };

  // ==========================================
  // FETCH DE DATOS
  // ==========================================
  const generarReporte = async () => {
    setLoading(true);
    setReportData([]);
    try {
      const params = new URLSearchParams({
        reportType: tipoReporte,
        from: fechaDesde.format('YYYY-MM-DD'),
        to: fechaHasta.format('YYYY-MM-DD')
      }).toString();
      
      const url = `http://localhost:3000/api/reportes/${moduloSeleccionado}?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const result = await response.json();
      if (result && result.data && result.data.rows) {
        setReportData(result.data.rows);
      } else {
        setReportData([]);
      }
    } catch (error) {
      console.error("Error al generar reporte:", error);
      alert("Hubo un error al generar el reporte. Revisá la consola.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // EXPORTACIONES
  // ==========================================
  const exportarCSV = () => {
    if (!reportData.length) return alert('No hay datos para exportar.');
    
    const headers = Object.keys(reportData[0]);
    const totales = calcularFilaTotales(reportData);

    const csvContent = [
      headers.map(translateCol).join(','), // Traducir cabeceras en CSV
      ...reportData.map(row => headers.map(header => `"${row[header] !== null ? row[header] : ''}"`).join(',')),
      totales.map(val => `"${val}"`).join(',')
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
    
    doc.setFontSize(16);
    doc.setTextColor(18, 104, 78);
    doc.text(`Punto Cell - Reporte de ${tituloModulo}`, 14, 15);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Análisis: ${tituloReporte}`, 14, 23);
    doc.text(`Período: ${fechaDesde.format('DD/MM/YYYY')} al ${fechaHasta.format('DD/MM/YYYY')}`, 14, 29);
    doc.text(`Generado el: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 35);

    // Traducir cabeceras en PDF
    const head = [Object.keys(reportData[0]).map(translateCol)];
    
    const body = reportData.map(row => Object.values(row).map(val => {
      if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(2);
      if (val === null || val === undefined) return '-';
      // Formatear fechas si vienen en formato ISO
      if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) return dayjs(val).format('DD/MM/YYYY');
      return String(val);
    }));

    const totales = calcularFilaTotales(reportData);
    body.push(totales.map(String));

    autoTable(doc, {
      startY: 42,
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

  // ==========================================
  // RENDERIZADO DINÁMICO
  // ==========================================
  const renderTableHeaders = () => {
    if (!reportData.length) return null;
    return (
      <TableRow>
        {Object.keys(reportData[0]).map((col) => (
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
        {Object.keys(row).map((col) => {
          let val = row[col];
          if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(2);
          // Si es una fecha ISO, la formateamos para que quede bonita
          if (typeof val === 'string' && val.includes('T') && val.endsWith('Z')) val = dayjs(val).format('DD/MM/YYYY HH:mm');
          return <TableCell key={col}>{val !== null ? val : '—'}</TableCell>;
        })}
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
                color: val !== '-' ? 'primary.main' : 'text.primary'
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker label="Desde" value={fechaDesde} onChange={(newValue) => setFechaDesde(newValue)} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
              <DatePicker label="Hasta" value={fechaHasta} onChange={(newValue) => setFechaHasta(newValue)} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
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
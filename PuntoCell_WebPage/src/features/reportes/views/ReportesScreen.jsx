import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Select, MenuItem, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress
} from '@mui/material';
import { Download, FileDownload, PictureAsPdf } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import PageHeader from '../../../components/ui/PageHeader';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// CONFIGURACIÓN DE REPORTES DISPONIBLES (Mapeo exacto al Backend)
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

export default function ReportesScreen() {
  const [moduloSeleccionado, setModuloSeleccionado] = useState('ventas');
  const [tipoReporte, setTipoReporte] = useState('facturacion');
  
  const [fechaDesde, setFechaDesde] = useState(dayjs().subtract(30, 'day'));
  const [fechaHasta, setFechaHasta] = useState(dayjs());
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  
  // Cuando cambia el módulo, resetear el tipo de reporte al primero de esa lista
  useEffect(() => {
    setTipoReporte(REPORT_MODULES[moduloSeleccionado].types[0].id);
  }, [moduloSeleccionado]);

  // ==========================================
  // FETCH DE DATOS (Adaptado para Cookies)
  // ==========================================
  const generarReporte = async () => {
    setLoading(true);
    setReportData([]); // Limpiar grilla anterior
    try {
      // 1. Preparamos los parámetros para la URL
      const params = new URLSearchParams({
        reportType: tipoReporte,
        from: fechaDesde.format('YYYY-MM-DD'),
        to: fechaHasta.format('YYYY-MM-DD')
      }).toString();
      
      // 2. Construimos la URL
      // NOTA: Si tu backend corre en el puerto 3000 y el front en el 5173, 
      // necesitás poner la URL completa aquí si Vite no está configurado como proxy.
      // Por defecto probaré asumiendo que comparten dominio o usas proxy:
      const url = `http://localhost:3000/api/reportes/${moduloSeleccionado}?${params}`;
      
      // 3. Hacemos la petición
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // ¡ESTA ES LA LÍNEA MÁGICA! Le dice al navegador que envíe tu cookie de sesión
        credentials: 'include' 
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      // 4. Asignamos los datos a la tabla
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
  // EXPORTACIONES (Lógica base)
  // ==========================================
  const exportarCSV = () => {
    if (!reportData.length) return alert('No hay datos para exportar.');
    
    // Obtener cabeceras dinámicas de las claves del primer objeto
    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','), // Fila de títulos
      ...reportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(',')) // Filas de datos
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${moduloSeleccionado}_${tipoReporte}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
  };

  // ==========================================
  // EXPORTACIÓN A PDF
  // ==========================================
  const exportarPDF = () => {
    if (!reportData.length) return alert('No hay datos para exportar.');

    // 1. Inicializar el documento PDF (orientación horizontal 'l' para que entren más columnas)
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // 2. Título y Metadatos
    const tituloModulo = REPORT_MODULES[moduloSeleccionado].label;
    const tituloReporte = REPORT_MODULES[moduloSeleccionado].types.find(t => t.id === tipoReporte)?.label;
    
    doc.setFontSize(16);
    doc.setTextColor(18, 104, 78); // Verde primario de PuntoCell (#12684e)
    doc.text(`Punto Cell - Reporte de ${tituloModulo}`, 14, 15);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Análisis: ${tituloReporte}`, 14, 23);
    doc.text(`Período: ${fechaDesde.format('DD/MM/YYYY')} al ${fechaHasta.format('DD/MM/YYYY')}`, 14, 29);
    doc.text(`Generado el: ${dayjs().format('DD/MM/YYYY HH:mm')}`, 14, 35);

    // 3. Preparar los datos para la tabla
    // Cabeceras: Transformamos camelCase a texto legible y lo pasamos a mayúsculas
    const head = [Object.keys(reportData[0]).map(col => col.replace(/([A-Z])/g, ' $1').trim().toUpperCase())];
    
    // Filas: Convertimos los objetos en arrays simples de valores
    const body = reportData.map(row => {
      return Object.values(row).map(val => {
        if (typeof val === 'number' && !Number.isInteger(val)) return val.toFixed(2);
        if (val === null || val === undefined) return '-';
        return String(val);
      });
    });

    // 4. Dibujar la tabla
    autoTable(doc, {
      startY: 42,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { 
        fillColor: [18, 104, 78], // Verde primario
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [246, 245, 242] // pc.surfaceMuted aprox
      }
    });

    // 5. Descargar el archivo
    const filename = `Reporte_${moduloSeleccionado}_${tipoReporte}_${dayjs().format('YYYYMMDD')}.pdf`;
    doc.save(filename);
  };

  // ==========================================
  // RENDERIZADO DINÁMICO DE TABLA
  // ==========================================
  // Como no sabemos qué columnas devuelve exactamente cada reporte, las renderizamos dinámicamente.
  const renderTableHeaders = () => {
    if (!reportData.length) return null;
    const columns = Object.keys(reportData[0]);
    return (
      <TableRow>
        {columns.map((col) => (
          <TableCell key={col} sx={{ textTransform: 'capitalize' }}>
            {col.replace(/([A-Z])/g, ' $1').trim()} {/* Formatear camelCase a Palabras */}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  const renderTableRows = () => {
    if (!reportData.length) return null;
    const columns = Object.keys(reportData[0]);
    
    return reportData.map((row, index) => (
      <TableRow key={index} hover>
        {columns.map((col) => {
          let cellValue = row[col];
          // Formateo rápido: si es un número flotante, redondear
          if (typeof cellValue === 'number' && !Number.isInteger(cellValue)) {
            cellValue = cellValue.toFixed(2);
          }
          return <TableCell key={col}>{cellValue}</TableCell>;
        })}
      </TableRow>
    ));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minHeight: 0 }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PageHeader eyebrow="Gestión" title="Centro de Reportes" meta="Generá, visualizá y exportá datos de la operación." />
        
        {/* Botones de Exportación (solo activos si hay datos) */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<FileDownload />} 
            onClick={exportarCSV}
            disabled={!reportData.length}
          >
            Exportar CSV
          </Button>
          <Button 
            variant="contained" 
            color="error" // Rojo para PDF
            startIcon={<PictureAsPdf />} 
            disabled={!reportData.length}
            onClick={exportarPDF}
          >
            Descargar PDF
          </Button>
        </Box>
      </Box>

      {/* PANEL DE FILTROS Y CONTENIDO */}
      <Box sx={{ display: 'flex', gap: 3, flexGrow: 1, overflow: 'hidden', flexDirection: { xs: 'column', lg: 'row' } }}>
        
        {/* SIDEBAR IZQUIERDO: Filtros */}
        <Paper sx={{ p: 3, width: { xs: '100%', lg: 320 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2.5, borderRadius: '12px', boxShadow: (t) => t.vars.palette.pc.lift }}>
          <Typography variant="subtitle1" fontWeight="bold">Configuración del Reporte</Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Módulo</Typography>
            <Select 
              size="small" 
              value={moduloSeleccionado} 
              onChange={(e) => setModuloSeleccionado(e.target.value)}
              fullWidth
            >
              {Object.entries(REPORT_MODULES).map(([key, mod]) => (
                <MenuItem key={key} value={key}>{mod.label}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Tipo de Reporte</Typography>
            <Select 
              size="small" 
              value={tipoReporte} 
              onChange={(e) => setTipoReporte(e.target.value)}
              fullWidth
            >
              {REPORT_MODULES[moduloSeleccionado].types.map((type) => (
                <MenuItem key={type.id} value={type.id}>{type.label}</MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>Rango de Fechas</Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Desde"
                value={fechaDesde}
                onChange={(newValue) => setFechaDesde(newValue)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="Hasta"
                value={fechaHasta}
                onChange={(newValue) => setFechaHasta(newValue)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Box>

          <Button 
            variant="contained" 
            fullWidth 
            size="large" 
            sx={{ mt: 'auto' }}
            onClick={generarReporte}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Generar Reporte'}
          </Button>
        </Paper>

        {/* ÁREA PRINCIPAL: Tabla de Resultados */}
        <Paper sx={{ flexGrow: 1, borderRadius: '12px', boxShadow: (t) => t.vars.palette.pc.lift, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {reportData.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
              {loading ? (
                <CircularProgress />
              ) : (
                <>
                  <Download sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1">Configurá los filtros y hacé clic en "Generar Reporte".</Typography>
                </>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  {renderTableHeaders()}
                </TableHead>
                <TableBody>
                  {renderTableRows()}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {reportData.length > 0 && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'pc.surfaceMuted' }}>
              <Typography variant="caption" color="text.secondary">
                Mostrando {reportData.length} registros (Limitado por el servidor).
              </Typography>
            </Box>
          )}

        </Paper>
      </Box>
    </Box>
  );
}
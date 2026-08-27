import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import InventarioForm from '../components/InventarioForm';
import { inventarioService } from "../../../services/inventarioServices";
import PageHeader from '../../../components/ui/PageHeader';

const InventarioEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataForForm, setDataForForm] = useState(null);
  const [idArticuloOriginal, setIdArticuloOriginal] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const res = await inventarioService.getById(id);
        const inv = res.data || res;
        const art = inv.articulo || inv.Articulo || {};

        setIdArticuloOriginal(art.Id || art.id);

        // IMEI/color/memoria/batería viven en Inventario, no en Articulo
        setDataForForm({
          esSerializado: art.EsSerializado,
          idModeloArticulo: art.IdModeloArticulo,
          nombreModelo: art.Nombre,
          imei: inv.IMEI || '',
          idColor: inv.IdColor || '',
          idMemoria: inv.IdMemoria || '',
          idBateria: inv.IdBateria || '',
          precioCosto: inv.PrecioCosto || '',
          precioMayor: inv.PrecioMayor || '',
          precioMenor: inv.PrecioMenor || '',
          idSucursal: inv.IdSucursal || 1,
          idProveedor: inv.IdProveedor || '',
          idEstadoInventario: inv.IdEstadoInventario || 1,
          stock: inv.Stock || 1,
          observaciones: inv.Observaciones || '',
          mesesGarantiaLocal: inv.MesesGarantiaLocal || ''
        });

      } catch (err) {
        console.error("Error al cargar:", err);
        alert("No se pudo cargar el producto.");
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [id]);

  const handleSubmit = async (formData) => {
    try {
      // Articulo: specs genéricas, sin IMEI/color/memoria/batería
      const payloadArticulo = {
        Nombre: formData.nombreModelo || 'Equipo Sin Nombre',
        EsSerializado: Boolean(formData.esSerializado),
        EsVendible: true,
        EsRepuesto: !formData.esSerializado,
        IdModeloArticulo: Number(formData.idModeloArticulo)
      };

      await inventarioService.updateArticulo(idArticuloOriginal, payloadArticulo);

      // Inventario: unidad física (IMEI/color/memoria/batería/proveedor/garantía)
      const payloadInventario = {
        IdArticulo: Number(idArticuloOriginal),
        IdSucursal: Number(formData.idSucursal),
        IdProveedor: formData.idProveedor ? Number(formData.idProveedor) : null,
        IdEstadoInventario: formData.idEstadoInventario ? Number(formData.idEstadoInventario) : 1, // antes quedaba fijo en 1
        Stock: Number(formData.stock),

        // Si no hay precio, mandamos null explícitamente para que Joi no se queje
        PrecioCosto: formData.precioCosto ? Number(formData.precioCosto) : null,
        PrecioMayor: formData.precioMayor ? Number(formData.precioMayor) : null,
        PrecioMenor: formData.precioMenor ? Number(formData.precioMenor) : null,

        IMEI: formData.esSerializado && formData.imei ? String(formData.imei) : null,
        IdColor: formData.idColor && formData.idColor !== "" ? Number(formData.idColor) : null,
        IdMemoria: formData.idMemoria && formData.idMemoria !== "" ? Number(formData.idMemoria) : null,
        IdBateria: formData.idBateria && formData.idBateria !== "" ? Number(formData.idBateria) : null,
        MesesGarantiaLocal: formData.mesesGarantiaLocal || new Date().toISOString(),
        Observaciones: formData.observaciones ? formData.observaciones : null // "" no pasa Joi
      };

      await inventarioService.update(id, payloadInventario);

      alert("✅ ¡Punto Cell actualizado con éxito!");
      navigate('/app/inventario');

    } catch (error) {
      console.error("❌ Error detallado:", error);
      alert(`No se pudo guardar: ${error.message || 'Error desconocido'}`);
    }
  };

  if (cargando) {
    return <Box sx={{ p: 5, textAlign: 'center', color: 'text.disabled' }}>Cargando datos del registro…</Box>;
  }

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Button
        onClick={() => navigate('/app/inventario')}
        startIcon={<ArrowBack sx={{ fontSize: '16px !important' }} />}
        sx={{ alignSelf: 'flex-start', px: 0 }}
      >
        Inventario
      </Button>

      <PageHeader
        eyebrow="Stock"
        title={`Editar registro #${id}`}
        meta={dataForForm?.nombreModelo || 'Registro de inventario'}
      />

      <InventarioForm
        initialData={dataForForm}
        isEdit={true}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/app/inventario')}
        excludeIdImei={id}
      />
    </Box>
  );
};

export default InventarioEdit;

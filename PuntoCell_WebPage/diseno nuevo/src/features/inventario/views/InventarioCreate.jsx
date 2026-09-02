import { useNavigate } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import InventarioForm from '../components/InventarioForm';
import { inventarioService } from "../../../services/inventarioServices";
import { useAuth } from '../../../context/AuthContext';
import PageHeader from '../../../components/ui/PageHeader';

const InventarioCreate = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  // La sucursal precargada es la del empleado logueado (sigue siendo editable en el
  // combo real del formulario) — antes quedaba siempre fija en 1.
  const initialState = {
    esSerializado: true,
    idSucursal: usuario?.sucursal || '', idProveedor: '', idEstadoInventario: 1, idModeloArticulo: '', imei: '', idColor: '',
    idMemoria: '', idBateria: '', precioCosto: '', precioMayor: '',
    precioMenor: '', stock: 1, observaciones: '', mesesGarantiaLocal: ''
  };

  const handleSubmit = async (formData) => {
    try {
      await inventarioService.crearIngresoCompleto(formData);
      alert("✅ Ingreso y stock guardados exitosamente en la base de datos.");
      navigate('/app/inventario');
    } catch (error) {
      console.error("❌ Error al guardar el producto:", error);
      // fetchApi arma error.message a partir de lo que devuelve el backend (ver src/services/api.js)
      alert(`No se pudo guardar: ${error.message || 'Error desconocido'}`);
    }
  };

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
        title="Nuevo ingreso"
        meta="Cargá el equipo o repuesto que entra al inventario"
      />

      <InventarioForm
        initialData={initialState}
        isEdit={false}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/app/inventario')}
        onReingreso={(id) => navigate(`/app/inventario/editar/${id}`)}
      />
    </Box>
  );
};

export default InventarioCreate;

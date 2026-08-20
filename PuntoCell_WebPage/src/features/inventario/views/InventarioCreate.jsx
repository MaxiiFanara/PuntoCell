import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography } from '@mui/material';
import { ArrowBack, Inventory } from '@mui/icons-material';
import InventarioForm from '../components/InventarioForm';
import { inventarioService } from "../../../services/inventarioServices";
import { useAuth } from '../../../context/AuthContext';

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
    <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, maxWidth: '1024px', mx: 'auto' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory fontSize="large" color="primary" /> Nuevo Ingreso
        </Typography>
        <Button variant="outlined" color="inherit" startIcon={<ArrowBack />} onClick={() => navigate('/app/inventario')} sx={{ bgcolor: 'white' }}>
          Volver
        </Button>
      </Box>

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
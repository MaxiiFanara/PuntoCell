import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Ajusta la ruta de importación según dónde hayas puesto tu Sidebar
import Sidebar from '../features/admin/components/Sidebar'; 

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (

    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'grey.100', overflow: 'hidden' }}>
      
      {/* 1. OVERLAY (Fondo oscuro) PARA MÓVILES */}
      {sidebarOpen && (
        <Box 
          onClick={() => setSidebarOpen(false)}
          sx={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 40, 
            bgcolor: 'rgba(15, 23, 42, 0.5)', 
            backdropFilter: 'blur(4px)', 
            display: { md: 'none' },
            transition: 'opacity 0.3s'
          }}
        />
      )}

      {/* 2. CONTENEDOR DEL SIDEBAR */}
      <Box 
        sx={{
          position: { xs: 'fixed', md: 'relative' },
          insetY: 0, 
          left: 0, 
          zIndex: 50, 
          width: 256, 
          bgcolor: '#0f172a', // slate-900
          transform: { 
            xs: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', 
            md: 'translateX(0)' 
          },
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </Box>

      {/* 3. ÁREA PRINCIPAL */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minWidth: 0 }}>
        
        {/* NAVBAR MÓVIL (Solo visible en pantallas chicas) */}
        <Box 
          sx={{ 
            display: { xs: 'flex', md: 'none' }, 
            bgcolor: 'white', 
            boxShadow: 1, 
            px: 2, 
            py: 1.5, 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            borderBottom: '1px solid', 
            borderColor: 'grey.200', 
            zIndex: 30 
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => setSidebarOpen(true)} edge="start" color="inherit">
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'grey.800', m: 0 }}>
              Punto Cell
            </Typography>
          </Box>
        </Box>
        
        {/* CONTENIDO DE LA PANTALLA (Outlet) */}
        <Box 
          component="main" 
          sx={{ 
            flex: 1, 
            overflowX: 'hidden', 
            overflowY: 'auto', 
            bgcolor: 'grey.50', 
            p: { xs: 2, md: 3 } 
          }}
        >
          <Outlet />
        </Box>
      </Box>

    </Box>
  );
}
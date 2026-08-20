import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box, Typography } from '@mui/material';
import { Group, Security, VerifiedUser, Smartphone } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Roles', icon: <Security />, path: '/app/admin/roles' },
    { text: 'Permisos', icon: <VerifiedUser />, path: '/app/admin/permisos' },
    { text: 'Usuarios', icon: <Group />, path: '/app/admin/usuarios' }
  ];

  return (
    <Box className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800">
      <List className="flex-1 px-3 py-4">
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding className="mb-1">
            <ListItemButton 
              onClick={() => navigate(item.path)}
              className={`rounded-lg transition-all ${
                location.pathname === item.path 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'hover:bg-slate-800'
              }`}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : '#94a3b8', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                slotProps={{
                    primary: {
                        fontSize: '0.9rem',
                        fontWeight: location.pathname === item.path ? 600 : 400,
                        className: location.pathname === item.path ? 'text-white' : 'text-slate-300'
                    }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <div className="p-4 border-t border-slate-800">
        <Typography variant="caption" className="text-slate-500 block text-center">
          v1.0.0 - Tesis Simón
        </Typography>
      </div>
    </Box>
  );
};

export default Sidebar;
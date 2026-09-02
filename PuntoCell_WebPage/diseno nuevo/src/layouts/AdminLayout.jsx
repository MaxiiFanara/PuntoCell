import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';

import Sidebar from '../features/admin/components/Sidebar';

// Anidado dentro de AppLayout (que ya trae el rail principal): acá no va un
// segundo sidebar pesado, solo una franja de tabs livianas arriba del Outlet.
export default function AdminLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Box sx={{ px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Sidebar />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

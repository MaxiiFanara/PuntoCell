import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// --- VISTAS DEL PROYECTO BASE (REPARACIONES Y AUTH) ---
import ReparacionesPage from './pages/ReparacionesPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';

// --- IMPORTACIONES DEL CATÁLOGO ---
import CatalogoLayout from './features/catalogo/layouts/CatalogoLayout';
import CatalogPage from './features/catalogo/views/CatalogPage';
import ProductDetail from './features/catalogo/views/ProductDetail';

// --- LAYOUTS Y VISTAS DE TU PROYECTO (VENTAS, STOCK, ADMIN) ---
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './features/landing/views/LandingPage';
import PuntoVentaScreen from './features/punto-venta/views/PuntoVentaScreen';
import UsersScreen from './features/admin/views/usuarios/UsersScreen';
import RolesScreen from './features/admin/views/roles/RolesScreen';
import PermissionsScreen from './features/admin/views/permisos/PermissionsScreen';
import BitacoraList from './features/admin/views/bitacora/BitacoraList';
import HistorialVentas from './features/venta/views/HistorialVentas';
import TicketVenta from './features/venta/views/TicketVenta';
import InventarioList from './features/inventario/views/InventarioList';
import InventarioCreate from './features/inventario/views/InventarioCreate';
import InventarioEdit from './features/inventario/views/InventarioEdit';
import InventarioDetails from './features/inventario/views/InventarioDetails';
import BalanceList from './features/reportes/views/BalanceList';
import { VentaProvider } from './features/punto-venta/context/VentaContext';




// --- WRAPPERS DE SEGURIDAD ---
const ProtectedRoute = ({ children }) => {
  const { usuario, loading } = useAuth();
  if (loading) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { usuario, loading } = useAuth();
  if (loading) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 1 && usuario.rol !== 2) return <Navigate to="/app" replace />;
  return children;
};

const App = () => (
  <AuthProvider>
    <Routes>
      {/* ---------------- PUBLICAS ---------------- */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ---------------- MÓDULO CATÁLOGO (NUEVO) ---------------- */}
      {/* Al entrar a /catalogo, se carga el CatalogoLayout con su Navbar y Footer */}
      <Route path="/catalogo" element={<CatalogoLayout />}>
        {/* Ruta base: /catalogo */}
        <Route index element={<CatalogPage />} />
        {/* Ruta de detalle: /catalogo/product/123 */}
        <Route path="product/:id" element={<ProductDetail />} />
      </Route>

      {/* ---------------- APP PRINCIPAL PROTEGIDA ---------------- */}
      <Route 
        path="/app" 
        element={
          <ProtectedRoute>
            <VentaProvider>
              <AppLayout />
            </VentaProvider>
          </ProtectedRoute>
        }
      >
        {/* Redirección por defecto al entrar a la app */}
        <Route index element={<Navigate to="/app/ventas/historial" replace />} />

        {/* -------- MÓDULO REPARACIONES Y DASHBOARD (BASE) -------- */}
        <Route path="reparaciones" element={<ReparacionesPage />} />
        <Route path="dashboard" element={
          <AdminRoute>
            <DashboardPage />
          </AdminRoute>
        } />

        {/* -------- VENTAS Y POS -------- */}
        <Route path="ventas/historial" element={<HistorialVentas />} />
        <Route path="punto-venta" element={<PuntoVentaScreen />} />
        <Route path="ventas/detalle/:id" element={<TicketVenta />} />

        {/* -------- INVENTARIO -------- */}
        <Route path="inventario" element={<InventarioList />} />
        <Route path="inventario/nuevo" element={<InventarioCreate />} />
        <Route path="inventario/editar/:id" element={<InventarioEdit />} />
        <Route path="inventario/detalle/:id" element={<InventarioDetails />} />

        {/* -------- REPORTES -------- */}
        <Route path="reportes" element={<BalanceList />} />

        {/* -------- BITÁCORA INDEPENDIENTE (Sin AdminLayout) -------- */}
        <Route 
          path="admin/bitacora" 
          element={
            <AdminRoute>
              <BitacoraList />
            </AdminRoute>
          } 
        />

        {/* -------- ADMIN (Con AdminLayout para el resto) -------- */}
        <Route path="admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<Navigate to="/app/admin/usuarios" replace />} />
          <Route path="usuarios" element={<UsersScreen />} />
          <Route path="roles" element={<RolesScreen />} />
          <Route path="permisos" element={<PermissionsScreen />} />
          {/* Ya no está BitacoraList aquí adentro */}
        </Route>

      </Route>

      {/* ---------------- 404 ---------------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;
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
import InventarioDetails from './features/inventario/views/InventarioDetails';
import ReportesScreen from './features/reportes/views/ReportesScreen';
import ComprasList from './features/compras/views/ComprasList';
import PreciosScreen from './features/precios/precios';
import { VentaProvider } from './features/punto-venta/context/VentaContext';
import ThemeToggle from './components/ui/ThemeToggle';
import CajaList from './features/caja/views/CajaList';

// --- IMPORTACIONES DE DASHBOARDS
import DashboardVentas from './features/dashboards/views/DashboardVentas';
import DashboardCompras from './features/dashboards/views/DashboardCompras';
import DashboardInventario from './features/dashboards/views/DashboardInventario';
import DashboardReparaciones from './features/dashboards/views/DashboardReparaciones';
import DashboardControl from './features/dashboards/views/DashboardControl';
import DashboardFinanciero from './features/dashboards/views/DashboardFinanciero';
import DashboardCaja from './features/dashboards/views/DashboardCaja';

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
    {/* Único switch de tema del sistema: fuera de <Routes> para que aparezca en
        todas las pantallas, públicas e internas. */}
    <ThemeToggle />
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
        <Route path="dashboard">
          {/* Ruta base del hub: /app/dashboard */}
          <Route index element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          } />
          
          {/* Sub-módulo: /app/dashboard/ventas */}
          <Route path="ventas" element={<AdminRoute><DashboardVentas /></AdminRoute>} />
          <Route path="compras" element={<AdminRoute><DashboardCompras /></AdminRoute>} /> 
          <Route path="inventario" element={<AdminRoute><DashboardInventario /></AdminRoute>} />
          <Route path="reparaciones" element={<AdminRoute><DashboardReparaciones /></AdminRoute>} />
          <Route path="control" element={<AdminRoute><DashboardControl /></AdminRoute>} />
          <Route path="financiero" element={<AdminRoute><DashboardFinanciero /></AdminRoute>} />
          <Route path="caja" element={<AdminRoute><DashboardCaja /></AdminRoute>} />
        </Route>

        {/* -------- VENTAS Y POS -------- */}
        <Route path="ventas/historial" element={<HistorialVentas />} />
        <Route path="punto-venta" element={<PuntoVentaScreen />} />
        <Route path="ventas/detalle/:id" element={<TicketVenta />} />

        {/* -------- INVENTARIO (solo listado + traspaso; el alta entra por Compras) -------- */}
        <Route path="inventario" element={<InventarioList />} />
        <Route path="inventario/detalle/:id" element={<InventarioDetails />} />

        {/* -------- COMPRAS / ABASTECIMIENTO -------- */}
        <Route path="compras" element={<AdminRoute><ComprasList /></AdminRoute>} />

        {/* -------- CAJA -------- */}
        <Route path="caja" element={<AdminRoute><CajaList /></AdminRoute>} />

        {/* -------- PRECIOS -------- */}
        <Route path="precios" element={<AdminRoute><PreciosScreen /></AdminRoute>} />

        {/* -------- REPORTES -------- */}
        <Route path="reportes" element={<ReportesScreen />} />

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
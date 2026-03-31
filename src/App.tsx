import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import PublicListings from './pages/PublicListings';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import SeedData from './pages/SeedData';
import PropertyDetails from './pages/PropertyDetails';
import Contracts from './pages/Contracts';
import Maintenance from './pages/Maintenance';
import Payments from './pages/Payments';
import Messaging from './pages/Messaging';
import Profile from './pages/Profile';
import Inspections from './pages/Inspections';
import Tenants from './pages/Tenants';
import BrowseProperties from './pages/BrowseProperties';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Blog from './pages/Blog';
import AdminLayout from './components/admin/AdminLayout';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProperties from './pages/admin/AdminProperties';
import AdminLeases from './pages/admin/AdminLeases';
import AdminFinance from './pages/admin/AdminFinance';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import AdminCommunication from './pages/admin/AdminCommunication';
import AdminSupport from './pages/admin/AdminSupport';
import AdminReports from './pages/admin/AdminReports';
import AdminAudit from './pages/admin/AdminAudit';
import AdminRoles from './pages/admin/AdminRoles';
import AdminSettings from './pages/admin/AdminSettings';

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<PublicListings />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/login" element={!user ? <Login /> : (profile?.userType === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/dashboard" />)} />
      <Route path="/admin/login" element={!user ? <AdminLogin /> : (profile?.userType === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/dashboard" />)} />
      
      {/* General User Layout */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/properties" element={user ? <Properties /> : <Navigate to="/login" />} />
        <Route path="/seed" element={user ? <SeedData /> : <Navigate to="/login" />} />
        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/messages" element={<Messaging />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/inspections" element={<Inspections />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/browse" element={<BrowseProperties />} />
      </Route>

      {/* Admin Specific Layout */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users/:type" element={<AdminUsers />} />
        <Route path="properties" element={<AdminProperties />} />
        <Route path="leases" element={<AdminLeases />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="maintenance" element={<AdminMaintenance />} />
        <Route path="communication" element={<AdminCommunication />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}


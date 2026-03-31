import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import AdminSidebar from './AdminSidebar';
import { 
  Bell, 
  Search, 
  LogOut, 
  HelpCircle, 
  Settings, 
  User,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';

const AdminLayout: React.FC = () => {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  if (loading) return null;

  if (profile?.userType !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-8 bg-slate-900 text-white">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-md">You do not have administrative privileges to access this area.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <AdminSidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden ml-64">
        {/* Admin Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Global Search: Properties, Users, Leases, Tickets..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-900/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">
              <Activity className="w-3 h-3" />
              System Healthy
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600">
                <HelpCircle className="w-5 h-5" />
              </button>
              
              <div className="h-8 w-px bg-slate-200 mx-2"></div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-slate-900">{profile?.firstName} {profile?.lastName}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Super Admin</p>
                </div>
                <div className="group relative">
                  <button className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">
                    {profile?.firstName?.charAt(0) || 'A'}
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      <User className="w-4 h-4" />
                      My Profile
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      <Settings className="w-4 h-4" />
                      Admin Settings
                    </button>
                    <div className="h-px bg-slate-100 my-2 mx-4"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Admin Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

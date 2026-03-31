import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  FileText, 
  CreditCard, 
  Wrench, 
  MessageSquare, 
  User as UserIcon, 
  LogOut,
  Bell,
  Search,
  ClipboardCheck,
  BookOpen,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

const Layout: React.FC = () => {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['tenant', 'landlord', 'manager', 'vendor', 'admin'] },
    { name: 'Browse Properties', path: '/browse', icon: Search, roles: ['tenant'] },
    { name: 'Properties', path: '/properties', icon: Home, roles: ['landlord', 'manager'] },
    { name: 'Tenants', path: '/tenants', icon: Users, roles: ['landlord', 'manager'] },
    { name: 'Contracts', path: '/contracts', icon: FileText, roles: ['tenant', 'landlord', 'manager'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['tenant', 'landlord', 'manager'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['tenant', 'landlord', 'manager', 'vendor'] },
    { name: 'Inspections', path: '/inspections', icon: ClipboardCheck, roles: ['landlord', 'manager'] },
    { name: 'Messages', path: '/messages', icon: MessageSquare, roles: ['tenant', 'landlord', 'manager', 'vendor'] },
    { name: 'User Management', path: '/admin/dashboard', icon: ShieldAlert, roles: ['admin'] },
    { name: 'Profile', path: '/profile', icon: UserIcon, roles: ['tenant', 'landlord', 'manager', 'vendor', 'admin'] },
  ];

  const filteredNav = navItems.filter(item => profile && item.roles.includes(profile.userType));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f2a4a] text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight">PropertyAZ</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Property Management</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-widest px-3 mb-2">Main Menu</p>
          {filteredNav.map((item) => (
            <Link
              key={`${item.name}-${item.path}`}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path 
                  ? "bg-white/10 text-white" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/profile')}>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  {profile?.firstName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{profile?.firstName} {profile?.lastName}</p>
                  <p className="text-[10px] text-white/40 capitalize">{profile?.userType}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 mt-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link 
                to="/login?mode=login" 
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Sign In
              </Link>
              <Link 
                to="/login?mode=signup" 
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Register
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search properties, tenants..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-900/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-xs font-medium text-slate-900">{new Date().toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</p>
              <p className="text-[10px] text-slate-500">Dhaka, Bangladesh</p>
            </div>
            {user && (
              <>
                <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                <button className="bg-[#0f2a4a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a1e36] transition-colors">
                  + New Action
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

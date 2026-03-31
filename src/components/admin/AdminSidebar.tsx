import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileText, 
  CreditCard, 
  Wrench, 
  MessageSquare, 
  ShieldAlert, 
  Settings, 
  ClipboardCheck, 
  History, 
  LifeBuoy,
  Megaphone,
  UserCheck,
  UserCog,
  HardHat,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    users: true
  });

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { 
      name: 'User Management', 
      id: 'users',
      icon: Users,
      subItems: [
        { name: 'All Tenants', path: '/admin/users/tenants', icon: UserCheck },
        { name: 'All Landlords', path: '/admin/users/landlords', icon: Building2 },
        { name: 'Property Managers', path: '/admin/users/managers', icon: ShieldAlert },
        { name: 'Service Providers', path: '/admin/users/vendors', icon: HardHat },
        { name: 'System Admins', path: '/admin/users/admins', icon: UserCog },
      ]
    },
    { name: 'Properties', path: '/admin/properties', icon: Building2 },
    { name: 'Lease & Tenants', path: '/admin/leases', icon: FileText },
    { name: 'Financial Records', path: '/admin/finance', icon: CreditCard },
    { name: 'Maintenance', path: '/admin/maintenance', icon: Wrench },
    { name: 'Communication', path: '/admin/communication', icon: Megaphone },
    { name: 'Support Tickets', path: '/admin/support', icon: LifeBuoy },
    { name: 'Compliance & Reports', path: '/admin/reports', icon: ClipboardCheck },
    { name: 'Audit Logs', path: '/admin/audit', icon: History },
    { name: 'Roles & Permissions', path: '/admin/roles', icon: ShieldAlert },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0f2a4a] text-white flex flex-col flex-shrink-0 h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">PropertyAZ</h1>
        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Admin Control Panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {navItems.map((item) => (
          <div key={item.name}>
            {item.subItems ? (
              <div className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.id!)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </div>
                  {openMenus[item.id!] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {openMenus[item.id!] && (
                  <div className="ml-4 pl-4 border-l border-white/10 space-y-1">
                    {item.subItems.map(sub => (
                      <Link
                        key={sub.name}
                        to={sub.path}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          location.pathname === sub.path 
                            ? "bg-white/10 text-white" 
                            : "text-white/40 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <sub.icon className="w-3.5 h-3.5" />
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                to={item.path!}
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
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-600/20">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">Super Admin</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">System Owner</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;

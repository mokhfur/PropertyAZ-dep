import React, { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Lock, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus,
  ChevronRight,
  Check,
  X,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'properties' | 'finance' | 'system' | 'support';
}

const PERMISSIONS: Permission[] = [
  { id: 'user_view', name: 'View Users', description: 'Can view user list and profiles', category: 'users' },
  { id: 'user_edit', name: 'Edit Users', description: 'Can modify user details and roles', category: 'users' },
  { id: 'user_delete', name: 'Delete Users', description: 'Can permanently remove user accounts', category: 'users' },
  { id: 'prop_view', name: 'View Properties', description: 'Can view all property listings', category: 'properties' },
  { id: 'prop_edit', name: 'Edit Properties', description: 'Can modify property details', category: 'properties' },
  { id: 'fin_view', name: 'View Finance', description: 'Can view financial reports and records', category: 'finance' },
  { id: 'sys_settings', name: 'System Settings', description: 'Can modify global system configuration', category: 'system' },
  { id: 'sup_manage', name: 'Manage Support', description: 'Can respond to support tickets', category: 'support' },
];

const AdminRoles: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('super_admin');
  const [roles, setRoles] = useState([
    { id: 'super_admin', name: 'Super Admin', description: 'Full system access with all permissions', users: 2, permissions: PERMISSIONS.map(p => p.id) },
    { id: 'admin', name: 'System Admin', description: 'General administrative access', users: 5, permissions: ['user_view', 'user_edit', 'prop_view', 'prop_edit', 'sup_manage'] },
    { id: 'support', name: 'Support Agent', description: 'Access to support and user viewing', users: 8, permissions: ['user_view', 'sup_manage'] },
  ]);

  const currentRole = roles.find(r => r.id === selectedRole);

  const togglePermission = (roleId: string, permId: string) => {
    if (roleId === 'super_admin') return; // Super admin permissions are locked
    setRoles(roles.map(role => {
      if (role.id === roleId) {
        const hasPerm = role.permissions.includes(permId);
        return {
          ...role,
          permissions: hasPerm 
            ? role.permissions.filter(id => id !== permId)
            : [...role.permissions, permId]
        };
      }
      return role;
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions</h2>
          <p className="text-sm text-slate-500">Define access levels and security permissions for administrative staff</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4" />
          Create New Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">System Roles</h3>
          <div className="space-y-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "w-full p-5 text-left rounded-3xl border transition-all group relative",
                  selectedRole === role.id 
                    ? "bg-white border-blue-600 shadow-xl shadow-blue-600/5 ring-1 ring-blue-600/10" 
                    : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                    role.id === 'super_admin' ? "bg-red-50 text-red-600" :
                    role.id === 'admin' ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-600"
                  )}>
                    {role.id === 'super_admin' ? <ShieldAlert className="w-5 h-5" /> :
                     role.id === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600">{role.users}</span>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{role.name}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{role.description}</p>
                
                {selectedRole === role.id && (
                  <motion.div 
                    layoutId="active-role"
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Security Tip</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Always follow the principle of least privilege. Only grant permissions that are absolutely necessary for a role's function.
            </p>
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="lg:col-span-2">
          {currentRole && (
            <motion.div 
              key={currentRole.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{currentRole.name} Permissions</h3>
                  <p className="text-xs text-slate-500">Configure what users with this role can see and do</p>
                </div>
                {currentRole.id === 'super_admin' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    <Lock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Read-Only</span>
                  </div>
                )}
              </div>

              <div className="p-8 space-y-8">
                {(['users', 'properties', 'finance', 'support', 'system'] as const).map((category) => (
                  <div key={category} className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      {category} Management
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {PERMISSIONS.filter(p => p.category === category).map((perm) => {
                        const isEnabled = currentRole.permissions.includes(perm.id);
                        return (
                          <button
                            key={perm.id}
                            disabled={currentRole.id === 'super_admin'}
                            onClick={() => togglePermission(currentRole.id, perm.id)}
                            className={cn(
                              "flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group",
                              isEnabled 
                                ? "bg-blue-50/50 border-blue-100" 
                                : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                          >
                            <div className={cn(
                              "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all",
                              isEnabled ? "bg-blue-600 text-white" : "bg-slate-100 text-transparent border border-slate-200"
                            )}>
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className={cn(
                                "text-sm font-bold transition-colors",
                                isEnabled ? "text-blue-900" : "text-slate-700"
                              )}>{perm.name}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{perm.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Reset Changes</button>
                <button 
                  disabled={currentRole.id === 'super_admin'}
                  className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Permissions
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoles;

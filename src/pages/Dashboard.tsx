import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import LandlordDashboard from '../components/dashboards/LandlordDashboard';
import TenantDashboard from '../components/dashboards/TenantDashboard';
import ManagerDashboard from '../components/dashboards/ManagerDashboard';
import VendorDashboard from '../components/dashboards/VendorDashboard';
import { User, Building2, ShieldCheck, Wrench, ArrowRight } from 'lucide-react';
import { UserType } from '../types';
import { cn } from '../lib/utils';
import { Navigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { profile, setRole, user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserType | null>(null);
  const [isSettingRole, setIsSettingRole] = useState(false);

  if (!profile) {
    if (!user) return null;

    const roles = [
      { id: 'tenant', title: 'Tenant', icon: User, desc: 'Find a home and manage your rent' },
      { id: 'landlord', title: 'Landlord', icon: Building2, desc: 'Manage your properties and tenants' },
      { id: 'manager', title: 'Property Manager', icon: ShieldCheck, desc: 'Manage properties for landlords' },
      { id: 'vendor', title: 'Service Provider', icon: Wrench, desc: 'Find maintenance and repair jobs' },
    ];

    const handleCompleteProfile = async () => {
      if (!selectedRole) return;
      setIsSettingRole(true);
      try {
        await setRole(selectedRole);
      } catch (err) {
        console.error('Error setting role:', err);
      } finally {
        setIsSettingRole(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mb-6">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Profile</h2>
        <p className="text-slate-500 mb-8">It looks like you haven't selected a role yet. Please choose how you'll be using PropertyAZ.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id as UserType)}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 text-center transition-all",
                selectedRole === role.id 
                  ? "border-blue-900 bg-blue-50" 
                  : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                selectedRole === role.id ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-500"
              )}>
                <role.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{role.title}</p>
                <p className="text-[10px] text-slate-400 mt-1">{role.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleCompleteProfile}
          disabled={!selectedRole || isSettingRole}
          className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSettingRole ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              Continue to Dashboard
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  if (profile.userType === 'admin') {
    return <Navigate to="/admin/dashboard" />;
  }

  switch (profile.userType) {
    case 'landlord':
      return <LandlordDashboard />;
    case 'tenant':
      return <TenantDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'vendor':
      return <VendorDashboard />;
    default:
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-500 italic">Role not recognized. Please contact support.</p>
        </div>
      );
  }
};

export default Dashboard;

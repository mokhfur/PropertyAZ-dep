import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { User, Lease, Property } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const Tenants: React.FC = () => {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState<(User & { lease?: Lease; property?: Property })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      if (!profile) return;
      try {
        // 1. Fetch all leases for this landlord/manager
        const leaseQ = query(collection(db, 'leases'), where('landlordOrManager', '==', profile.uid));
        const leaseSnap = await getDocs(leaseQ).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
        
        if (!leaseSnap || leaseSnap.empty) {
          setTenants([]);
          setLoading(false);
          return;
        }

        const leases = leaseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease));
        const tenantIds = Array.from(new Set(leases.map(l => l.tenant)));
        const propertyIds = Array.from(new Set(leases.map(l => l.property)));

        // 2. Fetch Tenant Details
        const tenantData: { [key: string]: User } = {};
        // Firestore 'in' query limit is 10, so we might need to chunk if there are many tenants
        // For now, we'll assume a reasonable number or fetch individually if needed
        for (const tid of tenantIds) {
          const tSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', tid))).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
          if (tSnap && !tSnap.empty) {
            tenantData[tid] = { uid: tSnap.docs[0].id, ...tSnap.docs[0].data() } as User;
          }
        }

        // 3. Fetch Property Details
        const propertyData: { [key: string]: Property } = {};
        for (const pid of propertyIds) {
          const pSnap = await getDocs(query(collection(db, 'properties'), where('id', '==', pid))).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
          if (pSnap && !pSnap.empty) {
            propertyData[pid] = { id: pSnap.docs[0].id, ...pSnap.docs[0].data() } as Property;
          }
        }

        // 4. Combine Data
        const combined = leases.map(lease => {
          const tenant = tenantData[lease.tenant];
          const property = propertyData[lease.property];
          return {
            ...tenant,
            lease,
            property
          };
        }).filter(t => t.uid); // Ensure we have the user data

        setTenants(combined as any);
      } catch (err) {
        console.error('Error fetching tenants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [profile]);

  const filteredTenants = tenants.filter(t => 
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.property?.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Tenants', value: tenants.length, icon: Users, color: 'blue', sub: 'Active residents' },
    { label: 'Monthly Revenue', value: `৳${tenants.reduce((sum, t) => sum + (t.lease?.rentAmount || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'green', sub: 'From active leases' },
    { label: 'Pending Signatures', value: tenants.filter(t => t.lease?.status === 'pending_tenant').length, icon: Clock, color: 'amber', sub: 'Awaiting tenant' },
    { label: 'Expiring Soon', value: tenants.filter(t => {
      if (!t.lease?.endDate) return false;
      const end = new Date(t.lease.endDate);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    }).length, icon: AlertCircle, color: 'red', sub: 'Next 30 days' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tenants Summary</h2>
          <p className="text-sm text-slate-500">Manage and monitor your tenant relationships</p>
        </div>
        <button className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0a1e36] transition-all flex items-center gap-2 shadow-sm">
          <UserPlus className="w-4 h-4" />
          Add New Lease
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
              stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
              stat.color === 'green' ? "bg-green-50 text-green-600" :
              stat.color === 'amber' ? "bg-amber-50 text-amber-600" :
              "bg-red-50 text-red-600"
            )}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            <p className="text-[10px] text-slate-400 mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or property..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-900/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg">
              <Filter className="w-4 h-4" />
            </button>
            <select className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-blue-900/10">
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Expired</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tenant</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lease Period</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rent</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.length > 0 ? filteredTenants.map((tenant) => (
                <tr key={tenant.lease?.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {tenant.firstName?.charAt(0)}{tenant.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tenant.firstName} {tenant.lastName}</p>
                        <p className="text-[10px] text-slate-500">{tenant.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-600 font-medium">{tenant.property?.address || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] text-slate-600">
                        {tenant.lease ? `${new Date(tenant.lease.startDate).toLocaleDateString()} - ${new Date(tenant.lease.endDate).toLocaleDateString()}` : 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">৳{tenant.lease?.rentAmount.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Monthly</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                      tenant.lease?.status === 'active' ? "bg-green-50 text-green-600" :
                      tenant.lease?.status === 'pending_tenant' ? "bg-amber-50 text-amber-600" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {tenant.lease?.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No tenants found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Tenants;

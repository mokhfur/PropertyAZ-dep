import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { Property, MaintenanceRequest, Payment, Lease } from '../../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Home, 
  CreditCard, 
  Wrench, 
  ArrowUpRight, 
  MoreVertical,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const LandlordDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        // Fetch Properties
        const propQ = query(collection(db, 'properties'), where('landlordOrManager', '==', profile.uid));
        const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
        let fetchedProps: Property[] = [];
        if (propSnap) {
          fetchedProps = propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
          setProperties(fetchedProps);
        }

        // Fetch Leases
        const leaseQ = query(collection(db, 'leases'), where('landlordOrManager', '==', profile.uid));
        const leaseSnap = await getDocs(leaseQ).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
        let fetchedLeases: Lease[] = [];
        if (leaseSnap) {
          fetchedLeases = leaseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease));
          setLeases(fetchedLeases);
        }

        // Fetch Maintenance
        const maintQ = query(collection(db, 'maintenance'), where('landlordOrManager', '==', profile.uid), limit(5));
        const maintSnap = await getDocs(maintQ).catch(err => handleFirestoreError(err, OperationType.GET, 'maintenance'));
        if (maintSnap) {
          const maints = maintSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
          setMaintenance(maints);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const activeLeases = leases.filter(l => l.status === 'active');
  const monthlyRevenue = activeLeases.reduce((sum, l) => sum + l.rentAmount, 0);
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

  const kpis = [
    { label: 'Monthly Revenue', value: `৳${monthlyRevenue.toLocaleString()}`, sub: monthlyRevenue > 0 ? '↑ From active leases' : 'No active leases', trend: monthlyRevenue > 0 ? 'up' : 'neutral', color: 'blue' },
    { label: 'Total Properties', value: totalProperties.toString(), sub: `Managed by you`, trend: 'neutral', color: 'slate' },
    { label: 'Portfolio Status', value: `${occupiedProperties} / ${totalProperties}`, sub: `${totalProperties - occupiedProperties} Vacant Properties`, trend: occupancyRate > 80 ? 'up' : 'neutral', color: 'green' },
    { label: 'Active Leases', value: activeLeases.length.toString(), sub: `${leases.filter(l => l.status === 'pending_tenant').length} pending signature`, trend: 'neutral', color: 'red' },
  ];

  const chartData = [
    { name: 'Oct', income: monthlyRevenue * 0.8, expenses: monthlyRevenue * 0.4 },
    { name: 'Nov', income: monthlyRevenue * 0.9, expenses: monthlyRevenue * 0.45 },
    { name: 'Dec', income: monthlyRevenue * 0.85, expenses: monthlyRevenue * 0.42 },
    { name: 'Jan', income: monthlyRevenue * 0.95, expenses: monthlyRevenue * 0.48 },
    { name: 'Feb', income: monthlyRevenue * 0.92, expenses: monthlyRevenue * 0.46 },
    { name: 'Mar', income: monthlyRevenue, expenses: monthlyRevenue * 0.5 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className={cn(
              "absolute top-0 left-0 w-full h-1",
              kpi.color === 'blue' ? "bg-blue-900" : 
              kpi.color === 'green' ? "bg-green-500" : 
              kpi.color === 'red' ? "bg-red-500" : "bg-slate-400"
            )}></div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">{kpi.label}</p>
            <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
            <div className="flex items-center gap-1 mt-2">
              {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
              {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={cn(
                "text-[10px] font-medium",
                kpi.trend === 'up' ? "text-green-600" : 
                kpi.trend === 'down' ? "text-red-600" : "text-slate-400"
              )}>
                {kpi.sub}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Rent Collection — {new Date().toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</h3>
            <button className="text-xs text-blue-600 font-semibold hover:underline">Full Report</button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `৳${val/1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="income" fill="#0f2a4a" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="expenses" fill="#B5D4F4" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Collected</p>
              <p className="text-lg font-bold text-green-600">৳1,06,500</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pending</p>
              <p className="text-lg font-bold text-amber-600">৳18,000</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Expected</p>
              <p className="text-lg font-bold text-slate-900">৳1,24,500</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Maintenance Requests</h3>
            <button className="text-xs text-blue-600 font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {maintenance.length > 0 ? maintenance.map((req) => (
              <div key={req.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  req.urgency === 'emergency' ? "bg-red-500" : 
                  req.urgency === 'urgent' ? "bg-amber-500" : "bg-slate-300"
                )}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{req.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{properties.find(p => p.id === req.propertyId)?.address || 'Property Details'} · {new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                  req.urgency === 'emergency' ? "bg-red-50 text-red-600" : 
                  req.urgency === 'urgent' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                )}>
                  {req.urgency}
                </span>
              </div>
            )) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-20" />
                <p className="text-xs text-slate-400">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Your Properties</h3>
          <Link to="/properties" className="text-xs text-blue-600 font-semibold hover:underline">Manage All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <Link 
              key={prop.id} 
              to={`/properties/${prop.id}`}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-900 transition-all cursor-pointer group block"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors">{prop.address}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{prop.propertyType}</p>
                </div>
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Rent</p>
                  <p className="text-sm font-bold text-slate-900">৳{prop.rentAmount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Type</p>
                  <p className="text-sm font-bold text-slate-900">{prop.propertyType}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-medium">
                  <span className="text-slate-500">Status</span>
                  <span className={cn(
                    "font-bold uppercase",
                    prop.status === 'vacant' ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {prop.status === 'vacant' ? 'Available' : prop.status}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={cn(
                    "h-full rounded-full",
                    prop.status === 'vacant' ? "bg-emerald-500" : "bg-amber-500"
                  )} style={{ width: prop.status === 'vacant' ? '100%' : '100%' }}></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;

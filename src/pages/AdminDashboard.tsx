import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, addDoc, where, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { User, UserType, Property, Lease, MaintenanceRequest, SupportTicket } from '../types';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Ban, 
  CheckCircle, 
  Search, 
  Filter,
  Shield,
  Mail,
  Calendar,
  MoreVertical,
  X,
  Building2,
  FileText,
  CreditCard,
  Wrench,
  LifeBuoy,
  AlertTriangle,
  AlertCircle,
  Activity,
  ArrowUpRight,
  Clock,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    tenants: 0,
    landlords: 0,
    properties: 0,
    managers: 0,
    vendors: 0,
    activeLeases: 0,
    pendingMaintenance: 0,
    overduePayments: 0,
    monthlyRevenue: 0,
    supportTickets: 0,
    suspendedAccounts: 0
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile || profile.userType !== 'admin') return;
      try {
        // Fetch Users
        const usersSnap = await getDocs(collection(db, 'users'))
          .catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
        const usersList = usersSnap ? usersSnap.docs.map(doc => doc.data() as User) : [];
        
        // Fetch Properties
        const propertiesSnap = await getDocs(collection(db, 'properties'))
          .catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
        
        // Fetch Leases
        const leasesSnap = await getDocs(query(collection(db, 'leases'), where('status', '==', 'active')))
          .catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
        
        // Fetch Maintenance
        const maintenanceSnap = await getDocs(query(collection(db, 'maintenance'), where('status', '==', 'pending')))
          .catch(err => handleFirestoreError(err, OperationType.GET, 'maintenance'));
        
        // Fetch Support
        const supportSnap = await getDocs(query(collection(db, 'supportTickets'), where('status', '==', 'open')))
          .catch(err => handleFirestoreError(err, OperationType.GET, 'supportTickets'));

        setStats({
          tenants: usersList.filter(u => u.userType === 'tenant').length,
          landlords: usersList.filter(u => u.userType === 'landlord').length,
          managers: usersList.filter(u => u.userType === 'manager').length,
          vendors: usersList.filter(u => u.userType === 'vendor').length,
          suspendedAccounts: usersList.filter(u => u.blocked).length,
          properties: propertiesSnap ? propertiesSnap.size : 0,
          activeLeases: leasesSnap ? leasesSnap.size : 0,
          pendingMaintenance: maintenanceSnap ? maintenanceSnap.size : 0,
          supportTickets: supportSnap ? supportSnap.size : 0,
          overduePayments: 0, // Mock for now
          monthlyRevenue: 1250000 // Mock for now (BDT)
        });

        // Recent Users
        const recentUsersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
        const recentUsersSnap = await getDocs(recentUsersQuery)
          .catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
        if (recentUsersSnap) {
          setRecentUsers(recentUsersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
        }

        // Pending Approvals (Users not verified)
        setPendingApprovals(usersList.filter(u => !u.verified).slice(0, 5));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const summaryCards = [
    { label: 'Total Tenants', value: stats.tenants, icon: Users, color: 'blue' },
    { label: 'Total Landlords', value: stats.landlords, icon: Building2, color: 'indigo' },
    { label: 'Total Properties', value: stats.properties, icon: Building2, color: 'emerald' },
    { label: 'Property Managers', value: stats.managers, icon: Shield, color: 'purple' },
    { label: 'Total Vendors', value: stats.vendors, icon: Wrench, color: 'orange' },
    { label: 'Active Leases', value: stats.activeLeases, icon: FileText, color: 'cyan' },
    { label: 'Pending Maintenance', value: stats.pendingMaintenance, icon: AlertTriangle, color: 'amber' },
    { label: 'Overdue Payments', value: stats.overduePayments, icon: Clock, color: 'red' },
    { label: 'Monthly Revenue', value: `৳${stats.monthlyRevenue.toLocaleString()}`, icon: CreditCard, color: 'green' },
    { label: 'Support Tickets', value: stats.supportTickets, icon: LifeBuoy, color: 'pink' },
    { label: 'Suspended Accounts', value: stats.suspendedAccounts, icon: Ban, color: 'slate' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Overview</h2>
          <p className="text-slate-500 mt-1">Real-time performance and management metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2 shadow-sm">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div 
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
              `bg-${card.color}-50 text-${card.color}-600`
            )}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs font-medium text-slate-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity & Approvals */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Registrations */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Recent Registrations
              </h3>
              <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentUsers.map(user => (
                <div key={user.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {user.firstName?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                      {user.userType}
                    </span>
                    <p className="text-[10px] text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                Pending Approvals
              </h3>
              <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-bold">
                {pendingApprovals.length} Action Required
              </span>
            </div>
            <div className="p-6">
              {pendingApprovals.length > 0 ? (
                <div className="space-y-4">
                  {pendingApprovals.map(user => (
                    <div key={user.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                          <p className="text-[10px] text-slate-500">Role: {user.userType}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-white text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50">View Docs</button>
                        <button className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">All accounts are verified</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: System Health & Alerts */}
        <div className="space-y-8">
          {/* System Health Widget */}
          <div className="bg-[#0f2a4a] text-white rounded-3xl p-6 shadow-xl shadow-blue-900/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                System Health
              </h3>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-white/60">Server Load</span>
                  <span className="font-bold">24%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 w-[24%]"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Last Backup</p>
                  <p className="text-xs font-bold">2h ago</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Active Users</p>
                  <p className="text-xs font-bold">1,240</p>
                </div>
              </div>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                System Logs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Admin Alerts */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Critical Alerts
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { title: 'Security: Failed Login Spikes', desc: 'Multiple failed attempts from IP 103.x.x.x', type: 'error' },
                { title: 'Compliance: License Expiry', desc: '5 properties have expired trade licenses', type: 'warning' },
                { title: 'Finance: Large Refund Request', desc: 'Refund of ৳50,000 pending approval', type: 'info' }
              ].map((alert, i) => (
                <div key={i} className={cn(
                  "p-4 rounded-2xl border flex gap-3",
                  alert.type === 'error' ? "bg-red-50 border-red-100" : 
                  alert.type === 'warning' ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    alert.type === 'error' ? "bg-red-500" : 
                    alert.type === 'warning' ? "bg-amber-500" : "bg-blue-500"
                  )}></div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{alert.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

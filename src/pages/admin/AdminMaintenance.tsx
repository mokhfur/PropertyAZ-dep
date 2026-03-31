import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  Wrench, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  MoreVertical,
  Eye,
  User,
  Building2,
  MapPin,
  Calendar,
  Hammer
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const AdminMaintenance: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'maintenance'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'maintenance'));
        if (snap) {
          setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'cancelled': return 'text-slate-600 bg-slate-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      case 'low': return 'text-slate-600 bg-slate-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const filteredRequests = requests.filter(r => 
    (r.title + ' ' + r.propertyId).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || r.status === filterStatus)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance Coordination</h2>
          <p className="text-sm text-slate-500">Oversee all repair requests, vendor assignments, and service quality</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600">12 Active Vendors Online</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Requests', value: requests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-amber-600' },
          { label: 'In Progress', value: requests.filter(r => r.status === 'in-progress').length, icon: Hammer, color: 'text-blue-600' },
          { label: 'Urgent Repairs', value: requests.filter(r => r.priority === 'urgent').length, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Completed (MTD)', value: requests.filter(r => r.status === 'completed').length, icon: CheckCircle2, color: 'text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50 mb-4", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by issue or property ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none appearance-none focus:ring-2 focus:ring-blue-600/10"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10"
          />
        </div>
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 h-32 animate-pulse" />
          ))
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
            <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No maintenance requests found</p>
          </div>
        ) : filteredRequests.map((request) => (
          <motion.div
            layout
            key={request.id}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg",
                    getPriorityColor(request.priority)
                  )}>
                    {request.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{request.id.slice(0, 8)}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{request.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Prop: {request.propertyId.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Unit: {request.unitNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 lg:border-l lg:pl-8 border-slate-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg block text-center",
                    getStatusColor(request.status)
                  )}>
                    {request.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Vendor</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{request.vendorName || 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminMaintenance;

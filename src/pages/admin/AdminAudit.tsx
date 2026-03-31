import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { AuditLog } from '../../types';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Activity, 
  Calendar, 
  Shield, 
  ArrowRight,
  Download,
  RefreshCcw,
  Info,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const AdminAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50));
        if (filterAction !== 'all') {
          q = query(collection(db, 'auditLogs'), where('action', '==', filterAction), orderBy('createdAt', 'desc'), limit(50));
        }
        const snap = await getDocs(q);
        setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [filterAction]);

  const getActionColor = (action: string) => {
    if (action.includes('delete')) return 'text-red-600 bg-red-50';
    if (action.includes('create')) return 'text-emerald-600 bg-emerald-50';
    if (action.includes('update')) return 'text-blue-600 bg-blue-50';
    if (action.includes('block')) return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-50';
  };

  const filteredLogs = logs.filter(log => 
    (log.adminName + ' ' + log.action + ' ' + log.targetId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Trails</h2>
          <p className="text-sm text-slate-500">Comprehensive log of all administrative actions and system events</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <RefreshCcw className="w-5 h-5" />
          </button>
          <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by admin, action, or target ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none appearance-none focus:ring-2 focus:ring-blue-600/10"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="create_user">Create User</option>
            <option value="update_user">Update User</option>
            <option value="delete_user">Delete User</option>
            <option value="block_user">Block User</option>
            <option value="unblock_user">Unblock User</option>
            <option value="update_settings">System Settings</option>
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

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No activity logs found</td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{log.adminName}</p>
                        <p className="text-[10px] text-slate-400">ID: {log.adminId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg",
                      getActionColor(log.action)
                    )}>
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{log.targetType}:</span>
                      <span className="text-sm font-medium text-slate-600">{log.targetId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-500 line-clamp-1 flex-1">
                        {log.details || 'No additional details provided'}
                      </p>
                      <button className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Alerts Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Security Insights
            </h3>
            <button className="text-[10px] font-bold text-blue-600 uppercase hover:underline">View Report</button>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Failed Login Attempts', value: '12', trend: '+2', color: 'text-amber-600' },
              { label: 'Password Resets', value: '4', trend: '-1', color: 'text-blue-600' },
              { label: 'New Admin Created', value: '0', trend: '0', color: 'text-slate-600' }
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-medium text-slate-600">{stat.label}</span>
                <div className="flex items-center gap-3">
                  <span className={cn("text-lg font-bold", stat.color)}>{stat.value}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    stat.trend.startsWith('+') ? "bg-red-50 text-red-600" : 
                    stat.trend.startsWith('-') ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>{stat.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-red-900">Critical Alerts</h4>
              <p className="text-xs text-red-700 leading-relaxed">
                There are 3 unresolved security alerts that require immediate attention.
              </p>
            </div>
          </div>
          <button className="w-full mt-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
            Resolve Alerts
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAudit;

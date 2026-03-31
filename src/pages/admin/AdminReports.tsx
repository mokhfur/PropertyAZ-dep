import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

const AdminReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('available');

  const reportCategories = [
    { id: 'financial', name: 'Financial Reports', icon: TrendingUp, count: 12 },
    { id: 'occupancy', name: 'Occupancy & Leasing', icon: BarChart3, count: 8 },
    { id: 'maintenance', name: 'Maintenance Analysis', icon: PieChartIcon, count: 5 },
    { id: 'system', name: 'System Performance', icon: AlertCircle, count: 3 },
  ];

  const availableReports = [
    { id: '1', title: 'Monthly Revenue Summary', category: 'Financial', lastRun: '2 hours ago', status: 'ready' },
    { id: '2', title: 'Occupancy Rate by Region', category: 'Occupancy', lastRun: '1 day ago', status: 'ready' },
    { id: '3', title: 'Vendor Performance Matrix', category: 'Maintenance', lastRun: '3 days ago', status: 'ready' },
    { id: '4', title: 'User Growth Analytics', category: 'System', lastRun: '5 hours ago', status: 'processing' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Compliance & Reporting</h2>
          <p className="text-sm text-slate-500">Generate, schedule, and archive system-wide administrative reports</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20">
          <FileText className="w-4 h-4" />
          Create New Report
        </button>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {reportCategories.map((cat) => (
          <button
            key={cat.id}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all mb-4">
              <cat.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-900">{cat.name}</p>
            <p className="text-xs text-slate-500 mt-1">{cat.count} Templates Available</p>
          </button>
        ))}
      </div>

      {/* Tabs & List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('available')}
              className={cn(
                "text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all",
                activeTab === 'available' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              Available Reports
            </button>
            <button 
              onClick={() => setActiveTab('scheduled')}
              className={cn(
                "text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all",
                activeTab === 'scheduled' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              Scheduled
            </button>
            <button 
              onClick={() => setActiveTab('archives')}
              className={cn(
                "text-xs font-bold uppercase tracking-widest pb-1 border-b-2 transition-all",
                activeTab === 'archives' ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent hover:text-slate-600"
              )}
            >
              Archives
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search reports..."
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-600/10"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {availableReports.map((report) => (
            <div key={report.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{report.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{report.category}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>Last run: {report.lastRun}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {report.status === 'processing' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold uppercase">Processing</span>
                    </div>
                  ) : (
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}
                  <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Compliance Status: Healthy</span>
            </div>
            <h3 className="text-xl font-bold">System Compliance Checklist</h3>
            <p className="text-slate-400 text-sm max-w-md">Your platform is currently meeting all regulatory and internal data security requirements for the Bangladesh region.</p>
          </div>
          <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all">
            Run Full Audit
          </button>
        </div>
        {/* Abstract Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
      </div>
    </div>
  );
};

export default AdminReports;

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { MaintenanceRequest, Property } from '../../types';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Phone,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

const VendorDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!profile) return;
      try {
        const q = query(collection(db, 'maintenance'), where('assignedToVendorId', '==', profile.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'maintenance'));
        if (snap) {
          const fetchedJobs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
          setJobs(fetchedJobs);

          // Fetch properties for these jobs
          const propertyIds = [...new Set(fetchedJobs.map(j => j.propertyId))].filter(Boolean);
          if (propertyIds.length > 0) {
            const propQ = query(collection(db, 'properties'), where('__name__', 'in', propertyIds));
            const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
            if (propSnap) {
              setProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [profile]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-[#0f2a4a] text-white p-8 rounded-3xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Service Provider Portal</h2>
          <p className="text-white/60">You have {jobs.filter(j => j.status !== 'completed').length} active jobs assigned to you.</p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Assigned Jobs</h3>
          {jobs.length > 0 ? jobs.map((job) => (
            <div key={job.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-900 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    job.urgency === 'emergency' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  )}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors">{job.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {properties.find(p => p.id === job.propertyId)?.address || 'Property Details'}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                  job.status === 'completed' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                )}>
                  {job.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-6">{job.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                    <Phone className="w-3 h-3" /> Contact Tenant
                  </button>
                </div>
                <button className="text-xs font-bold text-slate-600 hover:text-blue-900 flex items-center gap-1">
                  Update Status <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <p className="text-slate-400 italic">No jobs assigned yet.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Earnings Summary</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">This Month</p>
                <p className="text-2xl font-bold text-slate-900">৳24,500</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pending Payout</p>
                <p className="text-2xl font-bold text-amber-600">৳8,200</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;

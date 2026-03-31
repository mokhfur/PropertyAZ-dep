import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { MaintenanceRequest, Property } from '../types';
import { 
  Wrench, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  User,
  Filter,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Maintenance: React.FC = () => {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    property: '',
    urgency: 'routine' as const
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        const field = profile.userType === 'tenant' ? 'tenant' : 'landlordOrManager';
        const q = query(collection(db, 'maintenance'), where(field, '==', profile.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const fetchedRequests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
        setRequests(fetchedRequests);

        if (profile.userType === 'landlord' || profile.userType === 'manager') {
          const propQ = query(collection(db, 'properties'), where('landlordOrManager', '==', profile.uid));
          const propSnap = await getDocs(propQ);
          setProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
        } else if (profile.userType === 'tenant' && fetchedRequests.length > 0) {
          const propertyIds = [...new Set(fetchedRequests.map(r => r.propertyId))].filter(Boolean);
          if (propertyIds.length > 0) {
            const propQ = query(collection(db, 'properties'), where('__name__', 'in', propertyIds));
            const propSnap = await getDocs(propQ);
            setProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const docData = {
        ...newRequest,
        tenant: profile.uid,
        landlordOrManager: 'mock-landlord-id', // In real app, get from lease
        propertyId: newRequest.property, // Map property to propertyId
        status: 'pending',
        attachedPhotos: [],
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'maintenance'), docData);
      setRequests([{ id: docRef.id, ...docData } as MaintenanceRequest, ...requests]);
      setShowForm(false);
      setNewRequest({ title: '', description: '', property: '', urgency: 'routine' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Maintenance Requests</h2>
          <p className="text-slate-500 text-sm">Track repairs and service requests for your properties</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0a1e36] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filters & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pending</p>
                <p className="text-xl font-bold text-slate-900">{requests.filter(r => r.status === 'pending').length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Emergency</p>
                <p className="text-xl font-bold text-red-600">{requests.filter(r => r.urgency === 'emergency').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Filter By</h3>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search requests..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm" />
              </div>
              <select className="w-full px-4 py-2 bg-slate-50 border-none rounded-lg text-sm appearance-none">
                <option>All Statuses</option>
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Request List */}
        <div className="lg:col-span-2 space-y-4">
          {requests.length > 0 ? requests.map((req) => (
            <div key={req.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-900 transition-all cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    req.urgency === 'emergency' ? "bg-red-50 text-red-600" : 
                    req.urgency === 'urgent' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  )}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors">{req.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{properties.find(p => p.id === req.propertyId)?.address || 'Property Details'}</p>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                  req.status === 'completed' ? "bg-green-50 text-green-600" : 
                  req.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                )}>
                  {req.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-600 line-clamp-2 mb-4">{req.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1 capitalize"><AlertCircle className="w-3 h-3" /> {req.urgency} Urgency</span>
                </div>
                {req.assignedToVendorId && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">V</div>
                    <span className="text-[10px] text-slate-600 font-medium">Assigned to Vendor</span>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900">No requests found</h3>
              <p className="text-slate-500">Everything seems to be in order!</p>
            </div>
          )}
        </div>
      </div>

      {/* New Request Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">New Maintenance Request</h3>
                <p className="text-slate-500 text-sm mb-8">Describe the issue and we'll notify the landlord immediately.</p>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Issue Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Leaking kitchen tap"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newRequest.title}
                      onChange={e => setNewRequest({...newRequest, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Provide more details about the problem..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newRequest.description}
                      onChange={e => setNewRequest({...newRequest, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Urgency</label>
                      <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none"
                        value={newRequest.urgency}
                        onChange={e => setNewRequest({...newRequest, urgency: e.target.value as any})}
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Photos</label>
                      <button type="button" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-center gap-2 text-slate-400">
                        <Camera className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Maintenance;

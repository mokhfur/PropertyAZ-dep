import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Property, UserProfile, Lease, MaintenanceRequest, ManagementAgreement } from '../types';
import { useAuth } from '../AuthContext';
import { 
  MapPin, 
  Home, 
  Users, 
  Wrench, 
  ArrowLeft, 
  MoreVertical,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  User as UserIcon,
  ShieldCheck,
  Plus,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<UserProfile[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Assign Manager states
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<UserProfile[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [mgmtTerms, setMgmtTerms] = useState('');
  const [mgmtCommission, setMgmtCommission] = useState(10);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const propSnap = await getDoc(doc(db, 'properties', id));
        if (propSnap.exists()) {
          const propData = { id: propSnap.id, ...propSnap.data() } as Property;
          setProperty(propData);
          
          // Fetch Owner details
          if (propData.ownerId) {
            const ownerSnap = await getDoc(doc(db, 'users', propData.ownerId));
            if (ownerSnap.exists()) {
              setOwner({ uid: ownerSnap.id, ...ownerSnap.data() } as UserProfile);
            }
          }

          // Fetch management data (only for authorized roles)
          const isAuthorized = profile && ['landlord', 'manager', 'admin'].includes(profile.userType);
          
          if (isAuthorized) {
            // Fetch Leases to get tenants
            const leaseQ = query(collection(db, 'leases'), where('property', '==', id), where('status', '==', 'active'));
            const leaseSnap = await getDocs(leaseQ);
            const tenantIds = leaseSnap.docs.map(d => d.data().tenant);
            
            if (tenantIds.length > 0) {
              const userQ = query(collection(db, 'users'), where('uid', 'in', tenantIds));
              const userSnap = await getDocs(userQ);
              setTenants(userSnap.docs.map(d => d.data() as UserProfile));
            }

            // Fetch Maintenance
            const maintQ = query(collection(db, 'maintenance'), where('propertyId', '==', id));
            const maintSnap = await getDocs(maintQ);
            setMaintenance(maintSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRequest)));
          } else if (profile?.userType === 'tenant') {
            // Tenants can only see their own maintenance requests for this property
            const maintQ = query(
              collection(db, 'maintenance'), 
              where('propertyId', '==', id),
              where('tenant', '==', profile.uid)
            );
            const maintSnap = await getDocs(maintQ);
            setMaintenance(maintSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRequest)));
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, profile]);

  const fetchManagers = async () => {
    try {
      const q = query(collection(db, 'users'), where('userType', '==', 'manager'));
      const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
      if (snap) {
        setAvailableManagers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !property || !selectedManagerId) return;

    setAssigning(true);
    try {
      const agreement: Omit<ManagementAgreement, 'id'> = {
        propertyId: property.id,
        landlordId: profile.uid,
        managerId: selectedManagerId,
        status: 'pending',
        terms: mgmtTerms || 'Standard property management agreement.',
        commissionRate: mgmtCommission,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'managementAgreements'), agreement).catch(err => handleFirestoreError(err, OperationType.WRITE, 'managementAgreements'));
      
      alert('Management request sent successfully!');
      setShowAssignManagerModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const isAuthorized = profile && ['landlord', 'manager', 'admin'].includes(profile.userType);
  const isOwner = profile && property && property.ownerId === profile.uid;

  const handleContactManager = () => {
    if (!user) {
      navigate('/login?mode=login');
      return;
    }
    // Existing logic for logged in users would go here
    alert('Messaging feature coming soon!');
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!property) return <div className="p-8 text-center text-red-500">Property not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-3">
          {isOwner && (
            <button 
              onClick={() => { fetchManagers(); setShowAssignManagerModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Assign Manager
            </button>
          )}
          {isAuthorized && (
            <>
              <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Edit Property</button>
              <button className="px-4 py-2 bg-[#0f2a4a] text-white rounded-xl text-sm font-bold hover:bg-[#0a1e36]">Add Unit</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="aspect-video bg-slate-100 relative group">
              <img 
                src={property.images?.[activeImageIndex] || 'https://picsum.photos/seed/prop/1200/600'} 
                className="w-full h-full object-cover transition-all duration-500" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-6 left-6 text-white">
                <h2 className="text-3xl font-bold drop-shadow-lg">{property.address}</h2>
                <p className="flex items-center gap-1 text-sm opacity-90 drop-shadow-md mt-1">
                  <MapPin className="w-4 h-4" /> {property.propertyType}
                </p>
              </div>
            </div>
            
            {property.images && property.images.length > 1 && (
              <div className="p-4 border-b border-slate-100 flex gap-3 overflow-x-auto bg-slate-50">
                {property.images.map((src, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={cn(
                      "w-20 aspect-square rounded-xl overflow-hidden border-2 transition-all flex-shrink-0",
                      activeImageIndex === idx ? "border-blue-900 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={src} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-8 grid grid-cols-3 gap-8">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Monthly Rent</p>
                <p className="text-2xl font-bold text-slate-900">৳{property.rentAmount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                  Fixed Rate
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Status</p>
                <p className={cn(
                  "text-2xl font-bold capitalize",
                  property.status === 'vacant' ? "text-emerald-600" : "text-amber-600"
                )}>
                  {property.status === 'vacant' ? 'Available' : property.status}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Current State</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Configuration</p>
                <p className="text-2xl font-bold text-slate-900">
                  {property.numberOfBedrooms || 0}B / {property.numberOfBathrooms || 0}B
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Bed & Bath</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-2">Property Owner</p>
                {owner ? (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{owner.firstName} {owner.lastName}</h3>
                    <div className="flex flex-col mt-1 gap-1">
                      <p className="text-sm text-slate-500">{owner.email}</p>
                      {owner.phoneNumber && <p className="text-sm text-slate-500">{owner.phoneNumber}</p>}
                    </div>
                  </div>
                ) : (
                  <h3 className="text-lg font-bold text-slate-400">N/A</h3>
                )}
              </div>
            </div>
          </div>

          {isAuthorized && tenants.length > 0 && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Active Tenants</h3>
              <div className="space-y-4">
                {tenants.map((tenant) => (
                  <div key={tenant.uid} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {tenant.firstName?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tenant.firstName} {tenant.lastName}</p>
                        <p className="text-[10px] text-slate-500">Unit B3 · Paid until Apr 5</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-blue-900"><MoreVertical className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {(isAuthorized || profile?.userType === 'tenant') && maintenance.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Maintenance History</h3>
              <div className="space-y-4">
                {maintenance.map((req) => (
                  <div key={req.id} className="flex items-start gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5",
                      req.status === 'completed' ? "bg-green-500" : "bg-amber-500"
                    )}></div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{req.title}</p>
                      <p className="text-[10px] text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                View Full History
              </button>
            </div>
          )}

          <div className="bg-[#0f2a4a] p-8 rounded-3xl text-white">
            <h4 className="font-bold mb-4">Property Manager</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-bold">SM</div>
              <div>
                <p className="text-sm font-bold">Shafiul Muslemin</p>
                <p className="text-[10px] text-white/40">Assigned 12 Jan 2025</p>
              </div>
            </div>
            <button 
              onClick={handleContactManager}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              Contact Manager
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAssignManagerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Assign Property Manager</h3>
                <button onClick={() => setShowAssignManagerModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors font-bold text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssignManager} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Manager</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900/10 outline-none"
                    value={selectedManagerId}
                    onChange={e => setSelectedManagerId(e.target.value)}
                  >
                    <option value="">Choose a manager</option>
                    {availableManagers.map(m => (
                      <option key={m.uid} value={m.uid}>{m.firstName} {m.lastName} ({m.companyName || 'Freelance'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commission (%)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                      value={mgmtCommission}
                      onChange={e => setMgmtCommission(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Management Terms</label>
                  <textarea 
                    rows={4}
                    placeholder="Enter management terms, responsibilities, etc."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                    value={mgmtTerms}
                    onChange={e => setMgmtTerms(e.target.value)}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={assigning}
                  className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {assigning ? 'Sending Request...' : 'Send Management Request'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyDetails;

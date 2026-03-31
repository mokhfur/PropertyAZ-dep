import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Property, UserProfile, Lease, MaintenanceRequest } from '../types';
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
  User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

const PropertyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [tenants, setTenants] = useState<UserProfile[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const propSnap = await getDoc(doc(db, 'properties', id));
        if (propSnap.exists()) {
          const propData = { id: propSnap.id, ...propSnap.data() } as Property;
          setProperty(propData);
          
          // Fetch Owner if manager
          if (profile?.userType === 'manager' && propData.ownerId) {
            const ownerSnap = await getDoc(doc(db, 'users', propData.ownerId));
            if (ownerSnap.exists()) {
              setOwner(ownerSnap.data() as UserProfile);
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

  const isAuthorized = profile && ['landlord', 'manager', 'admin'].includes(profile.userType);

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
        {isAuthorized && (
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Edit Property</button>
            <button className="px-4 py-2 bg-[#0f2a4a] text-white rounded-xl text-sm font-bold hover:bg-[#0a1e36]">Add Unit</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="aspect-video bg-slate-100 relative">
              <img src={property.images?.[0] || 'https://picsum.photos/seed/prop/1200/600'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute bottom-6 left-6 text-white">
                <h2 className="text-3xl font-bold drop-shadow-lg">{property.address}</h2>
                <p className="flex items-center gap-1 text-sm opacity-90 drop-shadow-md mt-1">
                  <MapPin className="w-4 h-4" /> {property.propertyType}
                </p>
              </div>
            </div>
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

          {profile?.userType === 'manager' && owner && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Property Owner</p>
                  <h3 className="text-lg font-bold text-slate-900">{owner.firstName} {owner.lastName}</h3>
                  <p className="text-xs text-slate-500">{owner.email}</p>
                </div>
              </div>
            </div>
          )}

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
    </div>
  );
};

export default PropertyDetails;

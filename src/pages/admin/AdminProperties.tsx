import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Property } from '../../types';
import { 
  Building2, 
  Search, 
  Filter, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Eye,
  Trash2,
  Star,
  ShieldCheck,
  ArrowUpRight,
  Home,
  Hotel,
  Warehouse
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const AdminProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
        if (snap) {
          setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const handleVerify = async (id: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, 'properties', id), { isVerified: !currentStatus });
      setProperties(properties.map(p => p.id === id ? { ...p, isVerified: !currentStatus } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProperties = properties.filter(p => 
    (p.address + ' ' + (p.district || '')).toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterType === 'all' || p.propertyType === filterType)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Property Inventory</h2>
          <p className="text-sm text-slate-500">Manage all property listings, verify authenticity, and control visibility</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                <img src={`https://picsum.photos/seed/prop${i}/32/32`} alt="" referrerPolicy="no-referrer" />
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white">
              +12
            </div>
          </div>
          <p className="text-xs font-medium text-slate-600">New listings today</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Listings', value: properties.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Verified', value: properties.filter(p => p.isVerified).length, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Review', value: properties.filter(p => !p.isVerified).length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Featured', value: '12', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", stat.bg, stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:row items-center gap-4">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search properties by title or location..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {['all', 'apartment', 'house', 'commercial', 'land'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                filterType === type 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-600 border-slate-100 hover:border-slate-200"
              )}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 h-80 animate-pulse" />
          ))
        ) : filteredProperties.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100">
            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No properties found matching your criteria</p>
          </div>
        ) : filteredProperties.map((property) => (
          <motion.div
            layout
            key={property.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={property.images?.[0] || `https://picsum.photos/seed/${property.id}/400/300`} 
                alt={property.address}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm",
                  property.status === 'vacant' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                )}>
                  {property.status}
                </span>
                {property.isVerified && (
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-blue-600 shadow-sm">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 bg-white/90 backdrop-blur rounded-xl text-slate-600 hover:text-red-600 shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{property.propertyType}</span>
                  <span className="text-lg font-bold text-slate-900">৳{property.rentAmount.toLocaleString()}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{property.address}</h3>
                <div className="flex items-center gap-1 text-slate-400 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="text-xs">{property.district}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Landlord</p>
                    <p className="text-xs font-bold text-slate-700">ID: {property.landlordOrManager.slice(0, 8)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleVerify(property.id, property.isVerified)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all",
                    property.isVerified 
                      ? "bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600" 
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                  )}
                >
                  {property.isVerified ? 'Unverify' : 'Verify Now'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminProperties;

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Property } from '../types';
import { Search, MapPin, Home, ArrowRight, Filter, Building2, Bed, Bath } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const BrowseProperties: React.FC = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [district, setDistrict] = useState('All');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const q = query(collection(db, 'properties'), where('status', 'in', ['vacant', 'upcoming']));
        const querySnapshot = await getDocs(q);
        const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setProperties(props);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const filteredProperties = properties.filter(p => 
    (district === 'All' || p.district === district) &&
    (p.address.toLowerCase().includes(searchTerm.toLowerCase()) || p.propertyType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const districts = ['All', 'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Browse Properties</h2>
          <p className="text-sm text-slate-500">Find your next home from our verified listings</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by area, building name..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-900/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:w-64 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-900/10 appearance-none"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="bg-[#0f2a4a] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#0a1e36] transition-colors flex items-center justify-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((property) => (
            <motion.div 
              key={property.id}
              whileHover={{ y: -8 }}
              onClick={() => navigate(`/properties/${property.id}`)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                <img 
                  src={property.images?.[0] || `https://picsum.photos/seed/${property.id}/800/600`} 
                  alt={property.address}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    property.status === 'vacant' ? "bg-green-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {property.status === 'vacant' ? 'Vacant Now' : 'Upcoming'}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  {property.district}, Dhaka
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-900 transition-colors">{property.address}</h3>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Bed className="w-3.5 h-3.5" />
                    <span>{property.numberOfBedrooms} Beds</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Bath className="w-3.5 h-3.5" />
                    <span>{property.numberOfBathrooms} Baths</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Monthly Rent</p>
                    <p className="text-xl font-bold text-blue-900">৳{property.rentAmount?.toLocaleString()}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900">No properties found</h3>
          <p className="text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default BrowseProperties;

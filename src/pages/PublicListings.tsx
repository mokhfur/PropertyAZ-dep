import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Property } from '../types';
import { Search, MapPin, Home, ArrowRight, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const PublicListings: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Section */}
      <header className="bg-[#0f2a4a] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Top Navigation Links */}
          <div className="flex justify-end mb-12">
            <div className="flex items-center gap-4">
              <Link 
                to="/login?mode=signup" 
                className="text-white font-bold hover:text-white/80 transition-colors px-6 py-2 border-2 border-white rounded-lg"
              >
                Signup Now
              </Link>
              <Link 
                to="/login?mode=login" 
                className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
              >
                User Login
              </Link>
              <Link 
                to="/blog" 
                className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors"
              >
                Blog
              </Link>
            </div>
          </div>

          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-bold tracking-tight mb-6"
            >
              Find Your Next Home in Bangladesh
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/60 text-xl mb-12 max-w-2xl mx-auto"
            >
              The most trusted property management platform. Verified listings, secure contracts, and hassle-free renting.
            </motion.p>

            <div className="max-w-4xl mx-auto bg-white rounded-2xl p-2 shadow-2xl flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by area, building name..." 
                  className="w-full pl-12 pr-4 py-4 text-slate-900 border-none focus:ring-0 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="md:w-48 relative border-l border-slate-100">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select 
                  className="w-full pl-12 pr-4 py-4 text-slate-900 border-none focus:ring-0 rounded-xl appearance-none bg-transparent"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Listings Section */}
      <main className="max-w-6xl mx-auto py-16 px-6">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Available Properties</h2>
            <p className="text-slate-500 mt-2">Discover vacant and upcoming units across the country</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-96 animate-pulse border border-slate-200"></div>
            ))}
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredProperties.map((property) => (
              <motion.div 
                key={property.id}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all"
              >
                <Link to={`/properties/${property.id}`} className="block aspect-video bg-slate-100 relative">
                  <img 
                    src={property.images?.[0] || `https://picsum.photos/seed/${property.id}/800/600`} 
                    alt={property.address}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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
                </Link>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                    <MapPin className="w-3 h-3" />
                    {property.district}, Dhaka
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{property.address}</h3>
                  <p className="text-sm text-slate-500 mb-6 line-clamp-2">{property.propertyType}</p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Monthly Rent</p>
                      <p className="text-xl font-bold text-blue-900">৳{property.rentAmount?.toLocaleString()}</p>
                    </div>
                    <Link 
                      to={`/properties/${property.id}`} 
                      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 hover:bg-blue-900 hover:text-white transition-colors"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-2xl font-bold text-[#0f2a4a]">PropertyAZ</h2>
            <p className="text-slate-500 text-sm mt-2">© 2026 PropertyAZ Bangladesh. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-600">
            <span className="hover:text-blue-600 cursor-pointer">About Us</span>
            <span className="hover:text-blue-600 cursor-pointer">Contact</span>
            <span className="hover:text-blue-600 cursor-pointer">Terms</span>
            <span className="hover:text-blue-600 cursor-pointer">Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicListings;

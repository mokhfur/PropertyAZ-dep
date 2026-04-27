import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, or } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Property, User } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Home, 
  MapPin, 
  Users, 
  Wrench, 
  MoreVertical,
  X,
  ChevronRight,
  Building2,
  User as UserIcon,
  LayoutGrid,
  Map as MapIcon,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const HighlightIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to update map center
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const Properties: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const [newProperty, setNewProperty] = useState({
    address: '',
    propertyType: 'Apartment',
    description: '',
    numberOfBedrooms: 1,
    numberOfBathrooms: 1,
    rentAmount: 0,
    district: '',
    status: 'vacant' as const,
    ownerId: '', // For managers to assign an owner
    latitude: 23.8103,
    longitude: 90.4125
  });

  const [allLandlords, setAllLandlords] = useState<User[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        // Fetch Properties
        const propQ = query(
          collection(db, 'properties'), 
          or(
            where('landlordOrManager', '==', profile.uid),
            where('ownerId', '==', profile.uid)
          ),
          orderBy('createdAt', 'desc')
        );
        const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
        
        if (propSnap) {
          const props = propSnap.docs.map(doc => {
            const data = doc.data();
            // Add mock coordinates if missing for demonstration
            return { 
              id: doc.id, 
              ...data,
              latitude: data.latitude || 23.7 + (Math.random() * 0.2),
              longitude: data.longitude || 90.3 + (Math.random() * 0.2)
            } as Property;
          });
          setProperties(props);

          // Fetch owner details for all properties with ownerId
          const ownerIds = [...new Set(props.map(p => p.ownerId).filter(Boolean))];
          if (ownerIds.length > 0) {
            const ownerQ = query(collection(db, 'users'), where('uid', 'in', ownerIds.slice(0, 10)));
            const ownerSnap = await getDocs(ownerQ).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
            if (ownerSnap) {
              const ownerMap: Record<string, User> = {};
              ownerSnap.docs.forEach(doc => {
                ownerMap[doc.id] = { uid: doc.id, ...doc.data() } as User;
              });
              setOwners(ownerMap);
            }
          }

          // If manager, fetch all landlords for the "Add Property" dropdown
          if (profile.userType === 'manager') {
            const landlordQ = query(collection(db, 'users'), where('userType', '==', 'landlord'));
            const landlordSnap = await getDocs(landlordQ).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
            if (landlordSnap) {
              setAllLandlords(landlordSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
            }
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

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const propertyData: Omit<Property, 'id'> = {
        ...newProperty,
        images: selectedImages,
        createdAt: new Date().toISOString(),
        landlordOrManager: profile.uid,
        ownerId: profile.userType === 'landlord' ? profile.uid : newProperty.ownerId
      };

      const docRef = await addDoc(collection(db, 'properties'), propertyData).catch(err => handleFirestoreError(err, OperationType.WRITE, 'properties'));
      
      if (docRef) {
        const createdProperty = { id: docRef.id, ...propertyData } as Property;
        setProperties([createdProperty, ...properties]);
        closeAddModal();
        setNewProperty({
          address: '',
          propertyType: 'Apartment',
          description: '',
          numberOfBedrooms: 1,
          numberOfBathrooms: 1,
          rentAmount: 0,
          district: '',
          status: 'vacant',
          ownerId: '',
          latitude: 23.8103,
          longitude: 90.4125
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = p.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.district?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesLocation = locationFilter === 'all' || p.district === locationFilter;
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [properties, searchQuery, statusFilter, locationFilter]);

  const districts = [...new Set(properties.map(p => p.district).filter(Boolean))];

  const mapCenter = useMemo((): [number, number] => {
    if (hoveredPropertyId) {
      const prop = properties.find(p => p.id === hoveredPropertyId);
      if (prop?.latitude && prop?.longitude) return [prop.latitude, prop.longitude];
    }
    if (filteredProperties.length > 0 && filteredProperties[0].latitude && filteredProperties[0].longitude) {
      return [filteredProperties[0].latitude, filteredProperties[0].longitude];
    }
    return [23.8103, 90.4125]; // Default Dhaka
  }, [hoveredPropertyId, properties, filteredProperties]);

  const closeAddModal = () => {
    setShowAddModal(false);
    setSelectedImages([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Properties Portfolio</h2>
          <p className="text-slate-500 text-sm">Manage your real estate assets and occupancy</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-blue-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'map' ? "bg-blue-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <MapIcon className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#0f2a4a] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0a1e36] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
          >
            <Plus className="w-5 h-5" />
            Add New Property
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by address or district..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900/10 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900/10"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="repair">Under Repair</option>
          </select>
          <select 
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-900/10"
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
          >
            <option value="all">All Locations</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.length > 0 ? filteredProperties.map((prop) => (
            <motion.div 
              layout
              key={prop.id}
              onClick={() => navigate(`/properties/${prop.id}`)}
              onMouseEnter={() => setHoveredPropertyId(prop.id)}
              onMouseLeave={() => setHoveredPropertyId(null)}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-blue-900 transition-all cursor-pointer group overflow-hidden"
            >
              <div className="h-48 bg-slate-100 relative overflow-hidden">
                {prop.images && prop.images.length > 0 ? (
                  <img src={prop.images[0]} alt={prop.address} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Building2 className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-3 py-1 rounded-full backdrop-blur-md border",
                    prop.status === 'occupied' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                    prop.status === 'vacant' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : 
                    "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  )}>
                    {prop.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors truncate flex-1">{prop.address}</h4>
                  <p className="text-blue-900 font-bold ml-2">৳{prop.rentAmount.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-4">
                  <MapPin className="w-3 h-3" />
                  {prop.district || 'Dhaka'}
                </div>

                <div className="flex flex-col gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3 h-3 text-slate-400" />
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">Property Owner</p>
                  </div>
                  {prop.ownerId ? (
                    <div>
                      <p className="text-xs font-bold text-slate-900">{owners[prop.ownerId]?.firstName} {owners[prop.ownerId]?.lastName || 'Loading...'}</p>
                      {owners[prop.ownerId] && (
                        <div className="flex flex-col mt-1 space-y-0.5">
                          <p className="text-[10px] text-slate-500">{owners[prop.ownerId].email}</p>
                          {owners[prop.ownerId].phoneNumber && <p className="text-[10px] text-slate-500">{owners[prop.ownerId].phoneNumber}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-slate-400">N/A</p>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Type</p>
                    <p className="text-[11px] font-bold text-slate-900 truncate">{prop.propertyType}</p>
                  </div>
                  <div className="text-center border-x border-slate-100 px-2">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Beds</p>
                    <p className="text-[11px] font-bold text-slate-900">{prop.numberOfBedrooms}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Baths</p>
                    <p className="text-[11px] font-bold text-slate-900">{prop.numberOfBathrooms}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-blue-900 font-bold text-xs">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
              <Home className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No properties found</h3>
              <p className="text-slate-500 text-sm mt-1">Start by adding your first property to the portfolio.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative z-0">
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ChangeView center={mapCenter} />
              {filteredProperties.map(prop => (
                prop.latitude && prop.longitude && (
                  <Marker 
                    key={prop.id} 
                    position={[prop.latitude, prop.longitude]}
                    icon={hoveredPropertyId === prop.id ? HighlightIcon : DefaultIcon}
                    eventHandlers={{
                      click: () => navigate(`/properties/${prop.id}`),
                      mouseover: () => setHoveredPropertyId(prop.id),
                      mouseout: () => setHoveredPropertyId(null)
                    }}
                  >
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-slate-900 text-sm">{prop.address}</p>
                        <p className="text-blue-900 font-bold text-xs">৳{prop.rentAmount.toLocaleString()}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 overflow-y-auto shadow-sm p-4 space-y-4">
            <h3 className="font-bold text-slate-900 px-2">Properties List</h3>
            {filteredProperties.map(prop => (
              <div 
                key={prop.id}
                onMouseEnter={() => setHoveredPropertyId(prop.id)}
                onMouseLeave={() => setHoveredPropertyId(null)}
                onClick={() => navigate(`/properties/${prop.id}`)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer",
                  hoveredPropertyId === prop.id ? "border-blue-900 bg-blue-50/50" : "border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-slate-900 text-sm truncate flex-1">{prop.address}</h4>
                  <p className="text-blue-900 font-bold text-sm ml-2">৳{prop.rentAmount.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                  <MapPin className="w-3 h-3" />
                  {prop.district || 'Dhaka'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <h3 className="text-xl font-bold text-slate-900">Add New Property</h3>
                <button onClick={closeAddModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddProperty} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Address</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Flat 4B, Mirpur Tower, Dhaka"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.address}
                      onChange={e => setNewProperty({...newProperty, address: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Type</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.propertyType}
                      onChange={e => setNewProperty({...newProperty, propertyType: e.target.value})}
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Studio">Studio</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">District/Location</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Mirpur, Dhaka"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.district}
                      onChange={e => setNewProperty({...newProperty, district: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bedrooms</label>
                    <input 
                      type="number"
                      min="0"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.numberOfBedrooms}
                      onChange={e => setNewProperty({...newProperty, numberOfBedrooms: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bathrooms</label>
                    <input 
                      type="number"
                      min="0"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.numberOfBathrooms}
                      onChange={e => setNewProperty({...newProperty, numberOfBathrooms: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Rent (৳)</label>
                    <input 
                      required
                      type="number"
                      min="0"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.rentAmount}
                      onChange={e => setNewProperty({...newProperty, rentAmount: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Status</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.status}
                      onChange={e => setNewProperty({...newProperty, status: e.target.value as any})}
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="repair">Under Repair</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                    <input 
                      type="number"
                      step="any"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.latitude}
                      onChange={e => setNewProperty({...newProperty, latitude: Number(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                    <input 
                      type="number"
                      step="any"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newProperty.longitude}
                      onChange={e => setNewProperty({...newProperty, longitude: Number(e.target.value)})}
                    />
                  </div>

                  {profile?.userType === 'manager' && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Owner (Landlord)</label>
                      <select 
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                        value={newProperty.ownerId}
                        onChange={e => setNewProperty({...newProperty, ownerId: e.target.value})}
                      >
                        <option value="">Select an owner</option>
                        {allLandlords.map(l => (
                          <option key={l.uid} value={l.uid}>{l.firstName} {l.lastName} ({l.email})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Property Images</label>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-3xl p-8 transition-all flex flex-col items-center justify-center gap-3",
                      isDragging ? "border-blue-900 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">Drag & drop images here</p>
                      <p className="text-xs text-slate-500 mt-1">or click to browse from your computer</p>
                    </div>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e.target.files)}
                    />
                  </div>

                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {selectedImages.map((src, idx) => (
                        <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                          <img src={src} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <div className="absolute bottom-0 inset-x-0 bg-blue-900/80 text-white text-[8px] font-bold uppercase py-1 text-center">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                    placeholder="Describe the property features..."
                    value={newProperty.description}
                    onChange={e => setNewProperty({...newProperty, description: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Save Property
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Properties;

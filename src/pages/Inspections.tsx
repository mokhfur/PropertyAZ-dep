import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Inspection, Property } from '../types';
import { 
  ClipboardCheck, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Camera, 
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Inspections: React.FC = () => {
  const { profile } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        const q = query(collection(db, 'inspections'), where('performedBy', '==', profile.uid));
        const snap = await getDocs(q);
        setInspections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection)));

        const propQ = query(collection(db, 'properties'), where('ownerId', '==', profile.uid));
        const propSnap = await getDocs(propQ);
        setProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Property Inspections</h2>
          <p className="text-slate-500 text-sm">Schedule and manage move-in/move-out checklists</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0a1e36] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Schedule Inspection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upcoming Inspections */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Upcoming Schedule</h3>
            <div className="space-y-4">
              {inspections.length > 0 ? inspections.filter(ins => new Date(ins.date) >= new Date()).slice(0, 3).map((ins) => {
                const property = properties.find(p => p.id === ins.propertyId);
                const date = new Date(ins.date);
                return (
                  <div key={ins.id} className="flex items-center gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-16 h-16 rounded-2xl bg-white flex flex-col items-center justify-center border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-bold text-red-500 uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-2xl font-bold text-slate-900">{date.getDate().toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{ins.type}</span>
                        <span className="text-xs text-slate-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 truncate">{property?.address || 'Property Details'}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <User className="w-3 h-3" /> {ins.notes?.slice(0, 30) || 'Scheduled Inspection'}
                      </p>
                    </div>
                    <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                );
              }) : (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 italic">No upcoming inspections scheduled.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inspections.length > 0 ? inspections.map((ins) => (
                <div key={ins.id} className="p-4 rounded-2xl border border-slate-100 hover:border-blue-900 transition-all cursor-pointer group">
                  <div className="aspect-video rounded-xl bg-slate-100 mb-4 overflow-hidden relative">
                    <img src={ins.images?.[0] || 'https://picsum.photos/seed/ins/400/300'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 fill-white" />
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 truncate group-hover:text-blue-900 transition-colors">{properties.find(p => p.id === ins.propertyId)?.address || 'Property Details'}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{ins.type} · {new Date(ins.date).toLocaleDateString()}</p>
                </div>
              )) : (
                <div className="col-span-full text-center py-12">
                  <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-xs text-slate-400 italic">No inspection reports yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Checklist Template */}
        <div className="space-y-6">
          <div className="bg-[#0f2a4a] p-8 rounded-3xl text-white">
            <h3 className="text-lg font-bold mb-6">Digital Checklist</h3>
            <div className="space-y-4">
              {[
                'Structural integrity check',
                'Electrical & wiring safety',
                'Plumbing & water pressure',
                'Paint & wall condition',
                'Appliance functionality',
                'Key handover & locks'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                  <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 opacity-20" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors">
              Customize Template
            </button>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-2">AI Photo Comparison</h4>
            <p className="text-xs text-blue-700 leading-relaxed mb-4">
              Our AI automatically compares move-in and move-out photos to detect new damages and suggest deposit deductions.
            </p>
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs cursor-pointer hover:underline">
              Learn how it works <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inspections;

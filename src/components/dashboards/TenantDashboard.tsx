import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { Property, MaintenanceRequest, Payment, Lease } from '../../types';
import { 
  CreditCard, 
  Wrench, 
  MessageSquare, 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Download,
  Calendar,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

const TenantDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [lease, setLease] = useState<Lease | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        // Fetch Active Lease
        const leaseQ = query(collection(db, 'leases'), where('tenant', '==', profile.uid), where('status', '==', 'active'), limit(1));
        const leaseSnap = await getDocs(leaseQ).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
        if (leaseSnap && !leaseSnap.empty) {
          const leaseData = { id: leaseSnap.docs[0].id, ...leaseSnap.docs[0].data() } as Lease;
          setLease(leaseData);

          // Fetch Property
          const propRef = await getDocs(query(collection(db, 'properties'), where('id', '==', leaseData.property))).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
          if (propRef && !propRef.empty) {
            setProperty({ id: propRef.docs[0].id, ...propRef.docs[0].data() } as Property);
          }
        }

        // Fetch Recent Payments
        const payQ = query(collection(db, 'payments'), where('tenant', '==', profile.uid), orderBy('date', 'desc'), limit(5));
        const paySnap = await getDocs(payQ).catch(err => handleFirestoreError(err, OperationType.GET, 'payments'));
        if (paySnap) {
          setPayments(paySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
        }

        // Fetch Maintenance Requests
        const maintQ = query(collection(db, 'maintenance'), where('tenant', '==', profile.uid), orderBy('createdAt', 'desc'), limit(3));
        const maintSnap = await getDocs(maintQ).catch(err => handleFirestoreError(err, OperationType.GET, 'maintenance'));
        if (maintSnap) {
          setMaintenance(maintSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRequest)));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  const getRentDueInfo = () => {
    if (!lease) return null;
    const nextDue = new Date(lease.startDate); // Simplified logic for demo
    nextDue.setMonth(new Date().getMonth());
    if (nextDue < new Date()) nextDue.setMonth(nextDue.getMonth() + 1);
    
    const diffTime = Math.abs(nextDue.getTime() - new Date().getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      amount: lease.rentAmount,
      days: diffDays,
      month: nextDue.toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })
    };
  };

  const rentInfo = getRentDueInfo();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0f2a4a] text-white p-8 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Hello, {profile?.firstName}!</h2>
            {rentInfo && lease?.status === 'active' ? (
              <>
                <p className="text-white/60 mb-8">Your rent for {rentInfo.month} is due in {rentInfo.days} days.</p>
                
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => navigate('/payments')}
                    className="bg-white text-[#0f2a4a] px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay Rent ৳{rentInfo.amount.toLocaleString()}
                  </button>
                  <button 
                    onClick={() => navigate('/maintenance')}
                    className="bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Request Repair
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-2">Welcome, {profile?.firstName}!</h2>
                <p className="text-white/60 mb-8">You don't have any active leases at the moment. Browse available properties to find your next home.</p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => navigate('/browse')}
                    className="bg-white text-[#0f2a4a] px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Browse Properties
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Your Home</h3>
            {property ? (
              <div className="space-y-4">
                <div className="aspect-video rounded-2xl bg-slate-100 overflow-hidden">
                  <img 
                    src={`https://picsum.photos/seed/${property.id}/400/300`} 
                    alt={property.address}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{property.address}</h4>
                  <p className="text-xs text-slate-500">{property.propertyType}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 italic">No active lease found.</p>
              </div>
            )}
          </div>
          <button className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            View Lease Agreement
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment History</h3>
            <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" />
              Export Ledger
            </button>
          </div>
          <div className="space-y-2">
            {payments.length > 0 ? payments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    pay.status === 'paid' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 capitalize">Rent Payment</p>
                    <p className="text-[10px] text-slate-500">{new Date(pay.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })} · Online</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">৳{pay.amount.toLocaleString()}</p>
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                    pay.status === 'paid' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {pay.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CreditCard className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No payment records found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Maintenance */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Maintenance</h3>
            <div className="space-y-4">
              {maintenance.length > 0 ? maintenance.map((req) => (
                <div key={req.id} className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center text-amber-700">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-900 truncate max-w-[120px]">{req.title}</p>
                    <p className="text-[10px] text-amber-700 capitalize">Status: {req.status.replace('-', ' ')}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-[10px] text-slate-400 italic">No active requests</p>
                </div>
              )}
              <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors">
                New Request
              </button>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-4">Need Help?</h3>
            <p className="text-xs text-blue-700 mb-6 leading-relaxed">Contact your landlord or property manager directly through our secure messaging system.</p>
            <button 
              onClick={() => navigate('/messages')}
              className="w-full py-3 bg-white text-blue-900 rounded-xl text-sm font-bold border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Open Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;

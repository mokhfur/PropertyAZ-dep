import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, addDoc, doc, updateDoc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Payment, Lease } from '../types';
import { 
  CreditCard, 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Smartphone,
  Banknote,
  Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Payments: React.FC = () => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lease, setLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState(0); // 0: Method, 1: Details, 2: Success
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'bank' | 'card' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        const field = profile.userType === 'tenant' ? 'tenant' : 'landlordOrManager';
        const q = query(collection(db, 'payments'), where(field, '==', profile.uid), orderBy('date', 'desc'));
        const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'payments'));
        if (snap) {
          setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
        }

        if (profile.userType === 'tenant') {
          const leaseQ = query(collection(db, 'leases'), where('tenant', '==', profile.uid), where('status', '==', 'active'), limit(1));
          const leaseSnap = await getDocs(leaseQ).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
          if (leaseSnap && !leaseSnap.empty) {
            setLease({ id: leaseSnap.docs[0].id, ...leaseSnap.docs[0].data() } as Lease);
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

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingDues = 0; // In a real app, this would be calculated based on lease and payment history
  
  const getNextPaymentDate = () => {
    if (!lease) return 'N/A';
    const nextDue = new Date(lease.startDate);
    nextDue.setMonth(new Date().getMonth());
    if (nextDue < new Date()) nextDue.setMonth(nextDue.getMonth() + 1);
    return nextDue.toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Payment History Ledger', 14, 15);
    const tableData = payments.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.type.replace('_', ' '),
      p.method,
      `৳${p.amount.toLocaleString()}`,
      p.status
    ]);
    autoTable(doc, {
      head: [['Date', 'Type', 'Method', 'Amount', 'Status']],
      body: tableData,
      startY: 20
    });
    doc.save('payment-ledger.pdf');
  };

  const handlePayment = async () => {
    if (!profile || !selectedMethod) return;
    try {
      // Find active lease to get landlordId
      const leaseQ = query(
        collection(db, 'leases'), 
        where('tenant', '==', profile.uid), 
        where('status', '==', 'active'),
        limit(1)
      );
      const leaseSnap = await getDocs(leaseQ).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
      const activeLease = leaseSnap && !leaseSnap.empty ? { id: leaseSnap.docs[0].id, ...leaseSnap.docs[0].data() } as Lease : null;

      const newPay: Omit<Payment, 'id'> = {
        leaseId: activeLease?.id || 'no-active-lease',
        tenant: profile.uid,
        landlordOrManager: activeLease?.landlordOrManager || 'pending-assignment',
        propertyId: activeLease?.property || 'no-property',
        amount: 8500,
        type: 'rent',
        method: selectedMethod,
        status: 'paid',
        date: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'payments'), newPay).catch(err => handleFirestoreError(err, OperationType.WRITE, 'payments'));
      if (docRef) {
        setPayments([{ ...newPay, id: docRef.id } as Payment, ...payments]);
        setPaymentStep(2);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Payments & Ledger</h2>
          <p className="text-slate-500 text-sm">Track your rent, deposits, and maintenance costs</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={exportPDF}
            className="px-6 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          {profile?.userType === 'tenant' && (
            <button 
              onClick={() => { setShowPayModal(true); setPaymentStep(0); }}
              className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0a1e36] transition-colors flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Pay Rent
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Total Paid (YTD)</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">৳{totalPaid.toLocaleString()}</h3>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Pending Dues</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{pendingDues > 0 ? `৳${pendingDues.toLocaleString()}` : 'N/A'}</h3>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Next Payment Due</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900">{getNextPaymentDate()}</h3>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Transaction History</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm" />
            </div>
            <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length > 0 ? payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{new Date(pay.date).toLocaleDateString('en-BD')}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900 capitalize">{(pay as any).type?.replace('_', ' ') || 'Rent'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase">{(pay as any).method?.slice(0, 2) || 'BK'}</div>
                      <span className="text-sm text-slate-600 capitalize">{(pay as any).method || 'bKash'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">৳{pay.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                      pay.status === 'paid' ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    No transaction history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              {paymentStep === 0 && (
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Pay Rent</h3>
                  <p className="text-slate-500 text-sm mb-8">Select your preferred payment method</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <button 
                      onClick={() => setSelectedMethod('bkash')}
                      className={cn(
                        "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                        selectedMethod === 'bkash' ? "border-pink-500 bg-pink-50" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center text-white font-bold">bK</div>
                      <span className="text-sm font-bold text-slate-900">bKash</span>
                    </button>
                    <button 
                      onClick={() => setSelectedMethod('nagad')}
                      className={cn(
                        "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                        selectedMethod === 'nagad' ? "border-orange-500 bg-orange-50" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold">Na</div>
                      <span className="text-sm font-bold text-slate-900">Nagad</span>
                    </button>
                    <button 
                      onClick={() => setSelectedMethod('bank')}
                      className={cn(
                        "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                        selectedMethod === 'bank' ? "border-blue-900 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#0f2a4a] flex items-center justify-center text-white">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Bank Transfer</span>
                    </button>
                    <button 
                      onClick={() => setSelectedMethod('card')}
                      className={cn(
                        "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                        selectedMethod === 'card' ? "border-blue-600 bg-blue-50" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-900">Card</span>
                    </button>
                  </div>
                  
                  <button 
                    disabled={!selectedMethod}
                    onClick={() => setPaymentStep(1)}
                    className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                  >
                    Continue to Payment
                  </button>
                  <button 
                    onClick={() => setShowPayModal(false)}
                    className="w-full mt-4 text-sm text-slate-400 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {paymentStep === 1 && (
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setPaymentStep(0)} className="p-2 hover:bg-slate-100 rounded-lg">←</button>
                    <h3 className="text-xl font-bold text-slate-900">Confirm Payment</h3>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-500 text-sm">Rent for {new Date().toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}</span>
                      <span className="font-bold text-slate-900">৳8,500</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-slate-500 text-sm">Service Fee</span>
                      <span className="font-bold text-slate-900">৳25</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-slate-900 font-bold">Total Amount</span>
                      <span className="text-2xl font-bold text-blue-900">৳8,525</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="p-4 border border-slate-200 rounded-xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center text-white text-xs font-bold">bK</div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">bKash Wallet</p>
                        <p className="text-xs text-slate-500">{profile?.phoneNumber || "+880 ••• ••• ••••"}</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handlePayment}
                    className="w-full py-4 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-colors"
                  >
                    Confirm & Pay Now
                  </button>
                </div>
              )}

              {paymentStep === 2 && (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 stroke-[3]" />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
                  <p className="text-slate-500 mb-10">Your rent has been paid and the landlord has been notified.</p>
                  
                  <button 
                    onClick={() => setShowPayModal(false)}
                    className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Payments;

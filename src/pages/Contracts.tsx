import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Lease, Property, User } from '../types';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  ShieldCheck,
  Smartphone,
  Check,
  Plus,
  X,
  Calendar,
  Mail,
  User as UserIcon,
  Building
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Contracts: React.FC = () => {
  const { profile } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingStep, setSigningStep] = useState(0); // 0: Review, 1: OTP, 2: Success
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResendOtp = () => {
    setResendStatus('OTP Resent! (Demo: 123456)');
    setTimeout(() => setResendStatus(null), 5000);
  };
  
  // Landlord specific states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [allTenants, setAllTenants] = useState<User[]>([]);
  const [newLease, setNewLease] = useState({
    property: '',
    tenant: '',
    startDate: '',
    endDate: '',
    rentAmount: 0,
    depositAmount: 0,
    termsAndConditions: ''
  });

  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html }),
      });
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  };

  const isNearingEnd = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  };

  const handleRenew = (lease: Lease) => {
    setNewLease({
      property: lease.property,
      tenant: lease.tenant,
      startDate: lease.endDate,
      endDate: '',
      rentAmount: lease.rentAmount,
      depositAmount: lease.depositAmount || 0,
      termsAndConditions: lease.termsAndConditions || ''
    });
    setShowCreateModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        // Fetch Leases
        const field = profile.userType === 'tenant' ? 'tenant' : 'landlordOrManager';
        const q = query(collection(db, 'leases'), where(field, '==', profile.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
        
        let fetchedLeases: Lease[] = [];
        if (snap) {
          fetchedLeases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease));
          setLeases(fetchedLeases);
        }

        // Fetch properties
        if (profile.userType === 'landlord' || profile.userType === 'manager') {
          const propQ = query(collection(db, 'properties'), where('landlordOrManager', '==', profile.uid));
          const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
          if (propSnap) {
            setMyProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
          }

          const tenantQ = query(collection(db, 'users'), where('userType', '==', 'tenant'));
          const tenantSnap = await getDocs(tenantQ).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
          if (tenantSnap) {
            setAllTenants(tenantSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
          }
        } else if (profile.userType === 'tenant' && fetchedLeases.length > 0) {
          // For tenants, fetch only properties they have leases for
          const propertyIds = [...new Set(fetchedLeases.map(l => l.property))];
          if (propertyIds.length > 0) {
            // Note: 'in' query has a limit of 10-30 depending on version, but usually fine for this app
            const propQ = query(collection(db, 'properties'), where('__name__', 'in', propertyIds));
            const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
            if (propSnap) {
              setMyProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
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

  const handleSendReminder = async (lease: Lease) => {
    if (!profile) return;
    const tenant = allTenants.find(t => t.uid === lease.tenant);
    const property = myProperties.find(p => p.id === lease.property);
    
    if (tenant && property) {
      await sendEmail(
        tenant.email,
        "Reminder: Lease Agreement Awaiting Your Signature",
        `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0f2a4a; margin-top: 0;">Signature Required</h2>
            <p>Hello ${tenant.firstName},</p>
            <p>This is a friendly reminder that a lease agreement for the property at <strong>${property.address}</strong> is awaiting your signature.</p>
            <p>Please log in to your dashboard to review the terms and sign the contract using your secure OTP.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ৳${lease.rentAmount.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Start Date:</strong> ${lease.startDate}</p>
            </div>
            <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View & Sign Contract</a>
            <p style="margin-top: 32px; font-size: 12px; color: #64748b;">If you have already signed this contract, please ignore this email.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
          </div>
        </div>
        `
      );
      alert('Reminder sent successfully to ' + tenant.email);
    }
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const leaseData: Omit<Lease, 'id'> = {
        ...newLease,
        status: 'pending_tenant',
        createdAt: new Date().toISOString(),
        landlordOrManager: profile.uid
      };
      const docRef = await addDoc(collection(db, 'leases'), leaseData).catch(err => handleFirestoreError(err, OperationType.WRITE, 'leases'));
      if (docRef) {
        const createdLease = { id: docRef.id, ...leaseData } as Lease;
        setLeases([createdLease, ...leases]);
        setShowCreateModal(false);

        // Send Email Notifications
        const tenant = allTenants.find(t => t.uid === leaseData.tenant);
        const property = myProperties.find(p => p.id === leaseData.property);
        
        if (tenant && property) {
          // Notify Tenant
          await sendEmail(
            tenant.email,
            "Action Required: New Lease Agreement Ready for Signing",
            `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #0f2a4a; margin-top: 0;">New Lease Agreement</h2>
                <p>Hello ${tenant.firstName},</p>
                <p>A new lease agreement has been initiated for the property at <strong>${property.address}</strong>.</p>
                <p>Please log in to your PropertyAZ dashboard to review and sign the contract using your secure OTP.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ৳${leaseData.rentAmount.toLocaleString()}</p>
                  <p style="margin: 4px 0;"><strong>Start Date:</strong> ${leaseData.startDate}</p>
                </div>
                <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Review & Sign Contract</a>
                <p style="margin-top: 32px; font-size: 12px; color: #64748b;">This is a legally binding document. Please review all terms carefully before signing.</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
              </div>
            </div>
            `
          );

          // Notify Landlord (Confirmation)
          await sendEmail(
            profile.email,
            "Lease Agreement Initiated",
            `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #0f2a4a; margin-top: 0;">Lease Initiated</h2>
                <p>Hello ${profile.firstName},</p>
                <p>You have successfully initiated a lease agreement for <strong>${property.address}</strong> with tenant <strong>${tenant.firstName} ${tenant.lastName}</strong>.</p>
                <p>We have notified the tenant to review and sign the contract. You will receive another notification once they have signed.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 4px 0;"><strong>Tenant:</strong> ${tenant.firstName} ${tenant.lastName}</p>
                  <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ৳${leaseData.rentAmount.toLocaleString()}</p>
                </div>
                <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Contract Status</a>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
              </div>
            </div>
            `
          );
        }

        setNewLease({
          property: '',
          tenant: '',
          startDate: '',
          endDate: '',
          rentAmount: 0,
          depositAmount: 0,
          termsAndConditions: ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSign = async () => {
    if (!selectedLease) return;
    // Simulate OTP validation
    if (otp.join('').length < 6) {
      alert('Please enter the full 6-digit OTP');
      return;
    }

    try {
      const leaseRef = doc(db, 'leases', selectedLease.id);
      await updateDoc(leaseRef, {
        status: 'active',
        otpSigned: true,
        signedAt: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `leases/${selectedLease.id}`));
      
      setSigningStep(2);
      // Refresh list
      setLeases(leases.map(l => l.id === selectedLease.id ? { ...l, status: 'active', otpSigned: true, signedAt: new Date().toISOString() } as Lease : l));

      // Send Email Notifications for successful signing
      const property = myProperties.find(p => p.id === selectedLease.property);
      const landlordRef = await getDocs(query(collection(db, 'users'), where('uid', '==', selectedLease.landlordOrManager))).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
      const landlord = landlordRef && !landlordRef.empty ? landlordRef.docs[0].data() as User : null;

      if (profile && property && landlord) {
        // Notify Tenant
        await sendEmail(
          profile.email,
          "Lease Agreement Signed Successfully",
          `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #0f2a4a; margin-top: 0;">Congratulations!</h2>
              <p>Hello ${profile.firstName},</p>
              <p>You have successfully signed the lease agreement for <strong>${property.address}</strong>.</p>
              <p>The contract is now active. You can download your copy from the dashboard at any time.</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 4px 0;"><strong>Property:</strong> ${property.address}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Active</p>
                <p style="margin: 4px 0;"><strong>Signed Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Active Contract</a>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
            </div>
          </div>
          `
        );

        // Notify Landlord
        await sendEmail(
          landlord.email,
          "Lease Agreement Signed by Tenant",
          `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #0f2a4a; margin-top: 0;">Lease Signed</h2>
              <p>Hello ${landlord.firstName},</p>
              <p>The tenant <strong>${profile.firstName} ${profile.lastName}</strong> has signed the lease agreement for <strong>${property.address}</strong>.</p>
              <p>The lease is now active. You can view the signed document in your dashboard.</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 4px 0;"><strong>Property:</strong> ${property.address}</p>
                <p style="margin: 4px 0;"><strong>Tenant:</strong> ${profile.firstName} ${profile.lastName}</p>
              </div>
              <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Signed Contract</a>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
            </div>
          </div>
          `
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lease Agreements</h2>
          <p className="text-slate-500 text-sm">Manage and sign your digital contracts securely</p>
        </div>
        {(profile?.userType === 'landlord' || profile?.userType === 'manager') && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0a1e36] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Contract
          </button>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Initiate New Lease</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateLease} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Property</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.property}
                      onChange={e => setNewLease({...newLease, property: e.target.value})}
                    >
                      <option value="">Choose a property</option>
                      {myProperties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Tenant</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.tenant}
                      onChange={e => setNewLease({...newLease, tenant: e.target.value})}
                    >
                      <option value="">Choose a tenant</option>
                      {allTenants.map(t => (
                        <option key={t.uid} value={t.uid}>{t.firstName} {t.lastName} ({t.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.startDate}
                      onChange={e => setNewLease({...newLease, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.endDate}
                      onChange={e => setNewLease({...newLease, endDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Rent (৳)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.rentAmount}
                      onChange={e => setNewLease({...newLease, rentAmount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Deposit (৳)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.depositAmount}
                      onChange={e => setNewLease({...newLease, depositAmount: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                    placeholder="Enter specific lease terms..."
                    value={newLease.termsAndConditions}
                    onChange={e => setNewLease({...newLease, termsAndConditions: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Create & Send for Signing
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contract List */}
              <div className="lg:col-span-1 space-y-4">
          {leases.length > 0 ? leases.map((lease) => {
            const property = myProperties.find(p => p.id === lease.property);
            const tenant = allTenants.find(t => t.uid === lease.tenant);
            
            return (
              <div 
                key={lease.id}
                onClick={() => { setSelectedLease(lease); setSigningStep(0); }}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedLease?.id === lease.id ? "border-blue-900 bg-blue-50/50" : "border-slate-100 hover:border-slate-200 bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                    lease.status === 'active' ? "bg-green-50 text-green-600" : 
                    lease.status === 'pending_tenant' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {lease.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 truncate">
                  {property?.address || 'Property Details'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  {profile?.userType === 'tenant' ? 'Landlord/Manager' : `Tenant: ${tenant?.firstName || 'Unknown'}`}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Rent: ৳{lease.rentAmount.toLocaleString()} · {lease.startDate} to {lease.endDate}</p>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  Created {new Date(lease.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-400 italic">No contracts found.</p>
            </div>
          )}
        </div>

        {/* Contract Details / Signing Flow */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedLease ? (
              <motion.div 
                key={selectedLease.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {signingStep === 0 && (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-slate-900">Contract Details</h3>
                      <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        Download Draft
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-4">Lease Agreement</h4>
                      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                        <p>This agreement is made between the Landlord/Manager and the Tenant for the property at <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedLease.property)?.address || 'Selected Property'}</span>.</p>
                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-200">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Monthly Rent</p>
                            <p className="font-bold text-slate-900">৳{selectedLease.rentAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Security Deposit</p>
                            <p className="font-bold text-slate-900">৳{selectedLease.depositAmount?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Start Date</p>
                            <p className="font-bold text-slate-900">{selectedLease.startDate}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">End Date</p>
                            <p className="font-bold text-slate-900">{selectedLease.endDate}</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Terms & Conditions</p>
                          <p className="text-xs">{selectedLease.termsAndConditions || 'Standard lease terms apply.'}</p>
                        </div>
                      </div>
                    </div>

                    {selectedLease.status === 'pending_tenant' && profile?.userType === 'tenant' ? (
                      <button 
                        onClick={() => setSigningStep(1)}
                        className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                      >
                        Proceed to Sign Contract
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : selectedLease.status === 'pending_tenant' && (profile?.userType === 'landlord' || profile?.userType === 'manager') ? (
                      <button 
                        onClick={() => handleSendReminder(selectedLease)}
                        className="w-full py-4 border-2 border-blue-900 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Send Signature Reminder
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <p className="text-sm font-medium">This contract is active and signed via OTP.</p>
                        </div>
                        
                        {selectedLease.status === 'active' && 
                         (profile?.userType === 'landlord' || profile?.userType === 'manager') && 
                         isNearingEnd(selectedLease.endDate) && (
                          <button 
                            onClick={() => handleRenew(selectedLease)}
                            className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Renew Lease Agreement
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {signingStep === 1 && (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-900 mx-auto mb-6">
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Sign your contract</h3>
                    <p className="text-slate-500 text-sm mb-8">
                      Enter the 6-digit OTP sent to your registered phone <br />
                      <span className="text-blue-900 font-bold">{profile?.phoneNumber || "+880 ••• ••• ••••"}</span>
                      <br />
                      <span className="text-[10px] text-amber-600 font-bold uppercase mt-2 block">
                        Demo Mode: Use any 6 digits (e.g. 123456)
                      </span>
                    </p>

                    {resendStatus && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl border border-green-100 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {resendStatus}
                      </motion.div>
                    )}

                    <div className="flex justify-center gap-3 mb-8">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          type="text"
                          maxLength={1}
                          className="w-12 h-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-bold text-blue-900 focus:border-blue-900 focus:ring-0"
                          value={digit}
                          onChange={(e) => {
                            const newOtp = [...otp];
                            newOtp[i] = e.target.value;
                            setOtp(newOtp);
                            if (e.target.value && i < 5) {
                              (e.target.nextSibling as HTMLInputElement)?.focus();
                            }
                          }}
                        />
                      ))}
                    </div>

                    <div className="mb-8">
                      <button 
                        onClick={handleResendOtp}
                        className="text-xs font-bold text-blue-900 hover:text-blue-700 uppercase tracking-widest"
                      >
                        Didn't receive code? Resend OTP
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">By signing you confirm:</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        You have read and agree to the lease agreement for <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedLease.property)?.address || 'this property'}</span>. Rent: <span className="font-bold text-slate-900">৳{selectedLease.rentAmount.toLocaleString()}/mo</span> starting <span className="font-bold text-slate-900">{selectedLease.startDate}</span>.
                      </p>
                    </div>

                    <button 
                      onClick={handleSign}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                    >
                      Confirm & Sign Contract
                    </button>
                    <button 
                      onClick={() => setSigningStep(0)}
                      className="mt-4 text-sm text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {signingStep === 2 && (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-6">
                      <Check className="w-10 h-10 stroke-[3]" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2">Contract Signed!</h3>
                    <p className="text-slate-500 mb-10">Your lease for <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedLease.property)?.address || 'this property'}</span> is now active and stored securely.</p>
                    
                    <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-4">Audit Record</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Signed by</span>
                          <span className="font-bold text-slate-900">{profile?.firstName} {profile?.lastName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Date</span>
                          <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-BD')}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Ref ID</span>
                          <span className="font-bold text-slate-900 uppercase">CTR-{selectedLease.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">OTP Hash</span>
                          <span className="font-mono text-[10px] text-slate-400">{otp.join('').slice(0, 4)}…{otp.join('').slice(-2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button className="flex-1 py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                      <button 
                        onClick={() => { setSelectedLease(null); setSigningStep(0); }}
                        className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center">
                <FileText className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">Select a contract</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">Choose a contract from the list to view details or sign.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Contracts;

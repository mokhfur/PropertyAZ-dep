import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CreditCard, 
  Star, 
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const Profile: React.FC = () => {
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [success, setSuccess] = useState(false);

  const handleUpdatePhone = async () => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), { phoneNumber });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Your Profile</h2>
          <p className="text-slate-500 text-sm">Manage your personal information and verification status</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Verified Account</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - Avatar & Reputation */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-24 h-24 rounded-full bg-blue-600 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-900/20">
              {profile?.firstName?.charAt(0) || 'U'}
            </div>
            <h3 className="text-xl font-bold text-slate-900">{profile?.firstName} {profile?.lastName}</h3>
            <p className="text-slate-500 text-sm capitalize mb-6">{profile?.userType}</p>
            
            {profile?.userType === 'tenant' && (
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-center gap-1 text-slate-200 mb-2">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4" />)}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  No Ratings Yet
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Complete your first lease to earn badges</p>
              </div>
            )}
          </div>

          <div className="bg-[#0f2a4a] p-6 rounded-3xl text-white">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              Payment Methods
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs p-3 bg-white/5 rounded-xl border border-white/10">
                <span>bKash Wallet</span>
                <span className="text-white/40">Linked</span>
              </div>
              <button className="w-full py-2 text-xs font-bold text-blue-400 border border-blue-400/30 rounded-xl hover:bg-blue-400/10 transition-colors">
                + Add Method
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Details & NID */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-900">{profile?.firstName} {profile?.lastName}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-900">{profile?.email}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-900">{profile?.phoneNumber || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Identity Verification</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-wider">Pending Review</span>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                  />
                  <button 
                    onClick={handleUpdatePhone}
                    className="px-6 py-3 bg-blue-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors flex items-center gap-2"
                  >
                    {success ? <CheckCircle2 className="w-4 h-4" /> : null}
                    {success ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NID Document Upload</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-900 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-50 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-900" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Click to upload or drag and drop</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG or PDF (max. 5MB)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-700 leading-relaxed">
                  <p className="font-bold mb-1">Why do we need this?</p>
                  Verification builds trust between landlords and tenants. Verified profiles are 3x more likely to be accepted for premium listings.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

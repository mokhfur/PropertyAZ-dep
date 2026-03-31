import React, { useState } from 'react';
import { 
  Settings, 
  Globe, 
  Shield, 
  Bell, 
  Mail, 
  Database, 
  Smartphone, 
  Lock,
  Save,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { collection, getDocs, writeBatch, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';

const AdminSettings: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications' | 'system'>('general');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetStatus, setResetStatus] = useState('');

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Database },
  ] as const;

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  const handleSystemReset = async () => {
    if (!profile || profile.userType !== 'admin') return;
    
    setResetting(true);
    setResetStatus('Starting system reset...');
    
    const collectionsToClear = [
      'properties',
      'messages',
      'maintenance',
      'payments',
      'leases',
      'inspections',
      'auditLogs',
      'supportTickets',
      'broadcastMessages',
      'notifications'
    ];

    try {
      // 1. Clear all data collections
      for (const colName of collectionsToClear) {
        setResetStatus(`Clearing ${colName}...`);
        const snap = await getDocs(collection(db, colName));
        const batchSize = 50;
        let count = 0;
        let batch = writeBatch(db);
        
        for (const document of snap.docs) {
          batch.delete(document.ref);
          count++;
          if (count >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      }

      // 2. Clear users except current admin
      setResetStatus('Cleaning user accounts...');
      const usersSnap = await getDocs(collection(db, 'users'));
      let userBatch = writeBatch(db);
      let userCount = 0;
      
      for (const userDoc of usersSnap.docs) {
        if (userDoc.id !== profile.uid) {
          userBatch.delete(userDoc.ref);
          userCount++;
          if (userCount >= 50) {
            await userBatch.commit();
            userBatch = writeBatch(db);
            userCount = 0;
          }
        }
      }
      if (userCount > 0) await userBatch.commit();

      setResetStatus('System reset complete!');
      setTimeout(() => {
        setResetStatus('');
        setResetting(false);
        setShowResetConfirm(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setResetStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
          <p className="text-sm text-slate-500">Configure global application parameters and security policies</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70"
        >
          {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                  : "text-slate-500 hover:bg-slate-100"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blue-600" : "text-slate-400")} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 space-y-8">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Application Name</label>
                      <input 
                        type="text" 
                        defaultValue="PropertyAZ"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Support Email</label>
                      <input 
                        type="email" 
                        defaultValue="support@propertyaz.com"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Language</label>
                    <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none appearance-none">
                      <option>English (US)</option>
                      <option>Bengali (Bangladesh)</option>
                    </select>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Maintenance Mode</h4>
                        <p className="text-xs text-slate-500">Temporarily disable public access to the platform</p>
                      </div>
                      <button className="w-12 h-6 bg-slate-200 rounded-full relative transition-all">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">Security Policy</p>
                      <p className="text-xs text-blue-700 leading-relaxed">These settings affect all administrative and user accounts. Changes are logged in the audit trail.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Two-Factor Authentication (2FA)</h4>
                        <p className="text-xs text-slate-500">Require 2FA for all administrative accounts</p>
                      </div>
                      <button className="w-12 h-6 bg-blue-600 rounded-full relative transition-all">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Session Timeout</h4>
                        <p className="text-xs text-slate-500">Automatically logout inactive users after 30 minutes</p>
                      </div>
                      <button className="w-12 h-6 bg-blue-600 rounded-full relative transition-all">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Password Complexity</h4>
                        <p className="text-xs text-slate-500">Enforce strong password requirements for all users</p>
                      </div>
                      <button className="w-12 h-6 bg-blue-600 rounded-full relative transition-all">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Notifications</h4>
                    <div className="space-y-4">
                      {['New User Registration', 'Lease Expiry Alerts', 'Maintenance Requests', 'Financial Reports'].map((item) => (
                        <div key={item} className="flex items-center justify-between">
                          <span className="text-sm text-slate-700 font-medium">{item}</span>
                          <button className="w-12 h-6 bg-blue-600 rounded-full relative transition-all">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-4">
                        <Database className="w-5 h-5 text-slate-400" />
                        <h4 className="text-sm font-bold text-slate-900">Database Backup</h4>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Last backup: Today at 04:00 AM</p>
                      <button className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">
                        Run Manual Backup
                      </button>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-4">
                        <RefreshCcw className="w-5 h-5 text-slate-400" />
                        <h4 className="text-sm font-bold text-slate-900">Cache Management</h4>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">System cache size: 124 MB</p>
                      <button className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all">
                        Clear System Cache
                      </button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-red-900">Danger Zone: System Reset</h4>
                          <p className="text-sm text-red-700 mt-1">This action will permanently delete all properties, messages, maintenance requests, financial records, and user accounts (except yours). This cannot be undone.</p>
                        </div>
                      </div>
                      
                      {resetStatus && (
                        <div className="mb-6 p-4 bg-white/50 rounded-xl border border-red-200 flex items-center gap-3">
                          {resetting && <Loader2 className="w-4 h-4 text-red-600 animate-spin" />}
                          <p className="text-xs font-bold text-red-800">{resetStatus}</p>
                        </div>
                      )}

                      <button 
                        onClick={() => setShowResetConfirm(true)}
                        disabled={resetting}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                      >
                        Reset Entire System
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showResetConfirm && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-[2rem] max-w-md w-full p-8 text-center shadow-2xl"
                >
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Are you absolutely sure?</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    This will wipe all data from the database. Only your administrator profile will remain. 
                    <span className="block mt-2 font-bold text-red-600 uppercase tracking-widest text-[10px]">This action is irreversible.</span>
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleSystemReset}
                      disabled={resetting}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                      {resetting ? 'Resetting System...' : 'Yes, Delete Everything'}
                    </button>
                    <button 
                      onClick={() => setShowResetConfirm(false)}
                      disabled={resetting}
                      className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Cancel and Keep Data
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Mobile App Integration</p>
                <p className="text-[10px] text-slate-400">Manage API keys and mobile push configurations</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;

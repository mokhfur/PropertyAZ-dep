import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  where,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { User, UserType } from '../../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Ban, 
  CheckCircle, 
  Trash2, 
  Edit, 
  Key, 
  History, 
  UserPlus,
  X,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  FileText,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import Papa from 'papaparse';

const AdminUsers: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newUser, setNewUser] = useState<Partial<User>>({
    userType: 'tenant',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { ...selectedUser });
      setUsers(users.map(u => u.uid === selectedUser.uid ? selectedUser : u));
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.userType) return;
    setSaving(true);
    try {
      const uid = `manual-${Date.now()}`;
      const userToCreate: User = {
        uid,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        userType: newUser.userType as UserType,
        createdAt: new Date().toISOString(),
        verified: false,
        blocked: false
      };
      await setDoc(doc(db, 'users', uid), userToCreate);
      setUsers([userToCreate, ...users]);
      setShowAddModal(false);
      setNewUser({ userType: 'tenant', firstName: '', lastName: '', email: '', phoneNumber: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const userTypeMap: Record<string, UserType> = {
    tenants: 'tenant',
    landlords: 'landlord',
    managers: 'manager',
    vendors: 'vendor',
    admins: 'admin'
  };

  const targetType = type ? userTypeMap[type] : undefined;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      if (targetType) {
        q = query(collection(db, 'users'), where('userType', '==', targetType), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [targetType]);

  const downloadTemplate = () => {
    const csvContent = "firstName,lastName,email,phoneNumber,userType,nidNumber\nJohn,Doe,john@example.com,01700000000,tenant,1234567890\nJane,Smith,jane@example.com,01800000000,landlord,0987654321";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "user_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus('Parsing CSV...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        setImportStatus(`Importing ${data.length} users...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          try {
            if (!row.email || !row.userType) continue;

            const uid = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newUser: User = {
              uid,
              email: row.email.toLowerCase().trim(),
              firstName: row.firstName || '',
              lastName: row.lastName || '',
              phoneNumber: row.phoneNumber || '',
              userType: (row.userType.toLowerCase() as UserType) || 'tenant',
              createdAt: new Date().toISOString(),
              verified: false,
              blocked: false
            };

            await setDoc(doc(db, 'users', uid), newUser);
            successCount++;
          } catch (err) {
            console.error('Import error for row:', row, err);
            errorCount++;
          }
        }

        setImportStatus(`Import complete: ${successCount} success, ${errorCount} failed.`);
        fetchUsers();
        setTimeout(() => {
          setImporting(false);
          setImportStatus('');
        }, 5000);
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        setImportStatus('Error parsing CSV file.');
        setImporting(false);
      }
    });
  };

  const handleStatusToggle = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { blocked: !user.blocked });
      setUsers(users.map(u => u.uid === user.uid ? { ...u, blocked: !user.blocked } : u));
      
      // Log action
      await addDoc(collection(db, 'auditLogs'), {
        adminId: 'system', // Replace with actual admin ID
        adminName: 'System Admin',
        action: user.blocked ? 'unblock_user' : 'block_user',
        targetId: user.uid,
        targetType: 'user',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure? This is permanent.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.uid !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.firstName + ' ' + u.lastName + ' ' + u.email).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 capitalize">{type || 'All'} Management</h2>
          <p className="text-sm text-slate-500">Manage and monitor {type || 'all system'} accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Importing...' : 'Bulk Import'}
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Add {targetType || 'User'}
          </button>
        </div>
      </div>

      {importStatus && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3"
        >
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-medium text-blue-800">{importStatus}</p>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Search ${type || 'users'} by name, email, or ID...`}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/10 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 flex items-center gap-2 hover:bg-slate-100 transition-colors">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role & Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No users found</td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.firstName?.[0] || user.email[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded-md",
                        user.userType === 'admin' ? "bg-red-50 text-red-600" :
                        user.userType === 'landlord' ? "bg-purple-50 text-purple-600" :
                        user.userType === 'tenant' ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {user.userType}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", user.blocked ? "bg-red-500" : "bg-green-500")}></div>
                        <span className="text-[10px] font-medium text-slate-600">{user.blocked ? 'Suspended' : 'Active'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.verified ? (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase">Pending</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-[10px] text-slate-500">
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                      <p className="flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleStatusToggle(user)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          user.blocked ? "text-green-600 hover:bg-green-50" : "text-amber-600 hover:bg-amber-50"
                        )}
                        title={user.blocked ? "Unsuspend" : "Suspend"}
                      >
                        {user.blocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(user.uid)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                    {selectedUser.firstName?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Edit User Profile</h3>
                    <p className="text-xs text-slate-500">UID: {selectedUser.uid}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Information</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">First Name</label>
                        <input type="text" defaultValue={selectedUser.firstName} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Last Name</label>
                        <input type="text" defaultValue={selectedUser.lastName} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Email Address</label>
                      <input type="email" defaultValue={selectedUser.email} disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Phone Number</label>
                      <input type="text" defaultValue={selectedUser.phoneNumber} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Control</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">User Role</label>
                      <select defaultValue={selectedUser.userType} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                        <option value="tenant">Tenant</option>
                        <option value="landlord">Landlord</option>
                        <option value="manager">Property Manager</option>
                        <option value="vendor">Service Provider</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Verification Status</label>
                      <div className="flex gap-2">
                        <button className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                          selectedUser.verified ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-400"
                        )}>Verified</button>
                        <button className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                          !selectedUser.verified ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-400"
                        )}>Unverified</button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Internal Admin Notes</label>
                      <textarea 
                        placeholder="Add notes about this user (only visible to admins)..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none"
                        defaultValue={selectedUser.internalNotes}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowEditModal(false)} 
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-900 flex items-center justify-center text-white font-bold text-xl">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Create New User</h3>
                    <p className="text-xs text-slate-500">Add a manual user account to the system</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Information</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">First Name</label>
                        <input 
                          type="text" 
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Last Name</label>
                        <input 
                          type="text" 
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Email Address</label>
                      <input 
                        type="email" 
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Phone Number</label>
                      <input 
                        type="text" 
                        value={newUser.phoneNumber}
                        onChange={(e) => setNewUser({...newUser, phoneNumber: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Assignment</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">User Role</label>
                      <select 
                        value={newUser.userType}
                        onChange={(e) => setNewUser({...newUser, userType: e.target.value as UserType})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      >
                        <option value="tenant">Tenant</option>
                        <option value="landlord">Landlord</option>
                        <option value="manager">Property Manager</option>
                        <option value="vendor">Service Provider</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                      <p className="text-[10px] text-blue-700 leading-relaxed">
                        <AlertCircle className="w-3 h-3 inline mr-1 mb-0.5" />
                        New users created manually will need to use the "Forgot Password" feature with their email address to set their initial password and gain access to the system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowAddModal(false)} 
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateUser}
                  disabled={saving}
                  className="px-8 py-2.5 bg-blue-900 text-white text-sm font-bold rounded-xl hover:bg-blue-800 shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;

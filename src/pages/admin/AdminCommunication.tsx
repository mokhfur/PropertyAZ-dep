import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { BroadcastMessage, UserType } from '../../types';
import { 
  Send, 
  Users, 
  Megaphone, 
  Bell, 
  History, 
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const AdminCommunication: React.FC = () => {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    target: 'all' as UserType | 'all',
    type: 'announcement' as 'announcement' | 'warning' | 'popup' | 'emergency'
  });

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const q = query(collection(db, 'broadcastMessages'), orderBy('createdAt', 'desc'), limit(20));
        const snap = await getDocs(q);
        setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BroadcastMessage)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.title || !newMessage.content) return;

    try {
      const messageData = {
        title: newMessage.title,
        content: newMessage.content,
        type: newMessage.type,
        targetRoles: newMessage.target === 'all' ? 'all' : [newMessage.target],
        senderId: 'system',
        senderName: 'System Admin',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        readBy: []
      };

      const docRef = await addDoc(collection(db, 'broadcastMessages'), messageData);

      setMessages([{ 
        id: docRef.id, 
        ...messageData
      } as BroadcastMessage, ...messages]);
      
      setShowNewMessageModal(false);
      setNewMessage({ title: '', content: '', target: 'all', type: 'announcement' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Communication</h2>
          <p className="text-sm text-slate-500">Broadcast announcements and targeted notifications to users</p>
        </div>
        <button 
          onClick={() => setShowNewMessageModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          New Broadcast
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              Communication Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Total Sent</p>
                <p className="text-2xl font-bold text-blue-900">{messages.length}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Open Rate</p>
                <p className="text-2xl font-bold text-emerald-900">84%</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Templates</p>
              {['Maintenance Notice', 'System Update', 'Policy Change', 'Holiday Greeting'].map((template) => (
                <button key={template} className="w-full p-3 text-left text-sm text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all flex items-center justify-between group">
                  {template}
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Push Notifications
            </h4>
            <p className="text-xs text-blue-100 mb-4 leading-relaxed">
              Targeted push notifications have a 3x higher engagement rate than emails. Use them for urgent alerts.
            </p>
            <button className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/20">
              Configure Push Settings
            </button>
          </div>
        </div>

        {/* Message History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                Recent Broadcasts
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search history..."
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600/10"
                  />
                </div>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <Filter className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No messages sent yet</div>
              ) : messages.map((msg) => (
                <div key={msg.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        msg.type === 'emergency' ? "bg-red-50 text-red-600" :
                        msg.type === 'warning' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {msg.type === 'emergency' ? <AlertCircle className="w-5 h-5" /> :
                         msg.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{msg.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            To: {msg.target}
                          </span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 pl-13">
                    {msg.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessageModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <form onSubmit={handleSendMessage}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">New Broadcast</h3>
                      <p className="text-xs text-slate-500">Send a system-wide notification</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowNewMessageModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <Plus className="w-5 h-5 text-slate-400 rotate-45" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Target Audience</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/10 outline-none"
                          value={newMessage.target}
                          onChange={(e) => setNewMessage({ ...newMessage, target: e.target.value as any })}
                        >
                          <option value="all">All Users</option>
                          <option value="tenant">Tenants Only</option>
                          <option value="landlord">Landlords Only</option>
                          <option value="manager">Property Managers Only</option>
                          <option value="vendor">Vendors Only</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Message Type</label>
                        <select 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/10 outline-none"
                          value={newMessage.type}
                          onChange={(e) => setNewMessage({ ...newMessage, type: e.target.value as any })}
                        >
                          <option value="announcement">Announcement</option>
                          <option value="warning">Warning</option>
                          <option value="popup">Popup Alert</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Subject / Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Scheduled Maintenance - Sunday"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/10 outline-none"
                        value={newMessage.title}
                        onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Message Content</label>
                      <textarea 
                        placeholder="Type your message here..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-40 resize-none focus:ring-2 focus:ring-blue-600/10 outline-none"
                        value={newMessage.content}
                        onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                        required
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowNewMessageModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Discard</button>
                  <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Broadcast
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCommunication;

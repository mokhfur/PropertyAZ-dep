import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { SupportTicket } from '../../types';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  User, 
  Tag, 
  ChevronRight,
  MoreVertical,
  X,
  Send,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved'>('all');

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        let q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
        if (filter !== 'all') {
          q = query(collection(db, 'supportTickets'), where('status', '==', filter), orderBy('createdAt', 'desc'));
        }
        const snap = await getDocs(q);
        setTickets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [filter]);

  const handleStatusUpdate = async (ticketId: string, newStatus: SupportTicket['status']) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), { status: newStatus });
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Support Management</h2>
          <p className="text-sm text-slate-500">Manage user inquiries, technical issues, and support requests</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          {(['all', 'open', 'in-progress', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                filter === f ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tickets..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-600/10"
            />
          </div>

          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200">
                No tickets found
              </div>
            ) : tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "w-full p-4 text-left rounded-2xl border transition-all group relative",
                  selectedTicket?.id === ticket.id 
                    ? "bg-blue-50 border-blue-200 shadow-md" 
                    : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-sm"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-md",
                    ticket.priority === 'high' ? "bg-red-50 text-red-600" :
                    ticket.priority === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {ticket.priority}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{ticket.subject}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {ticket.userName[0]}
                    </div>
                    <span className="text-[10px] font-medium text-slate-600">{ticket.userName}</span>
                  </div>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    ticket.status === 'open' ? "bg-red-500" :
                    ticket.status === 'in-progress' ? "bg-amber-500" : "bg-emerald-500"
                  )}></div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket Detail View */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col min-h-[600px]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    selectedTicket.status === 'open' ? "bg-red-50 text-red-600" :
                    selectedTicket.status === 'in-progress' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {selectedTicket.status === 'open' ? <AlertCircle className="w-6 h-6" /> :
                     selectedTicket.status === 'in-progress' ? <Clock className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">Ticket ID: {selectedTicket.id}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 capitalize">{selectedTicket.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusUpdate(selectedTicket.id, e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600/10"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-3 gap-8">
                  <div className="col-span-2 space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Description</h4>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
                        {selectedTicket.description}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Notes</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                          <p className="text-xs text-amber-800 italic">"User reported this after the latest system update. Might be related to the new dashboard layout." - Admin</p>
                          <p className="text-[10px] text-amber-600 mt-2">Yesterday, 4:20 PM</p>
                        </div>
                        <textarea 
                          placeholder="Add an internal note..."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm h-24 resize-none focus:ring-2 focus:ring-blue-600/10 outline-none"
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Details</h4>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                            {selectedTicket.userName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{selectedTicket.userName}</p>
                            <p className="text-[10px] text-slate-500">User ID: {selectedTicket.userId}</p>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-50">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Account Type</span>
                            <span className="font-bold text-slate-700 uppercase">Landlord</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Member Since</span>
                            <span className="font-bold text-slate-700">Jan 2024</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metadata</h4>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-[10px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">Category: {selectedTicket.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reply Section */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <textarea 
                    placeholder="Type your reply to the user..."
                    className="w-full p-4 pr-32 bg-white border border-slate-200 rounded-2xl text-sm h-32 resize-none focus:ring-2 focus:ring-blue-600/10 outline-none shadow-sm"
                  ></textarea>
                  <div className="absolute right-4 bottom-4 flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
                      <Send className="w-4 h-4" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 space-y-4">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                <MessageSquare className="w-10 h-10" />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-600">No Ticket Selected</p>
                <p className="text-sm">Select a ticket from the list to view details and reply</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;

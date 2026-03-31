import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot, limit, or, and } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Message, User } from '../types';
import { 
  Search, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Image as ImageIcon, 
  Paperclip,
  Smile,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Messaging: React.FC = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<{ user: User, lastMessage?: Message }[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;

    // Fetch conversations based on messages
    const q = query(
      collection(db, 'messages'),
      or(
        where('sender', '==', profile.uid),
        where('receiver', '==', profile.uid)
      ),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      
      // Get unique user IDs from messages
      const userIds = new Set<string>();
      msgs.forEach(m => {
        if (m.sender !== profile.uid) userIds.add(m.sender);
        if (m.receiver !== profile.uid) userIds.add(m.receiver);
      });

      if (userIds.size === 0) {
        setConversations([]);
        return;
      }

      // Fetch user details for these IDs
      const usersQ = query(collection(db, 'users'), where('uid', 'in', Array.from(userIds)));
      const usersSnap = await getDocs(usersQ);
      const usersMap = new Map<string, User>();
      usersSnap.docs.forEach(doc => {
        const u = doc.data() as User;
        usersMap.set(u.uid, u);
      });

      const convs: { user: User, lastMessage?: Message }[] = [];
      userIds.forEach(uid => {
        const user = usersMap.get(uid);
        if (user) {
          const lastMsg = msgs.find(m => m.sender === uid || m.receiver === uid);
          convs.push({ user, lastMessage: lastMsg });
        }
      });

      setConversations(convs);
    });

    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    if (!profile || !selectedUser) return;

    // Use or() and and() for a more secure and precise query
    // Note: This may require a composite index in Firestore
    const q = query(
      collection(db, 'messages'),
      or(
        and(where('sender', '==', profile.uid), where('receiver', '==', selectedUser.uid)),
        and(where('sender', '==', selectedUser.uid), where('receiver', '==', profile.uid))
      ),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'messages');
    });

    return unsubscribe;
  }, [profile, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedUser || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        sender: profile.uid,
        receiver: selectedUser.uid,
        content: newMessage,
        createdAt: new Date().toISOString(),
        isRead: false
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div 
              key={conv.user.uid}
              onClick={() => setSelectedUser(conv.user)}
              className={cn(
                "p-4 flex items-center gap-4 cursor-pointer transition-colors",
                selectedUser?.uid === conv.user.uid ? "bg-blue-50" : "hover:bg-slate-50"
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                  {conv.user.firstName?.charAt(0)}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{conv.user.firstName} {conv.user.lastName}</p>
                  <span className="text-[10px] text-slate-400">9:41 AM</span>
                </div>
                <p className="text-xs text-slate-500 truncate capitalize">{conv.user.userType}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="h-20 bg-white border-b border-slate-100 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                  {selectedUser.firstName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <p className="text-[10px] text-green-500 font-medium">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"><Phone className="w-5 h-5" /></button>
                <button className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"><Video className="w-5 h-5" /></button>
                <button className="p-2 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "flex flex-col",
                    msg.sender === profile?.uid ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[70%] p-4 rounded-2xl text-sm",
                    msg.sender === profile?.uid 
                      ? "bg-blue-900 text-white rounded-tr-none" 
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-100 shadow-sm"
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button type="button" className="p-2 text-slate-400 hover:text-blue-900"><Paperclip className="w-5 h-5" /></button>
                  <button type="button" className="p-2 text-slate-400 hover:text-blue-900"><ImageIcon className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-900/10"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-blue-900 text-white rounded-xl flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-900 mb-6">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Your Conversations</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">Select a tenant, landlord, or manager to start a secure conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;

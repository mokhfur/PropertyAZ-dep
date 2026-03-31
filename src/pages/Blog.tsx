import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { BlogPost } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  User as UserIcon, 
  Tag, 
  X, 
  Image as ImageIcon,
  ArrowRight,
  Search,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const Blog: React.FC = () => {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    tags: ''
  });

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'blogPosts'));
        if (querySnapshot) {
          const postsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
          setPosts(postsList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const postData = {
      title: formData.title,
      content: formData.content,
      image: formData.image || 'https://picsum.photos/seed/property/800/400',
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
      authorId: profile.uid,
      authorName: `${profile.firstName} ${profile.lastName}`,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingPost) {
        await updateDoc(doc(db, 'blogPosts', editingPost.id), postData).catch(err => handleFirestoreError(err, OperationType.UPDATE, `blogPosts/${editingPost.id}`));
        setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...postData } : p));
      } else {
        const newPost = { ...postData, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'blogPosts'), newPost).catch(err => handleFirestoreError(err, OperationType.WRITE, 'blogPosts'));
        if (docRef) {
          setPosts([{ id: docRef.id, ...newPost } as BlogPost, ...posts]);
        }
      }
      setShowAddModal(false);
      setEditingPost(null);
      setFormData({ title: '', content: '', image: '', tags: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'blogPosts', id)).catch(err => handleFirestoreError(err, OperationType.DELETE, `blogPosts/${id}`));
      setPosts(posts.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = profile?.userType === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-[#0f2a4a]">PropertyAZ</Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">Login</Link>
            <Link to="/login" className="bg-[#0f2a4a] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#0a1e36] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-12 py-12 px-6 pb-20">
        {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-slate-900 tracking-tight">PropertyAZ Blog</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
          Insights, tips, and news from the leading property management ecosystem in Bangladesh.
        </p>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="mt-6 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto shadow-xl shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Create New Post
          </button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Search articles..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Featured Post (First one) */}
      {filteredPosts.length > 0 && !searchTerm && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-8 bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-xl"
        >
          <div className="h-[400px] md:h-full relative overflow-hidden group">
            <img 
              src={filteredPosts[0].image || 'https://picsum.photos/seed/featured/800/600'} 
              alt="" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-6 left-6 flex gap-2">
              {filteredPosts[0].tags?.map((tag, i) => (
                <span key={i} className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-full tracking-widest">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="p-12 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(filteredPosts[0].createdAt).toLocaleDateString()}
              </span>
              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <span className="flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                {filteredPosts[0].authorName}
              </span>
            </div>
            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
              {filteredPosts[0].title}
            </h2>
            <p className="text-slate-500 line-clamp-3 leading-relaxed">
              {filteredPosts[0].content}
            </p>
            <div className="flex items-center justify-between pt-4">
              <button className="text-blue-600 font-bold flex items-center gap-2 group">
                Read Full Article
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              {isAdmin && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingPost(filteredPosts[0]);
                      setFormData({
                        title: filteredPosts[0].title,
                        content: filteredPosts[0].content,
                        image: filteredPosts[0].image || '',
                        tags: filteredPosts[0].tags?.join(', ') || ''
                      });
                      setShowAddModal(true);
                    }}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(filteredPosts[0].id)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Post Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPosts.slice(searchTerm ? 0 : 1).map((post, idx) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white rounded-[32px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
          >
            <div className="h-56 relative overflow-hidden">
              <img 
                src={post.image || `https://picsum.photos/seed/${post.id}/600/400`} 
                alt="" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 left-4 flex gap-2">
                {post.tags?.slice(0, 2).map((tag, i) => (
                  <span key={i} className="bg-white/90 backdrop-blur-md text-slate-900 text-[9px] font-bold uppercase px-2.5 py-1 rounded-full tracking-widest">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-8 flex-1 flex flex-col space-y-4">
              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <Calendar className="w-3 h-3" />
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
              <h3 className="text-xl font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                {post.title}
              </h3>
              <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed flex-1">
                {post.content}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <button className="text-xs font-bold text-slate-900 flex items-center gap-1 group/btn">
                  Continue Reading
                  <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                </button>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        setEditingPost(post);
                        setFormData({
                          title: post.title,
                          content: post.content,
                          image: post.image || '',
                          tags: post.tags?.join(', ') || ''
                        });
                        setShowAddModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
          <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900">No articles found</h3>
          <p className="text-slate-500 mt-2">Try adjusting your search or check back later.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{editingPost ? 'Edit Article' : 'New Article'}</h3>
                  <p className="text-slate-500 text-sm">Share your insights with the PropertyAZ community</p>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingPost(null); }} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Article Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., 5 Tips for First-Time Landlords"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cover Image URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="url" 
                      placeholder="https://images.unsplash.com/..."
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                      value={formData.image}
                      onChange={e => setFormData({...formData, image: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tags (comma separated)</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Real Estate, Management, Tips"
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                      value={formData.tags}
                      onChange={e => setFormData({...formData, tags: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Content</label>
                  <textarea 
                    required
                    rows={8}
                    placeholder="Write your article content here..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:ring-2 focus:ring-blue-600 outline-none transition-all resize-none"
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    {editingPost ? 'Update Article' : 'Publish Article'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default Blog;

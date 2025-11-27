import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post, BrandContext } from './types';
import { PostEditor } from './components/PostEditor';
import { supabase } from './services/supabaseClient';
import { Plus, Leaf, Loader2, Copy, Check, Lock, Upload, Trash2, AlertCircle, RefreshCw, Settings, Table2, Calendar } from 'lucide-react';

const INITIAL_BRAND: BrandContext = {
  name: "Light Dust",
  mission: "Transforming any container into a sustainable candle using innovative pearl wax.",
  tone: "Cozy, Smart, Sustainable, Aesthetic, Warm, Inviting",
  keywords: ["Pearl Candle", "Sustainable Home", "DIY Candle", "Eco Friendly", "Home Decor", "Candle Lover"]
};

// Post Detail Modal Component
function PostDetailModal({ post, onClose }: { post: Post, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-brand-dark mb-2">{post.title || 'Untitled Post'}</h2>
              <p className="text-sm text-stone-500">
                {post.date ? (() => {
                  const [year, month, day] = post.date.split('-');
                  return `${day}/${month}/${year}`;
                })() : 'No date'}
              </p>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image */}
          {post.imageUrl && (
            <div className="mb-6">
              <img src={post.imageUrl} alt="Post" className="w-full rounded-lg shadow-md" />
            </div>
          )}

          {/* Status */}
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 rounded text-sm font-bold uppercase ${
              post.status === 'Posted' ? 'bg-stone-800 text-white' :
              post.status === 'Approved' ? 'bg-brand-green text-white' :
              post.status === 'For Approval' ? 'bg-amber-100 text-amber-800' :
              'bg-stone-100 text-stone-600'
            }`}>
              {post.status}
            </span>
          </div>

          {/* Caption */}
          {post.generatedCaption && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-stone-700 mb-2">Caption</h3>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{post.generatedCaption}</p>
            </div>
          )}

          {/* Hashtags */}
          {post.generatedHashtags && post.generatedHashtags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-stone-700 mb-2">Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {post.generatedHashtags.map((tag, idx) => (
                  <span key={idx} className="text-xs text-brand-green bg-brand-green/5 px-2 py-1 rounded border border-brand-green/10">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {post.notes && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-stone-700 mb-2">Notes</h3>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{post.notes}</p>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-brand-dark text-white py-3 rounded-lg hover:bg-black transition-all font-medium mt-6"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Calendar View Component
function CalendarView({ posts, selectedMonth }: { posts: Post[], selectedMonth: Date }) {
  const [currentMonth, setCurrentMonth] = useState(selectedMonth);

  // Sync with parent selectedMonth
  useEffect(() => {
    setCurrentMonth(selectedMonth);
  }, [selectedMonth]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const getPostsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return posts.filter(post => post.date === dateStr);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-stone-300 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-brand-dark">
            {monthNames[month]} {year}
          </h2>
          <div className="flex gap-2">
            <button onClick={previousMonth} className="px-3 py-1 border border-stone-300 rounded hover:bg-stone-50">
              ←
            </button>
            <button onClick={nextMonth} className="px-3 py-1 border border-stone-300 rounded hover:bg-stone-50">
              →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-stone-500 uppercase tracking-wider bg-purple-100 py-2 rounded">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="border border-stone-200 rounded min-h-[100px] bg-stone-50"></div>
          ))}

          {/* Calendar Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayPosts = getPostsForDate(day);

            return (
              <div key={day} className="border border-stone-200 rounded min-h-[100px] p-2 hover:bg-stone-50 transition-colors">
                <div className="text-sm font-semibold text-stone-700 mb-1">{day}</div>
                <div className="space-y-1">
                  {dayPosts.map(post => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="text-xs px-2 py-1 rounded cursor-pointer bg-pink-100 text-pink-800 hover:bg-pink-200 transition-colors truncate"
                      title={post.title}
                    >
                      {post.title || 'Untitled Post'}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </>
  );
}

// Map DB columns (snake_case) to App types (camelCase)
const mapDbToPost = (dbPost: any): Post => ({
  id: dbPost.id,
  title: dbPost.title,
  date: dbPost.date,
  status: dbPost.status as any,
  imageDescription: dbPost.image_description || '',
  imageUrl: dbPost.image_url || '',
  generatedCaption: dbPost.generated_caption || '',
  generatedHashtags: dbPost.generated_hashtags || [],
  notes: dbPost.notes || ''
});

// Map App types to DB columns
const mapPostToDb = (post: Partial<Post>) => {
  const dbObj: any = {};
  if (post.title !== undefined) dbObj.title = post.title;
  if (post.date !== undefined) dbObj.date = post.date;
  if (post.status !== undefined) dbObj.status = post.status;
  if (post.imageDescription !== undefined) dbObj.image_description = post.imageDescription;
  if (post.imageUrl !== undefined) dbObj.image_url = post.imageUrl;
  if (post.generatedCaption !== undefined) dbObj.generated_caption = post.generatedCaption;
  if (post.generatedHashtags !== undefined) dbObj.generated_hashtags = post.generatedHashtags;
  if (post.notes !== undefined) dbObj.notes = post.notes;
  return dbObj;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [configError, setConfigError] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  // Debounce timer for database updates
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Check for config on load
  useEffect(() => {
    // Check if the environment variables are available
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error("Missing Environment Variables");
      setConfigError(true);
    }
  }, []);

  // Fetch posts from Supabase
  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching posts:', error);
      // specific check for 400/404 which might mean bad URL/Key
      if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('apikey')) {
         setStorageError("Database connection failed. Please check API Keys in Vercel.");
         setConfigError(true);
      } else {
         setStorageError("Failed to load posts from database.");
      }
    } else {
      setPosts((data || []).map(mapDbToPost));
      setStorageError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && !configError) {
      fetchPosts();

      // Set up real-time subscription
      const channel = supabase
        .channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          // Simple strategy: reload all data on change to ensure consistency
          fetchPosts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated, configError]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1991') {
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const handleUpdatePost = useCallback((id: string, field: keyof Post, value: any) => {
    // Optimistic Update - immediate UI feedback
    setPosts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

    // Clear any existing debounce timer for this post+field
    const timerKey = `${id}-${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    // Set new debounce timer - only update DB after user stops typing for 500ms
    debounceTimers.current[timerKey] = setTimeout(async () => {
      // Database Update
      const updates = mapPostToDb({ [field]: value });
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating post:', error);
        if (field === 'imageUrl' && (error.code === '413' || error.message?.includes('payload'))) {
            alert("The image is too large to save to the database. Please try a smaller file.");
        } else {
            setStorageError("Failed to save changes. Please check your connection.");
        }
        // Revert optimism if needed (could be improved in future)
        fetchPosts();
      }

      // Clean up timer reference
      delete debounceTimers.current[timerKey];
    }, 500); // 500ms debounce delay
  }, []);

  const handleDeletePost = async (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      // Optimistic Delete
      setPosts(posts.filter(p => p.id !== id));

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting post:', error);
        fetchPosts(); // Revert on error
      }
    }
  };

  const handleImageChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 2MB limit to prevent heavy payload errors
      if (file.size > 2 * 1024 * 1024) {
          alert("Image is too large. Please use an image under 2MB.");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdatePost(id, 'imageUrl', reader.result as string);
      };
      reader.onerror = () => {
          alert("Failed to read image file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = (post: Post) => {
    const fullText = `${post.generatedCaption}\n\n${post.generatedHashtags?.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewPost = async (newPost: Post) => {
    // 1. Close modal immediately
    setIsEditorOpen(false);

    // 2. Prepare for DB
    const dbPayload = {
      id: newPost.id, // Using the timestamp ID generated in modal
      ...mapPostToDb(newPost)
    };

    // 3. Optimistic Add
    setPosts([...posts, newPost]);

    // 4. Send to DB
    const { error } = await supabase.from('posts').insert([dbPayload]);
    if (error) {
      console.error("Error creating post:", error);
      if (error.message?.includes('payload')) {
          setStorageError("Failed to create post: Image too large.");
      } else {
          setStorageError("Failed to create post.");
      }
      fetchPosts(); // Revert
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Posted': return 'bg-stone-800 text-white border-stone-800';
      case 'Approved': return 'bg-brand-green text-white border-brand-green';
      case 'For Approval': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Generated': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  // Filter posts by selected month
  const filteredPosts = posts.filter(post => {
    if (!post.date) return false;
    const postDate = new Date(post.date);
    return postDate.getMonth() === selectedMonth.getMonth() &&
           postDate.getFullYear() === selectedMonth.getFullYear();
  });

  if (configError) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-xl shadow-2xl max-w-lg w-full border border-red-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-sm">
                <Settings className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-2xl text-stone-800 mb-2">Setup Required</h1>
            <p className="text-stone-500 mb-6">The application cannot connect to the database.</p>
            
            <div className="text-left bg-stone-50 p-4 rounded-lg text-sm text-stone-600 mb-6 space-y-2 border border-stone-200">
                <p className="font-semibold text-stone-800">Missing or Invalid Environment Variables:</p>
                <p>1. Check that <code className="bg-stone-200 px-1 rounded">VITE_SUPABASE_URL</code> is set.</p>
                <p>2. Check that <code className="bg-stone-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> is set.</p>
                <p>3. Check that <code className="bg-stone-200 px-1 rounded">VITE_GEMINI_API_KEY</code> is set.</p>
                <p className="mt-2 text-xs text-stone-400">Note: All environment variables in Vercel must be prefixed with VITE_ to work with this app.</p>
            </div>

            <button 
                onClick={() => window.location.reload()}
                className="w-full bg-stone-800 text-white font-medium py-3 rounded-lg hover:bg-black transition-all"
            >
                Retry Connection
            </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-xl shadow-2xl max-w-md w-full border border-stone-200 text-center">
            <div className="w-16 h-16 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                <Lock className="w-8 h-8" />
            </div>
            <h1 className="font-serif text-3xl text-brand-dark mb-2">Client Access</h1>
            <p className="text-stone-500 mb-8 font-light">Please enter the password to view the <span className="font-semibold text-brand-green">Light Dust</span> content calendar.</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green focus:outline-none transition-all text-center tracking-widest text-lg placeholder:text-stone-300 placeholder:tracking-normal"
                      autoFocus
                  />
                </div>
                {loginError && (
                  <div className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-md animate-pulse">
                    Incorrect password. Please try again.
                  </div>
                )}
                <button 
                    type="submit" 
                    className="w-full bg-brand-dark text-white font-medium py-3 rounded-lg hover:bg-black transition-all shadow-md active:scale-[0.98]"
                >
                    Enter Portal
                </button>
            </form>
            <p className="mt-8 text-xs text-stone-400">© 2025 Light Dust Candles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-stone-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-brand-green rounded text-white">
              <Leaf className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-brand-dark">Light Dust <span className="font-sans font-normal text-stone-400 text-sm">Content Manager</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={fetchPosts} className="text-stone-400 hover:text-brand-green p-2" title="Refresh Data">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <button className="text-sm font-medium text-stone-500 hover:text-brand-dark px-3 py-2 transition-colors">
                Export to CSV
             </button>
             <button 
              onClick={() => setIsEditorOpen(true)}
              className="bg-brand-dark hover:bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Post
            </button>
          </div>
        </div>
      </header>

      {storageError && (
        <div className="bg-red-50 text-red-700 px-6 py-2 text-sm flex items-center justify-center gap-2 border-b border-red-100">
            <AlertCircle className="w-4 h-4" />
            {storageError}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-x-auto p-6">
        <div className="min-w-[1200px] max-w-[1600px] mx-auto">
          {/* Month Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {Array.from({ length: 6 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - 2 + i);
              const monthName = date.toLocaleString('default', { month: 'long' });
              const year = date.getFullYear();
              const isSelected = selectedMonth.getMonth() === date.getMonth() && selectedMonth.getFullYear() === date.getFullYear();

              return (
                <button
                  key={`${year}-${date.getMonth()}`}
                  onClick={() => setSelectedMonth(new Date(date))}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-brand-green text-white shadow-sm'
                      : 'bg-white text-stone-600 border border-stone-300 hover:border-brand-green'
                  }`}
                >
                  {monthName} {year}
                </button>
              );
            })}
          </div>

          {/* View Toggle Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-brand-dark border-2 border-brand-dark shadow-sm'
                  : 'bg-white text-stone-500 border border-stone-300 hover:border-stone-400'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-brand-dark border-2 border-brand-dark shadow-sm'
                  : 'bg-white text-stone-500 border border-stone-300 hover:border-stone-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar View
            </button>
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow-sm border border-stone-300 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-stone-50 border-b border-stone-300">
                        <th className="sticky left-0 z-10 bg-stone-50 p-4 w-32 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Date</th>
                        <th className="p-4 w-64 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Creative</th>
                        <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Caption & Hashtags</th>
                        <th className="p-4 w-48 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">
                          <div className="flex flex-col gap-2">
                            <span>Approval Status</span>
                            <button
                              onClick={async () => {
                                if (confirm(`Approve all ${filteredPosts.length} posts in this month?`)) {
                                  const updates = filteredPosts.map(post =>
                                    supabase.from('posts').update({ status: 'Approved' }).eq('id', post.id)
                                  );
                                  await Promise.all(updates);
                                  fetchPosts();
                                }
                              }}
                              className="bg-brand-green hover:bg-emerald-800 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                            >
                              Approve All
                            </button>
                          </div>
                        </th>
                        <th className="p-4 w-64 text-xs font-bold text-stone-500 uppercase tracking-wider">Additional Comments</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                    {loading && posts.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-stone-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>Loading content...</td></tr>
                    ) : filteredPosts.map((post) => (
                        <tr key={post.id} className="group hover:bg-stone-50/50 transition-colors bg-white">
                            {/* Date Column */}
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-stone-50/50 p-4 align-top border-r border-stone-200">
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="date"
                                        value={post.date || ''}
                                        onChange={(e) => handleUpdatePost(post.id, 'date', e.target.value)}
                                        className="w-full bg-transparent font-medium text-stone-600 focus:outline-none focus:text-brand-dark cursor-pointer border border-transparent hover:border-brand-green rounded px-2 py-1 transition-colors"
                                    />
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="text-stone-300 hover:text-red-500 transition-colors p-1"
                                        title="Delete Post"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </td>

                            {/* Creative Column */}
                            <td className="p-4 align-top border-r border-stone-200">
                                <div className="space-y-3">
                                    <div className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-100 border border-stone-200 shadow-sm group/image cursor-pointer">
                                        {post.imageUrl ? (
                                            <img 
                                              src={post.imageUrl} 
                                              alt="Creative" 
                                              className="w-full h-full object-cover" 
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement?.classList.add('image-error');
                                              }}
                                            />
                                        ) : null}
                                        
                                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-stone-400 ${post.imageUrl ? '-z-10' : 'z-0'}`}>
                                            <div className="p-2 bg-stone-200 rounded-full mb-2">
                                              <Upload className="w-5 h-5 text-stone-500" />
                                            </div>
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Upload Image</span>
                                        </div>

                                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors z-10 flex items-center justify-center">
                                            <div className="bg-white/90 text-stone-800 text-xs font-medium px-3 py-1.5 rounded shadow-sm opacity-0 group-hover/image:opacity-100 transform translate-y-1 group-hover/image:translate-y-0 transition-all">
                                                {post.imageUrl ? 'Change Image' : 'Select Image'}
                                            </div>
                                        </div>

                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          onChange={(e) => handleImageChange(post.id, e)}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />

                                        {post.status === 'Posted' && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium text-sm z-30 pointer-events-none">
                                                POSTED
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* Caption Column */}
                            <td className="p-4 align-top border-r border-stone-200">
                                <div className="h-full flex flex-col gap-3">
                                    <textarea
                                        value={post.generatedCaption || ''}
                                        onChange={(e) => handleUpdatePost(post.id, 'generatedCaption', e.target.value)}
                                        className="w-full min-h-[160px] p-3 text-sm leading-relaxed border border-stone-200 rounded bg-white focus:ring-1 focus:ring-brand-green focus:border-brand-green outline-none resize-y"
                                        placeholder="Caption..."
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {post.generatedHashtags?.map((tag, idx) => (
                                            <span key={idx} className="text-xs text-brand-green bg-brand-green/5 px-1.5 py-0.5 rounded border border-brand-green/10">#{tag}</span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-auto pt-2">
                                        <button
                                            onClick={() => handleCopy(post)}
                                            className="text-xs flex items-center gap-1 text-stone-500 hover:text-brand-dark transition-colors"
                                        >
                                            {copiedId === post.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copiedId === post.id ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </td>

                            {/* Approval Status Column */}
                            <td className="p-4 align-top border-r border-stone-200">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select
                                            value={post.status}
                                            onChange={(e) => handleUpdatePost(post.id, 'status', e.target.value)}
                                            className={`w-full appearance-none pl-3 pr-8 py-2 rounded text-xs font-bold uppercase tracking-wider border focus:outline-none focus:ring-2 focus:ring-offset-1 ${getStatusColor(post.status)} cursor-pointer transition-colors shadow-sm`}
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="For Approval">For Approval</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Posted">Posted</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-60">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>

                                    {post.status === 'Approved' && (
                                         <div className="text-center">
                                            <span className="text-xs font-serif italic text-stone-400">Ready to post</span>
                                         </div>
                                    )}
                                </div>
                            </td>

                            {/* Additional Comments Column */}
                            <td className="p-4 align-top">
                                <textarea 
                                    value={post.notes || ''}
                                    onChange={(e) => handleUpdatePost(post.id, 'notes', e.target.value)}
                                    className="w-full h-32 p-3 text-sm border border-stone-200 rounded bg-stone-50 focus:bg-white focus:ring-1 focus:ring-stone-400 focus:border-stone-400 outline-none resize-none transition-colors"
                                    placeholder="Add client notes or feedback here..."
                                />
                            </td>
                        </tr>
                    ))}
                    
                    {/* Add New Row Stub */}
                    <tr className="bg-stone-50">
                        <td colSpan={5} className="p-4 text-center border-t border-stone-300">
                            <button 
                                onClick={() => setIsEditorOpen(true)}
                                className="text-stone-500 hover:text-brand-green font-medium text-sm flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-stone-300 rounded hover:border-brand-green transition-all group"
                            >
                                <div className="bg-stone-200 group-hover:bg-brand-green/20 rounded-full p-1 transition-colors">
                                    <Plus className="w-4 h-4" /> 
                                </div>
                                Add Next Post
                            </button>
                        </td>
                    </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <CalendarView posts={posts} selectedMonth={selectedMonth} />
          )}
        </div>
      </main>

      {isEditorOpen && (
        <PostEditor 
          post={{
              id: Date.now().toString(),
              title: 'New Post',
              date: new Date().toISOString().split('T')[0],
              status: 'Draft',
              imageDescription: '',
              imageUrl: '',
          }} 
          brand={INITIAL_BRAND} 
          onUpdate={(p) => handleNewPost(p)} 
          onClose={() => setIsEditorOpen(false)} 
        />
      )}
    </div>
  );
}
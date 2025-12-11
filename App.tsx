import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Post, BrandContext, Client, MediaType } from './types';
import { PostEditor } from './components/PostEditor';
import { MetaSettings } from './src/components/MetaSettings';
import { ClientManagement } from './components/ClientManagement';
import { GeneratePostsModal } from './components/GeneratePostsModal';
import { supabase } from './services/supabaseClient';
import { Plus, Leaf, Loader2, Copy, Check, Lock, Upload, Trash2, AlertCircle, RefreshCw, Settings, Table2, Calendar, Users, Sparkles, Mail, Clock, Send, FileText, Image, Film, X, LayoutGrid, HardDrive } from 'lucide-react';
import { generateCaptionFromImage, updateFromFeedback, generateImageFromFeedback } from './services/geminiService';
import { isGmailConnected, getConnectedEmail, connectGmail, sendEmail, clearGmailSettings } from './services/gmailService';
import { isDriveConnected, getDriveEmail, connectDrive, clearDriveSettings } from './services/driveService';
import { isLateConfigured, getProfiles, schedulePost, LateProfile } from './services/lateService';
import { uploadMedia, uploadImage, detectMediaType } from './services/storageService';

// Debounced Textarea Component - prevents typing lag
function DebouncedTextarea({
  value,
  onChange,
  className,
  placeholder,
  debounceMs = 500
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value when external value changes (e.g., from AI generation)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounce timer
    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
}

// Debounced Input Component - for hashtags
function DebouncedInput({
  value,
  onChange,
  className,
  placeholder,
  debounceMs = 500
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounce timer
    timerRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
}

// Post Detail Modal Component
function PostDetailModal({ post, onClose }: { post: Post, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex">
          {/* Left side - Image/Video */}
          <div className="w-1/2 flex-shrink-0">
            {post.imageUrl ? (
              post.mediaType === 'video' ? (
                <video
                  src={post.imageUrl}
                  className="w-full h-full object-cover rounded-l-xl"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover rounded-l-xl" />
              )
            ) : (
              <div className="w-full h-full min-h-[400px] bg-stone-100 rounded-l-xl flex items-center justify-center">
                <span className="text-stone-400">No media</span>
              </div>
            )}
          </div>

          {/* Right side - Content */}
          <div className="w-1/2 p-6 flex flex-col">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${
                  post.status === 'Posted' ? 'bg-stone-800 text-white' :
                  post.status === 'Approved' ? 'bg-brand-green text-white' :
                  post.status === 'For Approval' ? 'bg-amber-100 text-amber-800' :
                  'bg-stone-100 text-stone-600'
                }`}>
                  {post.status}
                </span>
                <p className="text-sm text-stone-500">
                  {post.date ? (() => {
                    const [year, month, day] = post.date.split('-');
                    return `${day}/${month}/${year}`;
                  })() : 'No date'}
                </p>
              </div>
              <h2 className="text-xl font-serif font-bold text-brand-dark">{post.title || 'Untitled Post'}</h2>
            </div>

            {/* Caption */}
            {post.generatedCaption && (
              <div className="mb-4 flex-1">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Caption</h3>
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{post.generatedCaption}</p>
              </div>
            )}

            {/* Hashtags */}
            {post.generatedHashtags && post.generatedHashtags.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Hashtags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {post.generatedHashtags.map((tag, idx) => (
                    <span key={idx} className="text-xs text-brand-green bg-brand-green/10 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {post.notes && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Notes</h3>
                <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap bg-stone-50 p-3 rounded-lg">{post.notes}</p>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full bg-brand-dark text-white py-2.5 rounded-lg hover:bg-black transition-all font-medium mt-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Australian Public Holidays
const getAustralianHolidays = (year: number): Record<string, string> => {
  const holidays: Record<string, string> = {};

  // Fixed national holidays
  holidays[`${year}-01-01`] = "New Year's Day";
  holidays[`${year}-01-26`] = "Australia Day";
  holidays[`${year}-04-25`] = "Anzac Day";
  holidays[`${year}-12-25`] = "Christmas Day";
  holidays[`${year}-12-26`] = "Boxing Day";

  // Easter (calculated) - using anonymous function to calculate Easter Sunday
  const calculateEaster = (y: number) => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  };

  const easterSunday = calculateEaster(year);
  const goodFriday = new Date(easterSunday);
  goodFriday.setDate(easterSunday.getDate() - 2);
  const easterMonday = new Date(easterSunday);
  easterMonday.setDate(easterSunday.getDate() + 1);

  const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  holidays[formatDate(goodFriday)] = "Good Friday";
  holidays[formatDate(easterMonday)] = "Easter Monday";

  // Australia Day observed (if Jan 26 falls on weekend)
  const ausDay = new Date(year, 0, 26);
  if (ausDay.getDay() === 0) holidays[`${year}-01-27`] = "Australia Day (observed)";
  if (ausDay.getDay() === 6) holidays[`${year}-01-28`] = "Australia Day (observed)";

  // Queen's/King's Birthday - second Monday of June (most states)
  const junFirst = new Date(year, 5, 1);
  const firstMondayOffset = (8 - junFirst.getDay()) % 7;
  const secondMonday = 1 + firstMondayOffset + 7;
  holidays[`${year}-06-${String(secondMonday).padStart(2, '0')}`] = "King's Birthday";

  return holidays;
};

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
  const holidays = getAustralianHolidays(year);

  const getPostsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return posts.filter(post => post.date === dateStr);
  };

  const getHolidayForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays[dateStr] || null;
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
            const holiday = getHolidayForDate(day);

            return (
              <div key={day} className={`border rounded min-h-[100px] p-2 hover:bg-stone-50 transition-colors ${holiday ? 'border-red-200 bg-red-50/30' : 'border-stone-200'}`}>
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-sm font-semibold ${holiday ? 'text-red-700' : 'text-stone-700'}`}>{day}</span>
                  {holiday && (
                    <span className="text-[10px] text-red-600 font-medium truncate" title={holiday}>
                      {holiday}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayPosts.map(post => {
                    // Get caption snippet (first 40 chars)
                    const captionSnippet = post.generatedCaption
                      ? post.generatedCaption.substring(0, 40) + (post.generatedCaption.length > 40 ? '...' : '')
                      : post.title || 'Untitled Post';

                    // Status-based colors
                    const statusColors: Record<string, { bg: string; text: string; hoverBg: string; noImgBg: string; noImgText: string }> = {
                      'Draft': { bg: 'bg-stone-100', text: 'text-stone-600', hoverBg: 'hover:bg-stone-200', noImgBg: 'bg-stone-200', noImgText: 'text-stone-400' },
                      'Generated': { bg: 'bg-purple-100', text: 'text-purple-800', hoverBg: 'hover:bg-purple-200', noImgBg: 'bg-purple-200', noImgText: 'text-purple-400' },
                      'For Approval': { bg: 'bg-amber-100', text: 'text-amber-800', hoverBg: 'hover:bg-amber-200', noImgBg: 'bg-amber-200', noImgText: 'text-amber-500' },
                      'Approved': { bg: 'bg-emerald-100', text: 'text-emerald-800', hoverBg: 'hover:bg-emerald-200', noImgBg: 'bg-emerald-200', noImgText: 'text-emerald-500' },
                      'Posted': { bg: 'bg-stone-200', text: 'text-stone-600', hoverBg: 'hover:bg-stone-300', noImgBg: 'bg-stone-300', noImgText: 'text-stone-500' },
                    };
                    const colors = statusColors[post.status] || statusColors['Draft'];

                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className={`flex items-start gap-1.5 text-xs p-1.5 rounded cursor-pointer ${colors.bg} ${colors.text} ${colors.hoverBg} transition-colors`}
                        title={`${post.status}: ${post.generatedCaption || post.title}`}
                      >
                        {/* Thumbnail */}
                        {post.imageUrl ? (
                          post.mediaType === 'video' ? (
                            <div className="w-8 h-8 bg-stone-800 rounded flex-shrink-0 flex items-center justify-center">
                              <Film className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <img
                              src={post.imageUrl}
                              alt=""
                              className="w-8 h-8 object-cover rounded flex-shrink-0"
                            />
                          )
                        ) : (
                          <div className={`w-8 h-8 ${colors.noImgBg} rounded flex-shrink-0 flex items-center justify-center`}>
                            <span className={`text-[10px] ${colors.noImgText}`}>No img</span>
                          </div>
                        )}
                        {/* Caption snippet */}
                        <span className="line-clamp-2 leading-tight">{captionSnippet}</span>
                      </div>
                    );
                  })}
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

// Helper to detect if URL is a video
const isVideoUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  const urlLower = url.toLowerCase();
  return urlLower.includes('.mp4') || urlLower.includes('.mov') || urlLower.includes('.webm') || urlLower.includes('.m4v');
};

// Map DB columns (snake_case) to App types (camelCase)
const mapDbToPost = (dbPost: any): Post => ({
  id: dbPost.id,
  client_id: dbPost.client_id,
  title: dbPost.title,
  date: dbPost.date,
  status: dbPost.status as any,
  imageDescription: dbPost.image_description || '',
  imageUrl: dbPost.image_url || '',
  mediaType: (dbPost.media_type as MediaType) || 'image',
  generatedCaption: dbPost.generated_caption || '',
  generatedHashtags: dbPost.generated_hashtags || [],
  notes: dbPost.notes || ''
});

// Map App types to DB columns
const mapPostToDb = (post: Partial<Post>) => {
  const dbObj: any = {};
  if (post.client_id !== undefined) dbObj.client_id = post.client_id;
  if (post.title !== undefined) dbObj.title = post.title;
  if (post.date !== undefined) dbObj.date = post.date;
  if (post.status !== undefined) dbObj.status = post.status;
  if (post.imageDescription !== undefined) dbObj.image_description = post.imageDescription;
  if (post.imageUrl !== undefined) dbObj.image_url = post.imageUrl;
  if (post.mediaType !== undefined) dbObj.media_type = post.mediaType;
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

  // Multi-client state
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [isMasterAccount, setIsMasterAccount] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [showMetaSettings, setShowMetaSettings] = useState(false);
  const [brandContext, setBrandContext] = useState<BrandContext | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [generatingCaptionId, setGeneratingCaptionId] = useState<string | null>(null);
  const [updatingFromFeedbackId, setUpdatingFromFeedbackId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(isGmailConnected());
  const [gmailEmail, setGmailEmail] = useState(getConnectedEmail());
  const [driveConnected, setDriveConnected] = useState(isDriveConnected());
  const [driveEmail, setDriveEmail] = useState(getDriveEmail());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImagePostId, setPreviewImagePostId] = useState<string | null>(null);

  // Schedule Posts state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [lateProfiles, setLateProfiles] = useState<LateProfile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [schedulingPosts, setSchedulingPosts] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // Client Notes state (agency-only)
  const [showClientNotesModal, setShowClientNotesModal] = useState(false);

  // Main tab state (agency-only) - 'content' or 'clients'
  const [mainTab, setMainTab] = useState<'content' | 'clients'>('content');

  // Generate Posts modal state (agency-only)
  const [showGeneratePostsModal, setShowGeneratePostsModal] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [uploadingReferenceImage, setUploadingReferenceImage] = useState(false);
  const [savingClientNotes, setSavingClientNotes] = useState(false);
  const [clientLateProfiles, setClientLateProfiles] = useState<LateProfile[]>([]);
  const [selectedLateProfileIds, setSelectedLateProfileIds] = useState<string[]>([]);
  const [loadingClientProfiles, setLoadingClientProfiles] = useState(false);

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
    if (!currentClient) return;

    setLoading(true);
    const { data, error} = await supabase
      .from('posts')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

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
  }, [isAuthenticated, configError, currentClient]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Check if PIN matches any client
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('pin', passwordInput);

      if (error) {
        console.error('Error fetching clients:', error);
        setLoginError(true);
        setPasswordInput('');
        return;
      }

      if (clients && clients.length > 0) {
        const client = clients[0];

        // Check if this is the master account (Seam Media)
        if (passwordInput === '1991') {
          setIsMasterAccount(true);
          // Fetch all clients for master account
          const { data: allClientsData } = await supabase
            .from('clients')
            .select('*')
            .order('name');

          if (allClientsData) {
            setAllClients(allClientsData);
            setShowClientSelector(true);
          }
        } else {
          // Regular client login
          setIsMasterAccount(false);
          setCurrentClient(client);
          setBrandContext({
            name: client.brand_name,
            mission: client.brand_mission || '',
            tone: client.brand_tone || '',
            keywords: client.brand_keywords || []
          });
        }

        setIsAuthenticated(true);
        setLoginError(false);
      } else {
        setLoginError(true);
        setPasswordInput('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const selectClient = (client: Client) => {
    setCurrentClient(client);
    setBrandContext({
      name: client.brand_name,
      mission: client.brand_mission || '',
      tone: client.brand_tone || '',
      keywords: client.brand_keywords || []
    });
    setShowClientSelector(false);
  };

  const handleUpdatePost = useCallback(async (id: string, field: keyof Post, value: any) => {
    // Get current post to detect status changes
    const currentPost = posts.find(p => p.id === id);
    const isStatusChange = field === 'status' && value === 'Approved' && currentPost?.status !== 'Approved';

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
      } else if (isStatusChange && currentClient) {
        // Auto-post to social media when status changes to "Approved"
        await handleAutoPost(id);
      }

      // Clean up timer reference
      delete debounceTimers.current[timerKey];
    }, 500); // 500ms debounce delay
  }, [posts, currentClient]);

  const handleAutoPost = async (postId: string) => {
    if (!currentClient) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Check if client has assigned Late profiles for auto-scheduling
    const clientProfileIds = currentClient.late_profile_ids || [];
    if (clientProfileIds.length === 0) {
      console.log('No social profiles assigned to this client for auto-scheduling');
      return;
    }

    try {
      // Build caption with hashtags
      let content = post.generatedCaption || '';
      if (post.generatedHashtags && post.generatedHashtags.length > 0) {
        content += '\n\n' + post.generatedHashtags.map(tag => `#${tag}`).join(' ');
      }
      if (!content) {
        content = post.imageDescription || '';
      }

      // Check if post has valid media URL (not empty, not base64)
      const hasValidMedia = post.imageUrl &&
        post.imageUrl.trim() !== '' &&
        post.imageUrl.startsWith('http');

      // Fetch all profiles to get platform info
      const allProfiles = await getProfiles();
      const clientProfiles = allProfiles.filter(p => clientProfileIds.includes(p.id));

      // Check if Instagram is in the client's profiles - Instagram requires media
      const hasInstagram = clientProfiles.some(p => p.platform === 'instagram');
      if (hasInstagram && !hasValidMedia) {
        console.log('Skipping auto-schedule: Instagram requires media but post has no valid image/video');
        return;
      }

      // Build scheduled datetime using post date + 12:00 PM
      const scheduledDateTime = `${post.date}T12:00:00`;
      const scheduledFor = new Date(scheduledDateTime).toISOString();

      // Build platforms array from client's assigned profiles
      const platforms = clientProfiles.map(profile => ({
        platform: profile.platform,
        accountId: profile.id
      }));

      // Schedule the post via Late API
      await schedulePost({
        platforms,
        content,
        mediaUrls: hasValidMedia ? [post.imageUrl!] : [],
        mediaType: post.mediaType || 'image',
        scheduledFor
      });

      console.log(`Auto-scheduled post ${postId} to ${platforms.length} platform(s) for ${scheduledFor}`);

      // Update status to "Posted" after successful scheduling
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'Posted' } : p));
      await supabase
        .from('posts')
        .update({ status: 'Posted' })
        .eq('id', postId);
    } catch (error) {
      console.error('Auto-schedule error:', error);
    }
  };

  const handleConnectGmail = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to environment variables.');
      return;
    }

    try {
      const settings = await connectGmail(clientId);
      setGmailConnected(true);
      setGmailEmail(settings.email);
      alert(`Gmail connected successfully! Sending from: ${settings.email}`);
    } catch (error: any) {
      alert(error.message || 'Failed to connect Gmail');
    }
  };

  const handleDisconnectGmail = () => {
    if (confirm('Disconnect Gmail account?')) {
      clearGmailSettings();
      setGmailConnected(false);
      setGmailEmail(null);
    }
  };

  const handleConnectDrive = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to environment variables.');
      return;
    }
    try {
      const settings = await connectDrive(clientId);
      setDriveConnected(true);
      setDriveEmail(settings.email);
    } catch (error: any) {
      alert(error.message || 'Failed to connect Google Drive');
    }
  };

  const handleDisconnectDrive = () => {
    if (confirm('Disconnect Google Drive account?')) {
      clearDriveSettings();
      setDriveConnected(false);
      setDriveEmail(null);
    }
  };

  // Schedule Posts handlers
  const handleOpenScheduleModal = async () => {
    setShowScheduleModal(true);
    setLoadingProfiles(true);
    try {
      const allProfiles = await getProfiles();
      // Filter profiles to only show those assigned to the current client
      const clientProfileIds = currentClient?.late_profile_ids || [];
      const profiles = clientProfileIds.length > 0
        ? allProfiles.filter(p => clientProfileIds.includes(p.id))
        : allProfiles; // Show all if no profiles assigned (for backwards compatibility)
      setLateProfiles(profiles);
      // Auto-select all profiles by default
      setSelectedProfiles(profiles.map(p => p.id));
    } catch (error: any) {
      console.error('Error fetching Late profiles:', error);
      alert(error.message || 'Failed to load social media profiles. Please check your Late API key.');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleSchedulePosts = async () => {
    if (selectedProfiles.length === 0) {
      alert('Please select at least one social media profile');
      return;
    }

    // Check if Instagram is selected
    const hasInstagram = selectedProfiles.some(profileId => {
      const profile = lateProfiles.find(p => p.id === profileId);
      return profile?.platform === 'instagram';
    });

    // Helper to check if post has valid media URL (not empty, not base64)
    const hasValidMedia = (post: Post) => {
      return post.imageUrl &&
             post.imageUrl.trim() !== '' &&
             post.imageUrl.startsWith('http');
    };

    // Filter approved posts, and if Instagram is selected, require media
    let approvedPosts = filteredPosts.filter(p => p.status === 'Approved');

    if (hasInstagram) {
      const postsWithoutMedia = approvedPosts.filter(p => !hasValidMedia(p));
      if (postsWithoutMedia.length > 0) {
        approvedPosts = approvedPosts.filter(p => hasValidMedia(p));
        if (approvedPosts.length === 0) {
          alert('Instagram posts require media. Please upload images or videos to the approved posts first.');
          return;
        }
        alert(`Note: ${postsWithoutMedia.length} post(s) without media will be skipped (Instagram requires images/videos).`);
      }
    }

    if (approvedPosts.length === 0) {
      alert('No approved posts to schedule. Please approve posts first.');
      return;
    }

    setSchedulingPosts(true);
    let successCount = 0;
    let errorCount = 0;
    let lastError = '';
    const failedPostIds: string[] = [];

    try {
      for (const post of approvedPosts) {
        // Build caption with hashtags
        let content = post.generatedCaption || '';
        if (post.generatedHashtags && post.generatedHashtags.length > 0) {
          content += '\n\n' + post.generatedHashtags.map(tag => `#${tag}`).join(' ');
        }

        // Build scheduled datetime from post date + selected time
        const scheduledDateTime = `${post.date}T${scheduleTime}:00`;
        const scheduledFor = new Date(scheduledDateTime).toISOString();

        // Build platforms array
        const platforms = selectedProfiles.map(profileId => {
          const profile = lateProfiles.find(p => p.id === profileId);
          return {
            platform: profile?.platform || 'instagram',
            accountId: profileId,
          };
        });

        try {
          // Detect media type from URL if not set in database
          let mediaType = post.mediaType || 'image';
          if (post.imageUrl) {
            const urlLower = post.imageUrl.toLowerCase();
            if (urlLower.includes('.mp4') || urlLower.includes('.mov') || urlLower.includes('.webm') || urlLower.includes('.m4v')) {
              mediaType = 'video';
            }
          }

          console.log(`Scheduling post ${post.id}:`, {
            mediaType: mediaType,
            detectedFromUrl: mediaType !== post.mediaType,
            imageUrl: post.imageUrl?.substring(0, 100),
            platforms: platforms.map(p => p.platform),
          });

          await schedulePost({
            platforms,
            content,
            mediaUrls: post.imageUrl ? [post.imageUrl] : [],
            mediaType: mediaType,
            scheduledFor,
          });
          successCount++;

          // Update post status to "Posted" (or you could add a "Scheduled" status)
          await handleUpdatePost(post.id, 'status', 'Posted');
        } catch (error: any) {
          console.error(`Error scheduling post ${post.id}:`, error);
          const mediaInfo = post.mediaType === 'video' ? ' (video)' : ' (image)';
          lastError = `${error.message || 'Unknown error'}${mediaInfo}`;
          errorCount++;
          // Store which posts failed for better feedback
          failedPostIds.push(post.title || post.date);
        }
      }

      if (successCount > 0 && errorCount === 0) {
        alert(`Successfully scheduled ${successCount} post(s)!`);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`Scheduled ${successCount} post(s), but ${errorCount} failed.\n\nFailed posts: ${failedPostIds.join(', ')}\n\nError: ${lastError}`);
      } else {
        alert(`Failed to schedule posts.\n\nError: ${lastError || 'Please check your Late API configuration.'}`);
      }

      setShowScheduleModal(false);
    } catch (error: any) {
      console.error('Error scheduling posts:', error);
      alert(error.message || 'Failed to schedule posts');
    } finally {
      setSchedulingPosts(false);
    }
  };

  const toggleProfileSelection = (profileId: string) => {
    setSelectedProfiles(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  // Client Notes handlers
  const handleOpenClientNotes = async () => {
    setClientNotes(currentClient?.client_notes || '');
    setReferenceImages(currentClient?.reference_images || []);
    setSelectedLateProfileIds(currentClient?.late_profile_ids || []);
    setShowClientNotesModal(true);

    // Fetch all available Late profiles
    setLoadingClientProfiles(true);
    try {
      const profiles = await getProfiles();
      setClientLateProfiles(profiles);
    } catch (error) {
      console.error('Error fetching Late profiles:', error);
    } finally {
      setLoadingClientProfiles(false);
    }
  };

  const handleSaveClientNotes = async () => {
    if (!currentClient) return;

    setSavingClientNotes(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          client_notes: clientNotes,
          reference_images: referenceImages,
          late_profile_ids: selectedLateProfileIds
        })
        .eq('id', currentClient.id);

      if (error) throw error;

      // Update current client state
      const updatedClient = { ...currentClient, client_notes: clientNotes, reference_images: referenceImages, late_profile_ids: selectedLateProfileIds };
      setCurrentClient(updatedClient);

      // Also update in allClients array so notes persist when switching clients
      if (isMasterAccount) {
        setAllClients(allClients.map(c => c.id === currentClient.id ? updatedClient : c));
      }

      setShowClientNotesModal(false);
    } catch (error: any) {
      console.error('Error saving client notes:', error);
      alert('Failed to save client notes. Please try again.');
    } finally {
      setSavingClientNotes(false);
    }
  };

  const toggleClientLateProfile = (profileId: string) => {
    setSelectedLateProfileIds(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentClient) return;

    const file = e.target.files[0];
    setUploadingReferenceImage(true);

    try {
      // Convert file to base64 data URL for upload
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        // Upload using the storage service (use 'reference' as postId for reference images)
        const uploadedUrl = await uploadImage(dataUrl, currentClient.id, `reference-${Date.now()}`);
        setReferenceImages([...referenceImages, uploadedUrl]);
        setUploadingReferenceImage(false);
      };
      reader.onerror = () => {
        alert('Failed to read file');
        setUploadingReferenceImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error uploading reference image:', error);
      alert('Failed to upload image. Please try again.');
      setUploadingReferenceImage(false);
    }

    // Reset input
    e.target.value = '';
  };

  const handleRemoveReferenceImage = (indexToRemove: number) => {
    setReferenceImages(referenceImages.filter((_, index) => index !== indexToRemove));
  };

  const handleSendEmail = async () => {
    if (!currentClient || !emailTo) {
      alert('Please enter client email address');
      return;
    }

    if (!emailSubject.trim()) {
      alert('Please enter an email subject');
      return;
    }

    if (!emailBody.trim()) {
      alert('Please enter an email message');
      return;
    }

    setSendingEmail(true);

    const result = await sendEmail(emailTo, emailSubject, emailBody);

    setSendingEmail(false);

    if (result.success) {
      alert(`Email sent successfully to ${emailTo}!`);
      setShowEmailModal(false);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');

      // Save the email to the client record for future use
      if (currentClient && emailTo !== currentClient.contact_email) {
        await supabase
          .from('clients')
          .update({ contact_email: emailTo })
          .eq('id', currentClient.id);
        setCurrentClient({ ...currentClient, contact_email: emailTo });
      }
    } else {
      alert(result.error || 'Failed to send email');
    }
  };

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

  const handleDuplicatePost = async (post: Post) => {
    if (!currentClient) return;

    const newId = crypto.randomUUID();

    // Build insert data - only include media_type if the post has one
    const insertData: Record<string, any> = {
      id: newId,
      client_id: currentClient.id,
      title: post.title || 'Untitled',
      image_description: post.imageDescription || '',
      image_url: post.imageUrl || null,
      status: 'Draft',
      generated_caption: post.generatedCaption || null,
      generated_hashtags: post.generatedHashtags || [],
      date: post.date
    };

    // Only include media_type if it exists on the original post
    if (post.mediaType) {
      insertData.media_type = post.mediaType;
    }

    // Save to database
    const { error } = await supabase
      .from('posts')
      .insert(insertData);

    if (error) {
      console.error('Error duplicating post:', error);
      alert('Failed to duplicate post: ' + error.message);
    }
    // Realtime subscription will automatically refresh the posts list
  };

  const handleMediaChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentClient) return;

    // Detect media type
    const mediaType = detectMediaType(file);

    // Size limits: 500MB for videos, 10MB for images
    const maxSize = mediaType === 'video' ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = maxSize / (1024 * 1024);

    if (file.size > maxSize) {
      alert(`File is too large. Please use a ${mediaType} under ${maxSizeMB}MB.`);
      return;
    }

    setUploadingImageId(id);

    try {
      // Upload to Supabase Storage and get public URL
      const { url: publicUrl, mediaType: detectedType } = await uploadMedia(file, currentClient.id, id);

      // Save the public URL and media type to the database
      await handleUpdatePost(id, 'imageUrl', publicUrl);
      await handleUpdatePost(id, 'mediaType', detectedType);
    } catch (error: any) {
      console.error('Media upload error:', error);
      alert(error.message || 'Failed to upload media. Please try again.');
    } finally {
      setUploadingImageId(null);
    }
  };

  const handleCopy = (post: Post) => {
    const fullText = `${post.generatedCaption}\n\n${post.generatedHashtags?.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateCaption = async (post: Post) => {
    if (!post.imageUrl || !currentClient) {
      alert('Please upload an image first');
      return;
    }

    setGeneratingCaptionId(post.id);

    try {
      const result = await generateCaptionFromImage(post.imageUrl, currentClient.brand_name, currentClient.client_notes);

      // Update caption
      await handleUpdatePost(post.id, 'generatedCaption', result.caption);

      // Update hashtags
      await handleUpdatePost(post.id, 'generatedHashtags', result.hashtags);

    } catch (error: any) {
      console.error('Error generating caption:', error);
      const errorMessage = error.message || 'Failed to generate caption. Please try again.';
      alert(errorMessage);
    } finally {
      setGeneratingCaptionId(null);
    }
  };

  // Helper to detect if feedback is about images
  const isImageRelatedFeedback = (feedback: string): boolean => {
    const imageKeywords = [
      'image', 'photo', 'picture', 'background', 'visual', 'boring',
      'different image', 'another image', 'new image', 'change image',
      'replace image', 'update image', 'regenerate', 'redesign',
      'looks like', 'too plain', 'too simple', 'more exciting',
      'color', 'colours', 'lighting', 'style', 'aesthetic'
    ];
    const lowerFeedback = feedback.toLowerCase();
    return imageKeywords.some(keyword => lowerFeedback.includes(keyword));
  };

  const handleUpdateFromFeedback = async (post: Post) => {
    if (!post.notes || !currentClient) {
      alert('No feedback to process. Please add client notes first.');
      return;
    }

    setUpdatingFromFeedbackId(post.id);

    try {
      const feedbackIsAboutImage = isImageRelatedFeedback(post.notes);

      // If feedback mentions images, regenerate the image using Nano Banana Pro
      if (feedbackIsAboutImage) {
        try {
          const brandContext = `Brand: ${currentClient.brand_name}. ${currentClient.client_notes || ''}`;
          const imageResult = await generateImageFromFeedback(
            post.imageUrl || null,
            post.notes,
            brandContext,
            currentClient.reference_images // Pass reference images for style matching
          );

          // Convert base64 to data URL and upload
          const dataUrl = `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;

          // Upload the generated image to storage
          const uploadedUrl = await uploadImage(dataUrl, currentClient.id, post.id);

          // Update the post with new image
          await handleUpdatePost(post.id, 'imageUrl', uploadedUrl);

          // Regenerate caption for the new image
          const captionResult = await generateCaptionFromImage(
            uploadedUrl,
            currentClient.brand_name,
            currentClient.client_notes
          );

          await handleUpdatePost(post.id, 'generatedCaption', captionResult.caption);
          await handleUpdatePost(post.id, 'generatedHashtags', captionResult.hashtags);

        } catch (imageError: any) {
          console.error('Image generation failed:', imageError);
          // Fall back to just updating caption/hashtags if image generation fails
          if (post.generatedCaption || (post.generatedHashtags && post.generatedHashtags.length > 0)) {
            const result = await updateFromFeedback(
              post.generatedCaption || '',
              post.generatedHashtags || [],
              post.notes,
              currentClient.brand_name,
              currentClient.client_notes
            );
            await handleUpdatePost(post.id, 'generatedCaption', result.caption);
            await handleUpdatePost(post.id, 'generatedHashtags', result.hashtags);
            alert(`Image generation unavailable (${imageError.message}). Caption/hashtags updated instead.`);
          } else {
            throw imageError;
          }
        }
      } else {
        // Feedback is just about caption/hashtags
        if (!post.generatedCaption && (!post.generatedHashtags || post.generatedHashtags.length === 0)) {
          alert('No caption or hashtags to update. Please generate content first.');
          return;
        }

        const result = await updateFromFeedback(
          post.generatedCaption || '',
          post.generatedHashtags || [],
          post.notes,
          currentClient.brand_name,
          currentClient.client_notes
        );

        await handleUpdatePost(post.id, 'generatedCaption', result.caption);
        await handleUpdatePost(post.id, 'generatedHashtags', result.hashtags);
      }

    } catch (error: any) {
      console.error('Error updating from feedback:', error);
      const errorMessage = error.message || 'Failed to update. Please try again.';
      alert(errorMessage);
    } finally {
      setUpdatingFromFeedbackId(null);
    }
  };

  const handleNewPost = async (newPost: Post) => {
    if (!currentClient) return;

    // 1. Close modal immediately
    setIsEditorOpen(false);

    // Add client_id to new post
    const postWithClient = { ...newPost, client_id: currentClient.id };

    // 2. Prepare for DB - ensure all required fields are present
    const dbPayload: any = {
      id: postWithClient.id, // Using the timestamp ID generated in modal
      client_id: currentClient.id,
      title: postWithClient.title || 'New Post',
      date: postWithClient.date,
      status: postWithClient.status || 'Draft',
      image_description: postWithClient.imageDescription || '',
      image_url: postWithClient.imageUrl || '',
      generated_caption: postWithClient.generatedCaption || '',
      generated_hashtags: postWithClient.generatedHashtags || [],
      notes: postWithClient.notes || '',
    };

    console.log('Creating new post:', dbPayload);

    // 3. Optimistic Add
    setPosts([...posts, postWithClient]);

    // 4. Send to DB
    const { error } = await supabase.from('posts').insert([dbPayload]);
    if (error) {
      console.error("Error creating post:", error);
      alert(`Failed to create post: ${error.message}`);
      fetchPosts(); // Revert
    } else {
      console.log('Post created successfully');
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
            <p className="text-stone-500 mb-8 font-light">Please enter the password to view the <span className="font-semibold text-brand-green">Seam Media</span> content manager.</p>
            
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
            <p className="mt-8 text-xs text-stone-400">© 2025 Seam Media</p>
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
            <h1 className="font-serif text-xl font-bold tracking-tight text-brand-dark">
              {currentClient?.name || 'Light Dust'} <span className="font-sans font-normal text-stone-400 text-sm">Content Manager</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
             {isMasterAccount && currentClient && (
               <button
                 onClick={handleOpenClientNotes}
                 className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-green px-3 py-2 border border-stone-300 rounded-lg transition-colors"
                 title="View/edit client notes (agency only)"
               >
                 <FileText className="w-4 h-4" />
                 Client Notes
               </button>
             )}
             {isMasterAccount && (
               <button
                 onClick={() => setShowClientSelector(true)}
                 className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-green px-3 py-2 border border-stone-300 rounded-lg transition-colors"
               >
                 <Users className="w-4 h-4" />
                 Switch Client
               </button>
             )}
             <button
               onClick={() => setShowMetaSettings(true)}
               className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-brand-green px-3 py-2 border border-stone-300 rounded-lg transition-colors"
               title="Meta Integration Settings"
             >
               <Settings className="w-4 h-4" />
             </button>
             <button onClick={fetchPosts} className="text-stone-400 hover:text-brand-green p-2" title="Refresh Data">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <button className="text-sm font-medium text-stone-500 hover:text-brand-dark px-3 py-2 transition-colors">
                Export to CSV
             </button>
             {isMasterAccount && (
               <button
                onClick={() => setShowGeneratePostsModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> Generate Posts
              </button>
             )}
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
          {/* Main Tab Navigation (Agency Only) */}
          {isMasterAccount && (
            <div className="flex gap-1 mb-6 border-b border-stone-200">
              <button
                onClick={() => setMainTab('content')}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
                  mainTab === 'content'
                    ? 'text-brand-dark border-brand-green'
                    : 'text-stone-400 border-transparent hover:text-stone-600'
                }`}
              >
                <Table2 className="w-4 h-4" />
                Content Manager
              </button>
              <button
                onClick={() => setMainTab('clients')}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all border-b-2 -mb-[2px] ${
                  mainTab === 'clients'
                    ? 'text-brand-dark border-brand-green'
                    : 'text-stone-400 border-transparent hover:text-stone-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Client Management
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>
            </div>
          )}

          {/* Client Management View (Agency Only) */}
          {isMasterAccount && mainTab === 'clients' ? (
            <ClientManagement
              clients={allClients}
              onClientSelect={(client) => {
                selectClient(client);
                setMainTab('content');
              }}
            />
          ) : (
          <>
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
            <>
              {/* Action Buttons - positioned above table columns to match column widths */}
              {/* Table columns: Date(w-32) | Creative(w-64) | Caption(flex) | Approval Status(w-48) | Additional Comments(w-64) */}
              <div className="mb-2 flex items-center">
                {/* Spacer for Date column */}
                <div className="w-32 shrink-0"></div>
                {/* Spacer for Creative column */}
                <div className="w-64 shrink-0"></div>
                {/* Spacer for Caption column (flex) */}
                <div className="flex-1"></div>
                {/* Approve All - above Approval Status column (w-48) */}
                <div className="w-48 shrink-0 px-4">
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
                    className="bg-brand-green hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm"
                  >
                    Approve All
                  </button>
                </div>
                {/* Schedule Posts & Email Client Buttons - above Additional Comments column (w-64) */}
                <div className="w-64 shrink-0 px-4 flex justify-end gap-2">
                  {isMasterAccount && currentClient && isLateConfigured() && (
                    <button
                      onClick={handleOpenScheduleModal}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2"
                      title="Schedule approved posts to social media"
                    >
                      <Clock className="w-4 h-4" />
                      Schedule
                    </button>
                  )}
                  {isMasterAccount && currentClient && (
                    <button
                      onClick={() => {
                        if (gmailConnected) {
                          const contactName = currentClient.contact_name || currentClient.name;
                          const dashboardUrl = window.location.origin;
                          setEmailTo(currentClient.contact_email || '');
                          setEmailSubject('Your Social Calendar is Ready for Review');
                          setEmailBody(`Hi ${contactName},

Your social calendar is ready for review.

Please visit the link below to view and approve your upcoming posts:
${dashboardUrl}

If you have any feedback or changes, please add them in the comments section for each post.

Thanks,
Heath`);
                          setShowEmailModal(true);
                        } else {
                          // Fallback to mailto if Gmail not connected
                          const dashboardUrl = window.location.origin;
                          const clientName = currentClient.name;
                          const subject = encodeURIComponent(`Your Social Calendar is Ready for Review`);
                          const body = encodeURIComponent(
`Hi ${clientName},

Your social calendar is ready for review.

Please visit the link below to view and approve your upcoming posts:
${dashboardUrl}

If you have any feedback or changes, please add them in the comments section for each post.

Thanks,
Heath`
                          );
                          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                        }
                      }}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm border border-stone-300 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                      {gmailConnected && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-stone-300 overflow-hidden">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-stone-50 border-b border-stone-300">
                        <th className="sticky left-0 z-10 bg-stone-50 p-4 w-32 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Date</th>
                        <th className="p-4 w-64 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Creative</th>
                        <th className="p-4 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Caption & Hashtags</th>
                        <th className="p-4 w-48 text-xs font-bold text-stone-500 uppercase tracking-wider border-r border-stone-200">Approval Status</th>
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
                                    <div className="flex gap-1">
                                      <button
                                          onClick={() => handleDuplicatePost(post)}
                                          className="text-stone-300 hover:text-brand-green transition-colors p-1"
                                          title="Duplicate Post"
                                      >
                                          <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                          onClick={() => handleDeletePost(post.id)}
                                          className="text-stone-300 hover:text-red-500 transition-colors p-1"
                                          title="Delete Post"
                                      >
                                          <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                </div>
                            </td>

                            {/* Creative Column */}
                            <td className="p-4 align-top border-r border-stone-200">
                                <div className="space-y-2">
                                    {/* Image Preview - Clickable to enlarge */}
                                    <div
                                      className="relative aspect-square w-full rounded-md overflow-hidden bg-stone-100 border border-stone-200 shadow-sm cursor-pointer group/image"
                                      onClick={() => {
                                        if (post.imageUrl) {
                                          setPreviewImageUrl(post.imageUrl);
                                          setPreviewImagePostId(post.id);
                                        }
                                      }}
                                    >
                                        {post.imageUrl ? (
                                            <>
                                                {(post.mediaType === 'video' || isVideoUrl(post.imageUrl)) ? (
                                                  <video
                                                    src={post.imageUrl + '#t=0.5'}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    onError={(e) => {
                                                      e.currentTarget.style.display = 'none';
                                                      e.currentTarget.parentElement?.classList.add('image-error');
                                                    }}
                                                  />
                                                ) : (
                                                  <img
                                                    src={post.imageUrl}
                                                    alt="Creative"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                      e.currentTarget.style.display = 'none';
                                                      e.currentTarget.parentElement?.classList.add('image-error');
                                                    }}
                                                  />
                                                )}
                                                {/* Video indicator */}
                                                {(post.mediaType === 'video' || isVideoUrl(post.imageUrl)) && (
                                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded flex items-center gap-1">
                                                        <Film className="w-3 h-3" />
                                                        VIDEO
                                                    </div>
                                                )}
                                                {/* Click to enlarge hint */}
                                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center">
                                                    <div className="bg-white/90 text-stone-800 text-xs font-medium px-3 py-1.5 rounded shadow-sm opacity-0 group-hover/image:opacity-100 transform translate-y-1 group-hover/image:translate-y-0 transition-all">
                                                        Click to {(post.mediaType === 'video' || isVideoUrl(post.imageUrl)) ? 'preview' : 'enlarge'}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400">
                                                <div className="p-2 bg-stone-200 rounded-full mb-2">
                                                  <Image className="w-5 h-5 text-stone-500" />
                                                </div>
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">No Media</span>
                                            </div>
                                        )}

                                        {post.status === 'Posted' && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-medium text-sm pointer-events-none">
                                                POSTED
                                            </div>
                                        )}

                                        {/* Upload Loading Overlay */}
                                        {uploadingImageId === post.id && (
                                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-40">
                                                <Loader2 className="w-8 h-8 animate-spin text-brand-green mb-2" />
                                                <span className="text-xs font-medium text-stone-600">Uploading...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Button - Always visible below image */}
                                    <label className="flex items-center justify-center gap-2 px-3 py-2 border border-stone-300 rounded-md cursor-pointer hover:bg-stone-50 hover:border-brand-green transition-colors text-xs font-medium text-stone-600 hover:text-brand-green">
                                        <input
                                          type="file"
                                          accept="image/*,video/*"
                                          onChange={(e) => handleMediaChange(post.id, e)}
                                          className="hidden"
                                          disabled={post.status === 'Posted'}
                                        />
                                        <Upload className="w-3.5 h-3.5" />
                                        {post.imageUrl ? ((post.mediaType === 'video' || isVideoUrl(post.imageUrl)) ? 'Change Video' : 'Change Image') : 'Upload Media'}
                                    </label>
                                </div>
                            </td>

                            {/* Caption Column */}
                            <td className="p-4 align-top border-r border-stone-200">
                                <div className="h-full flex flex-col gap-3">
                                    <DebouncedTextarea
                                        value={post.generatedCaption || ''}
                                        onChange={(value) => handleUpdatePost(post.id, 'generatedCaption', value)}
                                        className="w-full min-h-[160px] p-3 text-sm leading-relaxed border border-stone-200 rounded bg-white focus:ring-1 focus:ring-brand-green focus:border-brand-green outline-none resize-y"
                                        placeholder="Caption..."
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        <DebouncedInput
                                            value={post.generatedHashtags?.map(h => `#${h}`).join(' ') || ''}
                                            onChange={(value) => {
                                                // Parse hashtags from input (split by space or #)
                                                const hashtags = value
                                                    .split(/[\s#]+/)
                                                    .filter(tag => tag.trim().length > 0)
                                                    .map(tag => tag.replace(/^#/, ''));
                                                handleUpdatePost(post.id, 'generatedHashtags', hashtags);
                                            }}
                                            className="w-full p-2 text-xs text-brand-green bg-brand-green/5 border border-brand-green/20 rounded focus:ring-1 focus:ring-brand-green focus:border-brand-green outline-none"
                                            placeholder="#hashtag1 #hashtag2 #hashtag3..."
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-auto pt-2">
                                        {/* Generate Caption - Only visible for master account */}
                                        {isMasterAccount && (
                                            <button
                                                onClick={() => handleGenerateCaption(post)}
                                                disabled={generatingCaptionId === post.id || !post.imageUrl}
                                                className="text-xs flex items-center gap-1 text-brand-green hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={!post.imageUrl ? 'Upload an image first' : 'Generate caption from image'}
                                            >
                                                {generatingCaptionId === post.id ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-3 h-3" />
                                                        Generate
                                                    </>
                                                )}
                                            </button>
                                        )}
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
                                <div className="flex flex-col gap-2">
                                    <DebouncedTextarea
                                        value={post.notes || ''}
                                        onChange={(value) => handleUpdatePost(post.id, 'notes', value)}
                                        className="w-full h-32 p-3 text-sm border border-stone-200 rounded bg-stone-50 focus:bg-white focus:ring-1 focus:ring-stone-400 focus:border-stone-400 outline-none resize-none transition-colors"
                                        placeholder="Add client notes or feedback here..."
                                    />
                                    {/* Update from Feedback - Only visible for master account */}
                                    {isMasterAccount && post.notes && (
                                        <button
                                            onClick={() => handleUpdateFromFeedback(post)}
                                            disabled={updatingFromFeedbackId === post.id}
                                            className="w-full text-xs flex items-center justify-center gap-1 px-3 py-2 bg-amber-100 text-amber-800 border border-amber-200 rounded hover:bg-amber-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {updatingFromFeedbackId === post.id ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-3 h-3" />
                                                    Update from Feedback
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
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
            </>
          ) : (
            <CalendarView posts={posts} selectedMonth={selectedMonth} />
          )}
          </>
          )}
        </div>
      </main>

      {isEditorOpen && brandContext && currentClient && (
        <PostEditor
          post={{
              id: Date.now().toString(),
              client_id: currentClient.id,
              title: 'New Post',
              date: new Date().toISOString().split('T')[0],
              status: 'Draft',
              imageDescription: '',
              imageUrl: '',
          }}
          brand={brandContext}
          clientId={currentClient.id}
          onUpdate={(p) => handleNewPost(p)}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {/* Client Selector Modal for Master Account */}
      {showClientSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-brand-green" />
              <h2 className="text-2xl font-serif font-bold text-brand-dark">Select Client</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {allClients.filter(c => c.pin !== '1991').map(client => (
                <button
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="p-6 border-2 border-stone-300 rounded-lg hover:border-brand-green hover:bg-brand-green/5 transition-all text-left group"
                >
                  <h3 className="font-bold text-lg text-brand-dark group-hover:text-brand-green transition-colors">
                    {client.name}
                  </h3>
                  <p className="text-sm text-stone-600 mt-2">{client.brand_name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Meta Integration Settings Modal */}
      {showMetaSettings && currentClient && (
        <MetaSettings
          client={currentClient}
          onUpdate={(updatedClient: Client) => {
            setCurrentClient(updatedClient);
            // Update in allClients array if master account
            if (isMasterAccount) {
              setAllClients(allClients.map(c => c.id === updatedClient.id ? updatedClient : c));
            }
          }}
          onClose={() => setShowMetaSettings(false)}
        />
      )}

      {/* Email Client Modal */}
      {showEmailModal && currentClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-brand-green" />
              <h2 className="text-xl font-serif font-bold text-brand-dark">Email Client</h2>
            </div>

            <div className="mb-4 text-sm text-stone-600">
              <p>Sending from: <span className="font-medium text-brand-dark">{gmailEmail}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">To:</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">CC:</label>
                <p className="text-sm text-stone-500 bg-stone-50 px-3 py-2 rounded-lg">
                  contact@seammedia.com.au
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subject:</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Message:</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Enter your email message..."
                  className="w-full h-48 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none resize-none text-sm"
                />
              </div>

              {/* Edit client contact info */}
              {!currentClient.contact_email && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Tip: Set up contact details for this client in Supabase to auto-fill the email address next time.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailTo || !emailSubject.trim() || !emailBody.trim()}
                className="flex-1 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Notes Modal (Agency Only) */}
      {showClientNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowClientNotesModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-brand-green" />
              <h2 className="text-xl font-serif font-bold text-brand-dark">Client Notes</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Agency Only</span>
            </div>

            <p className="text-sm text-stone-500 mb-4">
              These notes are private and only visible to agency staff. They will be used to guide AI caption and image generation.
            </p>

            <textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Add notes about this client's preferences, brand voice, things to avoid, common feedback, etc.

Example:
- Always mention their location (Sydney)
- Avoid using the word 'cheap' - use 'affordable' instead
- They prefer shorter captions (2-3 sentences max)
- Include a call-to-action in every post
- Their target audience is young professionals (25-35)"
              className="w-full h-48 px-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-brand-green outline-none resize-none text-sm"
            />

            {/* Reference Images Section */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="flex items-center gap-2 mb-3">
                <Image className="w-5 h-5 text-brand-green" />
                <h3 className="font-medium text-stone-800">Brand Reference Images</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">
                Upload reference images to guide AI image generation. These help match the client's existing brand style and aesthetic.
              </p>

              {/* Reference Images Grid */}
              {referenceImages.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {referenceImages.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200">
                      <img
                        src={url}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveReferenceImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-brand-green hover:bg-stone-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReferenceImageUpload}
                  disabled={uploadingReferenceImage}
                  className="hidden"
                />
                {uploadingReferenceImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                    <span className="text-sm text-stone-500">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-stone-500" />
                    <span className="text-sm text-stone-500">Add Reference Image</span>
                  </>
                )}
              </label>
              <p className="text-xs text-stone-400 mt-2">
                Tip: Upload images that represent the brand's visual style, color palette, or aesthetic preferences.
              </p>
            </div>

            {/* Social Accounts Section */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-brand-green" />
                <h3 className="font-medium text-stone-800">Social Media Accounts</h3>
              </div>
              <p className="text-sm text-stone-500 mb-4">
                Select which social media accounts belong to this client. Only selected accounts will appear when scheduling posts.
              </p>

              {loadingClientProfiles ? (
                <div className="flex items-center justify-center py-6 text-stone-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading accounts...
                </div>
              ) : clientLateProfiles.length === 0 ? (
                <p className="text-sm text-stone-400 py-4 text-center">
                  No social accounts connected. Please configure your Late API settings.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clientLateProfiles.map((profile) => {
                    const isSelected = selectedLateProfileIds.includes(profile.id);
                    const platformColors: Record<string, string> = {
                      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
                      facebook: 'bg-blue-600',
                      tiktok: 'bg-black',
                      twitter: 'bg-sky-500',
                      linkedin: 'bg-blue-700',
                      youtube: 'bg-red-600',
                      pinterest: 'bg-red-500'
                    };
                    const bgColor = platformColors[profile.platform.toLowerCase()] || 'bg-stone-500';

                    return (
                      <label
                        key={profile.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-green bg-emerald-50'
                            : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClientLateProfile(profile.id)}
                          className="w-4 h-4 text-brand-green border-stone-300 rounded focus:ring-brand-green"
                        />
                        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {profile.platform.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-stone-800 truncate">{profile.username}</div>
                          <div className="text-xs text-stone-500 capitalize">{profile.platform}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {clientLateProfiles.length > 0 && (
                <p className="text-xs text-stone-400 mt-2">
                  {selectedLateProfileIds.length} of {clientLateProfiles.length} account{clientLateProfiles.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowClientNotesModal(false)}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClientNotes}
                disabled={savingClientNotes}
                className="flex-1 px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingClientNotes ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setPreviewImageUrl(null);
            setPreviewImagePostId(null);
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => {
                setPreviewImageUrl(null);
                setPreviewImagePostId(null);
              }}
              className="absolute -top-10 right-0 text-white hover:text-stone-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Image/Video Preview */}
            {(() => {
              const previewPost = posts.find(p => p.id === previewImagePostId);
              const isVideo = previewPost?.mediaType === 'video' ||
                previewImageUrl.includes('.mp4') ||
                previewImageUrl.includes('.mov') ||
                previewImageUrl.includes('.webm');
              return isVideo ? (
                <video
                  src={previewImageUrl}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  controls
                  autoPlay
                  muted
                />
              ) : (
                <img
                  src={previewImageUrl}
                  alt="Preview"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
              );
            })()}

            {/* Upload New Image Button */}
            {previewImagePostId && (
              <div className="mt-4 flex justify-center">
                <label className="flex items-center gap-2 px-4 py-2 bg-white text-stone-700 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors text-sm font-medium shadow-lg">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      handleMediaChange(previewImagePostId, e);
                      setPreviewImageUrl(null);
                      setPreviewImagePostId(null);
                    }}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4" />
                  Upload New Media
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Posts Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-serif font-bold text-brand-dark">Schedule Posts</h2>
            </div>

            <div className="mb-4 text-sm text-stone-600">
              {(() => {
                const approved = filteredPosts.filter(p => p.status === 'Approved');
                const withImages = approved.filter(p => p.imageUrl && p.imageUrl.trim() !== '' && p.imageUrl.startsWith('http'));
                const withoutImages = approved.length - withImages.length;
                return (
                  <>
                    <p>Schedule <span className="font-bold text-blue-600">{approved.length}</span> approved posts to your connected social media accounts.</p>
                    {withoutImages > 0 && (
                      <p className="text-amber-600 mt-1">
                        ⚠️ {withoutImages} post(s) have no images and will be skipped for Instagram.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Post Time Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">Post Time (for each post's date)</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-stone-500 mt-1">Posts will be scheduled at this time on their respective dates</p>
            </div>

            {/* Profile Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">Select Platforms</label>
              {loadingProfiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-stone-500">Loading profiles...</span>
                </div>
              ) : lateProfiles.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <p className="text-amber-800 font-medium">No social profiles connected</p>
                  <p className="text-amber-700 mt-1">Please connect your social media accounts at <a href="https://getlate.dev" target="_blank" rel="noopener noreferrer" className="underline">getlate.dev</a></p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-2">
                  {lateProfiles.map((profile) => (
                    <label
                      key={profile.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedProfiles.includes(profile.id)
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-stone-50 border-2 border-transparent hover:bg-stone-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProfiles.includes(profile.id)}
                        onChange={() => toggleProfileSelection(profile.id)}
                        className="w-4 h-4 text-blue-600 rounded border-stone-300 focus:ring-blue-500"
                      />
                      {/* Platform Icon */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        profile.platform === 'instagram' ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' :
                        profile.platform === 'facebook' ? 'bg-blue-600' :
                        profile.platform === 'tiktok' ? 'bg-black' :
                        profile.platform === 'twitter' || profile.platform === 'x' ? 'bg-black' :
                        profile.platform === 'linkedin' ? 'bg-blue-700' :
                        profile.platform === 'youtube' ? 'bg-red-600' :
                        profile.platform === 'pinterest' ? 'bg-red-500' :
                        'bg-stone-500'
                      }`}>
                        {profile.platform === 'instagram' ? 'IG' :
                         profile.platform === 'facebook' ? 'FB' :
                         profile.platform === 'tiktok' ? 'TT' :
                         profile.platform === 'twitter' || profile.platform === 'x' ? 'X' :
                         profile.platform === 'linkedin' ? 'IN' :
                         profile.platform === 'youtube' ? 'YT' :
                         profile.platform === 'pinterest' ? 'PI' :
                         profile.platform?.substring(0, 2).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-800 truncate">{profile.username || profile.platform}</p>
                        <p className="text-xs text-stone-500 capitalize">{profile.platform}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            {lateProfiles.length > 0 && (
              <div className="mb-4 bg-blue-50 rounded-lg p-3 text-sm">
                {(() => {
                  const approved = filteredPosts.filter(p => p.status === 'Approved');
                  const hasInstagram = selectedProfiles.some(id => lateProfiles.find(p => p.id === id)?.platform === 'instagram');
                  const hasValidImage = (p: Post) => p.imageUrl && p.imageUrl.trim() !== '' && p.imageUrl.startsWith('http');
                  const schedulablePosts = hasInstagram ? approved.filter(p => hasValidImage(p)).length : approved.length;
                  return (
                    <p className="text-blue-800">
                      <span className="font-bold">{schedulablePosts}</span> post(s) will be scheduled to{' '}
                      <span className="font-bold">{selectedProfiles.length}</span> platform(s)
                    </p>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePosts}
                disabled={schedulingPosts || selectedProfiles.length === 0 || filteredPosts.filter(p => p.status === 'Approved').length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {schedulingPosts ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Schedule Posts
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Posts Modal (Agency Only) */}
      {showGeneratePostsModal && currentClient && (
        <GeneratePostsModal
          client={currentClient}
          onClose={() => setShowGeneratePostsModal(false)}
          onPostsGenerated={() => {
            // Refresh posts
            fetchPosts();
          }}
        />
      )}

      {/* Connection Settings - floating buttons for master account */}
      {isMasterAccount && isAuthenticated && (
        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
          {/* Drive Connection */}
          {driveConnected ? (
            <button
              onClick={handleDisconnectDrive}
              className="bg-white border border-stone-300 shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-stone-50 transition-colors"
              title={`Drive connected as ${driveEmail}`}
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <HardDrive className="w-4 h-4 text-blue-600" />
              Drive Connected
            </button>
          ) : (
            <button
              onClick={handleConnectDrive}
              className="bg-blue-600 text-white shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              Connect Drive
            </button>
          )}
          {/* Gmail Connection */}
          {gmailConnected ? (
            <button
              onClick={handleDisconnectGmail}
              className="bg-white border border-stone-300 shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-stone-50 transition-colors"
              title={`Connected as ${gmailEmail}`}
            >
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Gmail Connected
            </button>
          ) : (
            <button
              onClick={handleConnectGmail}
              className="bg-brand-green text-white shadow-lg rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-emerald-800 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>
          )}
        </div>
      )}
    </div>
  );
}
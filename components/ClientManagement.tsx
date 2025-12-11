import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Check, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { Client, Post } from '../types';
import { supabase } from '../services/supabaseClient';

interface ClientManagementProps {
  clients: Client[];
  onClientSelect: (client: Client) => void;
}

// Weekly status types
type WeeklyStatusType = 'posted' | 'approved' | 'awaiting' | 'in_progress' | 'outstanding' | 'no_posts';

interface WeeklyStatusInfo {
  type: WeeklyStatusType;
  label: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}

// Get Monday of the week containing a date
const getMonday = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Format date as YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Get week dates (Monday to Sunday)
const getWeekDates = (weekStart: Date): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Determine the weekly status for a client's posts
const getWeeklyStatusInfo = (posts: Post[], today: Date): WeeklyStatusInfo => {
  const todayStr = formatDateKey(today);

  if (posts.length === 0) {
    return {
      type: 'no_posts',
      label: 'No posts scheduled',
      bgColor: 'bg-stone-100',
      textColor: 'text-stone-400',
      icon: <span className="text-stone-300">—</span>
    };
  }

  // Check for outstanding posts:
  // 1. Past date and not posted (overdue)
  // 2. Any post still "For Approval" in the current week view (should have been approved by now)
  const hasOutstanding = posts.some(post => {
    const postDate = post.date;
    const notPosted = post.status !== 'Posted';
    const needsApproval = post.status === 'For Approval';

    // Outstanding if: past date and not posted, OR still awaiting approval (should be approved by now)
    return (postDate < todayStr && notPosted) || needsApproval;
  });

  if (hasOutstanding) {
    return {
      type: 'outstanding',
      label: 'Outstanding',
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      icon: <AlertTriangle className="w-5 h-5" />
    };
  }

  // Check if all posts are posted
  const allPosted = posts.every(post => post.status === 'Posted');
  if (allPosted) {
    return {
      type: 'posted',
      label: 'Posted',
      bgColor: 'bg-emerald-500',
      textColor: 'text-white',
      icon: <Check className="w-5 h-5" />
    };
  }

  // Check if any posts are awaiting approval (For Approval status)
  const hasAwaitingApproval = posts.some(post => post.status === 'For Approval');

  // Check if any posts are approved but not posted
  const hasApproved = posts.some(post => post.status === 'Approved');

  // Check if any posts are in progress (Draft or Generated)
  const hasInProgress = posts.some(post => post.status === 'Draft' || post.status === 'Generated');

  // Priority: Outstanding > In Progress > Awaiting Approval > Approved > Posted
  // (Show the "worst" status that needs attention)

  if (hasInProgress) {
    return {
      type: 'in_progress',
      label: 'In Progress',
      bgColor: 'bg-stone-400',
      textColor: 'text-white',
      icon: <Loader2 className="w-5 h-5" />
    };
  }

  if (hasAwaitingApproval) {
    return {
      type: 'awaiting',
      label: 'Awaiting Approval',
      bgColor: 'bg-amber-400',
      textColor: 'text-amber-900',
      icon: <Clock className="w-5 h-5" />
    };
  }

  if (hasApproved) {
    return {
      type: 'approved',
      label: 'Approved',
      bgColor: 'bg-sky-400',
      textColor: 'text-white',
      icon: <Check className="w-5 h-5" />
    };
  }

  // Fallback
  return {
    type: 'no_posts',
    label: 'No posts scheduled',
    bgColor: 'bg-stone-100',
    textColor: 'text-stone-400',
    icon: <span className="text-stone-300">—</span>
  };
};

export function ClientManagement({ clients, onClientSelect }: ClientManagementProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [allPosts, setAllPosts] = useState<Record<string, Post[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch all posts for all clients
  useEffect(() => {
    const fetchAllPosts = async () => {
      setLoading(true);

      // Get date range for the week
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);

      const startStr = formatDateKey(currentWeekStart);
      const endStr = formatDateKey(weekEnd);

      // Fetch posts for all clients within the week
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching posts:', error);
        setLoading(false);
        return;
      }

      // Group posts by client_id
      const postsByClient: Record<string, Post[]> = {};
      for (const post of data || []) {
        if (!postsByClient[post.client_id]) {
          postsByClient[post.client_id] = [];
        }
        postsByClient[post.client_id].push({
          id: post.id,
          client_id: post.client_id,
          title: post.title,
          date: post.date,
          status: post.status,
          imageDescription: post.image_description || '',
          imageUrl: post.image_url || '',
          mediaType: post.media_type || 'image',
          generatedCaption: post.generated_caption || '',
          generatedHashtags: post.generated_hashtags || [],
          notes: post.notes || ''
        });
      }

      setAllPosts(postsByClient);
      setLoading(false);
    };

    fetchAllPosts();
  }, [currentWeekStart]);

  const weekDates = getWeekDates(currentWeekStart);
  // Shorter day names
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Navigation
  const goToPreviousWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  // Format week range for display
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);
  const weekRangeStr = `${currentWeekStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}`;

  // Filter to only show non-master clients
  const displayClients = clients.filter(c => c.pin !== '1991');

  // Check if today is in the current week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);
  const isToday = (date: Date) => formatDateKey(date) === todayKey;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-300 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-stone-800">Weekly Client Overview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-stone-600" />
            </button>
            <span className="text-sm font-medium text-stone-600 min-w-[140px] text-center">
              {weekRangeStr}
            </span>
            <button
              onClick={goToNextWeek}
              className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-stone-600" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-stone-500">Posted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-sky-400"></div>
            <span className="text-stone-500">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-400"></div>
            <span className="text-stone-500">Awaiting Approval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-stone-400"></div>
            <span className="text-stone-500">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-stone-500">Outstanding</span>
          </div>
          <button
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors"
            title="AI Status Report (Coming Soon)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Status Report
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left py-3 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider w-72">
                Client
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider w-64">
                <div className="flex justify-between px-2">
                  {weekDates.map((date, idx) => {
                    const dayIsToday = isToday(date);
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center min-w-[32px] py-1 px-1 rounded-lg ${
                          dayIsToday ? 'bg-brand-green text-white' : ''
                        }`}
                      >
                        <span className={`text-[10px] ${dayIsToday ? 'text-white' : 'text-stone-400'}`}>{dayNames[idx]}</span>
                        <span className={`text-sm font-bold ${dayIsToday ? 'text-white' : 'text-stone-600'}`}>
                          {date.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-stone-400">
                  Loading client data...
                </td>
              </tr>
            ) : displayClients.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-12 text-stone-400">
                  No clients found
                </td>
              </tr>
            ) : (
              displayClients.map((client) => {
                // Get initials for avatar
                const initials = client.name
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                // Generate a consistent color based on client name
                const colors = [
                  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
                  'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'
                ];
                const colorIdx = client.name.charCodeAt(0) % colors.length;
                const avatarColor = colors[colorIdx];

                // Get all posts for this client this week
                const clientPosts = allPosts[client.id] || [];
                const statusInfo = getWeeklyStatusInfo(clientPosts, today);
                const postCount = clientPosts.length;

                return (
                  <tr key={client.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onClientSelect(client)}
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity group"
                      >
                        <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-800 group-hover:text-brand-green transition-colors whitespace-nowrap">
                            {client.name}
                          </div>
                          {client.contact_name && (
                            <div className="text-sm text-stone-400">{client.contact_name}</div>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      {/* Empty cell - days are just for reference in header */}
                    </td>
                    <td className="py-4 px-4">
                      <div
                        className={`flex items-center justify-center gap-3 py-3 px-6 rounded-lg ${statusInfo.bgColor} ${statusInfo.textColor} transition-all hover:opacity-90 cursor-pointer`}
                        title={`${postCount} post(s) this week`}
                        onClick={() => onClientSelect(client)}
                      >
                        {statusInfo.icon}
                        <span className="font-semibold">{statusInfo.label}</span>
                        {postCount > 0 && (
                          <span className={`text-sm ${statusInfo.type === 'awaiting' || statusInfo.type === 'outstanding' ? '' : 'opacity-80'}`}>
                            ({postCount} post{postCount !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

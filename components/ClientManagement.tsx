import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import { Client, Post } from '../types';
import { supabase } from '../services/supabaseClient';

interface ClientManagementProps {
  clients: Client[];
}

// Status priority for determining weekly status (highest to lowest)
const STATUS_PRIORITY: Record<string, number> = {
  'Draft': 1,
  'Generated': 2,
  'For Approval': 3,
  'Approved': 4,
  'Posted': 5,
};

// Get the lowest status (earliest in workflow) for a week's posts
const getWeeklyStatus = (posts: Post[]): string | null => {
  if (posts.length === 0) return null;

  let lowestPriority = Infinity;
  let lowestStatus = null;

  for (const post of posts) {
    const priority = STATUS_PRIORITY[post.status] || 0;
    if (priority < lowestPriority) {
      lowestPriority = priority;
      lowestStatus = post.status;
    }
  }

  return lowestStatus;
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

export function ClientManagement({ clients }: ClientManagementProps) {
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
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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

  // Get posts for a specific client and date
  const getPostsForClientDate = (clientId: string, date: Date): Post[] => {
    const dateKey = formatDateKey(date);
    const clientPosts = allPosts[clientId] || [];
    return clientPosts.filter(post => post.date === dateKey);
  };

  // Get cell background color based on status
  const getStatusColor = (status: string | null, hasPosts: boolean): string => {
    if (!hasPosts) return 'bg-stone-50'; // No posts scheduled

    switch (status) {
      case 'Posted':
        return 'bg-emerald-400'; // Green
      case 'Approved':
        return 'bg-sky-300'; // Blue
      case 'For Approval':
        return 'bg-amber-300'; // Orange
      case 'Generated':
      case 'Draft':
        return 'bg-stone-200'; // Grey
      default:
        return 'bg-stone-50';
    }
  };

  // Get icon for cell
  const getCellIcon = (status: string | null, hasPosts: boolean) => {
    if (!hasPosts) {
      return <span className="text-stone-300 text-xs">—</span>;
    }

    switch (status) {
      case 'Posted':
        return (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'Approved':
        return (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'For Approval':
        return (
          <svg className="w-4 h-4 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  // Filter to only show non-master clients
  const displayClients = clients.filter(c => c.pin !== '1991');

  // Check if today is in the current week
  const today = new Date();
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
            <div className="w-3 h-3 rounded bg-emerald-400"></div>
            <span className="text-stone-500">Posted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-sky-300"></div>
            <span className="text-stone-500">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-300"></div>
            <span className="text-stone-500">Awaiting Approval</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-stone-200"></div>
            <span className="text-stone-500">In Progress</span>
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
              <th className="text-left py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wider w-56">
                Client Name
              </th>
              {weekDates.map((date, idx) => {
                const dayIsToday = isToday(date);
                return (
                  <th
                    key={idx}
                    className={`text-center py-3 px-2 text-xs font-semibold uppercase tracking-wider min-w-[100px] ${
                      dayIsToday ? 'bg-brand-green text-white' : 'text-stone-500'
                    }`}
                  >
                    <div>{dayNames[idx]}</div>
                    <div className={`text-lg font-bold ${dayIsToday ? 'text-white' : 'text-stone-700'}`}>
                      {date.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-stone-400">
                  Loading client data...
                </td>
              </tr>
            ) : displayClients.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-stone-400">
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

                return (
                  <tr key={client.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium text-stone-800">{client.name}</div>
                          {client.contact_name && (
                            <div className="text-xs text-stone-400">{client.contact_name}</div>
                          )}
                        </div>
                        <button
                          className="ml-1 text-stone-300 hover:text-stone-500 transition-colors"
                          title="View client details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    {weekDates.map((date, idx) => {
                      const postsForDay = getPostsForClientDate(client.id, date);
                      const hasPosts = postsForDay.length > 0;
                      const dayStatus = getWeeklyStatus(postsForDay);
                      const bgColor = getStatusColor(dayStatus, hasPosts);

                      return (
                        <td key={idx} className="py-2 px-2">
                          <div
                            className={`h-12 rounded-lg ${bgColor} flex items-center justify-center transition-all hover:opacity-80 cursor-pointer`}
                            title={hasPosts ? `${postsForDay.length} post(s) - ${dayStatus}` : 'No posts scheduled'}
                          >
                            {getCellIcon(dayStatus, hasPosts)}
                          </div>
                        </td>
                      );
                    })}
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

// Late API Service for social media scheduling
// Uses serverless API routes to proxy requests (avoids CORS issues)
// Documentation: https://getlate.dev/

export interface LateProfile {
  id: string;
  platform: string;
  username: string;
  profilePicture?: string;
}

export interface SchedulePostParams {
  platforms: { platform: string; accountId: string }[];
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video'; // Type of media being posted
  scheduledFor: string; // ISO 8601 format
}

export interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledFor: string;
  status: string;
}

// Check if Late API is configured (by checking if env var exists)
export const isLateConfigured = (): boolean => {
  return !!import.meta.env.VITE_LATE_API_KEY;
};

// Fetch connected profiles from Late (via serverless proxy)
export const getProfiles = async (): Promise<LateProfile[]> => {
  const response = await fetch('/api/late-profiles', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch profiles: ${response.status}`);
  }

  const data = await response.json();
  return data.profiles || data || [];
};

// Schedule a post via Late API (via serverless proxy)
export const schedulePost = async (params: SchedulePostParams): Promise<{ id: string }> => {
  const response = await fetch('/api/late-schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platforms: params.platforms,
      content: params.content,
      mediaUrls: params.mediaUrls || [],
      mediaType: params.mediaType || 'image',
      scheduledFor: params.scheduledFor,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to schedule post: ${response.status}`);
  }

  return response.json();
};

// Get scheduled posts from Late (via serverless proxy)
export const getScheduledPosts = async (): Promise<ScheduledPost[]> => {
  const response = await fetch('/api/late-posts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch scheduled posts: ${response.status}`);
  }

  const data = await response.json();
  return data.posts || data || [];
};

// Delete a scheduled post (via serverless proxy)
export const deleteScheduledPost = async (postId: string): Promise<void> => {
  const response = await fetch(`/api/late-posts?id=${postId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to delete post: ${response.status}`);
  }
};

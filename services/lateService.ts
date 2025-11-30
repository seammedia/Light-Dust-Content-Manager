// Late API Service for social media scheduling
// Documentation: https://getlate.dev/

const LATE_API_BASE = 'https://getlate.dev/api/v1';

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
  scheduledFor: string; // ISO 8601 format
}

export interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledFor: string;
  status: string;
}

// Get API key from environment
const getApiKey = (): string | null => {
  return import.meta.env.VITE_LATE_API_KEY || null;
};

// Check if Late API is configured
export const isLateConfigured = (): boolean => {
  return !!getApiKey();
};

// Fetch connected profiles from Late
export const getProfiles = async (): Promise<LateProfile[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Late API key not configured');
  }

  const response = await fetch(`${LATE_API_BASE}/profiles`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch profiles: ${response.status}`);
  }

  const data = await response.json();
  return data.profiles || data || [];
};

// Schedule a post via Late API
export const schedulePost = async (params: SchedulePostParams): Promise<{ id: string }> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Late API key not configured');
  }

  const response = await fetch(`${LATE_API_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platforms: params.platforms,
      content: params.content,
      mediaUrls: params.mediaUrls || [],
      scheduledFor: params.scheduledFor,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to schedule post: ${response.status}`);
  }

  return response.json();
};

// Get scheduled posts from Late
export const getScheduledPosts = async (): Promise<ScheduledPost[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Late API key not configured');
  }

  const response = await fetch(`${LATE_API_BASE}/posts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to fetch scheduled posts: ${response.status}`);
  }

  const data = await response.json();
  return data.posts || data || [];
};

// Delete a scheduled post
export const deleteScheduledPost = async (postId: string): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Late API key not configured');
  }

  const response = await fetch(`${LATE_API_BASE}/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to delete post: ${response.status}`);
  }
};

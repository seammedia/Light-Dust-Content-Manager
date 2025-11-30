import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Late API - Schedule Post
 * Proxies requests to Late API to avoid CORS issues
 */

const LATE_API_BASE = 'https://getlate.dev/api/v1';

interface SchedulePostRequest {
  platforms: { platform: string; accountId: string }[];
  content: string;
  mediaUrls?: string[];
  scheduledFor: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_LATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Late API key not configured' });
  }

  try {
    const { platforms, content, mediaUrls, scheduledFor } = req.body as SchedulePostRequest;

    // Validate required fields
    if (!platforms || !content || !scheduledFor) {
      return res.status(400).json({ error: 'Missing required fields: platforms, content, scheduledFor' });
    }

    const response = await fetch(`${LATE_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platforms,
        content,
        mediaUrls: mediaUrls || [],
        scheduledFor,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: error.message || `Late API error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Late API schedule error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

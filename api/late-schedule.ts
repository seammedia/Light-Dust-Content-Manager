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
  mediaType?: 'image' | 'video'; // Media type for the post
  scheduledFor: string;
  timezone?: string;
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
    const { platforms, content, mediaUrls, mediaType, scheduledFor, timezone } = req.body as SchedulePostRequest;

    // Validate required fields
    if (!platforms || !content || !scheduledFor) {
      return res.status(400).json({ error: 'Missing required fields: platforms, content, scheduledFor' });
    }

    // Check if Instagram is in the platforms and validate media is provided
    const hasInstagram = platforms.some(p => p.platform === 'instagram');
    const hasValidMedia = mediaUrls && mediaUrls.length > 0 && mediaUrls.some(url => url && !url.startsWith('data:'));

    if (hasInstagram && !hasValidMedia) {
      return res.status(400).json({ error: 'Instagram posts require media content (images or videos)' });
    }

    // Build the request body according to Late API spec
    const requestBody: any = {
      platforms,
      content,
      scheduledFor,
      timezone: timezone || 'Australia/Sydney', // Default timezone
      publishNow: false,
      isDraft: false,
    };

    // Add media items if provided (Late expects mediaItems array with type and url)
    if (mediaUrls && mediaUrls.length > 0) {
      // Filter out base64 data URLs as Late API needs public URLs
      const publicUrls = mediaUrls.filter(url => !url.startsWith('data:'));
      if (publicUrls.length > 0) {
        // Use the provided mediaType, or default to 'image'
        const type = mediaType || 'image';
        requestBody.mediaItems = publicUrls.map(url => ({
          type: type,
          url: url,
        }));
      }
    }

    console.log('Late API schedule request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${LATE_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Late API schedule response:', response.status, responseText);

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { message: responseText };
      }
      console.error('Late API error details:', error);
      return res.status(response.status).json({
        error: error.message || error.error || error.detail || JSON.stringify(error) || `Late API error: ${response.status}`
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { success: true };
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Late API schedule error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

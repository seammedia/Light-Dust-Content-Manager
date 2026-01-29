import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Late API - Reschedule/Update Post
 * Updates an existing scheduled post in Late API
 */

const LATE_API_BASE = 'https://getlate.dev/api/v1';

interface ReschedulePostRequest {
  latePostId: string;
  scheduledFor?: string;
  content?: string;
  timezone?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow PUT for updates, DELETE for cancellation
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed. Use PUT to update or DELETE to cancel.' });
  }

  const apiKey = process.env.VITE_LATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Late API key not configured' });
  }

  try {
    const { latePostId, scheduledFor, content, timezone } = req.body as ReschedulePostRequest;

    // Validate required fields
    if (!latePostId) {
      return res.status(400).json({ error: 'Missing required field: latePostId' });
    }

    if (req.method === 'DELETE') {
      // Delete/cancel the post
      console.log('Late API delete request for post:', latePostId);

      const response = await fetch(`${LATE_API_BASE}/posts/${latePostId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const responseText = await response.text();
      console.log('Late API delete response:', response.status, responseText);

      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText };
        }
        return res.status(response.status).json({
          error: error.message || error.error || `Late API error: ${response.status}`
        });
      }

      return res.status(200).json({ success: true, message: 'Post cancelled successfully' });
    }

    // PUT - Update the post
    const updateBody: any = {};

    if (scheduledFor) {
      updateBody.scheduledFor = scheduledFor;
    }

    if (content) {
      updateBody.content = content;
    }

    if (timezone) {
      updateBody.timezone = timezone;
    }

    if (Object.keys(updateBody).length === 0) {
      return res.status(400).json({ error: 'No fields to update. Provide scheduledFor, content, or timezone.' });
    }

    console.log('Late API reschedule request:', latePostId, JSON.stringify(updateBody, null, 2));

    const response = await fetch(`${LATE_API_BASE}/posts/${latePostId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    });

    const responseText = await response.text();
    console.log('Late API reschedule response:', response.status, responseText);

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { message: responseText };
      }
      console.error('Late API reschedule error details:', error);

      // Provide helpful error messages
      if (response.status === 404) {
        return res.status(404).json({ error: 'Post not found in Late. It may have already been published or deleted.' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: error.message || 'Cannot update this post. It may already be published.' });
      }

      return res.status(response.status).json({
        error: error.message || error.error || error.detail || `Late API error: ${response.status}`
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
    console.error('Late API reschedule error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

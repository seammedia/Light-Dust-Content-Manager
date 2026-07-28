import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Zernio - Reschedule/Update Post
 * Updates an existing scheduled post in Zernio
 */

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

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

  const apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Zernio API key not configured' });
  }

  try {
    const { latePostId, scheduledFor, content, timezone } = req.body as ReschedulePostRequest;

    // Validate required fields
    if (!latePostId) {
      return res.status(400).json({ error: 'Missing required field: latePostId' });
    }

    if (req.method === 'DELETE') {
      // Delete/cancel the post
      console.log('Zernio delete request for post:', latePostId);

      const response = await fetch(`${ZERNIO_API_BASE}/posts/${latePostId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const responseText = await response.text();
      console.log('Zernio delete response:', response.status, responseText);

      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText };
        }
        return res.status(response.status).json({
          error: error.message || error.error || `Zernio error: ${response.status}`
        });
      }

      return res.status(200).json({ success: true, message: 'Post cancelled successfully' });
    }

    // PUT - Update the post
    // Use isDraft: false and publishNow: false to keep it scheduled (same as schedule endpoint)
    const updateBody: any = {
      isDraft: false,
      publishNow: false
    };

    if (scheduledFor) {
      updateBody.scheduledFor = scheduledFor;
    }

    if (content) {
      updateBody.content = content;
    }

    if (timezone) {
      updateBody.timezone = timezone;
    }

    // We always have status, so just check if we have at least one update field
    if (!scheduledFor && !content && !timezone) {
      return res.status(400).json({ error: 'No fields to update. Provide scheduledFor, content, or timezone.' });
    }

    console.log('Zernio reschedule request:', latePostId, JSON.stringify(updateBody, null, 2));

    const response = await fetch(`${ZERNIO_API_BASE}/posts/${latePostId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    });

    const responseText = await response.text();
    console.log('Zernio reschedule response:', response.status, responseText);

    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { message: responseText };
      }
      console.error('Zernio reschedule error details:', error);

      // Provide helpful error messages
      if (response.status === 404) {
        return res.status(404).json({ error: 'Post not found in Zernio. It may have already been published or deleted.' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: error.message || 'Cannot update this post. It may already be published.' });
      }

      return res.status(response.status).json({
        error: error.message || error.error || error.detail || `Zernio error: ${response.status}`
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
    console.error('Zernio reschedule error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

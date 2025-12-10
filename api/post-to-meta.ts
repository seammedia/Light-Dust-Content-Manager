import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Meta API Posting
 * Keeps access tokens secure on server-side
 */

interface PostToMetaRequest {
  clientId: string;
  postId: string;
  platform: 'facebook' | 'instagram';
  imageUrl?: string;
  mediaType?: 'image' | 'video'; // Type of media being posted
  caption: string;
  scheduledTime?: string;
}

const FACEBOOK_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, postId, platform, imageUrl, mediaType, caption, scheduledTime } =
      req.body as PostToMetaRequest;

    // Validate required fields
    if (!clientId || !postId || !platform || !caption) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine media type from URL if not explicitly provided
    const isVideo = mediaType === 'video' || (imageUrl ? (
      imageUrl.includes('.mp4') ||
      imageUrl.includes('.mov') ||
      imageUrl.includes('.webm')
    ) : false);

    // Import Supabase (server-side)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Fetch client credentials from database
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.meta_access_token) {
      return res.status(400).json({ error: 'Meta credentials not configured' });
    }

    // Post to the selected platform
    let result;
    if (platform === 'facebook') {
      result = await postToFacebook(
        client.meta_page_id,
        client.meta_access_token,
        imageUrl,
        caption,
        scheduledTime,
        isVideo
      );
    } else {
      result = await postToInstagram(
        client.instagram_account_id,
        client.meta_access_token,
        imageUrl!,
        caption,
        isVideo
      );
    }

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Update social_posts table
    await supabase.from('social_posts').insert({
      post_id: postId,
      client_id: clientId,
      platform,
      status: 'posted',
      meta_post_id: result.metaPostId,
      posted_at: new Date().toISOString(),
      scheduled_for: scheduledTime || new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      metaPostId: result.metaPostId,
    });
  } catch (error) {
    console.error('Meta posting error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Post to Facebook Page (supports both images and videos)
 */
async function postToFacebook(
  pageId: string,
  accessToken: string,
  mediaUrl: string | undefined,
  caption: string,
  scheduledTime?: string,
  isVideo?: boolean
): Promise<{ success: boolean; metaPostId?: string; error?: string }> {
  try {
    // Use different endpoints for photos vs videos
    const endpoint = isVideo ? 'videos' : 'photos';
    const url = `${GRAPH_API_BASE}/${pageId}/${endpoint}`;

    const formData = new URLSearchParams();
    formData.append(isVideo ? 'description' : 'message', caption);
    formData.append('access_token', accessToken);

    if (mediaUrl) {
      // Facebook uses 'url' for photos and 'file_url' for videos
      formData.append(isVideo ? 'file_url' : 'url', mediaUrl);
    }

    // Schedule post if future date
    if (scheduledTime) {
      const scheduledTimestamp = Math.floor(new Date(scheduledTime).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);

      if (scheduledTimestamp > now) {
        formData.append('published', 'false');
        formData.append('scheduled_publish_time', scheduledTimestamp.toString());
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Facebook API error');
    }

    return {
      success: true,
      metaPostId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post to Instagram Business Account (supports both images and videos/reels)
 */
async function postToInstagram(
  instagramAccountId: string,
  accessToken: string,
  mediaUrl: string,
  caption: string,
  isVideo?: boolean
): Promise<{ success: boolean; metaPostId?: string; error?: string }> {
  try {
    if (!mediaUrl) {
      throw new Error('Instagram posts require a media URL');
    }

    // Step 1: Create media container
    const containerUrl = `${GRAPH_API_BASE}/${instagramAccountId}/media`;
    const containerParams = new URLSearchParams({
      caption: caption,
      access_token: accessToken,
    });

    // Use different parameters for image vs video
    if (isVideo) {
      containerParams.append('video_url', mediaUrl);
      containerParams.append('media_type', 'REELS'); // Instagram videos are posted as Reels
    } else {
      containerParams.append('image_url', mediaUrl);
    }

    const containerResponse = await fetch(`${containerUrl}?${containerParams}`, {
      method: 'POST',
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok) {
      throw new Error(containerData.error?.message || 'Instagram container creation error');
    }

    // For videos, we need to wait for processing to complete
    if (isVideo) {
      // Poll for container status until ready (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      while (attempts < maxAttempts) {
        const statusUrl = `${GRAPH_API_BASE}/${containerData.id}`;
        const statusParams = new URLSearchParams({
          fields: 'status_code',
          access_token: accessToken,
        });

        const statusResponse = await fetch(`${statusUrl}?${statusParams}`);
        const statusData = await statusResponse.json();

        if (statusData.status_code === 'FINISHED') {
          break;
        } else if (statusData.status_code === 'ERROR') {
          throw new Error('Video processing failed on Instagram');
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Video processing timed out');
      }
    }

    // Step 2: Publish the container
    const publishUrl = `${GRAPH_API_BASE}/${instagramAccountId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: containerData.id,
      access_token: accessToken,
    });

    const publishResponse = await fetch(`${publishUrl}?${publishParams}`, {
      method: 'POST',
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      throw new Error(publishData.error?.message || 'Instagram publishing error');
    }

    return {
      success: true,
      metaPostId: publishData.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

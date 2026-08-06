import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Zernio (formerly Late) - Schedule Post
 *
 * Duplicate protection has two layers:
 * 1. Atomically claim the content-manager post in Supabase before any external
 *    request. A reserved late_post_id value means only one request can proceed.
 * 2. Send a stable x-request-id so a retry of the same logical request is
 *    idempotent at Zernio too.
 */

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

interface SchedulePostRequest {
  postId: string;
  platforms: { platform: string; accountId: string }[];
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  contentType?: 'post' | 'reel' | 'story';
  scheduledFor: string;
  timezone?: string;
}

interface ZernioPost {
  _id?: string;
  id?: string;
}

interface ZernioResponse {
  id?: string;
  _id?: string;
  post?: ZernioPost;
  existingPost?: ZernioPost;
  details?: { existingPostId?: string };
  error?: string;
  message?: string;
  detail?: string;
}

const stableRequestId = (postId: string): string => {
  const hash = createHash('sha256').update(`seam-media:zernio:${postId}`).digest('hex');
  // Format the deterministic digest as an RFC 4122 UUID. Zernio recommends a
  // UUID request ID, and using the post ID as the seed keeps retries stable.
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

const getZernioPostId = (data: ZernioResponse): string | undefined =>
  data.post?._id ||
  data.post?.id ||
  data.existingPost?._id ||
  data.existingPost?.id ||
  data.details?.existingPostId ||
  data.id ||
  data._id;

interface SchedulingStatusQuery {
  eq(column: string, value: string): SchedulingStatusQuery;
  select(columns: string): PromiseLike<{
    data: { id: string }[] | null;
    error: unknown;
  }>;
}

interface SchedulingStatusClient {
  from(table: string): {
    update(values: { status: 'Posted' }): SchedulingStatusQuery;
  };
}

export const reconcileExistingScheduledPost = async (
  supabase: SchedulingStatusClient,
  postId: string,
  latePostId: string,
) => {
  const { data, error } = await supabase
    .from('posts')
    .update({ status: 'Posted' })
    .eq('id', postId)
    .eq('late_post_id', latePostId)
    .select('id');

  return {
    error,
    reconciled: !error && data?.length === 1,
  };
};

export const buildZernioPlatforms = (
  platforms: { platform: string; accountId: string }[],
  contentType: 'post' | 'reel' | 'story',
) => platforms.map(target => {
  if (target.platform === 'instagram' && contentType === 'story') {
    return { ...target, platformSpecificData: { contentType: 'story' } };
  }
  if (target.platform === 'instagram' && contentType === 'reel') {
    return { ...target, platformSpecificData: { contentType: 'reels', shareToFeed: true } };
  }
  if (target.platform === 'facebook' && contentType !== 'post') {
    return { ...target, platformSpecificData: { contentType } };
  }
  return target;
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Zernio API key not configured' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase server credentials not configured' });
  }

  const { postId, platforms, content, mediaUrls, mediaType, contentType = 'post', scheduledFor, timezone } =
    req.body as SchedulePostRequest;

  if (!postId || !platforms?.length || !scheduledFor) {
    return res.status(400).json({
      error: 'Missing required fields: postId, platforms, scheduledFor',
    });
  }

  if (!['post', 'reel', 'story'].includes(contentType)) {
    return res.status(400).json({ error: 'Content type must be post, reel, or story' });
  }

  const hasInstagram = platforms.some(platform => platform.platform === 'instagram');
  const publicUrls = (mediaUrls || []).filter(url => url && !url.startsWith('data:'));
  if (!content?.trim() && publicUrls.length === 0) {
    return res.status(400).json({ error: 'Add a caption or media before scheduling' });
  }
  if (hasInstagram && publicUrls.length === 0) {
    return res.status(400).json({ error: 'Instagram posts require media content (images or videos)' });
  }
  if (contentType === 'story') {
    const unsupportedPlatforms = platforms.filter(({ platform }) => !['instagram', 'facebook'].includes(platform));
    if (unsupportedPlatforms.length > 0) {
      return res.status(400).json({
        error: 'Stories can only be scheduled to Instagram or Facebook. Deselect the other platforms first.',
      });
    }
    if (publicUrls.length !== 1) {
      return res.status(400).json({ error: 'Stories require exactly one image or video' });
    }
  }
  if (contentType === 'reel' && (mediaType !== 'video' || publicUrls.length !== 1)) {
    return res.status(400).json({ error: 'Reels require exactly one video' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const requestId = stableRequestId(postId);
  const claimToken = `scheduling:${requestId}`;

  // PostgreSQL re-checks this predicate after a concurrent row lock is
  // released, so exactly one contender can claim an unscheduled post.
  const { data: claimedRows, error: claimError } = await supabase
    .from('posts')
    .update({ late_post_id: claimToken })
    .eq('id', postId)
    .is('late_post_id', null)
    .select('id');

  if (claimError) {
    console.error('Unable to claim post for Zernio scheduling:', claimError);
    return res.status(500).json({ error: 'Unable to reserve this post for scheduling' });
  }

  if (!claimedRows?.length) {
    const { data: existing, error: existingError } = await supabase
      .from('posts')
      .select('late_post_id, status')
      .eq('id', postId)
      .maybeSingle();

    if (existingError) {
      console.error('Unable to inspect existing scheduling claim:', existingError);
      return res.status(500).json({ error: 'Unable to verify this post scheduling state' });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Content-manager post not found' });
    }
    if (existing.late_post_id && !existing.late_post_id.startsWith('scheduling:')) {
      if (existing.status !== 'Posted') {
        const { reconciled, error: reconcileError } = await reconcileExistingScheduledPost(
          supabase as unknown as SchedulingStatusClient,
          postId,
          existing.late_post_id,
        );

        if (!reconciled) {
          console.error('Existing Zernio post found but status reconciliation failed:', reconcileError);
          return res.status(500).json({
            error: 'This post is already scheduled, but its calendar status could not be updated.',
          });
        }
      }

      return res.status(200).json({
        id: existing.late_post_id,
        post: { _id: existing.late_post_id },
        existingPost: true,
        message: 'This post was already scheduled; no duplicate was created.',
      });
    }

    return res.status(409).json({
      error: 'This post is already being scheduled. No duplicate request was sent.',
      code: 'SCHEDULE_IN_PROGRESS',
    });
  }

  const zernioPlatforms = buildZernioPlatforms(platforms, contentType);

  const requestBody: Record<string, unknown> = {
    platforms: zernioPlatforms,
    content: content || '',
    scheduledFor,
    timezone: timezone || 'Australia/Sydney',
    publishNow: false,
    isDraft: false,
  };

  if (publicUrls.length > 0) {
    requestBody.mediaItems = publicUrls.map(url => ({
      type: mediaType || 'image',
      url,
    }));
  }

  try {
    const response = await fetch(`${ZERNIO_API_BASE}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let data: ZernioResponse = {};
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { message: responseText };
    }

    // A 409 contains the already-created post ID when Zernio's content hash
    // catches a duplicate. Adopt that post instead of creating another.
    const latePostId = getZernioPostId(data);
    const acceptedExistingPost = response.status === 409 && !!latePostId;

    if (!response.ok && !acceptedExistingPost) {
      const upstreamError = data.error || data.message || data.detail || `Zernio API error: ${response.status}`;

      if (response.status < 500) {
        // A completed 4xx response is a definitive rejection, so a corrected
        // request may safely try again. 5xx/network failures stay locked because
        // the provider may have created the post before the response was lost.
        await supabase
          .from('posts')
          .update({ late_post_id: null })
          .eq('id', postId)
          .eq('late_post_id', claimToken);
      }

      return res.status(response.status).json({ error: upstreamError });
    }

    if (!latePostId) {
      return res.status(502).json({
        error: 'Zernio accepted the request but returned no post ID. The post is locked to prevent a duplicate.',
      });
    }

    const { data: savedRows, error: saveError } = await supabase
      .from('posts')
      .update({
        status: 'Posted',
        late_post_id: latePostId,
      })
      .eq('id', postId)
      .eq('late_post_id', claimToken)
      .select('id');

    if (saveError || !savedRows?.length) {
      console.error('Zernio post created but database finalization failed:', saveError);
      return res.status(500).json({
        error: 'The post was scheduled but its record could not be finalized. It remains locked to prevent a duplicate.',
      });
    }

    return res.status(acceptedExistingPost ? 200 : response.status).json({
      ...data,
      id: latePostId,
      post: data.post || { _id: latePostId },
      duplicatePrevented: acceptedExistingPost,
    });
  } catch (error) {
    // Do not release the claim: a connection failure can happen after Zernio
    // created the post but before this function received the response.
    console.error('Zernio schedule request failed ambiguously:', error);
    return res.status(502).json({
      error: 'The scheduling result could not be confirmed. The post is locked to prevent a duplicate.',
    });
  }
}

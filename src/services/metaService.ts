import { supabase } from '../../services/supabaseClient';
import type { Post, Client } from '../../types';

interface MetaPostResponse {
  id: string;
  post_id?: string;
}

interface InstagramPostResponse {
  id: string;
}

/**
 * Meta Business Suite API Service
 * Handles posting to Facebook Pages and Instagram Business Accounts
 */
export class MetaService {
  private static FACEBOOK_API_VERSION = 'v18.0';
  private static GRAPH_API_BASE = `https://graph.facebook.com/${MetaService.FACEBOOK_API_VERSION}`;

  /**
   * Post to Facebook Page
   */
  static async postToFacebook(
    client: Client,
    post: Post
  ): Promise<{ success: boolean; metaPostId?: string; error?: string }> {
    try {
      if (!client.meta_page_id || !client.meta_access_token) {
        throw new Error('Meta credentials not configured for this client');
      }

      const url = `${this.GRAPH_API_BASE}/${client.meta_page_id}/photos`;

      const formData = new FormData();
      formData.append('message', this.buildCaption(post));
      formData.append('access_token', client.meta_access_token);

      // If there's an image URL, include it
      if (post.imageUrl) {
        formData.append('url', post.imageUrl);
      }

      // Schedule post for the specified date if it's in the future
      const scheduledTime = new Date(post.date).getTime() / 1000;
      const now = Date.now() / 1000;

      if (scheduledTime > now) {
        formData.append('published', 'false');
        formData.append('scheduled_publish_time', Math.floor(scheduledTime).toString());
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data: MetaPostResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error?.message || 'Facebook API error');
      }

      return {
        success: true,
        metaPostId: data.id,
      };
    } catch (error) {
      console.error('Facebook posting error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post to Instagram Business Account
   * Instagram requires a 2-step process: create container, then publish
   */
  static async postToInstagram(
    client: Client,
    post: Post
  ): Promise<{ success: boolean; metaPostId?: string; error?: string }> {
    try {
      if (!client.instagram_account_id || !client.meta_access_token) {
        throw new Error('Instagram credentials not configured for this client');
      }

      if (!post.imageUrl) {
        throw new Error('Instagram posts require an image URL');
      }

      // Step 1: Create media container
      const containerUrl = `${this.GRAPH_API_BASE}/${client.instagram_account_id}/media`;

      const containerParams = new URLSearchParams({
        image_url: post.imageUrl,
        caption: this.buildCaption(post),
        access_token: client.meta_access_token,
      });

      const containerResponse = await fetch(`${containerUrl}?${containerParams}`, {
        method: 'POST',
      });

      const containerData: { id: string } = await containerResponse.json();

      if (!containerResponse.ok) {
        throw new Error((containerData as any).error?.message || 'Instagram container creation error');
      }

      // Step 2: Publish the container
      const publishUrl = `${this.GRAPH_API_BASE}/${client.instagram_account_id}/media_publish`;

      const publishParams = new URLSearchParams({
        creation_id: containerData.id,
        access_token: client.meta_access_token,
      });

      const publishResponse = await fetch(`${publishUrl}?${publishParams}`, {
        method: 'POST',
      });

      const publishData: InstagramPostResponse = await publishResponse.json();

      if (!publishResponse.ok) {
        throw new Error((publishData as any).error?.message || 'Instagram publishing error');
      }

      return {
        success: true,
        metaPostId: publishData.id,
      };
    } catch (error) {
      console.error('Instagram posting error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Auto-post to both Facebook and Instagram when status changes to "Approved"
   */
  static async autoPost(client: Client, post: Post): Promise<void> {
    if (!client.auto_post_enabled) {
      console.log('Auto-posting is disabled for this client');
      return;
    }

    const promises: Promise<void>[] = [];

    // Post to Facebook if enabled
    if (client.auto_post_to_facebook) {
      promises.push(this.postAndTrack('facebook', client, post));
    }

    // Post to Instagram if enabled
    if (client.auto_post_to_instagram) {
      promises.push(this.postAndTrack('instagram', client, post));
    }

    await Promise.all(promises);
  }

  /**
   * Post to platform and track in social_posts table
   */
  private static async postAndTrack(
    platform: 'facebook' | 'instagram',
    client: Client,
    post: Post
  ): Promise<void> {
    try {
      // Create pending record
      const { data: socialPost } = await supabase
        .from('social_posts')
        .insert({
          post_id: post.id,
          client_id: client.id,
          platform,
          status: 'pending',
          scheduled_for: post.date,
        })
        .select()
        .single();

      if (!socialPost) {
        throw new Error('Failed to create social post record');
      }

      // Attempt posting
      const result =
        platform === 'facebook'
          ? await this.postToFacebook(client, post)
          : await this.postToInstagram(client, post);

      // Update record with result
      if (result.success) {
        await supabase
          .from('social_posts')
          .update({
            status: 'posted',
            meta_post_id: result.metaPostId,
            posted_at: new Date().toISOString(),
          })
          .eq('id', socialPost.id);

        console.log(`Successfully posted to ${platform}:`, result.metaPostId);
      } else {
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: result.error,
          })
          .eq('id', socialPost.id);

        console.error(`Failed to post to ${platform}:`, result.error);
      }
    } catch (error) {
      console.error(`Error posting to ${platform}:`, error);
    }
  }

  /**
   * Build caption from post content
   */
  private static buildCaption(post: Post): string {
    let caption = '';

    if (post.generatedCaption) {
      caption += post.generatedCaption;
    }

    if (post.generatedHashtags && post.generatedHashtags.length > 0) {
      caption += '\n\n' + post.generatedHashtags.map((tag: string) => `#${tag}`).join(' ');
    }

    return caption || post.imageDescription || '';
  }

  /**
   * Verify Meta credentials are valid
   */
  static async verifyCredentials(
    pageId: string,
    accessToken: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${this.GRAPH_API_BASE}/${pageId}?fields=name,access_token&access_token=${accessToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return {
          valid: false,
          error: data.error?.message || 'Invalid credentials',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

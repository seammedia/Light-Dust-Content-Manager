import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function - Cleanup old images from Supabase Storage
 * Deletes images for posts that have been "Posted" for more than 60 days
 *
 * This can be called via a cron job or manually
 * Set up a Vercel Cron to run daily: vercel.json -> crons
 */

const CLEANUP_AFTER_DAYS = 60;
const BUCKET_NAME = 'post-images';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET for cron jobs, POST for manual triggers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Calculate the cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_AFTER_DAYS);

    // Find posts that are "Posted" and older than 60 days with image URLs
    const { data: oldPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id, imageUrl, date, status')
      .eq('status', 'Posted')
      .lt('date', cutoffDate.toISOString().split('T')[0])
      .not('imageUrl', 'is', null);

    if (fetchError) {
      console.error('Error fetching old posts:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch old posts' });
    }

    if (!oldPosts || oldPosts.length === 0) {
      return res.status(200).json({
        message: 'No old images to clean up',
        deleted: 0
      });
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const post of oldPosts) {
      // Only process Supabase Storage URLs
      if (!post.imageUrl || !post.imageUrl.includes('supabase')) {
        continue;
      }

      try {
        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/post-images/clientId/filename.jpg
        const urlParts = post.imageUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`);
        if (urlParts.length !== 2) {
          continue;
        }

        const filePath = urlParts[1];

        // Delete the file from storage
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);

        if (deleteError) {
          console.error(`Failed to delete ${filePath}:`, deleteError);
          errors.push(filePath);
        } else {
          deletedCount++;

          // Clear the imageUrl from the post (optional - keeps record clean)
          await supabase
            .from('posts')
            .update({ imageUrl: null })
            .eq('id', post.id);
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
        errors.push(post.id);
      }
    }

    return res.status(200).json({
      message: `Cleanup complete`,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
      totalProcessed: oldPosts.length
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

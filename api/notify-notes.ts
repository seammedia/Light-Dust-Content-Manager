import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Cron Job - Check for client notes and send email notification
 * Runs every 20 minutes to batch notifications
 */

interface PostWithNotes {
  id: string;
  date: string;
  notes: string;
  notes_updated_at: string;
  generated_caption: string | null;
  client_id: string;
  clients: {
    name: string;
    brand_name: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron job request (Vercel adds this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow manual trigger for testing
    if (req.method !== 'POST' || req.headers['x-manual-trigger'] !== 'true') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Import Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );

    // Find posts with notes that haven't been notified yet
    // Only get notes updated more than 20 minutes ago (to allow batching)
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        date,
        notes,
        notes_updated_at,
        generated_caption,
        client_id,
        clients (
          name,
          brand_name
        )
      `)
      .eq('notes_notified', false)
      .not('notes', 'is', null)
      .not('notes', 'eq', '')
      .lt('notes_updated_at', twentyMinutesAgo)
      .order('notes_updated_at', { ascending: true });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    if (!posts || posts.length === 0) {
      return res.status(200).json({ message: 'No new notes to notify' });
    }

    // Group posts by client
    const postsByClient = (posts as unknown as PostWithNotes[]).reduce((acc, post) => {
      const clientName = post.clients?.name || 'Unknown Client';
      if (!acc[clientName]) {
        acc[clientName] = [];
      }
      acc[clientName].push(post);
      return acc;
    }, {} as Record<string, PostWithNotes[]>);

    // Build email content
    const emailHtml = buildEmailHtml(postsByClient);
    const emailText = buildEmailText(postsByClient);

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Light Dust Content Manager <notifications@seammedia.com.au>',
        to: ['contact@seammedia.com.au'],
        subject: `New Client Notes (${posts.length} post${posts.length > 1 ? 's' : ''})`,
        html: emailHtml,
        text: emailText,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend error:', errorData);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    // Mark all posts as notified
    const postIds = posts.map(p => p.id);
    const { error: updateError } = await supabase
      .from('posts')
      .update({ notes_notified: true })
      .in('id', postIds);

    if (updateError) {
      console.error('Error updating notification status:', updateError);
    }

    return res.status(200).json({
      success: true,
      notified: posts.length,
      clients: Object.keys(postsByClient),
    });

  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function buildEmailHtml(postsByClient: Record<string, PostWithNotes[]>): string {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #3498db; margin-top: 30px; }
        .post { background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .post-date { color: #666; font-size: 14px; margin-bottom: 8px; }
        .notes { background: #fff; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .notes-label { font-weight: bold; color: #e74c3c; }
        .caption-preview { color: #666; font-size: 13px; margin-top: 8px; font-style: italic; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>New Client Notes</h1>
        <p>The following posts have new client feedback:</p>
  `;

  for (const [clientName, posts] of Object.entries(postsByClient)) {
    html += `<h2>${clientName}</h2>`;

    for (const post of posts) {
      const date = new Date(post.date).toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      html += `
        <div class="post">
          <div class="post-date">📅 ${date}</div>
          <div class="notes">
            <span class="notes-label">Client Notes:</span><br>
            ${escapeHtml(post.notes)}
          </div>
          ${post.generated_caption ? `
            <div class="caption-preview">
              <strong>Current caption:</strong> ${escapeHtml(post.generated_caption.substring(0, 100))}${post.generated_caption.length > 100 ? '...' : ''}
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  html += `
        <div class="footer">
          <p>This is an automated notification from Light Dust Content Manager.</p>
          <p><a href="https://seam-media-content-manager.vercel.app">Open Content Manager</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

function buildEmailText(postsByClient: Record<string, PostWithNotes[]>): string {
  let text = 'NEW CLIENT NOTES\n\n';
  text += 'The following posts have new client feedback:\n\n';

  for (const [clientName, posts] of Object.entries(postsByClient)) {
    text += `--- ${clientName} ---\n\n`;

    for (const post of posts) {
      const date = new Date(post.date).toLocaleDateString('en-AU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      text += `Date: ${date}\n`;
      text += `Client Notes: ${post.notes}\n`;
      if (post.generated_caption) {
        text += `Current caption: ${post.generated_caption.substring(0, 100)}${post.generated_caption.length > 100 ? '...' : ''}\n`;
      }
      text += '\n';
    }
  }

  text += '---\n';
  text += 'This is an automated notification from Light Dust Content Manager.\n';
  text += 'https://seam-media-content-manager.vercel.app\n';

  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

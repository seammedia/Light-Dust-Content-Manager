import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Late API - Get Profiles
 * Proxies requests to Late API to avoid CORS issues
 */

const LATE_API_BASE = 'https://getlate.dev/api/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_LATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Late API key not configured' });
  }

  try {
    const response = await fetch(`${LATE_API_BASE}/profiles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Late API error response:', error);
      return res.status(response.status).json({
        error: error.message || error.error || `Late API error: ${response.status}`
      });
    }

    const data = await response.json();
    console.log('Late API profiles response:', JSON.stringify(data, null, 2));

    // Normalize the response - Late API may return different structures
    // Handle both array and object with profiles/connections keys
    let profiles = [];

    if (Array.isArray(data)) {
      profiles = data;
    } else if (data.profiles) {
      profiles = data.profiles;
    } else if (data.connections) {
      profiles = data.connections;
    } else if (data.accounts) {
      profiles = data.accounts;
    } else if (data.data) {
      profiles = Array.isArray(data.data) ? data.data : [data.data];
    }

    // Map to a consistent format
    const normalizedProfiles = profiles.map((p: any) => ({
      id: p.id || p.accountId || p.account_id,
      platform: p.platform || p.network || p.type || 'unknown',
      username: p.username || p.name || p.handle || p.displayName || p.display_name || '',
      profilePicture: p.profilePicture || p.profile_picture || p.avatar || p.image || p.picture || '',
    }));

    return res.status(200).json({ profiles: normalizedProfiles });
  } catch (error) {
    console.error('Late API profiles error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

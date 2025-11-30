import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function for Late API - Get Accounts
 * Proxies requests to Late API to avoid CORS issues
 * Uses /accounts endpoint to get individual platform connections
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
    // Use /accounts endpoint to get individual social media accounts
    const response = await fetch(`${LATE_API_BASE}/accounts`, {
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
    console.log('Late API accounts response:', JSON.stringify(data, null, 2));

    // Normalize the response - Late API returns accounts array
    let accounts = [];

    if (Array.isArray(data)) {
      accounts = data;
    } else if (data.accounts) {
      accounts = data.accounts;
    } else if (data.data) {
      accounts = Array.isArray(data.data) ? data.data : [data.data];
    }

    // Map to a consistent format matching Late API response structure
    // Late returns: _id, profileId, platform, username, displayName, profilePicture, isActive
    const normalizedProfiles = accounts
      .filter((a: any) => a.isActive !== false) // Only include active accounts
      .map((a: any) => ({
        id: a._id || a.id || a.accountId,
        platform: (a.platform || 'unknown').toLowerCase(),
        username: a.username || a.displayName || a.display_name || a.name || '',
        profilePicture: a.profilePicture || a.profile_picture || a.avatar || '',
      }));

    return res.status(200).json({ profiles: normalizedProfiles });
  } catch (error) {
    console.error('Late API accounts error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

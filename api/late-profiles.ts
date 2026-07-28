import type { VercelRequest, VercelResponse } from '@vercel/node';
import socialConnectionsHandler from '../server/socialConnections.js';

/**
 * Vercel Serverless Function for Zernio (formerly Late) - Get Accounts
 * Proxies requests to Zernio to avoid CORS issues
 * Uses /accounts endpoint to get individual platform connections
 */

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.mode === 'social-connections') {
    return socialConnectionsHandler(req, res);
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Zernio API key not configured' });
  }

  try {
    // Use /accounts endpoint to get individual social media accounts
    const response = await fetch(`${ZERNIO_API_BASE}/accounts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Zernio API error response:', error);
      return res.status(response.status).json({
        error: error.message || error.error || `Zernio API error: ${response.status}`
      });
    }

    const data = await response.json();
    console.log('Zernio API accounts response received.');

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
    console.error('Zernio API accounts error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePortalRequest, cleanText } from './portal.js';
import { ensureZernioProfile } from './zernioProfiles.js';

const ZERNIO_API_BASE = 'https://zernio.com/api/v1';
const SUPPORTED_PLATFORMS = new Set([
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'googlebusiness',
  'linkedin',
  'threads',
  'twitter',
  'pinterest',
  'reddit',
  'snapchat',
]);

type ZernioAccount = {
  _id?: string;
  id?: string;
  accountId?: string;
  platform?: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  profilePicture?: string;
  isActive?: boolean;
};

async function zernioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY;
  if (!apiKey) throw new Error('Zernio is not configured yet.');
  const response = await fetch(`${ZERNIO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || data.message || `Zernio returned ${response.status}.`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

function requestOrigin(req: VercelRequest) {
  const forwardedHost = Array.isArray(req.headers['x-forwarded-host']) ? req.headers['x-forwarded-host'][0] : req.headers['x-forwarded-host'];
  const host = forwardedHost || req.headers.host;
  const forwardedProto = Array.isArray(req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'][0] : req.headers['x-forwarded-proto'];
  return `${forwardedProto || 'https'}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const clientId = cleanText(req.method === 'GET' ? req.query.clientId : req.body?.clientId, 80);
    if (!clientId) return res.status(400).json({ error: 'Client is required.' });
    const { db } = await authenticatePortalRequest(req, clientId);
    const { data: client, error: clientError } = await db
      .from('clients')
      .select('id, name, zernio_profile_id, late_profile_ids, provisioning_status')
      .eq('id', clientId)
      .maybeSingle();
    if (clientError) throw clientError;
    if (!client) return res.status(404).json({ error: 'Client could not be found.' });
    if (client.provisioning_status === 'cancelled') return res.status(403).json({ error: 'This client has been offboarded.' });

    if (req.method === 'GET') {
      if (!client.zernio_profile_id) return res.status(200).json({ profileId: null, accounts: [] });
      const params = new URLSearchParams({ profileId: client.zernio_profile_id });
      const result = await zernioRequest<{ accounts?: ZernioAccount[] }>(`/accounts?${params.toString()}`);
      const accounts = (result.accounts || []).map((account) => ({
        id: account._id || account.id || account.accountId,
        platform: String(account.platform || '').toLowerCase(),
        username: account.username || account.displayName || '',
        displayName: account.displayName || account.username || '',
        profileUrl: account.profileUrl || '',
        profilePicture: account.profilePicture || '',
        connected: account.isActive !== false,
      }));
      const accountIds = accounts.map((account) => account.id).filter(Boolean);
      if (JSON.stringify(accountIds) !== JSON.stringify(client.late_profile_ids || [])) {
        await db.from('clients').update({ late_profile_ids: accountIds, updated_at: new Date().toISOString() }).eq('id', client.id);
      }
      return res.status(200).json({ profileId: client.zernio_profile_id, accounts });
    }

    const action = cleanText(req.body?.action, 30);
    if (action !== 'connect' && action !== 'ensure-profile') {
      return res.status(400).json({ error: 'Unknown social connection action.' });
    }
    const profileId = await ensureZernioProfile(db, client);
    if (action === 'ensure-profile') return res.status(200).json({ profileId });

    const platform = cleanText(req.body?.platform, 40).toLowerCase();
    if (!SUPPORTED_PLATFORMS.has(platform)) return res.status(400).json({ error: 'That social platform is not supported.' });

    const redirectUrl = new URL('/', requestOrigin(req));
    redirectUrl.searchParams.set('social_connected', '1');
    redirectUrl.searchParams.set('clientId', client.id);
    const params = new URLSearchParams({
      profileId,
      redirect_url: redirectUrl.toString(),
    });
    const connected = await zernioRequest<{ authUrl?: string }>(`/connect/${platform}?${params.toString()}`);
    if (!connected.authUrl) throw new Error('Zernio returned no connection link.');
    return res.status(200).json({ authUrl: connected.authUrl, profileId });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    const status = Number((error as Error & { status?: number }).status || 500);
    console.error('Social connection failed:', error);
    return res.status(status >= 400 && status < 500 ? status : 500).json({
      error: error instanceof Error ? error.message : 'The social account connection could not be started.',
    });
  }
}

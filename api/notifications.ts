import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePortalRequest, cleanText } from '../server/portal.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = cleanText(req.method === 'GET' ? req.query.clientId : req.body?.clientId, 80);
  if (!clientId) return res.status(400).json({ error: 'Client is required.' });
  try {
    const { db, isAgency } = await authenticatePortalRequest(req, clientId);
    const audience = isAgency ? 'agency' : 'client';
    if (req.method === 'GET') {
      const { data, error } = await db.from('portal_notifications').select('*').eq('client_id', clientId).eq('audience', audience).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return res.status(200).json({ notifications: data || [] });
    }
    if (req.method === 'PATCH') {
      const id = cleanText(req.body?.id, 80);
      let query = db.from('portal_notifications').update({ read_at: new Date().toISOString() }).eq('client_id', clientId).eq('audience', audience);
      query = id ? query.eq('id', id) : query.is('read_at', null);
      const { error } = await query;
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    console.error('Notifications request failed:', error);
    return res.status(500).json({ error: 'Notifications are unavailable right now.' });
  }
}

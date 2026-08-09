import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export type PortalClient = {
  id: string;
  name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  owner_user_id?: string | null;
  pin?: string | null;
};

// Portal email alerts are hard-disabled. In-platform notifications and
// automation continue to work without sending email.
export function isPortalEmailNotificationsEnabled() {
  return false;
}

export function portalDb(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Portal database is not configured.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function authenticatePortalRequest(req: VercelRequest, clientId: string) {
  const db = portalDb();
  const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
  const pinHeader = Array.isArray(req.headers['x-portal-pin']) ? req.headers['x-portal-pin'][0] : req.headers['x-portal-pin'];
  const pin = String(req.body?.pin || pinHeader || '');
  const [{ data: authData }, { data: client }, { data: master }] = await Promise.all([
    bearer ? db.auth.getUser(bearer) : Promise.resolve({ data: { user: null } } as any),
    db.from('clients').select('id, name, contact_name, contact_email, owner_user_id, pin').eq('id', clientId).maybeSingle(),
    db.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle(),
  ]);
  const owner = Boolean(authData.user && client?.owner_user_id === authData.user.id);
  const masterUser = Boolean(pin && master?.pin === pin);
  if (!client || (!owner && !masterUser && client.pin !== pin)) throw new Error('UNAUTHORISED');
  return { db, client: client as PortalClient, isAgency: masterUser };
}

export async function sendPortalEmail(input: { to: string[]; subject: string; text: string }) {
  if (!isPortalEmailNotificationsEnabled() || !process.env.RESEND_API_KEY || !input.to.length) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Seam Media Portal <notifications@seammedia.com.au>', ...input }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
}

export function cleanText(value: unknown, max: number) {
  return String(value || '').trim().slice(0, max);
}

export async function kickPortalAutomation() {
  const hostname = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (!hostname || !process.env.CRON_SECRET) return;
  const response = await fetch(`https://${hostname}/api/automation-worker`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  if (!response.ok) throw new Error(`Automation worker returned ${response.status}.`);
}

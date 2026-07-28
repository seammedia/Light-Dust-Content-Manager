import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import revenueSyncHandler from '../server/revenueSync.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.mode === 'revenue-sync') {
    return revenueSyncHandler(req, res);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { clientId, pin } = req.body || {};
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey || !stripeKey) return res.status(500).json({ error: 'Online billing is not configured yet.' });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: client } = await supabase.from('clients').select('id, pin, stripe_customer_id').eq('id', clientId).maybeSingle();
  const { data: master } = await supabase.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle();
  if (!client || (client.pin !== pin && master?.pin !== pin)) return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  if (!client.stripe_customer_id) return res.status(400).json({ error: 'This account is not linked to online billing yet.' });

  const returnUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/`;
  const body = new URLSearchParams({ customer: client.stripe_customer_id, return_url: returnUrl });
  const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const session = await stripeResponse.json();
  if (!stripeResponse.ok || !session.url) return res.status(502).json({ error: session.error?.message || 'Stripe billing is unavailable.' });
  return res.status(200).json({ url: session.url });
}

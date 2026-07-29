import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import revenueSyncHandler from '../server/revenueSync.js';
import {
  findAuthUserByEmail,
  findPaidSocialSubscription,
  provisionPaidSocialClient,
} from '../server/socialProvisioning.js';

async function onboardingRecoveryHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Portal recovery is not configured.' });

  const db = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    const cronAuthorised = Boolean(process.env.CRON_SECRET && bearer === process.env.CRON_SECRET);
    if (bearer && !cronAuthorised) {
      const { data, error } = await db.auth.getUser(bearer);
      if (error || !data.user) return res.status(401).json({ error: 'Please sign in again.' });
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(200).json({ recovered: false, reason: 'RECOVERY_UNAVAILABLE' });
      }
      const result = await provisionPaidSocialClient(db, data.user);
      return res.status(200).json(result);
    }

    const pin = String(req.body?.pin || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    const inviteIfMissing = req.body?.inviteIfMissing === true;
    const { data: master } = await db.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle();
    if (!cronAuthorised && (!pin || pin !== master?.pin)) return res.status(401).json({ error: 'Agency access is required.' });
    if (!email) return res.status(400).json({ error: 'A customer email is required.' });
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe recovery is not configured.' });

    const paidSubscription = await findPaidSocialSubscription(email);
    if (!paidSubscription) return res.status(404).json({ error: 'No active paid Seam Media social subscription was found for that email.' });

    let user = await findAuthUserByEmail(db, email);
    let invited = false;
    if (!user && inviteIfMissing) {
      const origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers.host || 'seam-media-content-manager.vercel.app'}`;
      const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/callback`,
        data: { full_name: paidSubscription.customer.name || '' },
      });
      if (error || !data.user) throw error || new Error('The portal invitation could not be created.');
      user = data.user;
      invited = true;
    }
    if (!user) {
      return res.status(409).json({
        error: 'The payment is confirmed, but this customer has not created a portal account.',
        code: 'AUTH_USER_NOT_FOUND',
      });
    }

    const result = await provisionPaidSocialClient(db, user, paidSubscription);
    return res.status(200).json({ ...result, invited });
  } catch (error) {
    console.error('Onboarding recovery failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'The client portal could not be recovered.' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.mode === 'revenue-sync') {
    return revenueSyncHandler(req, res);
  }
  if (req.query.mode === 'onboarding-recovery') {
    return onboardingRecoveryHandler(req, res);
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

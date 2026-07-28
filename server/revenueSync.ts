import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cleanText, portalDb } from './portal.js';

type StripeInvoice = {
  id: string;
  amount_paid?: number;
  currency?: string;
  created?: number;
  status_transitions?: { paid_at?: number | null };
  post_payment_credit_notes_amount?: number;
  subscription?: string | null;
};

type StripeSubscription = {
  id: string;
  status?: string;
  canceled_at?: number | null;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
};

async function stripeRequest<T>(path: string, params?: URLSearchParams): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured.');
  const response = await fetch(`https://api.stripe.com/v1${path}${params ? `?${params.toString()}` : ''}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Stripe returned ${response.status}.`);
  return data as T;
}

async function listPaidInvoices(customerId: string): Promise<StripeInvoice[]> {
  const invoices: StripeInvoice[] = [];
  let startingAfter = '';

  for (let page = 0; page < 10; page += 1) {
    const params = new URLSearchParams({ customer: customerId, status: 'paid', limit: '100' });
    if (startingAfter) params.set('starting_after', startingAfter);
    const result = await stripeRequest<{ data?: StripeInvoice[]; has_more?: boolean }>('/invoices', params);
    const pageInvoices = result.data || [];
    invoices.push(...pageInvoices);
    if (!result.has_more || !pageInvoices.length) break;
    startingAfter = pageInvoices[pageInvoices.length - 1].id;
  }

  return invoices;
}

async function authorise(req: VercelRequest) {
  const db = portalDb();
  const authHeader = String(req.headers.authorization || '');
  const cronAuthorised = Boolean(
    req.method === 'GET'
    && process.env.CRON_SECRET
    && authHeader === `Bearer ${process.env.CRON_SECRET}`,
  );
  if (cronAuthorised) return db;

  const pinHeader = Array.isArray(req.headers['x-portal-pin']) ? req.headers['x-portal-pin'][0] : req.headers['x-portal-pin'];
  const suppliedPin = cleanText(req.body?.pin || pinHeader, 30);
  const { data: master } = await db.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle();
  if (!suppliedPin || suppliedPin !== master?.pin) throw new Error('UNAUTHORISED');
  return db;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await authorise(req);
    const { data: clients, error: clientsError } = await db
      .from('clients')
      .select('id, name, stripe_customer_id, stripe_subscription_id, subscription_status, provisioning_status')
      .not('stripe_customer_id', 'is', null);
    if (clientsError) throw clientsError;

    const { data: leads, error: leadsError } = await db.from('agency_leads').select('id, client_id');
    if (leadsError) throw leadsError;
    const leadByClient = new Map((leads || []).filter((lead) => lead.client_id).map((lead) => [lead.client_id, lead.id]));

    let invoicesSynced = 0;
    let clientsUpdated = 0;

    for (const client of clients || []) {
      let terminalSubscription = false;
      const invoices = await listPaidInvoices(client.stripe_customer_id);
      if (invoices.length) {
        const revenueRows = invoices.map((invoice) => ({
          client_id: client.id,
          lead_id: leadByClient.get(client.id) || null,
          provider: 'stripe',
          provider_reference: invoice.id,
          revenue_type: 'invoice',
          amount: Math.max(0, Number(invoice.amount_paid || 0) - Number(invoice.post_payment_credit_notes_amount || 0)) / 100,
          currency: String(invoice.currency || 'aud').toLowerCase(),
          paid_at: new Date(Number(invoice.status_transitions?.paid_at || invoice.created || 0) * 1000).toISOString(),
          metadata: { subscription_id: invoice.subscription || client.stripe_subscription_id || null },
        }));
        const { error: revenueError } = await db
          .from('agency_client_revenue')
          .upsert(revenueRows, { onConflict: 'provider,provider_reference' });
        if (revenueError) throw revenueError;
        invoicesSynced += revenueRows.length;
      }

      if (client.stripe_subscription_id) {
        const subscription = await stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(client.stripe_subscription_id)}`);
        const terminal = subscription.status === 'canceled' || subscription.status === 'unpaid';
        terminalSubscription = terminal;
        const paused = subscription.status === 'paused';
        const clientUpdate: Record<string, unknown> = {
          subscription_status: subscription.status || client.subscription_status,
          updated_at: new Date().toISOString(),
        };
        if (terminal) {
          clientUpdate.provisioning_status = 'cancelled';
          clientUpdate.offboarded_at = new Date(Number(subscription.canceled_at || subscription.cancel_at || Math.floor(Date.now() / 1000)) * 1000).toISOString();
          clientUpdate.offboarding_reason = `Stripe subscription ${subscription.status}`;
          clientUpdate.auto_post_enabled = false;
        } else if (paused) {
          clientUpdate.provisioning_status = 'paused';
          clientUpdate.auto_post_enabled = false;
        }
        const { error: clientError } = await db.from('clients').update(clientUpdate).eq('id', client.id);
        if (clientError) throw clientError;
      }

      const { data: revenue, error: totalError } = await db
        .from('agency_client_revenue')
        .select('amount, paid_at')
        .eq('client_id', client.id)
        .order('paid_at', { ascending: true });
      if (totalError) throw totalError;
      const lifetimeValue = (revenue || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      const leadId = leadByClient.get(client.id);
      if (leadId) {
        const leadUpdate: Record<string, unknown> = {
          lifetime_value: lifetimeValue,
          updated_at: new Date().toISOString(),
        };
        if (revenue?.[0]?.paid_at) leadUpdate.sign_on_date = String(revenue[0].paid_at).slice(0, 10);
        if (terminalSubscription || client.provisioning_status === 'cancelled') {
          leadUpdate.exit_date = new Date().toISOString().slice(0, 10);
          leadUpdate.churn_reason = 'Stripe subscription cancelled';
        }
        const { error: leadError } = await db.from('agency_leads').update(leadUpdate).eq('id', leadId);
        if (leadError) throw leadError;
      }
      clientsUpdated += 1;
    }

    return res.status(200).json({ success: true, clientsUpdated, invoicesSynced });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Agency access is required.' });
    console.error('Revenue sync failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Revenue could not be synchronised.' });
  }
}

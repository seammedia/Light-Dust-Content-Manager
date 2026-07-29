import { randomUUID } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ensureZernioProfile } from './zernioProfiles.js';

type BillingCycle = 'monthly' | 'annual';

type SocialPackage = {
  plan: 'Basic' | 'Pro' | 'Max';
  billing: BillingCycle;
};

type StripeCustomer = {
  id: string;
  email?: string | null;
  name?: string | null;
  business_name?: string | null;
  individual_name?: string | null;
  created?: number;
};

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  created?: number;
  items?: {
    data?: Array<{
      price?: {
        unit_amount?: number | null;
        recurring?: { interval?: string | null } | null;
      } | null;
    }>;
  };
};

type StripeCheckoutSession = {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  status?: string | null;
  payment_status?: string | null;
  collected_information?: {
    business_name?: string | null;
    individual_name?: string | null;
  } | null;
  customer_details?: {
    business_name?: string | null;
    individual_name?: string | null;
  } | null;
};

type StripeList<T> = {
  data?: T[];
};

export type PaidSocialSubscription = {
  customer: StripeCustomer;
  subscription: StripeSubscription;
  checkoutSessionId: string | null;
  socialPackage: SocialPackage;
  businessName: string | null;
  contactName: string | null;
};

const SOCIAL_PACKAGE_BY_AMOUNT: Record<number, SocialPackage> = {
  19900: { plan: 'Basic', billing: 'monthly' },
  214800: { plan: 'Basic', billing: 'annual' },
  39900: { plan: 'Pro', billing: 'monthly' },
  430800: { plan: 'Pro', billing: 'annual' },
  59900: { plan: 'Max', billing: 'monthly' },
  646800: { plan: 'Max', billing: 'annual' },
};

const ELIGIBLE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function stripeRequest<T>(path: string, params?: URLSearchParams): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe recovery is not configured.');
  const query = params?.toString();
  const response = await fetch(`https://api.stripe.com/v1${path}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Stripe returned ${response.status}.`);
  return data as T;
}

function packageForSubscription(subscription: StripeSubscription): SocialPackage | null {
  const item = subscription.items?.data?.[0];
  const amount = Number(item?.price?.unit_amount);
  const socialPackage = SOCIAL_PACKAGE_BY_AMOUNT[amount];
  if (!socialPackage) return null;

  const expectedInterval = socialPackage.billing === 'annual' ? 'year' : 'month';
  const actualInterval = item?.price?.recurring?.interval;
  return !actualInterval || actualInterval === expectedInterval ? socialPackage : null;
}

async function activeSocialSubscription(customer: StripeCustomer): Promise<PaidSocialSubscription | null> {
  const subscriptions = await stripeRequest<StripeList<StripeSubscription>>(
    '/subscriptions',
    new URLSearchParams({ customer: customer.id, status: 'all', limit: '100' }),
  );

  const eligible = (subscriptions.data || [])
    .filter((subscription) => ELIGIBLE_SUBSCRIPTION_STATUSES.has(subscription.status))
    .map((subscription) => ({ subscription, socialPackage: packageForSubscription(subscription) }))
    .filter((candidate): candidate is { subscription: StripeSubscription; socialPackage: SocialPackage } => Boolean(candidate.socialPackage))
    .sort((a, b) => Number(b.subscription.created || 0) - Number(a.subscription.created || 0))[0];

  if (!eligible) return null;

  const sessions = await stripeRequest<StripeList<StripeCheckoutSession>>(
    '/checkout/sessions',
    new URLSearchParams({ customer: customer.id, limit: '100' }),
  );
  const checkoutSession = (sessions.data || []).find((session) => (
    session.subscription === eligible.subscription.id
    && session.status === 'complete'
    && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
  ));

  return {
    customer,
    subscription: eligible.subscription,
    checkoutSessionId: checkoutSession?.id || null,
    socialPackage: eligible.socialPackage,
    businessName: checkoutSession?.customer_details?.business_name?.trim()
      || checkoutSession?.collected_information?.business_name?.trim()
      || customer.business_name?.trim()
      || null,
    contactName: checkoutSession?.customer_details?.individual_name?.trim()
      || checkoutSession?.collected_information?.individual_name?.trim()
      || customer.individual_name?.trim()
      || null,
  };
}

export async function findPaidSocialSubscription(email: string): Promise<PaidSocialSubscription | null> {
  const normalisedEmail = email.trim().toLowerCase();
  if (!normalisedEmail) return null;

  const customers = await stripeRequest<StripeList<StripeCustomer>>(
    '/customers',
    new URLSearchParams({ email: normalisedEmail, limit: '100' }),
  );
  const exactCustomers = (customers.data || [])
    .filter((customer) => customer.email?.trim().toLowerCase() === normalisedEmail)
    .sort((a, b) => Number(b.created || 0) - Number(a.created || 0));

  for (const customer of exactCustomers) {
    const paidSubscription = await activeSocialSubscription(customer);
    if (paidSubscription) return paidSubscription;
  }
  return null;
}

async function linkAgencyLead(db: SupabaseClient, clientId: string, email: string) {
  const { data: lead, error } = await db
    .from('agency_leads')
    .select('id, client_id')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!lead || lead.client_id === clientId) return;
  if (lead.client_id) throw new Error('This converted lead is already linked to another client.');

  const { error: updateError } = await db
    .from('agency_leads')
    .update({ client_id: clientId, updated_at: new Date().toISOString() })
    .eq('id', lead.id);
  if (updateError) throw updateError;
}

export async function provisionPaidSocialClient(
  db: SupabaseClient,
  user: Pick<User, 'id' | 'email' | 'user_metadata'>,
  paidSubscription?: PaidSocialSubscription | null,
) {
  const email = user.email?.trim().toLowerCase();
  if (!email) throw new Error('Your account does not have an email address.');

  const verifiedPayment = paidSubscription === undefined
    ? await findPaidSocialSubscription(email)
    : paidSubscription;
  if (!verifiedPayment) return { recovered: false as const, reason: 'NO_PAID_SUBSCRIPTION' as const };

  const [{ data: ownerClient, error: ownerError }, { data: stripeClient, error: stripeError }] = await Promise.all([
    db.from('clients').select('*').eq('owner_user_id', user.id).maybeSingle(),
    db.from('clients').select('*').eq('stripe_customer_id', verifiedPayment.customer.id).maybeSingle(),
  ]);
  if (ownerError) throw ownerError;
  if (stripeError) throw stripeError;
  if (ownerClient && stripeClient && ownerClient.id !== stripeClient.id) {
    throw new Error('The payment and portal are already connected to different client records.');
  }

  const existing = ownerClient || stripeClient;
  const businessName = verifiedPayment.businessName?.trim();
  if (!businessName) throw new Error('A business name is required before this client can be provisioned.');

  const contactName = verifiedPayment.contactName?.trim()
    || String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
    || null;
  const now = new Date().toISOString();
  const paymentFields = {
    owner_user_id: user.id,
    stripe_customer_id: verifiedPayment.customer.id,
    stripe_subscription_id: verifiedPayment.subscription.id,
    subscription_status: verifiedPayment.subscription.status,
    plan_name: verifiedPayment.socialPackage.plan,
    billing_cycle: verifiedPayment.socialPackage.billing,
    updated_at: now,
    ...(verifiedPayment.checkoutSessionId
      ? { stripe_checkout_session_id: verifiedPayment.checkoutSessionId }
      : {}),
  };

  let client;
  if (existing) {
    const { data, error } = await db
      .from('clients')
      .update({
        ...paymentFields,
        name: businessName,
        brand_name: businessName,
        provisioning_status: existing.provisioning_status === 'active' ? 'active' : 'pending_intake',
        contact_email: existing.contact_email || email,
        contact_name: existing.contact_name || contactName,
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    client = data;
  } else {
    const { data, error } = await db
      .from('clients')
      .insert({
        ...paymentFields,
        pin: randomUUID(),
        name: businessName,
        brand_name: businessName,
        contact_name: contactName,
        contact_email: email,
        provisioning_status: 'pending_intake',
      })
      .select('*')
      .single();
    if (error) throw error;
    client = data;
  }

  await linkAgencyLead(db, client.id, email);
  await ensureZernioProfile(db, client);
  return { recovered: true as const, client };
}

export async function findAuthUserByEmail(db: SupabaseClient, email: string): Promise<User | null> {
  const normalisedEmail = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalisedEmail);
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  return null;
}

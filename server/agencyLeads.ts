import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cleanText, portalDb } from './portal.js';

const LOST_STAGES = new Set(['not_interested', 'no_response', 'not_qualified']);
const VALID_STAGES = new Set([
  'new', 'warm', 'contacted_1', 'contacted_2', 'called', 'call_booked',
  'interested', 'proposal_sent', 'on_hold', 'onboarding_sent', 'converted',
  'not_interested', 'no_response', 'not_qualified',
]);
const VALID_SOURCES = new Set(['meta_ads', 'google_ads', 'referral', 'website', 'instagram', 'facebook_organic', 'linkedin', 'email', 'existing_client', 'prospecting', 'networking', 'manual', 'other']);
const INACTIVE_CLIENT_NAMES = new Set([
  'Flagworks', 'Light Dust', 'Mabii Co', 'Efficient Finance', 'Phoenix Hospitality Group',
  'Mediterranean Blu Spritz', 'The Mastery Lab', 'Little Windmill Clothing Co', 'Lease of Mind',
  'Bark Hair', 'NSW Fishing League', 'Laud Recovery', 'Familia Fitness', 'Goochs Garage',
  'KHY Physio', 'Sandhurst Roofing',
]);
const PLAN_MONTHLY_VALUES: Record<string, number> = { basic: 199, pro: 399, max: 599 };
const VALID_HEALTH_CONFIDENCE = new Set(['low', 'medium', 'high']);
const VALID_ISSUE_SEVERITY = new Set(['none', 'watch', 'concern', 'critical']);
const VALID_PAYMENT_STATUS = new Set(['unknown', 'current', 'overdue']);
const VALID_ONBOARDING_STATUS = new Set(['not_started', 'in_progress', 'complete', 'blocked']);
const VALID_RENEWAL_SIGNAL = new Set(['unknown', 'positive', 'neutral', 'negative']);

function nullableText(value: unknown, max: number) {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

function nullableNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function nullableDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateOnly(value: unknown) {
  const cleaned = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null;
}

function melbourneToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function currentWeek(today: string) {
  const date = new Date(`${today}T00:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const start = shiftDate(today, -mondayOffset);
  return { start, end: shiftDate(start, 6) };
}

function daysSince(value: string | null | undefined, today: string) {
  if (!value) return null;
  const time = new Date(value).getTime();
  const todayTime = new Date(`${today}T00:00:00.000Z`).getTime();
  return Number.isNaN(time) ? null : Math.floor((todayTime - time) / 86_400_000);
}

function churnAssessment(input: {
  health: Record<string, any>;
  delivery: { total: number; outstanding: number };
  lastAnalyticsSent?: string | null;
  today: string;
  startDate?: string | null;
}) {
  const { health, delivery, lastAnalyticsSent, today, startDate } = input;
  const reasons: string[] = [];
  let score = Math.round((100 - Number(health.relationship_health || 70)) * 0.35);
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const issuePoints: Record<string, number> = { watch: 10, concern: 20, critical: 35 };
  if (issuePoints[health.issue_severity]) add(issuePoints[health.issue_severity], health.open_issue || `${health.issue_severity} client issue recorded`);
  if (health.payment_status === 'overdue') add(25, 'Payment is overdue');
  if (health.onboarding_status === 'blocked') add(20, 'Onboarding is blocked');
  else if (health.onboarding_status !== 'complete' && (daysSince(startDate, today) || 0) >= 7) add(10, 'Onboarding is still incomplete');
  if (health.renewal_signal === 'negative') add(20, 'Negative renewal signal recorded');
  if (health.scope_pressure) add(10, 'Scope or expectation pressure is present');
  if (health.performance_concern) add(10, 'Performance concern is present');

  const contactAge = daysSince(health.last_meaningful_contact, today);
  if (contactAge === null) add(5, 'No meaningful contact has been recorded');
  else if (contactAge > 30) add(20, `No meaningful contact for ${contactAge} days`);
  else if (contactAge > 14) add(10, `Last meaningful contact was ${contactAge} days ago`);

  if (health.next_action_due && health.next_action_due < today) add(10, 'Next action is overdue');
  if (delivery.outstanding > 0) add(15, `${delivery.outstanding} current-week delivery item${delivery.outstanding === 1 ? ' is' : 's are'} overdue`);
  else if (delivery.total === 0) add(5, 'No content is scheduled this week');

  const clientAge = daysSince(startDate, today);
  const reportAge = daysSince(lastAnalyticsSent, today);
  if ((clientAge || 0) > 35 && (reportAge === null || reportAge > 35)) add(5, 'No recent analytics update has been sent');
  const positiveAge = daysSince(health.positive_feedback_at, today);
  if (positiveAge !== null && positiveAge <= 30) {
    score -= 10;
    reasons.push('Recent positive feedback lowers the current risk');
  }

  score = Math.min(100, Math.max(0, score));
  const riskLevel = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'watch' : 'low';
  return { churn_risk: score, risk_level: riskLevel, risk_reasons: reasons };
}

function clientHealthPayload(input: Record<string, unknown>) {
  const enumValue = (value: unknown, valid: Set<string>, fallback: string) => valid.has(String(value)) ? String(value) : fallback;
  return {
    monthly_value: nullableNumber(input.monthly_value),
    start_date: dateOnly(input.start_date),
    relationship_health: Math.min(100, Math.max(0, Math.round(Number(input.relationship_health) || 0))),
    health_note: nullableText(input.health_note, 2000),
    confidence: enumValue(input.confidence, VALID_HEALTH_CONFIDENCE, 'low'),
    last_meaningful_contact: nullableDate(input.last_meaningful_contact),
    next_action: nullableText(input.next_action, 1000),
    next_action_due: dateOnly(input.next_action_due),
    open_issue: nullableText(input.open_issue, 3000),
    issue_severity: enumValue(input.issue_severity, VALID_ISSUE_SEVERITY, 'none'),
    payment_status: enumValue(input.payment_status, VALID_PAYMENT_STATUS, 'unknown'),
    onboarding_status: enumValue(input.onboarding_status, VALID_ONBOARDING_STATUS, 'not_started'),
    renewal_signal: enumValue(input.renewal_signal, VALID_RENEWAL_SIGNAL, 'unknown'),
    scope_pressure: Boolean(input.scope_pressure),
    performance_concern: Boolean(input.performance_concern),
    positive_feedback_at: nullableDate(input.positive_feedback_at),
    internal_notes: nullableText(input.internal_notes, 10_000),
    updated_at: new Date().toISOString(),
  };
}

async function authenticateAgency(req: VercelRequest) {
  const db = portalDb();
  const pinHeader = Array.isArray(req.headers['x-portal-pin']) ? req.headers['x-portal-pin'][0] : req.headers['x-portal-pin'];
  const suppliedPin = cleanText(req.body?.pin || pinHeader, 30);
  const { data: master, error } = await db.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle();
  if (error || !suppliedPin || suppliedPin !== master?.pin) throw new Error('UNAUTHORISED');
  return db;
}

function leadPayload(input: Record<string, unknown>, creating = false) {
  const payload: Record<string, unknown> = {};
  if (creating || input.name !== undefined) payload.name = cleanText(input.name, 160);
  if (creating || input.company !== undefined) payload.company = cleanText(input.company, 200);
  if (input.email !== undefined) payload.email = nullableText(input.email, 320)?.toLowerCase();
  if (input.phone !== undefined) payload.phone = nullableText(input.phone, 80);
  if (input.stage !== undefined && VALID_STAGES.has(String(input.stage))) {
    payload.stage = input.stage;
    payload.archived = LOST_STAGES.has(String(input.stage));
    if (input.stage === 'converted') payload.converted_at = nullableDate(input.converted_at) || new Date().toISOString();
  }
  if (input.source !== undefined) payload.source = VALID_SOURCES.has(String(input.source)) ? input.source : 'other';
  if (input.conversion_source !== undefined) {
    payload.conversion_source = input.conversion_source && VALID_SOURCES.has(String(input.conversion_source))
      ? input.conversion_source
      : null;
  }
  if (input.source_platform !== undefined) payload.source_platform = nullableText(input.source_platform, 100);
  if (input.source_campaign !== undefined) payload.source_campaign = nullableText(input.source_campaign, 300);
  if (input.owner !== undefined) payload.owner = cleanText(input.owner, 120) || 'Heath';
  if (input.conversion_probability !== undefined) payload.conversion_probability = Math.min(100, Math.max(0, Number(input.conversion_probability) || 0));
  if (input.monthly_value !== undefined) payload.monthly_value = nullableNumber(input.monthly_value);
  if (input.lifetime_value !== undefined) payload.lifetime_value = nullableNumber(input.lifetime_value);
  if (input.churn_reason !== undefined) payload.churn_reason = nullableText(input.churn_reason, 1000);
  if (input.notes !== undefined) payload.notes = nullableText(input.notes, 10_000);
  if (input.next_action !== undefined) payload.next_action = nullableText(input.next_action, 500);
  if (input.last_contacted !== undefined) payload.last_contacted = nullableDate(input.last_contacted);
  if (input.follow_up_at !== undefined) payload.follow_up_at = nullableDate(input.follow_up_at);
  if (input.sign_on_date !== undefined) payload.sign_on_date = dateOnly(input.sign_on_date);
  if (input.exit_date !== undefined) payload.exit_date = dateOnly(input.exit_date);
  if (input.archived !== undefined && input.stage === undefined) payload.archived = Boolean(input.archived);
  payload.updated_at = new Date().toISOString();
  return payload;
}

export async function agencyLeadsHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await authenticateAgency(req);

    if (req.method === 'GET') {
      const today = melbourneToday();
      const week = currentWeek(today);
      const [
        { data: leads, error: leadsError },
        { data: periods, error: periodsError },
        { data: clients, error: clientsError },
        { data: clientHealth, error: clientHealthError },
        { data: posts, error: postsError },
        { data: reportRuns, error: reportRunsError },
      ] = await Promise.all([
        db.from('agency_leads').select('*, client:clients(id, name, provisioning_status, subscription_status, offboarded_at, offboarding_reason)').order('created_at', { ascending: false }).limit(3000),
        db.from('agency_marketing_periods').select('*').order('period_end', { ascending: false }).limit(120),
        db.from('clients').select('id,name,brand_name,contact_name,plan_name,provisioning_status,subscription_status,created_at,onboarding_completed_at').neq('name', 'Seam Media').order('name'),
        db.from('agency_client_health').select('*'),
        db.from('posts').select('client_id,date,status').gte('date', week.start).lte('date', week.end),
        db.from('client_analytics_report_runs').select('client_id,sent_at').eq('status', 'sent').order('sent_at', { ascending: false }).limit(1000),
      ]);
      if (leadsError) throw leadsError;
      if (periodsError) throw periodsError;
      if (clientsError) throw clientsError;
      if (clientHealthError) throw clientHealthError;
      if (postsError) throw postsError;
      if (reportRunsError) throw reportRunsError;

      const healthByClient = new Map((clientHealth || []).map((health) => [health.client_id, health]));
      const leadByClient = new Map((leads || []).filter((lead) => lead.client_id).map((lead) => [lead.client_id, lead]));
      const reportsByClient = new Map<string, string>();
      for (const run of reportRuns || []) if (run.sent_at && !reportsByClient.has(run.client_id)) reportsByClient.set(run.client_id, run.sent_at);
      const postsByClient = new Map<string, Array<{ date: string; status: string }>>();
      for (const post of posts || []) {
        const clientPosts = postsByClient.get(post.client_id) || [];
        clientPosts.push(post);
        postsByClient.set(post.client_id, clientPosts);
      }

      const currentClients = (clients || [])
        .filter((client) => (
          client.provisioning_status !== 'cancelled'
          && !INACTIVE_CLIENT_NAMES.has(client.name)
          && Boolean(PLAN_MONTHLY_VALUES[String(client.plan_name || '').toLowerCase()])
        ))
        .map((client) => {
          const health = healthByClient.get(client.id) || {};
          const convertedLead = leadByClient.get(client.id);
          const planValue = PLAN_MONTHLY_VALUES[String(client.plan_name || '').toLowerCase()];
          const monthlyValue = health.monthly_value ?? convertedLead?.monthly_value ?? planValue ?? null;
          const monthlyValueSource = health.monthly_value !== null && health.monthly_value !== undefined
            ? 'health'
            : convertedLead?.monthly_value
              ? 'lead'
              : planValue
                ? 'plan'
                : 'missing';
          const startDate = health.start_date || convertedLead?.sign_on_date || client.created_at?.slice(0, 10) || null;
          const clientAge = daysSince(startDate, today) || 0;
          const onboardingStatus = health.onboarding_status || (
            client.provisioning_status === 'pending_intake'
              ? 'in_progress'
              : client.onboarding_completed_at || clientAge > 30
                ? 'complete'
                : 'in_progress'
          );
          const clientPosts = postsByClient.get(client.id) || [];
          const delivery = {
            total: clientPosts.length,
            posted: clientPosts.filter((post) => post.status === 'Posted').length,
            outstanding: clientPosts.filter((post) => post.date < today && post.status !== 'Posted').length,
            awaiting: clientPosts.filter((post) => ['For Approval', 'Revision'].includes(post.status)).length,
            in_progress: clientPosts.filter((post) => ['Client Idea', 'Draft', 'Generated', 'Approved'].includes(post.status)).length,
          };
          const normalisedHealth = {
            relationship_health: health.relationship_health ?? 70,
            health_note: health.health_note ?? null,
            confidence: health.confidence || 'low',
            last_meaningful_contact: health.last_meaningful_contact ?? null,
            next_action: health.next_action ?? null,
            next_action_due: health.next_action_due ?? null,
            open_issue: health.open_issue ?? null,
            issue_severity: health.issue_severity || 'none',
            payment_status: health.payment_status || 'unknown',
            onboarding_status: onboardingStatus,
            renewal_signal: health.renewal_signal || 'unknown',
            scope_pressure: Boolean(health.scope_pressure),
            performance_concern: Boolean(health.performance_concern),
            positive_feedback_at: health.positive_feedback_at ?? null,
            internal_notes: health.internal_notes ?? null,
          };
          const lastAnalyticsSent = reportsByClient.get(client.id) || null;
          return {
            id: client.id,
            name: client.brand_name || client.name,
            contact_name: client.contact_name,
            plan_name: client.plan_name,
            provisioning_status: client.provisioning_status,
            subscription_status: client.subscription_status,
            monthly_value: monthlyValue,
            monthly_value_source: monthlyValueSource,
            start_date: startDate,
            ...normalisedHealth,
            delivery,
            analytics: { last_sent_at: lastAnalyticsSent },
            ...churnAssessment({ health: normalisedHealth, delivery, lastAnalyticsSent, today, startDate }),
            updated_at: health.updated_at || null,
          };
        });

      return res.status(200).json({ leads: leads || [], periods: periods || [], currentClients });
    }

    const action = cleanText(req.body?.action, 50);

    if (action === 'saveClientHealth') {
      const input = (req.body?.client || {}) as Record<string, unknown>;
      const clientId = cleanText(input.id, 80);
      if (!clientId) return res.status(400).json({ error: 'A current client is required.' });
      const { data: client, error: clientError } = await db
        .from('clients')
        .select('id,name,provisioning_status')
        .eq('id', clientId)
        .maybeSingle();
      if (clientError) throw clientError;
      if (!client || client.provisioning_status === 'cancelled' || INACTIVE_CLIENT_NAMES.has(client.name)) {
        return res.status(404).json({ error: 'That current client could not be found.' });
      }
      const payload = { client_id: clientId, ...clientHealthPayload(input) };
      const { data: clientHealth, error } = await db
        .from('agency_client_health')
        .upsert(payload, { onConflict: 'client_id' })
        .select('*')
        .single();
      if (error) throw error;
      return res.status(200).json({ clientHealth });
    }

    if (action === 'createLead') {
      const input = (req.body?.lead || {}) as Record<string, unknown>;
      const payload = leadPayload(input, true);
      if (!payload.name) return res.status(400).json({ error: 'A lead name is required.' });
      if (payload.stage === 'converted' && !payload.conversion_source) payload.conversion_source = payload.source || 'other';
      const { data: lead, error } = await db.from('agency_leads').insert(payload).select('*').single();
      if (error) throw error;
      await db.from('agency_lead_activities').insert({ lead_id: lead.id, activity_type: 'created', description: 'Lead added to the agency pipeline.' });
      return res.status(200).json({ lead });
    }

    if (action === 'updateLead') {
      const input = (req.body?.lead || {}) as Record<string, unknown>;
      const id = cleanText(input.id, 80);
      if (!id) return res.status(400).json({ error: 'Lead is required.' });
      const { data: existing, error: existingError } = await db.from('agency_leads').select('id, client_id, stage, source, conversion_source, last_contacted, monthly_value, lifetime_value').eq('id', id).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return res.status(404).json({ error: 'That lead could not be found.' });
      const payload = leadPayload(input);
      const requestedClientStatus = cleanText(input.client_status, 20);
      if (existing.client_id && ['active', 'paused', 'cancelled'].includes(requestedClientStatus)) {
        if (requestedClientStatus === 'cancelled') {
          payload.exit_date = dateOnly(input.exit_date) || new Date().toISOString().slice(0, 10);
          payload.churn_reason = nullableText(input.churn_reason, 1000) || 'Client offboarded';
        } else if (requestedClientStatus === 'active') {
          payload.exit_date = null;
          payload.churn_reason = null;
        }
      }
      if (payload.stage === 'converted' && !payload.conversion_source) {
        payload.conversion_source = existing.conversion_source || payload.source || existing.source || 'other';
      }
      const { data: lead, error } = await db.from('agency_leads').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

      if (existing.client_id && ['active', 'paused', 'cancelled'].includes(requestedClientStatus)) {
        const clientUpdate: Record<string, unknown> = {
          provisioning_status: requestedClientStatus,
          updated_at: new Date().toISOString(),
        };
        if (requestedClientStatus === 'active') {
          clientUpdate.offboarded_at = null;
          clientUpdate.offboarding_reason = null;
        } else {
          clientUpdate.auto_post_enabled = false;
          clientUpdate.offboarded_at = requestedClientStatus === 'cancelled'
            ? new Date(`${String(payload.exit_date)}T00:00:00.000Z`).toISOString()
            : null;
          clientUpdate.offboarding_reason = payload.churn_reason || (requestedClientStatus === 'paused' ? 'Client paused' : 'Client offboarded');
        }
        const { error: clientUpdateError } = await db.from('clients').update(clientUpdate).eq('id', existing.client_id);
        if (clientUpdateError) throw clientUpdateError;
      }

      const activities: Array<Record<string, unknown>> = [];
      if (payload.stage && payload.stage !== existing.stage) activities.push({ lead_id: id, activity_type: 'stage_change', description: `Stage changed from ${existing.stage} to ${payload.stage}.`, metadata: { from: existing.stage, to: payload.stage } });
      if (payload.last_contacted && payload.last_contacted !== existing.last_contacted) activities.push({ lead_id: id, activity_type: 'contact', description: 'Lead marked as contacted.', metadata: { contacted_at: payload.last_contacted } });
      if ((payload.monthly_value !== undefined && payload.monthly_value !== existing.monthly_value) || (payload.lifetime_value !== undefined && payload.lifetime_value !== existing.lifetime_value)) activities.push({ lead_id: id, activity_type: 'value_change', description: 'Lead value updated.' });
      if (payload.conversion_source !== undefined && payload.conversion_source !== existing.conversion_source) activities.push({ lead_id: id, activity_type: 'note', description: 'Conversion attribution source updated.', metadata: { from: existing.conversion_source, to: payload.conversion_source } });
      if (existing.client_id && ['active', 'paused', 'cancelled'].includes(requestedClientStatus)) activities.push({ lead_id: id, activity_type: 'note', description: `Client lifecycle status set to ${requestedClientStatus}.`, metadata: { client_status: requestedClientStatus } });
      if (activities.length) await db.from('agency_lead_activities').insert(activities);
      return res.status(200).json({ lead });
    }

    if (action === 'saveMarketingPeriod') {
      const input = (req.body?.period || {}) as Record<string, unknown>;
      const periodStart = dateOnly(input.period_start);
      const periodEnd = dateOnly(input.period_end);
      if (!periodStart || !periodEnd || periodEnd < periodStart) return res.status(400).json({ error: 'Please provide a valid reporting period.' });
      const payload = {
        period_start: periodStart,
        period_end: periodEnd,
        source: VALID_SOURCES.has(String(input.source)) ? input.source : 'meta_ads',
        source_platform: nullableText(input.source_platform, 100),
        source_campaign: nullableText(input.source_campaign, 300),
        spend: nullableNumber(input.spend) || 0,
        impressions: Math.max(0, Math.round(Number(input.impressions) || 0)),
        clicks: Math.max(0, Math.round(Number(input.clicks) || 0)),
        leads: Math.max(0, Math.round(Number(input.leads) || 0)),
        conversions: Math.max(0, Math.round(Number(input.conversions) || 0)),
        conversion_revenue: nullableNumber(input.conversion_revenue) || 0,
        lifetime_revenue: nullableNumber(input.lifetime_revenue) || 0,
        notes: nullableText(input.notes, 2000),
        is_estimate: Boolean(input.is_estimate),
        updated_at: new Date().toISOString(),
      };
      let id = cleanText(input.id, 80);
      let periodPayload = payload;

      // "Add ad stats" represents the totals for a source and reporting window.
      // If that row already exists, replace its ad totals instead of creating a
      // duplicate. Keep confirmed conversion attribution/revenue when the add
      // form did not provide those values.
      if (!id) {
        const { data: existingPeriod, error: existingPeriodError } = await db
          .from('agency_marketing_periods')
          .select('*')
          .eq('period_start', periodStart)
          .eq('period_end', periodEnd)
          .eq('source', payload.source)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (existingPeriodError) throw existingPeriodError;

        if (existingPeriod) {
          id = existingPeriod.id;
          periodPayload = {
            ...payload,
            source_platform: payload.source_platform || existingPeriod.source_platform,
            source_campaign: payload.source_campaign || existingPeriod.source_campaign,
            conversion_revenue: payload.conversion_revenue || Number(existingPeriod.conversion_revenue || 0),
            lifetime_revenue: payload.lifetime_revenue || Number(existingPeriod.lifetime_revenue || 0),
            notes: payload.notes || existingPeriod.notes,
          };
        }
      }

      const query = id
        ? db.from('agency_marketing_periods').update(periodPayload).eq('id', id)
        : db.from('agency_marketing_periods').insert(periodPayload);
      const { data: period, error } = await query.select('*').single();
      if (error) throw error;
      return res.status(200).json({ period });
    }

    return res.status(400).json({ error: 'Unknown lead management action.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Agency access is required.' });
    console.error('Agency lead management failed:', error);
    return res.status(500).json({ error: 'Lead management could not be updated. Please try again.' });
  }
}

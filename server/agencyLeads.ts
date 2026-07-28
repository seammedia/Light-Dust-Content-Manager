import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cleanText, portalDb } from './portal.js';

const LOST_STAGES = new Set(['not_interested', 'no_response', 'not_qualified']);
const VALID_STAGES = new Set([
  'new', 'warm', 'contacted_1', 'contacted_2', 'called', 'call_booked',
  'interested', 'proposal_sent', 'on_hold', 'onboarding_sent', 'converted',
  'not_interested', 'no_response', 'not_qualified',
]);
const VALID_SOURCES = new Set(['meta_ads', 'google_ads', 'referral', 'website', 'instagram', 'facebook_organic', 'linkedin', 'email', 'existing_client', 'prospecting', 'networking', 'manual', 'other']);

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
      const [{ data: leads, error: leadsError }, { data: periods, error: periodsError }] = await Promise.all([
        db.from('agency_leads').select('*, client:clients(id, name, provisioning_status, subscription_status, offboarded_at, offboarding_reason)').order('created_at', { ascending: false }).limit(3000),
        db.from('agency_marketing_periods').select('*').order('period_end', { ascending: false }).limit(120),
      ]);
      if (leadsError) throw leadsError;
      if (periodsError) throw periodsError;
      return res.status(200).json({ leads: leads || [], periods: periods || [] });
    }

    const action = cleanText(req.body?.action, 50);

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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { portalDb } from '../server/portal.js';
import { REPORTS_GLOBAL_ENABLED, REPORT_TIMEZONE } from '../server/clientAnalyticsReports.js';

function header(req: VercelRequest, name: string) {
  const value = req.headers[name];
  return String(Array.isArray(value) ? value[0] : value || '');
}

async function requireAgency(req: VercelRequest) {
  const db = portalDb();
  const pin = header(req, 'x-portal-pin');
  const { data: master } = await db.from('clients').select('pin').eq('name', 'Seam Media').maybeSingle();
  if (!pin || !master?.pin || pin !== master.pin) throw new Error('UNAUTHORISED');
  return db;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

type ReportClient = {
  name?: string | null;
  plan_name?: string | null;
  provisioning_status?: string | null;
  subscription_status?: string | null;
  zernio_profile_id?: string | null;
  late_profile_ids?: unknown[] | null;
};

function isEligibleSocialClient(client: ReportClient) {
  if (client.name === 'Seam Media') return false;
  if (['paused', 'cancelled'].includes(String(client.provisioning_status || '').toLowerCase())) return false;
  if (['cancelled', 'unpaid', 'incomplete_expired'].includes(String(client.subscription_status || '').toLowerCase())) return false;
  return Boolean(client.plan_name || client.zernio_profile_id || client.late_profile_ids?.length);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'PUT'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await requireAgency(req);

    if (req.method === 'GET') {
      const [
        { data: clients, error: clientsError },
        { data: settings, error: settingsError },
        { data: runs, error: runsError },
      ] = await Promise.all([
        db.from('clients')
          .select('id,name,brand_name,contact_name,contact_email,plan_name,provisioning_status,subscription_status,zernio_profile_id,late_profile_ids')
          .order('name'),
        db.from('client_analytics_report_settings').select('*'),
        db.from('client_analytics_report_runs')
          .select('id,client_id,period_start,period_end,status,transport,recipient_email,subject,generated_at,sent_at,error')
          .order('generated_at', { ascending: false })
          .limit(100),
      ]);
      if (clientsError) throw clientsError;
      if (settingsError) throw settingsError;
      if (runsError) throw runsError;
      const settingsByClient = new Map((settings || []).map((item) => [item.client_id, item]));
      const eligibleClients = (clients || [])
        .filter(isEligibleSocialClient)
        .map((client) => ({
          ...client,
          reportSettings: settingsByClient.get(client.id) || {
            client_id: client.id,
            enabled: false,
            recipient_email: client.contact_email || '',
            recipient_name: client.contact_name || '',
            timezone: REPORT_TIMEZONE,
            send_weekday: 1,
            send_time: '09:00',
            lookback_days: 30,
            transport: 'resend',
          },
        }));
      return res.status(200).json({
        globalEnabled: REPORTS_GLOBAL_ENABLED,
        timezone: REPORT_TIMEZONE,
        recommendedTransport: 'resend',
        readiness: {
          schedulerSecretConfigured: Boolean(process.env.CRON_SECRET),
          resendConfigured: Boolean(process.env.RESEND_API_KEY),
          zernioConfigured: Boolean(process.env.ZERNIO_API_KEY),
          legacyZernioFallbackConfigured: Boolean(!process.env.ZERNIO_API_KEY && process.env.VITE_LATE_API_KEY),
        },
        runs: runs || [],
        clients: eligibleClients,
      });
    }

    const clientId = String(req.body?.clientId || '').trim();
    const recipientEmail = String(req.body?.recipientEmail || '').trim();
    const recipientName = String(req.body?.recipientName || '').trim();
    const sendTime = String(req.body?.sendTime || '09:00').slice(0, 5);
    const enabled = req.body?.enabled === true;
    if (!clientId) return res.status(400).json({ error: 'Client is required.' });
    if (enabled && !validEmail(recipientEmail)) return res.status(400).json({ error: 'A valid recipient email is required before opting in.' });
    if (!validTime(sendTime)) return res.status(400).json({ error: 'Send time must use 24-hour HH:MM format.' });

    const { data: client } = await db
      .from('clients')
      .select('id,name,plan_name,provisioning_status,subscription_status,zernio_profile_id,late_profile_ids')
      .eq('id', clientId)
      .maybeSingle();
    if (!client || !isEligibleSocialClient(client)) {
      return res.status(400).json({ error: 'This client is not eligible for analytics reports.' });
    }
    if (enabled && (!client.zernio_profile_id || !client.late_profile_ids?.length)) {
      return res.status(400).json({ error: 'A Zernio profile and at least one connected social account are required before opting in.' });
    }

    const payload = {
      client_id: clientId,
      enabled,
      recipient_email: recipientEmail || null,
      recipient_name: recipientName || null,
      timezone: REPORT_TIMEZONE,
      send_weekday: 1,
      send_time: sendTime,
      lookback_days: 30,
      transport: 'resend',
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from('client_analytics_report_settings')
      .upsert(payload, { onConflict: 'client_id' })
      .select('*')
      .single();
    if (error) throw error;
    return res.status(200).json({
      settings: data,
      globalEnabled: REPORTS_GLOBAL_ENABLED,
      deliveryStatus: REPORTS_GLOBAL_ENABLED && enabled ? 'configured' : 'disabled',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Unauthorised' });
    console.error('Client analytics report settings failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Settings could not be loaded.' });
  }
}

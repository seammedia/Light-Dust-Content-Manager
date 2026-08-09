import type { VercelRequest, VercelResponse } from '@vercel/node';
import { portalDb } from '../server/portal.js';
import {
  buildClientAnalyticsEmail,
  MockAnalyticsProvider,
  ZernioAnalyticsProvider,
} from '../server/clientAnalyticsReports.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const db = await requireAgency(req);
    const clientId = String(req.body?.clientId || '').trim();
    const useMockData = req.body?.useMockData === true;
    if (!clientId) return res.status(400).json({ error: 'Client is required.' });

    const [{ data: client }, { data: settings }] = await Promise.all([
      db.from('clients')
        .select('id,name,brand_name,contact_name,contact_email,provisioning_status,zernio_profile_id,late_profile_ids')
        .eq('id', clientId)
        .maybeSingle(),
      db.from('client_analytics_report_settings').select('*').eq('client_id', clientId).maybeSingle(),
    ]);
    if (!client || client.name === 'Seam Media' || ['paused', 'cancelled'].includes(String(client.provisioning_status || '').toLowerCase())) {
      return res.status(404).json({ error: 'Eligible client not found.' });
    }
    if (!useMockData && (!client.zernio_profile_id || !client.late_profile_ids?.length)) {
      return res.status(400).json({ error: 'Connect the client Zernio profile and social accounts before previewing available data.' });
    }

    const provider = useMockData
      ? new MockAnalyticsProvider()
      : new ZernioAnalyticsProvider(client.zernio_profile_id);
    const report = await provider.getReport({
      clientId: client.id,
      clientName: client.brand_name || client.name,
      recipientName: settings?.recipient_name || client.contact_name || client.name,
      lookbackDays: 30,
      includeDaily: true,
      includeTopPosts: true,
    });
    const email = buildClientAnalyticsEmail(report);

    if (settings) {
      await db.from('client_analytics_report_settings')
        .update({ last_previewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('client_id', clientId);
    }

    return res.status(200).json({
      mode: 'preview',
      sent: false,
      recipientEmail: settings?.recipient_email || client.contact_email || '',
      report,
      email,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Unauthorised' });
    console.error('Client analytics report preview failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Preview could not be generated.' });
  }
}

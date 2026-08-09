import type { VercelRequest, VercelResponse } from '@vercel/node';
import { portalDb } from '../server/portal.js';
import {
  buildClientAnalyticsEmail,
  isDueInMelbourne,
  REPORTS_GLOBAL_ENABLED,
  reportingPeriods,
  ResendEmailTransport,
  ZernioAnalyticsProvider,
} from '../server/clientAnalyticsReports.js';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });
  const auth = String(req.headers.authorization || '');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  if (!REPORTS_GLOBAL_ENABLED) {
    return res.status(200).json({
      enabled: false,
      processed: 0,
      sent: 0,
      message: 'Client analytics email delivery is disabled. No reports were generated or sent.',
    });
  }

  const db = portalDb();
  const now = new Date();
  const transport = new ResendEmailTransport();
  const { data: settings, error: settingsError } = await db
    .from('client_analytics_report_settings')
    .select('*,clients!inner(id,name,brand_name,contact_name,contact_email,provisioning_status,subscription_status,zernio_profile_id,late_profile_ids)')
    .eq('enabled', true);
  if (settingsError) return res.status(500).json({ error: settingsError.message });

  const results: Array<{ clientId: string; status: string; detail?: string }> = [];
  for (const setting of settings || []) {
    const client = setting.clients;
    const inactiveProvisioning = ['paused', 'cancelled'].includes(String(client?.provisioning_status || '').toLowerCase());
    const inactiveSubscription = ['cancelled', 'unpaid', 'incomplete_expired'].includes(String(client?.subscription_status || '').toLowerCase());
    if (!client || inactiveProvisioning || inactiveSubscription) {
      results.push({ clientId: setting.client_id, status: 'skipped', detail: 'Client is inactive, unpaid or unavailable.' });
      continue;
    }
    if (!client.zernio_profile_id || !client.late_profile_ids?.length) {
      results.push({ clientId: setting.client_id, status: 'skipped', detail: 'Zernio profile or connected social account mapping is missing.' });
      continue;
    }
    if (!isDueInMelbourne(now, setting.send_weekday, String(setting.send_time))) continue;
    if (!setting.recipient_email) {
      results.push({ clientId: setting.client_id, status: 'skipped', detail: 'Recipient email is missing.' });
      continue;
    }

    const periods = reportingPeriods({ now, lookbackDays: setting.lookback_days });
    const provider = new ZernioAnalyticsProvider(client.zernio_profile_id);
    const report = await provider.getReport({
      clientId: client.id,
      clientName: client.brand_name || client.name,
      recipientName: setting.recipient_name || client.contact_name || client.name,
      periodEnd: periods.periodEnd,
      lookbackDays: setting.lookback_days,
      includeDaily: true,
      includeTopPosts: true,
    });
    const email = buildClientAnalyticsEmail(report);

    const { data: run, error: insertError } = await db
      .from('client_analytics_report_runs')
      .insert({
        client_id: client.id,
        period_start: report.periodStart,
        period_end: report.periodEnd,
        scheduled_for: now.toISOString(),
        status: 'generated',
        transport: 'resend',
        recipient_email: setting.recipient_email,
        subject: email.subject,
        report_payload: report,
      })
      .select('id')
      .maybeSingle();
    if (insertError?.code === '23505') {
      results.push({ clientId: client.id, status: 'duplicate_prevented' });
      continue;
    }
    if (insertError || !run) {
      results.push({ clientId: client.id, status: 'failed', detail: insertError?.message || 'Run record was not created.' });
      continue;
    }

    const { data: claimed } = await db
      .from('client_analytics_report_runs')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', run.id)
      .eq('status', 'generated')
      .select('id')
      .maybeSingle();
    if (!claimed) {
      results.push({ clientId: client.id, status: 'duplicate_prevented' });
      continue;
    }

    try {
      const delivery = await transport.send({
        to: setting.recipient_email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      await db.from('client_analytics_report_runs').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        provider_message_id: delivery.messageId || null,
        error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', run.id);
      results.push({ clientId: client.id, status: 'sent' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delivery failed.';
      await db.from('client_analytics_report_runs').update({
        status: 'failed',
        error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      }).eq('id', run.id);
      results.push({ clientId: client.id, status: 'failed', detail: message });
    }
  }

  return res.status(200).json({
    enabled: true,
    processed: results.length,
    sent: results.filter((item) => item.status === 'sent').length,
    results,
  });
}

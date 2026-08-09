import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePortalRequest } from '../server/portal.js';
import {
  summariseClientAnalyticsReport,
  SupabaseSnapshotAnalyticsProvider,
  ZernioAnalyticsProvider,
} from '../server/clientAnalyticsReports.js';

export const maxDuration = 30;

function clientIdFrom(req: VercelRequest) {
  return String(req.query.clientId || req.body?.clientId || '').trim();
}

function normaliseScheduleTime(slot: any): string | null {
  const direct = String(slot?.time || slot?.localTime || slot?.hourLabel || '').trim();
  const match = direct.match(/^(\d{1,2}):([0-5]\d)/);
  if (match) {
    const hour = Number(match[1]);
    if (hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:${match[2]}`;
  }
  const hour = Number(slot?.hour);
  if (Number.isInteger(hour) && hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:00`;
  return null;
}

function learnedScheduleTimes(learnings: any[]) {
  const slots = learnings
    .filter((learning) => learning.learning_type === 'posting_time')
    .flatMap((learning) => learning.evidence?.bestTimes || [])
    .flatMap((bestTime: any) => bestTime.slots || bestTime.bestTimes || [])
    .map((slot: any) => ({ time: normaliseScheduleTime(slot), score: Number(slot.score ?? slot.engagement ?? slot.value ?? 0) }))
    .filter((slot: { time: string | null; score: number }): slot is { time: string; score: number } => Boolean(slot.time))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
  return [...new Set(slots.map((slot: { time: string }) => slot.time))].slice(0, 8);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!['GET', 'PATCH'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });
  const clientId = clientIdFrom(req);
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  try {
    const { db } = await authenticatePortalRequest(req, clientId);

    if (req.method === 'PATCH') {
      const ids = Array.isArray(req.body?.usedIdeaIds)
        ? req.body.usedIdeaIds.map(String).filter(Boolean).slice(0, 20)
        : [];
      if (ids.length) {
        const { error } = await db.from('content_ideas').update({ status: 'used' }).eq('client_id', clientId).in('id', ids);
        if (error) throw error;
      }
      return res.status(200).json({ updated: ids.length });
    }

    const [{ data: client }, { data: profile }, { data: ideas }, { data: learnings }, { data: metrics }] = await Promise.all([
      db.from('clients')
        .select('id, name, brand_name, zernio_profile_id, analytics_enabled')
        .eq('id', clientId)
        .maybeSingle(),
      db.from('content_intelligence_profiles')
        .select('industry, audience, objectives, platforms, compliance_notes')
        .eq('client_id', clientId)
        .maybeSingle(),
      db.from('content_ideas')
        .select('id, title, angle, rationale, suggested_format, platform, source_title, source_url, source_published_at, source_summary, risk_notes, relevance_score, timeliness_score, authority_score')
        .eq('client_id', clientId)
        .in('status', ['new', 'shortlisted'])
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('relevance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12),
      db.from('content_learnings')
        .select('learning_type, platform, statement, recommendation, confidence, sample_size, evidence, last_confirmed_at')
        .eq('client_id', clientId)
        .eq('active', true)
        .order('confidence', { ascending: false })
        .order('last_confirmed_at', { ascending: false })
        .limit(12),
      db.from('social_post_metric_snapshots')
        .select('post_id, platform, captured_on, impressions, reach, likes, comments, shares, saves, clicks, views, engagement_rate, posts(title, date)')
        .eq('client_id', clientId)
        .order('captured_on', { ascending: false })
        .limit(250),
    ]);

    const latest = new Map<string, any>();
    for (const metric of metrics || []) {
      const key = `${metric.post_id}:${metric.platform}`;
      if (!latest.has(key)) latest.set(key, metric);
    }
    const rows = [...latest.values()];
    const topPosts = [...rows]
      .sort((a, b) => (Number(b.reach || b.impressions || b.views || 0) - Number(a.reach || a.impressions || a.views || 0)))
      .slice(0, 5);

    let report;
    let liveAnalyticsError: string | null = null;
    const reportRequest = {
      clientId,
      clientName: client?.brand_name || client?.name || 'Client',
      lookbackDays: 30,
    };
    if (client?.analytics_enabled && client.zernio_profile_id) {
      try {
        report = await new ZernioAnalyticsProvider(client.zernio_profile_id).getReport(reportRequest);
      } catch (error) {
        liveAnalyticsError = error instanceof Error ? error.message : 'Live analytics could not be loaded.';
      }
    }
    if (!report) {
      report = await new SupabaseSnapshotAnalyticsProvider(db).getReport(reportRequest);
    }
    const analytics = summariseClientAnalyticsReport(report);

    return res.status(200).json({
      profile: profile || null,
      ideas: ideas || [],
      learnings: learnings || [],
      scheduleTimes: learnedScheduleTimes(learnings || []),
      analytics: { ...analytics, topPosts, liveAnalyticsError },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORISED') return res.status(401).json({ error: 'Unauthorised' });
    console.error('Content context request failed:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Content context request failed' });
  }
}

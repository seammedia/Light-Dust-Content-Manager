import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatePortalRequest } from '../server/portal.js';
import {
  summariseClientAnalyticsReport,
  SupabaseSnapshotAnalyticsProvider,
  type TopPostAnalytics,
  ZernioAnalyticsProvider,
} from '../server/clientAnalyticsReports.js';

export const maxDuration = 30;

function clientIdFrom(req: VercelRequest) {
  return String(req.query.clientId || req.body?.clientId || '').trim();
}

function lookbackDaysFrom(req: VercelRequest) {
  const requested = Number(req.query.lookbackDays || req.body?.lookbackDays || 30);
  return [30, 60, 90].includes(requested) ? requested : 30;
}

function includeAnalyticsDetailsFrom(req: VercelRequest) {
  return String(req.query.includeAnalyticsDetails || req.body?.includeAnalyticsDetails || '') === '1';
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function snapshotTopPosts(rows: any[], periodStart: string, periodEnd: string): TopPostAnalytics[] {
  return rows
    .map((row) => {
      const relatedPost = Array.isArray(row.posts) ? row.posts[0] : row.posts;
      const publishedAt = relatedPost?.date || row.captured_on || null;
      const date = String(publishedAt || '').slice(0, 10);
      const likes = number(row.likes);
      const comments = number(row.comments);
      const shares = number(row.shares);
      const saves = number(row.saves);
      const reach = number(row.reach);
      const impressions = number(row.impressions);
      const engagements = likes + comments + shares + saves;
      return {
        id: `${row.post_id}:${row.platform}`,
        content: String(relatedPost?.title || '').trim(),
        publishedAt,
        platform: String(row.platform || 'social').toLowerCase(),
        thumbnailUrl: null,
        postUrl: null,
        metrics: {
          impressions,
          reach,
          likes,
          comments,
          shares,
          saves,
          clicks: number(row.clicks),
          views: number(row.views),
          engagements,
          engagementRate: number(row.engagement_rate) || (reach ? Math.round((engagements / reach) * 1000) / 10 : 0),
        },
        date,
      };
    })
    .filter((row) => row.date >= periodStart && row.date <= periodEnd)
    .sort((left, right) => {
      const leftScore = left.metrics.reach || left.metrics.impressions || left.metrics.views || left.metrics.engagements;
      const rightScore = right.metrics.reach || right.metrics.impressions || right.metrics.views || right.metrics.engagements;
      return rightScore - leftScore;
    })
    .slice(0, 6)
    .map(({ date: _date, ...row }) => row);
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
  const lookbackDays = lookbackDaysFrom(req);
  const includeAnalyticsDetails = includeAnalyticsDetailsFrom(req);

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
    let report;
    let liveTopPosts: TopPostAnalytics[] = [];
    let liveAnalyticsError: string | null = null;
    const reportRequest = {
      clientId,
      clientName: client?.brand_name || client?.name || 'Client',
      lookbackDays,
      includeDaily: includeAnalyticsDetails,
    };
    if (client?.analytics_enabled && client.zernio_profile_id) {
      const provider = new ZernioAnalyticsProvider(client.zernio_profile_id);
      const [reportResult, topPostsResult] = await Promise.allSettled([
        provider.getReport(reportRequest),
        includeAnalyticsDetails ? provider.getTopPosts(reportRequest) : Promise.resolve([]),
      ]);
      if (reportResult.status === 'fulfilled') report = reportResult.value;
      else liveAnalyticsError = reportResult.reason instanceof Error
        ? reportResult.reason.message
        : 'Live analytics could not be loaded.';
      if (topPostsResult.status === 'fulfilled') liveTopPosts = topPostsResult.value;
    }
    if (!report) {
      report = await new SupabaseSnapshotAnalyticsProvider(db).getReport(reportRequest);
    }
    const analytics = summariseClientAnalyticsReport(report);
    const topPosts = includeAnalyticsDetails
      ? (liveTopPosts.length ? liveTopPosts : snapshotTopPosts(rows, analytics.periodStart, analytics.periodEnd))
      : [];

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

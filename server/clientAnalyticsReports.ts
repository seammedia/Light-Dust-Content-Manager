import type { SupabaseClient } from '@supabase/supabase-js';

export const REPORT_TIMEZONE = 'Australia/Melbourne';
export const REPORT_LOOKBACK_DAYS = 30;
// Weekly analytics emails have their own explicit opt-in switch. Portal
// feedback, support and automation emails remain hard-disabled separately.
export const REPORTS_GLOBAL_ENABLED = process.env.CLIENT_ANALYTICS_EMAILS_ENABLED === 'true';

type MetricKey = 'impressions' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'clicks' | 'views';

const METRIC_LABELS: Record<MetricKey, string> = {
  impressions: 'Impressions',
  reach: 'Reach',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  clicks: 'Clicks',
  views: 'Video views',
};

const METRIC_KEYS = Object.keys(METRIC_LABELS) as MetricKey[];

export const ZERNIO_METRIC_ALIASES: Record<MetricKey, string[]> = {
  impressions: ['impressions'],
  reach: ['reach'],
  likes: ['likes', 'likeCount', 'like_count'],
  comments: ['comments', 'commentCount', 'comment_count'],
  shares: ['shares', 'shareCount', 'share_count'],
  saves: ['saves', 'saved'],
  clicks: ['clicks', 'linkClicks', 'link_clicks'],
  views: ['views', 'videoViews', 'video_views', 'playCount', 'play_count'],
};

export type ReportMetric = {
  key: MetricKey;
  label: string;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
};

export type PlatformReport = {
  platform: string;
  posts: number;
  previousPosts: number;
  metrics: ReportMetric[];
};

export type DailyAnalyticsPoint = {
  date: string;
  posts: number;
  metrics: Record<MetricKey, number>;
};

export type ClientAnalyticsReport = {
  clientId: string;
  clientName: string;
  recipientName: string;
  periodStart: string;
  periodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  lookbackDays: number;
  generatedAt: string;
  provider: 'zernio_api' | 'zernio_snapshots' | 'mock';
  platforms: PlatformReport[];
  dailySeries: DailyAnalyticsPoint[];
  dailyAttribution: 'received' | 'published';
  topPosts: TopPostAnalytics[];
  hasData: boolean;
  dataNote?: string;
};

export type PortalAnalyticsMetric = {
  key: MetricKey | 'engagements' | 'posts';
  label: string;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
};

export type PortalAnalyticsSummary = {
  hasData: boolean;
  provider: ClientAnalyticsReport['provider'];
  periodStart: string;
  periodEnd: string;
  sampledPosts: number;
  metrics: PortalAnalyticsMetric[];
  platforms: PlatformReport[];
  dailySeries: DailyAnalyticsPoint[];
  dailyAttribution: ClientAnalyticsReport['dailyAttribution'];
  dataNote?: string;
};

export type ReportRequest = {
  clientId: string;
  clientName: string;
  recipientName?: string | null;
  periodEnd?: string;
  lookbackDays?: number;
  includeDaily?: boolean;
  includeTopPosts?: boolean;
};

type SnapshotRow = {
  post_id: string;
  platform: string;
  captured_on: string;
  published_at: string | null;
  raw_metrics?: Record<string, unknown> | null;
} & Record<MetricKey, number | string | null | undefined>;

type AggregatedPlatform = {
  posts: Set<string>;
  values: Record<MetricKey, number>;
  available: Set<MetricKey>;
};

type ZernioPlatformBreakdown = {
  platform: string;
  postCount?: number;
} & Partial<Record<MetricKey, number | string | null>>;

type ZernioDailyPoint = {
  date?: string;
  postCount?: number;
  metrics?: Record<string, unknown> | null;
};

type ZernioDailyMetricsPayload = {
  dailyData?: ZernioDailyPoint[];
  platformBreakdown?: ZernioPlatformBreakdown[];
  error?: string;
};

export type TopPostAnalytics = {
  id: string;
  content: string;
  publishedAt: string | null;
  platform: string;
  thumbnailUrl: string | null;
  postUrl: string | null;
  metrics: Record<MetricKey | 'engagements' | 'engagementRate', number>;
};

export interface AnalyticsProvider {
  readonly name: ClientAnalyticsReport['provider'];
  getReport(request: ReportRequest): Promise<ClientAnalyticsReport>;
}

export function summariseClientAnalyticsReport(report: ClientAnalyticsReport): PortalAnalyticsSummary {
  const sampledPosts = report.platforms.reduce((sum, platform) => sum + platform.posts, 0);
  const previousPosts = report.platforms.reduce((sum, platform) => sum + platform.previousPosts, 0);
  const metric = (key: MetricKey): PortalAnalyticsMetric | null => {
    const matches = report.platforms.flatMap((platform) => platform.metrics.filter((item) => item.key === key));
    if (!matches.length) return null;
    const value = matches.reduce((sum, item) => sum + item.value, 0);
    const hasPrevious = matches.some((item) => item.previousValue !== null);
    const previousValue = hasPrevious
      ? matches.reduce((sum, item) => sum + Number(item.previousValue || 0), 0)
      : null;
    return { key, label: METRIC_LABELS[key], value, previousValue, changePercent: changePercent(value, previousValue) };
  };
  const providerMetrics = METRIC_KEYS.map(metric).filter((item): item is PortalAnalyticsMetric => Boolean(item));
  const engagementParts = providerMetrics.filter((item) => ['likes', 'comments', 'shares', 'saves'].includes(item.key));
  const engagements = engagementParts.length ? {
    key: 'engagements' as const,
    label: 'Engagements',
    value: engagementParts.reduce((sum, item) => sum + item.value, 0),
    previousValue: engagementParts.some((item) => item.previousValue !== null)
      ? engagementParts.reduce((sum, item) => sum + Number(item.previousValue || 0), 0)
      : null,
    changePercent: null as number | null,
  } : null;
  if (engagements) engagements.changePercent = changePercent(engagements.value, engagements.previousValue);
  const headlineOrder = ['reach', 'impressions', 'engagements', 'clicks', 'views', 'posts'];
  const postsMetric: PortalAnalyticsMetric = {
    key: 'posts',
    label: 'Posts measured',
    value: sampledPosts,
    previousValue: previousPosts,
    changePercent: changePercent(sampledPosts, previousPosts),
  };
  const metrics: PortalAnalyticsMetric[] = [
    ...providerMetrics,
    ...(engagements ? [engagements] : []),
    postsMetric,
  ].sort((a, b) => headlineOrder.indexOf(a.key) - headlineOrder.indexOf(b.key));
  return {
    hasData: report.hasData,
    provider: report.provider,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    sampledPosts,
    metrics,
    platforms: report.platforms,
    dailySeries: report.dailySeries,
    dailyAttribution: report.dailyAttribution,
    dataNote: report.dataNote,
  };
}

function dateOnlyInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shiftDateOnly(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function reportingPeriods(options: {
  now?: Date;
  timezone?: string;
  periodEnd?: string;
  lookbackDays?: number;
} = {}) {
  const timezone = options.timezone || REPORT_TIMEZONE;
  const lookbackDays = options.lookbackDays || REPORT_LOOKBACK_DAYS;
  const today = dateOnlyInTimezone(options.now || new Date(), timezone);
  const periodEnd = options.periodEnd || shiftDateOnly(today, -1);
  const periodStart = shiftDateOnly(periodEnd, -(lookbackDays - 1));
  const previousPeriodEnd = shiftDateOnly(periodStart, -1);
  const previousPeriodStart = shiftDateOnly(previousPeriodEnd, -(lookbackDays - 1));
  return { periodStart, periodEnd, previousPeriodStart, previousPeriodEnd, lookbackDays };
}

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normaliseZernioMetrics(rawMetrics: Record<string, unknown>) {
  return Object.fromEntries(METRIC_KEYS.map((key) => {
    const alias = ZERNIO_METRIC_ALIASES[key].find((candidate) => Object.prototype.hasOwnProperty.call(rawMetrics, candidate));
    return [key, alias ? numeric(rawMetrics[alias]) : 0];
  })) as Record<MetricKey, number>;
}

function metricWasReturned(row: SnapshotRow, key: MetricKey) {
  if (numeric(row[key]) !== 0) return true;
  const raw = row.raw_metrics || {};
  return ZERNIO_METRIC_ALIASES[key].some((alias) => Object.prototype.hasOwnProperty.call(raw, alias));
}

function latestSnapshots(rows: SnapshotRow[]) {
  const latest = new Map<string, SnapshotRow>();
  for (const row of rows) {
    const key = `${row.post_id}:${row.platform}`;
    const current = latest.get(key);
    if (!current || row.captured_on > current.captured_on) latest.set(key, row);
  }
  return [...latest.values()];
}

function emptyMetricValues() {
  return Object.fromEntries(METRIC_KEYS.map((key) => [key, 0])) as Record<MetricKey, number>;
}

function dailySeriesFromSnapshots(rows: SnapshotRow[]) {
  const days = new Map<string, { posts: Set<string>; metrics: Record<MetricKey, number> }>();
  for (const row of latestSnapshots(rows)) {
    const date = String(row.published_at || '').slice(0, 10);
    if (!date) continue;
    const entry = days.get(date) || { posts: new Set<string>(), metrics: emptyMetricValues() };
    entry.posts.add(row.post_id);
    for (const key of METRIC_KEYS) entry.metrics[key] += numeric(row[key]);
    days.set(date, entry);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, posts: value.posts.size, metrics: value.metrics }));
}

function dailySeriesFromZernio(rows: ZernioDailyPoint[]) {
  return rows
    .map((row) => ({
      date: String(row.date || '').slice(0, 10),
      posts: numeric(row.postCount),
      metrics: normaliseZernioMetrics(row.metrics || {}),
    }))
    .filter((row) => Boolean(row.date))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function aggregate(rows: SnapshotRow[]) {
  const platforms = new Map<string, AggregatedPlatform>();
  for (const row of latestSnapshots(rows)) {
    const platform = String(row.platform || 'unknown').toLowerCase();
    const entry = platforms.get(platform) || {
      posts: new Set<string>(),
      values: Object.fromEntries(METRIC_KEYS.map((key) => [key, 0])) as Record<MetricKey, number>,
      available: new Set<MetricKey>(),
    };
    entry.posts.add(row.post_id);
    for (const key of METRIC_KEYS) {
      entry.values[key] += numeric(row[key]);
      if (metricWasReturned(row, key)) entry.available.add(key);
    }
    platforms.set(platform, entry);
  }
  return platforms;
}

function changePercent(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function buildReportFromSnapshots(
  request: ReportRequest,
  currentRows: SnapshotRow[],
  previousRows: SnapshotRow[],
  provider: ClientAnalyticsReport['provider'] = 'zernio_snapshots',
): ClientAnalyticsReport {
  const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
  const current = aggregate(currentRows);
  const previous = aggregate(previousRows);
  const platformNames = [...new Set([...current.keys(), ...previous.keys()])].sort();

  const platforms = platformNames.map((platform) => {
    const currentPlatform = current.get(platform);
    const previousPlatform = previous.get(platform);
    const availableKeys = new Set([
      ...(currentPlatform?.available || []),
      ...(previousPlatform?.available || []),
    ]);
    return {
      platform,
      posts: currentPlatform?.posts.size || 0,
      previousPosts: previousPlatform?.posts.size || 0,
      metrics: METRIC_KEYS.filter((key) => availableKeys.has(key)).map((key) => {
        const value = currentPlatform?.values[key] || 0;
        const previousValue = previousPlatform?.available.has(key)
          ? previousPlatform.values[key]
          : null;
        return {
          key,
          label: METRIC_LABELS[key],
          value,
          previousValue,
          changePercent: changePercent(value, previousValue),
        };
      }),
    };
  });

  const hasData = platforms.some((platform) => platform.posts > 0 && platform.metrics.length > 0);
  return {
    clientId: request.clientId,
    clientName: request.clientName,
    recipientName: request.recipientName || request.clientName,
    ...periods,
    generatedAt: new Date().toISOString(),
    provider,
    platforms,
    dailySeries: dailySeriesFromSnapshots(currentRows),
    dailyAttribution: 'published',
    topPosts: [],
    hasData,
    dataNote: hasData
      ? undefined
      : 'Connected-platform analytics have not been returned for this reporting period yet.',
  };
}

export class SupabaseSnapshotAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'zernio_snapshots' as const;
  private readonly db: SupabaseClient;

  constructor(db: SupabaseClient) {
    this.db = db;
  }

  async getReport(request: ReportRequest) {
    const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
    const select = 'post_id,platform,captured_on,published_at,impressions,reach,likes,comments,shares,saves,clicks,views,raw_metrics';
    const { data, error } = await this.db
      .from('social_post_metric_snapshots')
      .select(select)
      .eq('client_id', request.clientId)
      .gte('published_at', `${shiftDateOnly(periods.previousPeriodStart, -1)}T00:00:00.000Z`)
      .lte('published_at', `${shiftDateOnly(periods.periodEnd, 1)}T23:59:59.999Z`)
      .order('captured_on', { ascending: false });
    if (error) throw new Error(`Analytics snapshots could not be loaded: ${error.message}`);
    const rows = (data || []) as SnapshotRow[];
    const publishedDate = (row: SnapshotRow) => row.published_at
      ? dateOnlyInTimezone(new Date(row.published_at), REPORT_TIMEZONE)
      : '';
    const currentRows = rows.filter((row) => {
      const date = publishedDate(row);
      return date >= periods.periodStart && date <= periods.periodEnd;
    });
    const previousRows = rows.filter((row) => {
      const date = publishedDate(row);
      return date >= periods.previousPeriodStart && date <= periods.previousPeriodEnd;
    });
    return buildReportFromSnapshots(request, currentRows, previousRows, this.name);
  }
}

function buildReportFromZernioBreakdowns(
  request: ReportRequest,
  currentRows: ZernioPlatformBreakdown[],
  previousRows: ZernioPlatformBreakdown[],
  dailyRows: ZernioDailyPoint[] = [],
  dailyAttribution: ClientAnalyticsReport['dailyAttribution'] = 'published',
): ClientAnalyticsReport {
  const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
  const byPlatform = (rows: ZernioPlatformBreakdown[]) =>
    new Map(rows.map((row) => [String(row.platform || 'unknown').toLowerCase(), row]));
  const current = byPlatform(currentRows);
  const previous = byPlatform(previousRows);
  const platformNames = [...new Set([...current.keys(), ...previous.keys()])].sort();
  const platforms = platformNames.map((platform) => {
    const currentPlatform = current.get(platform);
    const previousPlatform = previous.get(platform);
    const availableKeys = METRIC_KEYS.filter((key) =>
      Object.prototype.hasOwnProperty.call(currentPlatform || {}, key)
      || Object.prototype.hasOwnProperty.call(previousPlatform || {}, key));
    return {
      platform,
      posts: numeric(currentPlatform?.postCount),
      previousPosts: numeric(previousPlatform?.postCount),
      metrics: availableKeys.map((key) => {
        const value = numeric(currentPlatform?.[key]);
        const previousValue = Object.prototype.hasOwnProperty.call(previousPlatform || {}, key)
          ? numeric(previousPlatform?.[key])
          : null;
        return {
          key,
          label: METRIC_LABELS[key],
          value,
          previousValue,
          changePercent: changePercent(value, previousValue),
        };
      }),
    };
  });
  const hasData = platforms.some((platform) => platform.posts > 0 && platform.metrics.length > 0);
  return {
    clientId: request.clientId,
    clientName: request.clientName,
    recipientName: request.recipientName || request.clientName,
    ...periods,
    generatedAt: new Date().toISOString(),
    provider: 'zernio_api',
    platforms,
    dailySeries: dailySeriesFromZernio(dailyRows),
    dailyAttribution,
    topPosts: [],
    hasData,
    dataNote: hasData
      ? undefined
      : 'Connected-platform analytics have not been returned for this reporting period yet.',
  };
}

export class ZernioAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'zernio_api' as const;
  private readonly profileId: string;
  private readonly apiKey: string;

  constructor(profileId: string, apiKey = process.env.ZERNIO_API_KEY || process.env.VITE_LATE_API_KEY || '') {
    this.profileId = profileId;
    this.apiKey = apiKey;
  }

  private async zernioRequest<T>(path: string, params: Record<string, string>) {
    if (!this.apiKey) throw new Error('Zernio analytics is not configured.');
    const url = new URL(`https://zernio.com/api/v1/${path.replace(/^\//, '')}`);
    url.searchParams.set('profileId', this.profileId);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const payload = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || `Zernio analytics returned ${response.status}.`);
    }
    return payload;
  }

  private async getDailyMetrics(fromDate: string, toDate: string, attribution: 'publish' | 'received' = 'publish') {
    return this.zernioRequest<ZernioDailyMetricsPayload>('analytics/daily-metrics', {
      fromDate: `${fromDate}T00:00:00.000Z`,
      toDate: `${toDate}T23:59:59.999Z`,
      source: 'all',
      attribution,
    });
  }

  async getReport(request: ReportRequest) {
    const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
    const [current, previous, received, topPosts] = await Promise.all([
      this.getDailyMetrics(periods.periodStart, periods.periodEnd),
      this.getDailyMetrics(periods.previousPeriodStart, periods.previousPeriodEnd),
      request.includeDaily
        ? this.getDailyMetrics(periods.periodStart, periods.periodEnd, 'received').catch(() => null)
        : Promise.resolve(null),
      request.includeTopPosts
        ? this.getTopPosts(request).catch(() => [])
        : Promise.resolve([] as TopPostAnalytics[]),
    ]);
    const receivedRows = received && Array.isArray(received.dailyData) ? received.dailyData : [];
    const publishedRows = Array.isArray(current.dailyData) ? current.dailyData : [];
    const report = buildReportFromZernioBreakdowns(
      request,
      Array.isArray(current.platformBreakdown) ? current.platformBreakdown : [],
      Array.isArray(previous.platformBreakdown) ? previous.platformBreakdown : [],
      receivedRows.length ? receivedRows : publishedRows,
      receivedRows.length ? 'received' : 'published',
    );
    return { ...report, topPosts };
  }

  async getTopPosts(request: ReportRequest): Promise<TopPostAnalytics[]> {
    const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
    const payload = await this.zernioRequest<Record<string, unknown>>('analytics', {
      fromDate: periods.periodStart,
      toDate: periods.periodEnd,
      source: 'all',
      sortBy: 'engagement',
      order: 'desc',
      limit: '6',
      page: '1',
    });
    const nested = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : null;
    const rows = [payload.posts, payload.items, payload.data, nested?.posts, nested?.items, nested?.data]
      .find((value) => Array.isArray(value)) as Array<Record<string, unknown>> | undefined;
    return (rows || []).slice(0, 6).map((row) => {
      const analytics = row.analytics && typeof row.analytics === 'object'
        ? row.analytics as Record<string, unknown>
        : {};
      const platformRows = Array.isArray(row.platformAnalytics) ? row.platformAnalytics as Array<Record<string, unknown>> : [];
      const firstPlatform = platformRows[0] || {};
      const platformAnalytics = firstPlatform.analytics && typeof firstPlatform.analytics === 'object'
        ? firstPlatform.analytics as Record<string, unknown>
        : {};
      const values = normaliseZernioMetrics({ ...platformAnalytics, ...analytics });
      const engagements = values.likes + values.comments + values.shares + values.saves;
      const engagementRate = numeric(analytics.engagementRate ?? platformAnalytics.engagementRate);
      return {
        id: String(row.postId || row.latePostId || `${row.publishedAt || row.scheduledFor || ''}-${row.platform || firstPlatform.platform || ''}`),
        content: String(row.content || '').trim(),
        publishedAt: row.publishedAt ? String(row.publishedAt) : row.scheduledFor ? String(row.scheduledFor) : null,
        platform: String(row.platform || firstPlatform.platform || 'social').toLowerCase(),
        thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : null,
        postUrl: row.platformPostUrl ? String(row.platformPostUrl) : firstPlatform.platformPostUrl ? String(firstPlatform.platformPostUrl) : null,
        metrics: { ...values, engagements, engagementRate },
      };
    });
  }
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'mock' as const;

  async getReport(request: ReportRequest) {
    const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
    const rows = (platform: string, posts: number, base: number, publishedAt: string) =>
      Array.from({ length: posts }, (_, index) => ({
        post_id: `${platform}-${index}`,
        platform,
        captured_on: periods.periodEnd,
        published_at: `${shiftDateOnly(publishedAt, index * 5)}T08:00:00.000Z`,
        impressions: base + index * 91,
        reach: Math.round((base + index * 91) * 0.72),
        likes: 24 + index * 3,
        comments: 3 + index,
        shares: 4 + index,
        saves: 7 + index,
        clicks: 0,
        views: platform === 'instagram' ? base + index * 110 : 0,
        raw_metrics: platform === 'instagram'
          ? { impressions: true, reach: true, likes: true, comments: true, shares: true, saves: true, views: true }
          : { impressions: true, reach: true, likes: true, comments: true, shares: true },
      })) as SnapshotRow[];
    const report = buildReportFromSnapshots(
      request,
      [...rows('instagram', 5, 840, periods.periodStart), ...rows('facebook', 4, 510, periods.periodStart)],
      [...rows('instagram', 4, 690, periods.previousPeriodStart), ...rows('facebook', 4, 470, periods.previousPeriodStart)],
      this.name,
    );
    return {
      ...report,
      topPosts: [
        {
          id: 'mock-instagram-1',
          content: 'A practical behind-the-scenes look at the people and process that bring the work to life.',
          publishedAt: `${shiftDateOnly(periods.periodStart, 10)}T08:00:00.000Z`,
          platform: 'instagram',
          thumbnailUrl: null,
          postUrl: null,
          metrics: {
            impressions: 1840,
            reach: 1325,
            likes: 58,
            comments: 9,
            shares: 14,
            saves: 21,
            clicks: 0,
            views: 1920,
            engagements: 102,
            engagementRate: 7.7,
          },
        },
        {
          id: 'mock-facebook-1',
          content: 'A client result story that shows the outcome, the thinking behind it and what happened next.',
          publishedAt: `${shiftDateOnly(periods.periodStart, 18)}T08:00:00.000Z`,
          platform: 'facebook',
          thumbnailUrl: null,
          postUrl: null,
          metrics: {
            impressions: 1260,
            reach: 905,
            likes: 41,
            comments: 7,
            shares: 10,
            saves: 5,
            clicks: 0,
            views: 0,
            engagements: 63,
            engagementRate: 7,
          },
        },
      ],
    };
  }
}

function titleCase(value: string) {
  return value.replace(/(^|[\s_-])\w/g, (match) => match.toUpperCase()).replace(/[_-]/g, ' ');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-AU').format(Math.round(value));
}

function formatPeriodDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00.000Z`));
}

function changeWords(change: number | null) {
  if (change === null) return '';
  if (change === 0) return ' (steady from the previous period)';
  return ` (${Math.abs(change)}% ${change > 0 ? 'up' : 'down'} from the previous period)`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function changeHtml(change: number | null) {
  if (change === null) return '';
  const colour = change > 0 ? '#15803d' : change < 0 ? '#b91c1c' : '#78716c';
  return ` <span style="color:${colour};font-weight:700;">${escapeHtml(changeWords(change).trim())}</span>`;
}

function comparisonChartHtml(metrics: ReportMetric[]) {
  const chartMetrics = metrics
    .filter((metric) => metric.previousValue !== null)
    .sort((a, b) => Math.max(b.value, b.previousValue || 0) - Math.max(a.value, a.previousValue || 0))
    .slice(0, 4);

  if (chartMetrics.length === 0) return '';

  const rows = chartMetrics.map((metric) => {
    const previousValue = metric.previousValue || 0;
    const maximum = Math.max(metric.value, previousValue, 1);
    const width = (value: number) => value === 0 ? 0 : Math.max(3, Math.round((value / maximum) * 100));
    const previousWidth = width(previousValue);
    const currentWidth = width(metric.value);
    const bar = (barWidth: number, colour: string) => barWidth === 0
      ? '<span style="font-size:12px;color:#a8a29e;">0</span>'
      : `<table role="presentation" width="${barWidth}%" cellpadding="0" cellspacing="0" border="0" style="width:${barWidth}%;"><tr><td height="10" style="height:10px;border-radius:5px;background:${colour};font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

    return `
      <tr>
        <td colspan="2" style="padding:12px 0 5px;font-size:13px;font-weight:700;color:#44403c;">${escapeHtml(metric.label)}</td>
      </tr>
      <tr>
        <td width="92" style="padding:3px 10px 3px 0;font-size:11px;color:#78716c;white-space:nowrap;">Previous ${formatNumber(previousValue)}</td>
        <td style="padding:3px 0;">${bar(previousWidth, '#d6d3d1')}</td>
      </tr>
      <tr>
        <td width="92" style="padding:3px 10px 3px 0;font-size:11px;color:#15803d;font-weight:700;white-space:nowrap;">Current ${formatNumber(metric.value)}</td>
        <td style="padding:3px 0;">${bar(currentWidth, '#22c55e')}</td>
      </tr>`;
  }).join('');

  return `
    <div style="margin-top:20px;padding-top:18px;border-top:1px solid #e7e5e4;">
      <h3 style="margin:0 0 4px;color:#1c3c34;font-size:15px;">30-day comparison</h3>
      <p style="margin:0 0 6px;color:#78716c;font-size:12px;">Current 30 days compared with the previous 30 days</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
      </table>
    </div>`;
}

type EmailSummaryMetric = {
  label: string;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
};

function sumMetrics(report: ClientAnalyticsReport, keys: MetricKey[]) {
  const current = report.platforms.reduce((total, platform) => total + platform.metrics
    .filter((metric) => keys.includes(metric.key))
    .reduce((sum, metric) => sum + metric.value, 0), 0);
  const matching = report.platforms.flatMap((platform) => platform.metrics.filter((metric) => keys.includes(metric.key)));
  const previousIsKnown = matching.some((metric) => metric.previousValue !== null);
  const previous = previousIsKnown
    ? matching.reduce((sum, metric) => sum + Number(metric.previousValue || 0), 0)
    : null;
  return { current, previous, changePercent: changePercent(current, previous) };
}

function emailSummary(report: ClientAnalyticsReport) {
  const posts = report.platforms.reduce((sum, platform) => sum + platform.posts, 0);
  const previousPosts = report.platforms.reduce((sum, platform) => sum + platform.previousPosts, 0);
  const reach = sumMetrics(report, ['reach']);
  const engagement = sumMetrics(report, ['likes', 'comments', 'shares', 'saves']);
  const clicks = sumMetrics(report, ['clicks']);
  const impressions = sumMetrics(report, ['impressions']);
  const views = sumMetrics(report, ['views']);
  const visibility = impressions.current > 0
    ? { label: 'Impressions', ...impressions }
    : { label: 'Video views', ...views };

  const metrics: EmailSummaryMetric[] = [
    { label: 'Posts measured', value: posts, previousValue: previousPosts, changePercent: changePercent(posts, previousPosts) },
    { label: 'Reach', value: reach.current, previousValue: reach.previous, changePercent: reach.changePercent },
    { label: visibility.label, value: visibility.current, previousValue: visibility.previous, changePercent: visibility.changePercent },
    { label: 'Engagements', value: engagement.current, previousValue: engagement.previous, changePercent: engagement.changePercent },
  ];
  if (clicks.current > 0 || Number(clicks.previous || 0) > 0) {
    metrics[3] = { label: 'Clicks', value: clicks.current, previousValue: clicks.previous, changePercent: clicks.changePercent };
  }

  const comparable = metrics.filter((metric) => metric.changePercent !== null);
  const strongest = [...comparable].sort((a, b) => Number(b.changePercent) - Number(a.changePercent))[0];
  const watch = [...comparable].filter((metric) => Number(metric.changePercent) < 0)
    .sort((a, b) => Number(a.changePercent) - Number(b.changePercent))[0];
  const bestPlatform = [...report.platforms]
    .filter((platform) => platform.posts > 0)
    .sort((a, b) => {
      const reachFor = (platform: PlatformReport) => platform.metrics.find((metric) => metric.key === 'reach')?.value || 0;
      return reachFor(b) - reachFor(a) || b.posts - a.posts;
    })[0];

  const highlights: string[] = [];
  if (strongest && Number(strongest.changePercent) > 0) {
    highlights.push(`${strongest.label} increased ${Math.abs(Number(strongest.changePercent))}% compared with the previous 30 days.`);
  } else if (bestPlatform) {
    highlights.push(`${titleCase(bestPlatform.platform)} generated the strongest reach across the connected channels this period.`);
  }
  if (watch) {
    highlights.push(`${watch.label} decreased ${Math.abs(Number(watch.changePercent))}%, so this is the main area we will watch next month.`);
  } else {
    highlights.push('There are no material downward trends in the headline results this period.');
  }
  const focus = bestPlatform
    ? `Next, we will build on the formats working best on ${titleCase(bestPlatform.platform)} and keep improving the content that prompts meaningful engagement.`
    : 'Next, we will keep testing the content formats that create meaningful reach and engagement.';

  return { metrics, highlights, focus };
}

type DailyTrendDatum = {
  date: string;
  value: number;
};

type DailyTrend = {
  label: string;
  points: DailyTrendDatum[];
  peak: DailyTrendDatum;
  attribution: ClientAnalyticsReport['dailyAttribution'];
};

type ChannelContribution = {
  label: string;
  total: number;
  rows: Array<{ platform: string; value: number; percentage: number }>;
};

type EngagementBreakdownItem = {
  key: Extract<MetricKey, 'likes' | 'comments' | 'shares' | 'saves'>;
  label: string;
  value: number;
  percentage: number;
  colour: string;
};

const CLIENT_ANALYTICS_DASHBOARD_URL = 'https://seam-media-content-manager.vercel.app/';

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function truncateText(value: string, maximum = 150) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= maximum ? clean : `${clean.slice(0, maximum - 1).trimEnd()}…`;
}

function platformMetricValue(platform: PlatformReport, keys: MetricKey[]) {
  return platform.metrics
    .filter((metric) => keys.includes(metric.key))
    .reduce((sum, metric) => sum + metric.value, 0);
}

function dailyTrendData(report: ClientAnalyticsReport): DailyTrend | null {
  const candidates = [
    { label: 'Reach', value: (point: DailyAnalyticsPoint) => point.metrics.reach },
    { label: 'Impressions', value: (point: DailyAnalyticsPoint) => point.metrics.impressions },
    { label: 'Video views', value: (point: DailyAnalyticsPoint) => point.metrics.views },
    {
      label: 'Engagements',
      value: (point: DailyAnalyticsPoint) => point.metrics.likes + point.metrics.comments + point.metrics.shares + point.metrics.saves,
    },
  ];
  const selected = candidates.find((candidate) => report.dailySeries.some((point) => candidate.value(point) > 0));
  if (!selected) return null;
  const allPoints = report.dailySeries
    .map((point) => ({ date: point.date, value: selected.value(point) }))
    .filter((point) => point.value > 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (!allPoints.length) return null;
  const peak = [...allPoints].sort((left, right) => right.value - left.value)[0];
  return {
    label: selected.label,
    points: allPoints.slice(-10),
    peak,
    attribution: report.dailyAttribution,
  };
}

function dailyTrendHtml(report: ClientAnalyticsReport) {
  const trend = dailyTrendData(report);
  if (!trend) return '';
  const maximum = Math.max(...trend.points.map((point) => point.value), 1);
  const context = trend.attribution === 'received'
    ? 'The latest performance recorded by day during this 30-day period'
    : 'Performance grouped by each post publish date during this 30-day period';
  const rows = trend.points.map((point) => {
    const width = Math.max(3, Math.round((point.value / maximum) * 100));
    return `
      <tr>
        <td width="58" style="padding:5px 10px 5px 0;font-size:11px;color:#78716c;white-space:nowrap;">${escapeHtml(formatCompactDate(point.date))}</td>
        <td style="padding:5px 10px 5px 0;">
          <table role="presentation" width="${width}%" cellpadding="0" cellspacing="0" border="0" style="width:${width}%;">
            <tr><td height="11" style="height:11px;border-radius:6px;background:#4f9d75;font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>
        </td>
        <td width="70" align="right" style="padding:5px 0;font-size:12px;font-weight:700;color:#1c3c34;white-space:nowrap;">${formatNumber(point.value)}</td>
      </tr>`;
  }).join('');
  return `
    <div style="margin:22px 0;padding:20px;border:1px solid #dce7e2;border-radius:14px;background:#f7faf8;">
      <h2 style="margin:0;color:#1c3c34;font-size:18px;">Daily performance trend</h2>
      <p style="margin:5px 0 14px;color:#78716c;font-size:12px;line-height:1.5;">${escapeHtml(context)}. Showing ${escapeHtml(trend.label.toLowerCase())} on the latest ${trend.points.length} active ${trend.points.length === 1 ? 'day' : 'days'}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
      </table>
      <p style="margin:12px 0 0;color:#44403c;font-size:12px;"><strong>Peak day:</strong> ${escapeHtml(formatCompactDate(trend.peak.date))} with ${formatNumber(trend.peak.value)} ${escapeHtml(trend.label.toLowerCase())}.</p>
    </div>`;
}

function channelContributionData(report: ClientAnalyticsReport): ChannelContribution | null {
  const candidates: Array<{ label: string; keys: MetricKey[] }> = [
    { label: 'Reach', keys: ['reach'] },
    { label: 'Impressions', keys: ['impressions'] },
    { label: 'Video views', keys: ['views'] },
    { label: 'Engagements', keys: ['likes', 'comments', 'shares', 'saves'] },
  ];
  for (const candidate of candidates) {
    const values = report.platforms
      .filter((platform) => platform.posts > 0)
      .map((platform) => ({ platform: platform.platform, value: platformMetricValue(platform, candidate.keys) }))
      .filter((row) => row.value > 0)
      .sort((left, right) => right.value - left.value);
    const total = values.reduce((sum, row) => sum + row.value, 0);
    if (total > 0) {
      return {
        label: candidate.label,
        total,
        rows: values.map((row) => ({ ...row, percentage: Math.round((row.value / total) * 100) })),
      };
    }
  }
  return null;
}

function channelContributionHtml(report: ClientAnalyticsReport) {
  const contribution = channelContributionData(report);
  if (!contribution) return '';
  const maximum = Math.max(...contribution.rows.map((row) => row.value), 1);
  const rows = contribution.rows.map((row) => {
    const width = Math.max(4, Math.round((row.value / maximum) * 100));
    return `
      <tr>
        <td width="88" style="padding:7px 10px 7px 0;font-size:12px;font-weight:700;color:#44403c;white-space:nowrap;">${escapeHtml(titleCase(row.platform))}</td>
        <td style="padding:7px 10px 7px 0;">
          <table role="presentation" width="${width}%" cellpadding="0" cellspacing="0" border="0" style="width:${width}%;">
            <tr><td height="11" style="height:11px;border-radius:6px;background:#8cc6a7;font-size:0;line-height:0;">&nbsp;</td></tr>
          </table>
        </td>
        <td width="88" align="right" style="padding:7px 0;font-size:11px;color:#57534e;white-space:nowrap;"><strong style="color:#1c3c34;">${formatNumber(row.value)}</strong> (${row.percentage}%)</td>
      </tr>`;
  }).join('');
  return `
    <div style="margin:22px 0;padding:20px;border:1px solid #e7e5e4;border-radius:14px;background:#ffffff;">
      <h2 style="margin:0;color:#1c3c34;font-size:18px;">Channel contribution</h2>
      <p style="margin:5px 0 12px;color:#78716c;font-size:12px;line-height:1.5;">How each connected channel contributed to total ${escapeHtml(contribution.label.toLowerCase())}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
      </table>
    </div>`;
}

function engagementBreakdownData(report: ClientAnalyticsReport): EngagementBreakdownItem[] {
  const definitions: Array<Omit<EngagementBreakdownItem, 'value' | 'percentage'>> = [
    { key: 'likes', label: 'Likes', colour: '#2f6b57' },
    { key: 'comments', label: 'Comments', colour: '#5b927c' },
    { key: 'shares', label: 'Shares', colour: '#90b8a5' },
    { key: 'saves', label: 'Saves', colour: '#d8a75a' },
  ];
  const values = definitions.map((definition) => ({
    ...definition,
    value: report.platforms.reduce((sum, platform) => sum + platformMetricValue(platform, [definition.key]), 0),
  })).filter((item) => item.value > 0);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return values.map((item) => ({ ...item, percentage: Math.round((item.value / total) * 100) }));
}

function engagementBreakdownHtml(report: ClientAnalyticsReport) {
  const items = engagementBreakdownData(report);
  if (!items.length) return '';
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const segments = items.map((item) => `
    <td width="${Math.max(3, item.percentage)}%" height="13" style="height:13px;background:${item.colour};font-size:0;line-height:0;">&nbsp;</td>`).join('');
  const legend = items.map((item) => `
    <tr>
      <td width="18" style="padding:6px 8px 6px 0;"><span style="display:block;width:10px;height:10px;border-radius:5px;background:${item.colour};font-size:0;line-height:0;">&nbsp;</span></td>
      <td style="padding:6px 0;font-size:12px;color:#57534e;">${escapeHtml(item.label)}</td>
      <td align="right" style="padding:6px 0;font-size:12px;color:#1c3c34;"><strong>${formatNumber(item.value)}</strong> <span style="color:#78716c;">(${item.percentage}%)</span></td>
    </tr>`).join('');
  return `
    <div style="margin:22px 0;padding:20px;border:1px solid #e7e5e4;border-radius:14px;background:#ffffff;">
      <h2 style="margin:0;color:#1c3c34;font-size:18px;">How people responded</h2>
      <p style="margin:5px 0 14px;color:#78716c;font-size:12px;line-height:1.5;">A breakdown of ${formatNumber(total)} measured engagements.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="overflow:hidden;border-radius:7px;"><tr>${segments}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">${legend}</table>
    </div>`;
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function topPostStats(post: TopPostAnalytics) {
  const candidates = [
    { label: 'Engagements', value: post.metrics.engagements },
    { label: 'Reach', value: post.metrics.reach },
    { label: 'Video views', value: post.metrics.views },
    { label: 'Impressions', value: post.metrics.impressions },
  ];
  return candidates.filter((item) => item.value > 0).slice(0, 2);
}

function topPostsHtml(report: ClientAnalyticsReport) {
  const posts = report.topPosts.slice(0, 3);
  if (!posts.length) return '';
  const rows = posts.map((post, index) => {
    const postUrl = safeExternalUrl(post.postUrl);
    const date = post.publishedAt ? formatCompactDate(post.publishedAt) : 'Current period';
    const content = truncateText(post.content || 'Social post');
    const stats = topPostStats(post).map((item) => `${escapeHtml(item.label)} <strong>${formatNumber(item.value)}</strong>`).join(' &nbsp;•&nbsp; ');
    return `
      <tr>
        <td valign="top" style="padding:${index === 0 ? '0' : '16px 0 0'};${index === 0 ? '' : 'border-top:1px solid #eeeae7;'}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="34" valign="top" style="padding-right:12px;">
                <div style="width:28px;height:28px;line-height:28px;text-align:center;border-radius:14px;background:#1c3c34;color:#ffffff;font-size:12px;font-weight:800;">${index + 1}</div>
              </td>
              <td valign="top">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">${escapeHtml(titleCase(post.platform))} · ${escapeHtml(date)}</div>
                <p style="margin:5px 0;color:#292524;font-size:13px;line-height:1.5;">${escapeHtml(content)}</p>
                ${stats ? `<div style="font-size:11px;color:#57534e;">${stats}</div>` : ''}
                ${postUrl ? `<div style="margin-top:7px;"><a href="${escapeHtml(postUrl)}" style="color:#1c6c52;font-size:12px;font-weight:700;text-decoration:underline;">View post</a></div>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');
  return `
    <div style="margin:22px 0;padding:20px;border:1px solid #eadfcf;border-radius:14px;background:#fffcf7;">
      <h2 style="margin:0;color:#1c3c34;font-size:18px;">Top-performing content</h2>
      <p style="margin:5px 0 16px;color:#78716c;font-size:12px;line-height:1.5;">The posts generating the strongest engagement during this reporting period.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </div>`;
}

function dashboardButtonHtml() {
  return `
    <div style="margin:24px 0;padding:20px;border-radius:14px;background:#1c3c34;color:#ffffff;text-align:center;">
      <h2 style="margin:0 0 6px;color:#ffffff;font-size:18px;">Explore the full picture</h2>
      <p style="margin:0 0 15px;color:#d7e5df;font-size:13px;line-height:1.5;">Review the complete analytics dashboard with your usual client portal access.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr><td style="border-radius:8px;background:#ffffff;"><a href="${CLIENT_ANALYTICS_DASHBOARD_URL}" style="display:inline-block;padding:11px 18px;color:#1c3c34;font-size:13px;font-weight:800;text-decoration:none;">Review your analytics</a></td></tr>
      </table>
    </div>`;
}

function summaryCardsHtml(metrics: EmailSummaryMetric[]) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px;">
      ${[0, 2].map((start) => `
        <tr>
          ${metrics.slice(start, start + 2).map((metric, index) => `
            <td width="50%" valign="top" style="padding:${start === 0 ? '0 0 10px' : '0'};${index === 0 ? 'padding-right:5px;' : 'padding-left:5px;'}">
              <div style="padding:15px;border:1px solid #e7e5e4;border-radius:12px;background:#fafaf9;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#78716c;">${escapeHtml(metric.label)}</div>
                <div style="margin-top:5px;font-size:23px;font-weight:800;color:#1c3c34;">${formatNumber(metric.value)}</div>
                <div style="margin-top:4px;font-size:11px;color:${metric.changePercent === null || metric.changePercent === 0 ? '#78716c' : metric.changePercent > 0 ? '#15803d' : '#b91c1c'};">${metric.changePercent === null ? 'Current period' : escapeHtml(changeWords(metric.changePercent).trim().replace(/^\(|\)$/g, ''))}</div>
              </div>
            </td>`).join('')}
        </tr>`).join('')}
    </table>`;
}

function platformMetricHtml(platform: PlatformReport) {
  const preferredKeys: MetricKey[] = ['reach', 'impressions', 'views', 'likes', 'clicks'];
  const metrics = [...platform.metrics]
    .filter((metric) => metric.value > 0 || Number(metric.previousValue || 0) > 0)
    .sort((a, b) => preferredKeys.indexOf(a.key) - preferredKeys.indexOf(b.key))
    .slice(0, 5);
  return metrics.map((metric) => `
    <tr>
      <td style="padding:8px 0;border-top:1px solid #f5f5f4;font-size:13px;color:#57534e;">${escapeHtml(metric.label)}</td>
      <td align="right" style="padding:8px 0;border-top:1px solid #f5f5f4;font-size:13px;color:#292524;"><strong>${formatNumber(metric.value)}</strong>${changeHtml(metric.changePercent)}</td>
    </tr>`).join('');
}

export function buildClientAnalyticsEmail(report: ClientAnalyticsReport) {
  const subject = `${report.clientName}: your 30-day social performance update`;
  const summary = emailSummary(report);
  const trend = dailyTrendData(report);
  const contribution = channelContributionData(report);
  const engagementBreakdown = engagementBreakdownData(report);
  const lines = [
    `Hi ${report.recipientName},`,
    '',
    `Here is your social media performance update for ${formatPeriodDate(report.periodStart)} to ${formatPeriodDate(report.periodEnd)}.`,
    '',
  ];

  if (!report.hasData) {
    lines.push('We do not yet have enough connected-platform performance data for this reporting period.', '');
    lines.push('We will keep monitoring the connection and include the available results in your next update.', '');
  } else {
    lines.push('At a glance:', '');
    for (const metric of summary.metrics) {
      lines.push(`- ${metric.label}: ${formatNumber(metric.value)}${changeWords(metric.changePercent)}`);
    }
    if (trend) {
      lines.push('', 'Daily performance trend:', '');
      lines.push(`- Peak day for ${trend.label.toLowerCase()}: ${formatCompactDate(trend.peak.date)} with ${formatNumber(trend.peak.value)}`);
      trend.points.forEach((point) => lines.push(`- ${formatCompactDate(point.date)}: ${formatNumber(point.value)} ${trend.label.toLowerCase()}`));
    }
    if (contribution) {
      lines.push('', 'Channel contribution:', '', `Total ${contribution.label.toLowerCase()}: ${formatNumber(contribution.total)}`);
      contribution.rows.forEach((row) => lines.push(`- ${titleCase(row.platform)}: ${formatNumber(row.value)} (${row.percentage}%)`));
    }
    if (engagementBreakdown.length) {
      const engagementTotal = engagementBreakdown.reduce((sum, item) => sum + item.value, 0);
      lines.push('', 'How people responded:', '', `Total measured engagements: ${formatNumber(engagementTotal)}`);
      engagementBreakdown.forEach((item) => lines.push(`- ${item.label}: ${formatNumber(item.value)} (${item.percentage}%)`));
    }
    if (report.topPosts.length) {
      lines.push('', 'Top-performing content:', '');
      report.topPosts.slice(0, 3).forEach((post, index) => {
        const date = post.publishedAt ? formatCompactDate(post.publishedAt) : 'Current period';
        const stats = topPostStats(post).map((item) => `${item.label} ${formatNumber(item.value)}`).join(', ');
        lines.push(`- ${index + 1}. ${titleCase(post.platform)}, ${date}: ${truncateText(post.content || 'Social post')}${stats ? ` (${stats})` : ''}`);
        const postUrl = safeExternalUrl(post.postUrl);
        if (postUrl) lines.push(`  View post: ${postUrl}`);
      });
    }
    lines.push('', 'What changed:', '');
    summary.highlights.forEach((highlight) => lines.push(`- ${highlight}`));
    lines.push('', 'Our focus for the next period:', '', summary.focus, '');
    for (const platform of report.platforms.filter((item) => item.posts > 0)) {
      lines.push(`${titleCase(platform.platform)} detail:`, '', `- Published posts measured: ${platform.posts}`);
      platform.metrics
        .filter((metric) => metric.value > 0 || Number(metric.previousValue || 0) > 0)
        .slice(0, 5)
        .forEach((metric) => lines.push(`- ${metric.label}: ${formatNumber(metric.value)}${changeWords(metric.changePercent)}`));
      lines.push('');
    }
    lines.push('Full analytics dashboard:', CLIENT_ANALYTICS_DASHBOARD_URL, '');
    lines.push('These figures come directly from the connected social platforms and can change slightly as each platform finalises its reporting.', '');
  }

  lines.push('If you would like to discuss the results or adjust the content focus for the next month, simply reply to this email.', '', 'Thanks,', 'Heath', 'Seam Media');
  const text = lines.join('\n');

  const platformHtml = report.hasData
    ? report.platforms.filter((item) => item.posts > 0).map((platform) => `
      <div style="margin:18px 0;padding:20px;border:1px solid #e7e5e4;border-radius:14px;background:#ffffff;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 style="margin:0;color:#1c3c34;font-size:19px;">${escapeHtml(titleCase(platform.platform))}</h2>
          <span style="font-size:12px;color:#78716c;">${platform.posts} ${platform.posts === 1 ? 'post' : 'posts'} measured</span>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          ${platformMetricHtml(platform)}
        </table>
        ${comparisonChartHtml(platform.metrics)}
      </div>`).join('')
    : '<p style="padding:18px;border-radius:12px;background:#f5f5f0;color:#57534e;">We do not yet have enough connected-platform performance data for this reporting period. We will keep monitoring the connection and include the available results in your next update.</p>';

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#292524;">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <div style="overflow:hidden;border-radius:18px;background:#ffffff;">
        <div style="padding:28px;background:#1c3c34;color:#ffffff;">
          <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Seam Media</div>
          <h1 style="margin:8px 0 0;font-size:28px;line-height:1.2;">Your 30-day social update</h1>
        </div>
        <div style="padding:28px;">
          <p>Hi ${escapeHtml(report.recipientName)},</p>
          <p>Here is your social media performance update for ${escapeHtml(formatPeriodDate(report.periodStart))} to ${escapeHtml(formatPeriodDate(report.periodEnd))}.</p>
          ${report.hasData ? `
            <h2 style="margin:24px 0 4px;color:#1c3c34;font-size:19px;">At a glance</h2>
            <p style="margin:0;color:#78716c;font-size:13px;">The headline results across your connected channels</p>
            ${summaryCardsHtml(summary.metrics)}
            ${dailyTrendHtml(report)}
            ${channelContributionHtml(report)}
            ${engagementBreakdownHtml(report)}
            ${topPostsHtml(report)}
            <div style="margin:20px 0;padding:18px;border-radius:12px;background:#f0fdf4;border-left:4px solid #22c55e;">
              <h2 style="margin:0 0 10px;color:#1c3c34;font-size:17px;">What changed</h2>
              ${summary.highlights.map((highlight) => `<p style="margin:6px 0;color:#44403c;font-size:14px;line-height:1.5;">${escapeHtml(highlight)}</p>`).join('')}
            </div>
            <div style="margin:20px 0;padding:18px;border-radius:12px;background:#f5f5f0;">
              <h2 style="margin:0 0 8px;color:#1c3c34;font-size:17px;">Our focus for the next period</h2>
              <p style="margin:0;color:#44403c;font-size:14px;line-height:1.55;">${escapeHtml(summary.focus)}</p>
            </div>` : ''}
          ${platformHtml}
          ${report.hasData ? dashboardButtonHtml() : ''}
          ${report.hasData ? '<p style="font-size:13px;color:#78716c;">These figures come directly from the connected social platforms and can change slightly as each platform finalises its reporting.</p>' : ''}
          <p>If you would like to discuss the results or adjust the content focus for the next month, simply reply to this email.</p>
          <p style="margin-bottom:0;">Thanks,<br>Heath<br>Seam Media</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

export interface EmailTransport {
  readonly name: 'resend' | 'gmail' | 'preview';
  send(input: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ messageId?: string }>;
}

export class ResendEmailTransport implements EmailTransport {
  readonly name = 'resend' as const;

  async send(input: { to: string; subject: string; text: string; html: string }) {
    if (!REPORTS_GLOBAL_ENABLED) throw new Error('Client analytics email delivery is globally disabled.');
    if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured.');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CLIENT_ANALYTICS_FROM || 'Seam Media <notifications@seammedia.com.au>',
        reply_to: process.env.CLIENT_ANALYTICS_REPLY_TO || 'contact@seammedia.com.au',
        ...input,
      }),
    });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok) throw new Error(payload.message || `Resend returned ${response.status}.`);
    return { messageId: payload.id };
  }
}

export class PreviewEmailTransport implements EmailTransport {
  readonly name = 'preview' as const;
  async send() {
    return {};
  }
}

export function isDueInMelbourne(now: Date, weekday: number, sendTime: string) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: REPORT_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  const weekdayNumber: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const [targetHour, targetMinute] = sendTime.slice(0, 5).split(':').map(Number);
  const currentMinutes = Number(part('hour')) * 60 + Number(part('minute'));
  const targetMinutes = targetHour * 60 + targetMinute;
  return weekdayNumber[part('weekday')] === weekday && currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 60;
}

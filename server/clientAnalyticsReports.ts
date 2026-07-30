import type { SupabaseClient } from '@supabase/supabase-js';

export const REPORT_TIMEZONE = 'Australia/Melbourne';
export const REPORT_LOOKBACK_DAYS = 30;
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
  hasData: boolean;
  dataNote?: string;
};

export type ReportRequest = {
  clientId: string;
  clientName: string;
  recipientName?: string | null;
  periodEnd?: string;
  lookbackDays?: number;
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

export interface AnalyticsProvider {
  readonly name: ClientAnalyticsReport['provider'];
  getReport(request: ReportRequest): Promise<ClientAnalyticsReport>;
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

  private async getBreakdown(fromDate: string, toDate: string) {
    if (!this.apiKey) throw new Error('Zernio analytics is not configured.');
    const url = new URL('https://zernio.com/api/v1/analytics/daily-metrics');
    url.searchParams.set('profileId', this.profileId);
    url.searchParams.set('fromDate', `${fromDate}T00:00:00.000Z`);
    url.searchParams.set('toDate', `${toDate}T23:59:59.999Z`);
    url.searchParams.set('source', 'all');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const payload = await response.json().catch(() => ({})) as {
      platformBreakdown?: ZernioPlatformBreakdown[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error || `Zernio analytics returned ${response.status}.`);
    }
    return Array.isArray(payload.platformBreakdown) ? payload.platformBreakdown : [];
  }

  async getReport(request: ReportRequest) {
    const periods = reportingPeriods({ periodEnd: request.periodEnd, lookbackDays: request.lookbackDays });
    const [current, previous] = await Promise.all([
      this.getBreakdown(periods.periodStart, periods.periodEnd),
      this.getBreakdown(periods.previousPeriodStart, periods.previousPeriodEnd),
    ]);
    return buildReportFromZernioBreakdowns(request, current, previous);
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
        published_at: `${publishedAt}T08:00:00.000Z`,
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
    return buildReportFromSnapshots(
      request,
      [...rows('instagram', 5, 840, periods.periodStart), ...rows('facebook', 4, 510, periods.periodStart)],
      [...rows('instagram', 4, 690, periods.previousPeriodStart), ...rows('facebook', 4, 470, periods.previousPeriodStart)],
      this.name,
    );
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

export function buildClientAnalyticsEmail(report: ClientAnalyticsReport) {
  const subject = `${report.clientName}: your 30-day social performance update`;
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
    for (const platform of report.platforms.filter((item) => item.posts > 0)) {
      lines.push(`${titleCase(platform.platform)}:`, '');
      lines.push(`- Published posts measured: ${platform.posts}`);
      for (const metric of platform.metrics) {
        lines.push(`- ${metric.label}: ${formatNumber(metric.value)}${changeWords(metric.changePercent)}`);
      }
      lines.push('');
    }
    lines.push('These figures come directly from the connected social platforms and can change slightly as each platform finalises its reporting.', '');
  }

  lines.push('If you would like to discuss the results or adjust the content focus for the next month, simply reply to this email.', '', 'Thanks,', 'Heath', 'Seam Media');
  const text = lines.join('\n');

  const platformHtml = report.hasData
    ? report.platforms.filter((item) => item.posts > 0).map((platform) => `
      <div style="margin:24px 0;padding:20px;border:1px solid #e7e5e4;border-radius:14px;background:#ffffff;">
        <h2 style="margin:0 0 14px;color:#1c3c34;font-size:20px;">${escapeHtml(titleCase(platform.platform))}</h2>
        <ul style="margin:0;padding-left:20px;color:#44403c;">
          <li style="margin:8px 0;">Published posts measured: ${platform.posts}</li>
          ${platform.metrics.map((metric) => `<li style="margin:8px 0;">${escapeHtml(metric.label)}: <strong>${formatNumber(metric.value)}</strong>${escapeHtml(changeWords(metric.changePercent))}</li>`).join('')}
        </ul>
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
          ${platformHtml}
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

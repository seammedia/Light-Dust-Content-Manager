import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Eye,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Play,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Post } from '../types';

interface ClientAnalyticsProps {
  posts: Post[];
  clientId: string;
  pin: string;
}

type BaseMetricKey = 'impressions' | 'reach' | 'likes' | 'comments' | 'shares' | 'saves' | 'clicks' | 'views';
type PortalMetricKey = BaseMetricKey | 'engagements' | 'posts';
type ChartMetricKey = 'reach' | 'impressions' | 'engagements' | 'views';

type AnalyticsMetric = {
  key: PortalMetricKey;
  label: string;
  value: number;
  previousValue: number | null;
  changePercent: number | null;
};

type DailyPoint = {
  date: string;
  posts: number;
  metrics: Record<BaseMetricKey, number>;
};

type PlatformAnalytics = {
  platform: string;
  posts: number;
  previousPosts: number;
  metrics: AnalyticsMetric[];
};

type TopPost = {
  id: string;
  content: string;
  publishedAt: string | null;
  platform: string;
  thumbnailUrl: string | null;
  postUrl: string | null;
  metrics: Record<BaseMetricKey | 'engagements' | 'engagementRate', number>;
};

type IntelligenceSummary = {
  analytics: {
    hasData: boolean;
    provider: 'zernio_api' | 'zernio_snapshots' | 'mock';
    periodStart: string;
    periodEnd: string;
    sampledPosts: number;
    metrics: AnalyticsMetric[];
    platforms: PlatformAnalytics[];
    dailySeries?: DailyPoint[];
    dailyAttribution?: 'received' | 'published';
    topPosts?: TopPost[];
    dataNote?: string;
    liveAnalyticsError?: string | null;
  };
  learnings: Array<{ statement: string; recommendation: string; confidence: number; sample_size: number }>;
};

const chartMetricLabels: Record<ChartMetricKey, string> = {
  reach: 'Reach',
  impressions: 'Impressions',
  engagements: 'Engagements',
  views: 'Video views',
};

const platformColours: Record<string, string> = {
  facebook: '#2563eb',
  instagram: '#c026d3',
  linkedin: '#0284c7',
  tiktok: '#111827',
  youtube: '#dc2626',
  pinterest: '#e11d48',
  threads: '#44403c',
  twitter: '#0f172a',
  bluesky: '#0ea5e9',
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-AU').format(Math.round(value));
const formatCompact = (value: number) => new Intl.NumberFormat('en-AU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const formatDate = (value: string | null | undefined, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-AU', options);
};

function metricValue(metrics: AnalyticsMetric[], key: PortalMetricKey) {
  return metrics.find((metric) => metric.key === key)?.value || 0;
}

function dailyMetricValue(point: DailyPoint, key: ChartMetricKey) {
  if (key === 'engagements') return point.metrics.likes + point.metrics.comments + point.metrics.shares + point.metrics.saves;
  return point.metrics[key] || 0;
}

function platformMetricValue(platform: PlatformAnalytics, key: ChartMetricKey) {
  if (key === 'engagements') {
    return ['likes', 'comments', 'shares', 'saves']
      .reduce((total, metricKey) => total + metricValue(platform.metrics, metricKey as BaseMetricKey), 0);
  }
  return metricValue(platform.metrics, key);
}

export function ClientAnalytics({ posts, clientId, pin }: ClientAnalyticsProps) {
  const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lookbackDays, setLookbackDays] = useState<30 | 60 | 90>(30);
  const [trendMetric, setTrendMetric] = useState<ChartMetricKey>('reach');
  const [channelMetric, setChannelMetric] = useState<ChartMetricKey>('reach');

  useEffect(() => {
    const controller = new AbortController();
    setLoadingAnalytics(true);
    setLoadError(false);
    fetch(`/api/content-context?clientId=${encodeURIComponent(clientId)}&lookbackDays=${lookbackDays}&includeAnalyticsDetails=1`, {
      headers: { 'x-portal-pin': pin },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Analytics could not be loaded.')))
      .then((value) => setIntelligence(value))
      .catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setLoadError(true);
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingAnalytics(false); });
    return () => controller.abort();
  }, [clientId, pin, lookbackDays]);

  const analytics = intelligence?.analytics;
  const headlineMetrics = analytics?.metrics.filter((metric) =>
    ['reach', 'impressions', 'engagements', 'clicks', 'views', 'posts'].includes(metric.key)
  ) || [];
  const availableChartMetrics = useMemo(() => (Object.keys(chartMetricLabels) as ChartMetricKey[]).filter((metric) => {
    if (metric === 'engagements') return analytics?.metrics.some((item) => ['engagements', 'likes', 'comments', 'shares', 'saves'].includes(item.key));
    return analytics?.metrics.some((item) => item.key === metric);
  }), [analytics?.metrics]);
  useEffect(() => {
    const firstAvailable = availableChartMetrics[0];
    if (!firstAvailable) return;
    if (!availableChartMetrics.includes(trendMetric)) setTrendMetric(firstAvailable);
    if (!availableChartMetrics.includes(channelMetric)) setChannelMetric(firstAvailable);
  }, [availableChartMetrics, trendMetric, channelMetric]);
  const platforms = analytics?.platforms.filter((platform) => platform.posts > 0) || [];
  const published = posts.filter((post) => post.status === 'Posted').length;
  const approved = posts.filter((post) => post.status === 'Approved').length;
  const awaitingApproval = posts.filter((post) => post.status === 'For Approval').length;
  const withVideo = posts.filter((post) => post.mediaType === 'video').length;
  const withCarousel = posts.filter((post) => (post.imageUrls?.length || 0) > 1).length;
  const reach = metricValue(headlineMetrics, 'reach');
  const impressions = metricValue(headlineMetrics, 'impressions');
  const engagements = metricValue(headlineMetrics, 'engagements');
  const sampledPosts = analytics?.sampledPosts || 0;
  const engagementBase = reach || impressions;
  const engagementRate = engagementBase ? (engagements / engagementBase) * 100 : 0;
  const averageReach = sampledPosts ? reach / sampledPosts : 0;
  const strongestPlatform = useMemo(() => [...platforms].sort((left, right) => {
    const rightValue = platformMetricValue(right, 'reach') || platformMetricValue(right, 'impressions') || platformMetricValue(right, 'engagements');
    const leftValue = platformMetricValue(left, 'reach') || platformMetricValue(left, 'impressions') || platformMetricValue(left, 'engagements');
    return rightValue - leftValue;
  })[0], [platforms]);

  const statusRows = [
    ['Published', published, '#16a34a'],
    ['Approved', approved, '#4a6741'],
    ['Needs approval', awaitingApproval, '#d97706'],
    ['Draft or revision', Math.max(0, posts.length - published - approved - awaitingApproval), '#a8a29e'],
  ] as const;

  const engagementParts = [
    { label: 'Likes', value: metricValue(analytics?.metrics || [], 'likes'), colour: '#4a6741', icon: Heart },
    { label: 'Comments', value: metricValue(analytics?.metrics || [], 'comments'), colour: '#2563eb', icon: MessageCircle },
    { label: 'Shares', value: metricValue(analytics?.metrics || [], 'shares'), colour: '#d97706', icon: Share2 },
    { label: 'Saves', value: metricValue(analytics?.metrics || [], 'saves'), colour: '#9333ea', icon: CheckCircle2 },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[#2c3d2d] bg-[#1f2b20] px-5 py-6 text-white shadow-[0_28px_70px_rgba(28,38,29,0.18)] sm:px-8 sm:py-8 lg:px-10">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#88b477]/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
              <Sparkles className="h-3.5 w-3.5" /> Performance overview
            </div>
            <h2 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">Your social performance, made clear.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">See what changed, which channels contributed and what content is earning attention.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {analytics?.periodStart ? `${formatDate(analytics.periodStart)} to ${formatDate(analytics.periodEnd)}` : `Last ${lookbackDays} days`}</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span>{analytics?.liveAnalyticsError ? 'Latest synced platform data' : 'Connected-platform data'}</span>
            </div>
          </div>

          <div className="xl:min-w-[510px]">
            <div className="flex w-fit rounded-xl border border-white/10 bg-black/15 p-1" aria-label="Analytics date range">
              {([30, 60, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={lookbackDays === days}
                  onClick={() => setLookbackDays(days)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4 ${lookbackDays === days ? 'bg-white text-[#1f2b20] shadow-sm' : 'text-white/55 hover:bg-white/10 hover:text-white'}`}
                >
                  {days} days
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              <HeroStat label="Engagement rate" value={engagementBase ? `${engagementRate.toFixed(1)}%` : 'Not available'} />
              <HeroStat label="Avg. reach / post" value={reach ? formatCompact(averageReach) : 'Not available'} />
              <HeroStat label="Strongest channel" value={strongestPlatform ? titleCase(strongestPlatform.platform) : 'Collecting data'} />
            </div>
          </div>
        </div>
      </section>

      {loadingAnalytics && !analytics ? (
        <div className="ui-surface flex min-h-64 items-center justify-center rounded-3xl border border-stone-200 bg-white text-sm text-stone-500 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-green" /> Loading connected-platform results...
        </div>
      ) : loadError && !analytics ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="font-semibold">Analytics could not be loaded right now.</p>
          <p className="mt-2 text-sm leading-6 text-red-800/75">Please refresh the page in a moment. Your content and connected accounts have not been affected.</p>
        </div>
      ) : analytics?.hasData ? (
        <>
          <div className="ui-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {headlineMetrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
            <section className="ui-surface rounded-[26px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading
                eyebrow="Daily trend"
                title="How performance moved"
                description={analytics.dailyAttribution === 'received' ? 'Daily gains recorded across your connected channels.' : 'Results grouped by the day each post was published.'}
              />
              <MetricTabs value={trendMetric} onChange={setTrendMetric} available={headlineMetrics.map((metric) => metric.key)} />
              <div className="mt-5">
                <TrendChart points={analytics.dailySeries || []} metric={trendMetric} />
              </div>
            </section>

            <section className="ui-surface rounded-[26px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading eyebrow="Period comparison" title={`Current ${lookbackDays} days vs previous`} description="A like-for-like view of the headline results." />
              <div className="mt-6 space-y-5">
                {headlineMetrics.filter((metric) => ['reach', 'impressions', 'engagements', 'views'].includes(metric.key)).slice(0, 4).map((metric) => (
                  <ComparisonRow key={metric.key} metric={metric} />
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="ui-surface rounded-[26px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading eyebrow="Channel contribution" title="Performance by platform" description="Compare the channels that are contributing to this period." />
              <MetricTabs value={channelMetric} onChange={setChannelMetric} available={headlineMetrics.map((metric) => metric.key)} />
              <div className="mt-6 space-y-5">
                <PlatformBars platforms={platforms} metric={channelMetric} />
              </div>
            </section>

            <section className="ui-surface rounded-[26px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeading eyebrow="Engagement quality" title="How people responded" description="A breakdown of visible interactions across connected channels." />
              <EngagementDonut parts={engagementParts} total={engagements} />
            </section>
          </div>

          <section className="ui-surface overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-5 sm:px-6">
              <SectionHeading eyebrow="Top content" title="Posts earning the most attention" description="Ranked by the strongest available performance signal for this reporting period." />
            </div>
            <TopPosts posts={analytics.topPosts || []} />
          </section>
        </>
      ) : (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><TrendingUp className="h-5 w-5" /></div>
          <p className="mt-5 text-lg font-semibold">Connected-platform results are still being collected.</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/70">{analytics?.dataNote || 'Charts will populate as the connected accounts return performance data.'}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="ui-surface rounded-[26px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Content workflow" title="Publishing progress" description="The current status of content in your workspace." />
          <div className="mt-6 grid gap-6 sm:grid-cols-[190px_1fr] sm:items-center">
            <DonutSummary rows={statusRows} total={posts.length} centreValue={published} centreLabel="published" />
            <div className="space-y-4">
              {statusRows.map(([label, count, colour]) => (
                <LegendRow key={label} label={label} value={count} colour={colour} total={posts.length} />
              ))}
            </div>
          </div>
        </section>

        <section className="ui-surface rounded-[26px] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Format mix" title="What you are publishing" description="The balance of video, carousel and single-image content." />
          <div className="mt-7 space-y-6">
            <FormatBar label="Video" value={withVideo} total={posts.length} colour="#7c3aed" icon={Play} />
            <FormatBar label="Carousel" value={withCarousel} total={posts.length} colour="#2563eb" icon={BarChart3} />
            <FormatBar label="Single image and other" value={Math.max(0, posts.length - withVideo - withCarousel)} total={posts.length} colour="#4a6741" icon={Eye} />
          </div>
        </section>
      </div>

      {intelligence?.learnings?.length ? (
        <section className="overflow-hidden rounded-[26px] border border-[#d8e4d4] bg-[#f1f6ef] p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="What happens next" title="Insights shaping the next content cycle" description="Evidence-based recommendations being applied to future planning." />
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-green shadow-sm"><Lightbulb className="h-3.5 w-3.5" /> Learning loop active</div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {intelligence.learnings.slice(0, 6).map((learning, index) => (
              <article key={`${learning.statement}-${index}`} className="rounded-2xl border border-white bg-white/85 p-5 shadow-[0_10px_30px_rgba(36,53,34,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e1ecdd] text-brand-green"><Sparkles className="h-4 w-4" /></span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{Math.round(learning.confidence * 100)}% confidence</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-6 text-brand-dark">{learning.statement}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-500">{learning.recommendation}</p>
                <p className="mt-4 text-xs text-stone-400">Based on {learning.sample_size} measured posts</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="px-1 text-xs leading-5 text-stone-400">Results come directly from connected social platforms and may change slightly as each platform finalises its reporting. Metrics are shown only when returned by the platform.</p>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-3 py-3.5 last:border-r-0 sm:px-4">
      <p className="truncate text-sm font-semibold text-white sm:text-base">{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40 sm:text-[10px]">{label}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-green">{eyebrow}</p>
      <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-brand-dark">{title}</h3>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-stone-500">{description}</p>
    </div>
  );
}

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const icons: Partial<Record<PortalMetricKey, typeof BarChart3>> = {
    reach: Users,
    impressions: Send,
    engagements: Heart,
    clicks: MousePointerClick,
    views: Eye,
    posts: CheckCircle2,
  };
  const tones: Partial<Record<PortalMetricKey, string>> = {
    reach: 'bg-blue-50 text-blue-700',
    impressions: 'bg-emerald-50 text-emerald-700',
    engagements: 'bg-amber-50 text-amber-700',
    clicks: 'bg-cyan-50 text-cyan-700',
    views: 'bg-fuchsia-50 text-fuchsia-700',
    posts: 'bg-violet-50 text-violet-700',
  };
  const Icon = icons[metric.key] || CircleAlert;
  return (
    <article className="ui-surface ui-surface-interactive rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex rounded-xl p-2.5 ${tones[metric.key] || 'bg-stone-50 text-stone-700'}`}><Icon className="h-5 w-5" /></span>
        <ChangeBadge change={metric.changePercent} />
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-brand-dark">{formatCompact(metric.value)}</p>
      <p className="mt-1 text-xs font-medium text-stone-500">{metric.label}</p>
      <p className="mt-3 text-[11px] text-stone-400">{metric.previousValue === null ? 'No previous comparison yet' : `Previous ${formatCompact(metric.previousValue)}`}</p>
    </article>
  );
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) return <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-500">New</span>;
  const positive = change > 0;
  const negative = change < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${positive ? 'bg-emerald-50 text-emerald-700' : negative ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-500'}`}>
      <Icon className="h-3 w-3" /> {positive ? '+' : ''}{change}%
    </span>
  );
}

function MetricTabs({ value, onChange, available }: { value: ChartMetricKey; onChange: (value: ChartMetricKey) => void; available: PortalMetricKey[] }) {
  return (
    <div className="mt-5 flex flex-wrap gap-1 rounded-xl bg-stone-100/80 p-1.5" aria-label="Chart metric">
      {(Object.keys(chartMetricLabels) as ChartMetricKey[]).map((metric) => {
        const isAvailable = metric === 'engagements'
          ? ['engagements', 'likes', 'comments', 'shares', 'saves'].some((key) => available.includes(key as PortalMetricKey))
          : available.includes(metric);
        return (
          <button
            key={metric}
            type="button"
            disabled={!isAvailable}
            aria-pressed={value === metric}
            onClick={() => onChange(metric)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${value === metric ? 'bg-white text-brand-dark shadow-sm' : isAvailable ? 'text-stone-500 hover:bg-white/70 hover:text-brand-dark' : 'cursor-not-allowed text-stone-300'}`}
          >
            {chartMetricLabels[metric]}
          </button>
        );
      })}
    </div>
  );
}

function TrendChart({ points, metric }: { points: DailyPoint[]; metric: ChartMetricKey }) {
  if (!points.length) {
    return <ChartEmpty icon={TrendingUp} message="Daily trend data will appear here as connected channels return day-by-day results." />;
  }
  const width = 840;
  const height = 260;
  const padding = { left: 58, right: 18, top: 18, bottom: 38 };
  const values = points.map((point) => dailyMetricValue(point, metric));
  const maximum = Math.max(...values, 1);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coordinates = points.map((point, index) => {
    const x = padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - (dailyMetricValue(point, metric) / maximum) * plotHeight;
    return { x, y, point };
  });
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = `${padding.left},${padding.top + plotHeight} ${line} ${padding.left + plotWidth},${padding.top + plotHeight}`;
  const total = values.reduce((sum, value) => sum + value, 0);
  const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><p className="text-2xl font-semibold text-brand-dark">{formatCompact(total)}</p><p className="text-xs text-stone-400">Total {chartMetricLabels[metric].toLowerCase()} in this trend</p></div>
        <div className="flex items-center gap-2 text-xs text-stone-400"><span className="h-2 w-2 rounded-full bg-brand-green" /> Daily result</div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${chartMetricLabels[metric]} by day`} className="min-w-[620px] w-full">
          <defs>
            <linearGradient id={`analytics-area-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a6741" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#4a6741" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + plotHeight * ratio;
            const label = maximum * (1 - ratio);
            return <g key={ratio}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e7e5e4" strokeDasharray="4 6" /><text x={padding.left - 10} y={y + 4} textAnchor="end" fill="#a8a29e" fontSize="10">{formatCompact(label)}</text></g>;
          })}
          <polygon points={area} fill={`url(#analytics-area-${metric})`} />
          <polyline points={line} fill="none" stroke="#4a6741" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {coordinates.filter((_, index) => points.length <= 14 || index === points.length - 1).map(({ x, y, point }) => (
            <circle key={point.date} cx={x} cy={y} r="4" fill="#fff" stroke="#4a6741" strokeWidth="2.5"><title>{formatDate(point.date)}: {formatNumber(dailyMetricValue(point, metric))}</title></circle>
          ))}
          {labelIndexes.map((index) => <text key={points[index].date} x={coordinates[index].x} y={height - 10} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill="#78716c" fontSize="11">{formatDate(points[index].date, { day: 'numeric', month: 'short' })}</text>)}
        </svg>
      </div>
    </div>
  );
}

function ComparisonRow({ metric }: { metric: AnalyticsMetric }) {
  const maximum = Math.max(metric.value, metric.previousValue || 0, 1);
  const previousWidth = ((metric.previousValue || 0) / maximum) * 100;
  const currentWidth = (metric.value / maximum) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-stone-600">{metric.label}</span><ChangeBadge change={metric.changePercent} /></div>
      <div className="space-y-2">
        <div className="grid grid-cols-[58px_1fr_auto] items-center gap-2 text-[11px] text-stone-400"><span>Current</span><div className="h-2.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-brand-green" style={{ width: `${currentWidth}%` }} /></div><span className="min-w-12 text-right font-semibold text-brand-dark">{formatCompact(metric.value)}</span></div>
        <div className="grid grid-cols-[58px_1fr_auto] items-center gap-2 text-[11px] text-stone-400"><span>Previous</span><div className="h-2.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-stone-300" style={{ width: `${previousWidth}%` }} /></div><span className="min-w-12 text-right font-semibold text-stone-500">{metric.previousValue === null ? 'N/A' : formatCompact(metric.previousValue)}</span></div>
      </div>
    </div>
  );
}

function PlatformBars({ platforms, metric }: { platforms: PlatformAnalytics[]; metric: ChartMetricKey }) {
  if (!platforms.length) return <ChartEmpty icon={BarChart3} message="Platform comparisons will appear when channel-level results are available." />;
  const values = platforms.map((platform) => platformMetricValue(platform, metric));
  const maximum = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  return (
    <>
      {platforms.map((platform) => {
        const value = platformMetricValue(platform, metric);
        const share = total ? Math.round((value / total) * 100) : 0;
        const colour = platformColours[platform.platform] || '#4a6741';
        return (
          <div key={platform.platform}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colour }} /><span className="truncate text-sm font-semibold capitalize text-brand-dark">{titleCase(platform.platform)}</span><span className="text-xs text-stone-400">{platform.posts} {platform.posts === 1 ? 'post' : 'posts'}</span></div>
              <div className="text-right"><span className="text-sm font-semibold text-brand-dark">{formatCompact(value)}</span><span className="ml-2 text-xs text-stone-400">{share}%</span></div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value / maximum) * 100}%`, backgroundColor: colour }} /></div>
          </div>
        );
      })}
    </>
  );
}

function EngagementDonut({ parts, total }: { parts: Array<{ label: string; value: number; colour: string; icon: typeof Heart }>; total: number }) {
  const measuredTotal = parts.reduce((sum, part) => sum + part.value, 0);
  let cursor = 0;
  const gradient = measuredTotal ? `conic-gradient(${parts.map((part) => {
    const start = cursor;
    cursor += (part.value / measuredTotal) * 100;
    return `${part.colour} ${start}% ${cursor}%`;
  }).join(', ')})` : 'conic-gradient(#e7e5e4 0 100%)';
  return (
    <div className="mt-6 grid gap-7 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="relative mx-auto h-44 w-44 rounded-full" style={{ background: gradient }} role="img" aria-label={`${formatNumber(measuredTotal)} total visible engagements`}>
        <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white text-center"><p className="text-2xl font-semibold text-brand-dark">{formatCompact(total || measuredTotal)}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Engagements</p></div>
      </div>
      <div className="space-y-3">
        {parts.map((part) => {
          const Icon = part.icon;
          return <div key={part.label} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm"><Icon className="h-3.5 w-3.5" style={{ color: part.colour }} /></span><span className="text-sm text-stone-600">{part.label}</span></div><div className="text-right"><span className="font-semibold text-brand-dark">{formatCompact(part.value)}</span><span className="ml-2 text-xs text-stone-400">{measuredTotal ? Math.round((part.value / measuredTotal) * 100) : 0}%</span></div></div>;
        })}
      </div>
    </div>
  );
}

function TopPosts({ posts }: { posts: TopPost[] }) {
  if (!posts.length) return <div className="px-6 py-12"><ChartEmpty icon={Sparkles} message="Top-performing posts will appear here when post-level analytics are returned." /></div>;
  return (
    <div className="divide-y divide-stone-100">
      {posts.slice(0, 6).map((post, index) => {
        const mainValue = post.metrics.reach || post.metrics.impressions || post.metrics.views || post.metrics.engagements;
        const mainLabel = post.metrics.reach ? 'reach' : post.metrics.impressions ? 'impressions' : post.metrics.views ? 'views' : 'engagements';
        const content = post.content || `${titleCase(post.platform)} post`;
        const body = (
          <div className="grid grid-cols-[28px_64px_minmax(0,1fr)] items-center gap-4 px-5 py-4 transition-colors hover:bg-stone-50/70 sm:grid-cols-[28px_64px_minmax(0,1fr)_auto] sm:px-6">
            <span className="text-sm font-semibold text-stone-300">{String(index + 1).padStart(2, '0')}</span>
            <PostThumbnail src={post.thumbnailUrl} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400"><span className="capitalize" style={{ color: platformColours[post.platform] || '#4a6741' }}>{titleCase(post.platform)}</span>{post.publishedAt ? <><span className="h-1 w-1 rounded-full bg-stone-300" /><span>{formatDate(post.publishedAt)}</span></> : null}</div>
              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-5 text-brand-dark">{content}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400"><span>{formatCompact(post.metrics.engagements)} engagements</span>{post.metrics.clicks ? <span>{formatCompact(post.metrics.clicks)} clicks</span> : null}{post.metrics.engagementRate ? <span>{post.metrics.engagementRate.toFixed(1)}% engagement rate</span> : null}</div>
            </div>
            <div className="col-start-3 sm:col-start-auto sm:text-right"><p className="text-lg font-semibold text-brand-dark">{formatCompact(mainValue)}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{mainLabel}</p></div>
          </div>
        );
        return post.postUrl ? <a key={post.id} href={post.postUrl} target="_blank" rel="noreferrer" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-inset">{body}</a> : <div key={post.id}>{body}</div>;
      })}
    </div>
  );
}

function PostThumbnail({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-stone-100 text-stone-400">
      {src && !failed ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <Eye className="h-5 w-5" />}
    </div>
  );
}

function DonutSummary({ rows, total, centreValue, centreLabel }: { rows: ReadonlyArray<readonly [string, number, string]>; total: number; centreValue: number; centreLabel: string }) {
  let cursor = 0;
  const gradient = total ? `conic-gradient(${rows.map(([, value, colour]) => {
    const start = cursor;
    cursor += (value / total) * 100;
    return `${colour} ${start}% ${cursor}%`;
  }).join(', ')})` : 'conic-gradient(#e7e5e4 0 100%)';
  return <div className="relative mx-auto h-44 w-44 rounded-full" style={{ background: gradient }}><div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white"><p className="text-3xl font-semibold text-brand-dark">{centreValue}</p><p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{centreLabel}</p></div></div>;
}

function LegendRow({ label, value, colour, total }: { label: string; value: number; colour: string; total: number }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} /><span className="text-sm text-stone-600">{label}</span></div><div className="flex items-center gap-3"><span className="text-xs text-stone-400">{percentage}%</span><span className="min-w-6 text-right font-semibold text-brand-dark">{value}</span></div></div>;
}

function FormatBar({ label, value, total, colour, icon: Icon }: { label: string; value: number; total: number; colour: string; icon: typeof Play }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-50"><Icon className="h-4 w-4" style={{ color: colour }} /></span><span className="text-sm font-medium text-stone-600">{label}</span></div><div><span className="font-semibold text-brand-dark">{value}</span><span className="ml-2 text-xs text-stone-400">{percentage}%</span></div></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: colour }} /></div>
    </div>
  );
}

function ChartEmpty({ icon: Icon, message }: { icon: typeof TrendingUp; message: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-400 shadow-sm"><Icon className="h-5 w-5" /></span><p className="mt-3 max-w-sm text-sm leading-6 text-stone-500">{message}</p></div>;
}

function titleCase(value: string) {
  return value.replace(/(^|[\s_-])\w/g, (match) => match.toUpperCase()).replace(/[_-]/g, ' ');
}

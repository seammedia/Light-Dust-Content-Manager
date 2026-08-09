import { useEffect, useState } from 'react';
import { BarChart3, CalendarCheck, CheckCircle2, CircleAlert, Eye, Lightbulb, Loader2, MousePointerClick, Send } from 'lucide-react';
import { Post } from '../types';

interface ClientAnalyticsProps {
  posts: Post[];
  clientId: string;
  pin: string;
}

type IntelligenceSummary = {
  analytics: {
    hasData: boolean;
    provider: 'zernio_api' | 'zernio_snapshots' | 'mock';
    periodStart: string;
    periodEnd: string;
    sampledPosts: number;
    metrics: Array<{ key: string; label: string; value: number; previousValue: number | null; changePercent: number | null }>;
    platforms: Array<{ platform: string; posts: number; metrics: Array<{ key: string; label: string; value: number; changePercent: number | null }> }>;
    dataNote?: string;
    liveAnalyticsError?: string | null;
  };
  learnings: Array<{ statement: string; recommendation: string; confidence: number; sample_size: number }>;
};

export function ClientAnalytics({ posts, clientId, pin }: ClientAnalyticsProps) {
  const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/content-context?clientId=${encodeURIComponent(clientId)}`, { headers: { 'x-portal-pin': pin } })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (active && value) setIntelligence(value); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoadingAnalytics(false); });
    return () => { active = false; };
  }, [clientId, pin]);
  const published = posts.filter((post) => post.status === 'Posted').length;
  const approved = posts.filter((post) => post.status === 'Approved').length;
  const awaitingApproval = posts.filter((post) => post.status === 'For Approval').length;
  const withVideo = posts.filter((post) => post.mediaType === 'video').length;
  const withCarousel = posts.filter((post) => (post.imageUrls?.length || 0) > 1).length;

  const statusRows = [
    ['Published', published, 'bg-emerald-500'],
    ['Approved', approved, 'bg-brand-green'],
    ['Needs approval', awaitingApproval, 'bg-amber-500'],
    ['Draft or revision', Math.max(0, posts.length - published - approved - awaitingApproval), 'bg-stone-400'],
  ] as const;
  const iconFor = (key: string) => key === 'reach' ? BarChart3
    : key === 'impressions' ? Send
      : key === 'clicks' ? MousePointerClick
        : key === 'views' ? Eye
          : key === 'posts' ? CheckCircle2
            : CircleAlert;
  const metricTones: Record<string, string> = {
    reach: 'bg-blue-50 text-blue-700',
    impressions: 'bg-emerald-50 text-emerald-700',
    engagements: 'bg-amber-50 text-amber-700',
    clicks: 'bg-cyan-50 text-cyan-700',
    views: 'bg-fuchsia-50 text-fuchsia-700',
    posts: 'bg-violet-50 text-violet-700',
  };
  const headlineMetrics = intelligence?.analytics.metrics.filter((metric) =>
    ['reach', 'impressions', 'engagements', 'clicks', 'views', 'posts'].includes(metric.key)
  ) || [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Performance analytics</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Content performance</h2>
        <p className="mt-2 max-w-2xl text-stone-500">
          {intelligence?.analytics.periodStart
            ? `Live connected-platform results for ${intelligence.analytics.periodStart} to ${intelligence.analytics.periodEnd}.`
            : 'Live connected-platform results for the last 30 completed days.'}
        </p>
      </div>

      {loadingAnalytics ? (
        <div className="ui-surface flex items-center justify-center rounded-2xl border border-stone-200 bg-white py-16 text-sm text-stone-500 shadow-sm">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-brand-green" /> Loading live analytics...
        </div>
      ) : intelligence?.analytics.hasData ? (
        <>
          <div className="ui-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {headlineMetrics.map((metric) => {
              const Icon = iconFor(metric.key);
              return (
                <section key={metric.key} className="ui-surface ui-surface-interactive rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className={`mb-4 inline-flex rounded-xl p-2.5 ${metricTones[metric.key] || 'bg-stone-50 text-stone-700'}`}><Icon className="h-5 w-5" /></div>
                  <p className="text-3xl font-semibold text-brand-dark">{metric.value.toLocaleString()}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-stone-500">{metric.label}</span>
                    {metric.changePercent !== null && (
                      <span className={metric.changePercent > 0 ? 'text-emerald-700' : metric.changePercent < 0 ? 'text-red-700' : 'text-stone-500'}>
                        {metric.changePercent > 0 ? '+' : ''}{metric.changePercent}%
                      </span>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          <section className="ui-surface rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-brand-dark">Results by platform</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {intelligence.analytics.platforms.filter((platform) => platform.posts > 0).map((platform) => (
                <div key={platform.platform} className="rounded-xl bg-stone-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold capitalize text-brand-dark">{platform.platform}</p>
                    <span className="text-xs text-stone-500">{platform.posts} posts</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
                    {platform.metrics.map((metric) => (
                      <div key={metric.key}>
                        <p className="text-xs text-stone-500">{metric.label}</p>
                        <p className="mt-0.5 font-semibold text-brand-dark">{metric.value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-semibold">No connected-platform results are available for this 30-day period yet.</p>
          <p className="mt-2 text-sm leading-6">{intelligence?.analytics.dataNote || 'Analytics will appear here after connected accounts return performance data.'}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="ui-surface rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><CalendarCheck className="h-5 w-5 text-brand-green" /><h3 className="text-lg font-semibold text-brand-dark">Content status</h3></div>
          <div className="mt-6 space-y-5">
            {statusRows.map(([label, count, colour]) => {
              const width = posts.length ? Math.round((count / posts.length) * 100) : 0;
              return (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm"><span className="text-stone-600">{label}</span><span className="font-semibold text-brand-dark">{count}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${colour}`} style={{ width: `${width}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="ui-surface rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-dark">Content mix</h3>
          <div className="mt-6 space-y-4">
            <Metric label="Videos" value={withVideo} />
            <Metric label="Carousels" value={withCarousel} />
            <Metric label="Images and other" value={Math.max(0, posts.length - withVideo - withCarousel)} />
          </div>
          <p className="mt-6 rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-500">The learning loop uses the live performance above to improve future format, timing and content recommendations.</p>
        </section>
      </div>

      {intelligence?.learnings?.length ? (
        <section className="ui-surface rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><Lightbulb className="h-5 w-5 text-brand-green" /><h3 className="text-lg font-semibold text-brand-dark">What the learning loop is applying</h3></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {intelligence.learnings.slice(0, 6).map((learning, index) => (
              <div key={`${learning.statement}-${index}`} className="rounded-xl bg-stone-50 p-4">
                <p className="text-sm font-medium text-brand-dark">{learning.statement}</p>
                <p className="mt-2 text-sm leading-6 text-stone-500">{learning.recommendation}</p>
                <p className="mt-2 text-xs text-stone-400">Based on {learning.sample_size} posts · {Math.round(learning.confidence * 100)}% confidence</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between border-b border-stone-100 pb-3"><span className="text-sm text-stone-600">{label}</span><span className="text-lg font-semibold text-brand-dark">{value}</span></div>;
}

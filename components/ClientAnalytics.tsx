import { useEffect, useState } from 'react';
import { BarChart3, CalendarCheck, CheckCircle2, CircleAlert, Lightbulb, Send } from 'lucide-react';
import { Post } from '../types';

interface ClientAnalyticsProps {
  posts: Post[];
  clientId: string;
  pin: string;
}

type IntelligenceSummary = {
  analytics: { sampledPosts: number; impressions: number; reach: number; engagements: number; clicks: number; views: number };
  learnings: Array<{ statement: string; recommendation: string; confidence: number; sample_size: number }>;
};

export function ClientAnalytics({ posts, clientId, pin }: ClientAnalyticsProps) {
  const [intelligence, setIntelligence] = useState<IntelligenceSummary | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/content-context?clientId=${encodeURIComponent(clientId)}`, { headers: { 'x-portal-pin': pin } })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (active && value) setIntelligence(value); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [clientId, pin]);
  const published = posts.filter((post) => post.status === 'Posted').length;
  const approved = posts.filter((post) => post.status === 'Approved').length;
  const awaitingApproval = posts.filter((post) => post.status === 'For Approval').length;
  const reviewed = published + approved;
  const approvalRate = posts.length ? Math.round((reviewed / posts.length) * 100) : 0;
  const withVideo = posts.filter((post) => post.mediaType === 'video').length;
  const withCarousel = posts.filter((post) => (post.imageUrls?.length || 0) > 1).length;

  const statusRows = [
    ['Published', published, 'bg-emerald-500'],
    ['Approved', approved, 'bg-brand-green'],
    ['Needs approval', awaitingApproval, 'bg-amber-500'],
    ['Draft or revision', Math.max(0, posts.length - published - approved - awaitingApproval), 'bg-stone-400'],
  ] as const;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Max analytics</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Content performance</h2>
        <p className="mt-2 max-w-2xl text-stone-500">A live view of your content workflow, approvals and publishing activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(intelligence?.analytics.sampledPosts ? [
          { label: 'Reach', value: intelligence.analytics.reach.toLocaleString(), icon: BarChart3, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Impressions', value: intelligence.analytics.impressions.toLocaleString(), icon: Send, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Engagements', value: intelligence.analytics.engagements.toLocaleString(), icon: CircleAlert, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Posts sampled', value: intelligence.analytics.sampledPosts, icon: CheckCircle2, tone: 'bg-violet-50 text-violet-700' },
        ] : [
          { label: 'Total content', value: posts.length, icon: BarChart3, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Published', value: published, icon: Send, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Needs approval', value: awaitingApproval, icon: CircleAlert, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Approval progress', value: `${approvalRate}%`, icon: CheckCircle2, tone: 'bg-violet-50 text-violet-700' },
        ]).map(({ label, value, icon: Icon, tone }) => (
          <section key={label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></div>
            <p className="text-3xl font-semibold text-brand-dark">{value}</p>
            <p className="mt-1 text-sm text-stone-500">{label}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
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

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-dark">Content mix</h3>
          <div className="mt-6 space-y-4">
            <Metric label="Videos" value={withVideo} />
            <Metric label="Carousels" value={withCarousel} />
            <Metric label="Images and other" value={Math.max(0, posts.length - withVideo - withCarousel)} />
          </div>
          <p className="mt-6 rounded-xl bg-stone-50 p-4 text-sm leading-6 text-stone-500">Audience reach and engagement will populate as connected social channels provide performance data.</p>
        </section>
      </div>

      {intelligence?.learnings?.length ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
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

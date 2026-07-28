import { ArrowRight, CalendarCheck, CheckCircle2, CircleAlert, Clock3, Palette } from 'lucide-react';
import { Client, Post } from '../types';
import { PortalSection } from './ClientPortalSidebar';

interface ClientHomeProps {
  client: Client;
  posts: Post[];
  onNavigate: (section: PortalSection) => void;
}

export function ClientHome({ client, posts, onNavigate }: ClientHomeProps) {
  const today = new Date().toISOString().slice(0, 10);
  const awaitingApproval = posts.filter((post) => post.status === 'For Approval').length;
  const approved = posts.filter((post) => post.status === 'Approved').length;
  const posted = posts.filter((post) => post.status === 'Posted').length;
  const upcomingPost = posts
    .filter((post) => post.date >= today && post.status !== 'Posted')
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const brandComplete = Boolean(
    client.website_url
    && client.logo_url
    && client.brand_colors?.length
    && client.primary_font
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Client portal</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Welcome back, {client.contact_name || client.name}</h2>
        <p className="mt-2 max-w-2xl text-stone-500">Review what needs your attention and keep your business details up to date in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Needs approval', value: awaitingApproval, icon: CircleAlert, tone: 'text-amber-700 bg-amber-50' },
          { label: 'Approved', value: approved, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
          { label: 'Published', value: posted, icon: CalendarCheck, tone: 'text-stone-700 bg-stone-100' },
          { label: 'Total content', value: posts.length, icon: Clock3, tone: 'text-blue-700 bg-blue-50' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></div>
            <p className="text-3xl font-semibold text-brand-dark">{value}</p>
            <p className="mt-1 text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Next up</p>
              <h3 className="mt-2 font-serif text-xl font-bold text-brand-dark">
                {upcomingPost?.title || 'Your calendar is clear'}
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                {upcomingPost
                  ? `Scheduled for ${new Date(`${upcomingPost.date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : 'There are no upcoming posts waiting in the calendar.'}
              </p>
            </div>
            {upcomingPost && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{upcomingPost.status}</span>}
          </div>
          <button type="button" onClick={() => onNavigate('content')} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-emerald-800">
            Open social calendar <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${brandComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-brand-dark">Brand profile</h3>
              <p className="text-sm text-stone-500">{brandComplete ? 'Your core brand details are complete.' : 'A few brand details still need attention.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('account')} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-emerald-800">
            {brandComplete ? 'Review brand details' : 'Complete brand details'} <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </div>
  );
}

import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { PortalSection } from './ClientPortalSidebar';
import { usePortalNotifications } from './usePortalNotifications';

interface ClientNotificationsProps {
  clientId: string;
  pin: string;
  onNavigate: (section: PortalSection) => void;
}

export function ClientNotifications({ clientId, pin, onNavigate }: ClientNotificationsProps) {
  const { items, loading, unread, markRead } = usePortalNotifications(clientId, pin);

  return (
    <section className="mx-auto w-full max-w-5xl p-5 sm:p-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-green">Workspace updates</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Notifications</h1>
          <p className="mt-2 text-sm text-stone-500">Keep track of content requests, approvals and account activity.</p>
        </div>
        <button
          type="button"
          onClick={() => void markRead()}
          disabled={!unread}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-brand-green transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all as read
        </button>
      </div>

      <div className="ui-surface overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {loading && !items.length ? (
          <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-green" /></div>
        ) : items.length ? (
          <div className="ui-stagger divide-y divide-stone-100">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  void markRead(item.id);
                  if (item.link) onNavigate(item.link);
                }}
                className={`flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50 sm:px-6 ${item.read_at ? '' : 'bg-emerald-50/50'}`}
              >
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? 'bg-stone-200' : 'bg-brand-green'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-dark">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-stone-500">{item.body}</span>
                  <span className="mt-2 block text-xs text-stone-400">
                    {new Date(item.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F0] text-brand-green"><Bell className="h-5 w-5" /></span>
            <h2 className="mt-4 font-serif text-xl font-bold text-brand-dark">You’re all caught up</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">New requests, comments and content updates will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

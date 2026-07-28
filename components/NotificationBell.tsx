import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { PortalSection } from './ClientPortalSidebar';
import { usePortalNotifications } from './usePortalNotifications';

interface NotificationBellProps {
  clientId: string;
  pin: string;
  onNavigate: (section: PortalSection) => void;
  onUnreadChange?: (count: number) => void;
}

export function NotificationBell({ clientId, pin, onNavigate, onUnreadChange }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { items, loading, unread, refresh, markRead } = usePortalNotifications(clientId, pin);

  useEffect(() => {
    onUnreadChange?.(unread);
  }, [onUnreadChange, unread]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={root} className="relative">
      <button type="button" onClick={() => { setOpen((value) => !value); void refresh(true); }} className="relative rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand-green" aria-label={`${unread} unread notifications`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <div><h2 className="font-semibold text-brand-dark">Notifications</h2><p className="text-xs text-stone-400">Updates on requests and content</p></div>
            <button type="button" onClick={() => void markRead()} disabled={!unread} className="flex items-center gap-1 text-xs font-semibold text-brand-green disabled:opacity-40"><CheckCheck className="h-4 w-4" /> Mark all read</button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {loading && !items.length ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-brand-green" /></div> : items.length ? items.map((item) => (
              <button key={item.id} type="button" onClick={() => { void markRead(item.id); if (item.link) onNavigate(item.link); setOpen(false); }} className={`block w-full border-b border-stone-100 px-4 py-3 text-left hover:bg-stone-50 ${item.read_at ? '' : 'bg-emerald-50/50'}`}>
                <div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? 'bg-stone-200' : 'bg-brand-green'}`} /><div><p className="text-sm font-semibold text-brand-dark">{item.title}</p><p className="mt-0.5 line-clamp-2 text-xs leading-5 text-stone-500">{item.body}</p><p className="mt-1 text-[11px] text-stone-400">{new Date(item.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p></div></div>
              </button>
            )) : <p className="p-8 text-center text-sm text-stone-500">You’re all caught up.</p>}
          </div>
          <button type="button" onClick={() => { onNavigate('notifications'); setOpen(false); }} className="w-full border-t border-stone-100 px-4 py-3 text-center text-xs font-semibold text-brand-green hover:bg-stone-50">View all notifications</button>
        </div>
      )}
    </div>
  );
}

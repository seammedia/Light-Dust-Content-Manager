import { AtSign, Inbox, MessageCircle, MessagesSquare } from 'lucide-react';

const inboxFilters = [
  { label: 'All activity', icon: Inbox },
  { label: 'Messages', icon: MessagesSquare },
  { label: 'Comments', icon: MessageCircle },
  { label: 'Mentions', icon: AtSign },
];

export function ClientSocialInbox({ onConnectAccounts }: { onConnectAccounts: () => void }) {
  return (
    <section className="mx-auto w-full max-w-6xl p-5 sm:p-8">
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-green">Pro rollout</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Social Inbox</h1>
        <p className="mt-2 text-sm text-stone-500">Bring messages, comments and mentions from connected social accounts into one place.</p>
      </div>

      <div className="grid min-h-[32rem] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:grid-cols-[14rem_1fr]">
        <nav aria-label="Social inbox filters" className="border-b border-stone-200 bg-stone-50/70 p-3 md:border-b-0 md:border-r">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400">Inbox</p>
          {inboxFilters.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              type="button"
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium ${index === 0 ? 'bg-white text-brand-dark shadow-sm' : 'text-stone-500 hover:bg-white hover:text-brand-dark'}`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              <span className="ml-auto text-xs text-stone-400">0</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-brand-green"><Inbox className="h-6 w-6" /></span>
          <h2 className="mt-5 font-serif text-2xl font-bold text-brand-dark">Your unified inbox is ready for rollout</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">Social conversations will appear here as channel inbox connections are enabled for Pro workspaces.</p>
          <button type="button" onClick={onConnectAccounts} className="mt-6 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark">
            View connected accounts
          </button>
        </div>
      </div>
    </section>
  );
}

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleHelp, Clock3, Loader2, MessageSquareText, Send } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabaseClient';

interface ClientSupportProps {
  client: Client;
  pin: string;
}

export function ClientSupport({ client, pin }: ClientSupportProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch(`/api/conversations?clientId=${encodeURIComponent(client.id)}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(pin ? { 'X-Portal-Pin': pin } : {}) } });
    if (response.ok) setConversations((await response.json()).conversations || []);
  }, [client.id, pin]);

  useEffect(() => {
    void loadRequests();
    const timer = window.setInterval(() => void loadRequests(), 30000);
    return () => window.clearInterval(timer);
  }, [loadRequests]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch('/api/support-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ clientId: client.id, pin, subject, message, priority }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send your request.');
      setSent(true);
      setSubject('');
      setMessage('');
      setPriority('normal');
      await loadRequests();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send your request.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center p-8 text-center lg:pt-20">
        <div className="rounded-full bg-emerald-50 p-4 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div>
        <h2 className="mt-5 font-serif text-3xl font-bold text-brand-dark">Support request sent</h2>
        <p className="mt-2 text-stone-500">Your request is now being triaged. Replies will appear in the platform and under the notification bell.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-brand-green hover:text-brand-green">View requests</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Help & support</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">How can we help?</h2>
        <p className="mt-2 text-stone-500">Log a request here so it can be tracked through to completion.</p>
      </div>
      <form onSubmit={submit} className="ui-surface rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><CircleHelp className="h-5 w-5 text-brand-green" /><h3 className="text-lg font-semibold text-brand-dark">New support request</h3></div>
        <div className="space-y-5">
          <label className="block text-sm font-medium text-stone-700">Subject<input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" /></label>
          <label className="block text-sm font-medium text-stone-700">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"><option value="normal">Normal</option><option value="high">High - blocking my work</option></select></label>
          <label className="block text-sm font-medium text-stone-700">Details<textarea required rows={7} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what happened, what you expected, and which post or screen is involved." className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" /></label>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={sending} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{sending ? 'Sending…' : 'Send request'}
        </button>
      </form>
      <section className="space-y-3">
        <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-brand-green" /><h3 className="text-lg font-semibold text-brand-dark">Your requests</h3></div>
        {conversations.filter((conversation) => conversation.kind === 'support').length ? conversations.filter((conversation) => conversation.kind === 'support').map((conversation) => (
          <article key={conversation.id} className="ui-surface rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold text-brand-dark">{conversation.subject}</h4><p className="mt-1 flex items-center gap-1 text-xs text-stone-400"><Clock3 className="h-3.5 w-3.5" /> Updated {new Date(conversation.last_message_at).toLocaleString('en-AU')}</p></div><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold capitalize text-stone-600">{String(conversation.status).split('_').join(' ')}</span></div>
            <div className="mt-4 space-y-2">{(conversation.portal_messages || []).filter((message: any) => !message.is_internal).map((message: any) => <div key={message.id} className={`rounded-xl px-3 py-2.5 text-sm ${message.sender_type === 'client' ? 'ml-8 bg-stone-100 text-stone-700' : 'mr-8 bg-emerald-50 text-stone-700'}`}><p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-stone-400">{message.sender_type === 'client' ? 'You' : message.sender_name || 'Seam Media'}</p><p className="whitespace-pre-wrap">{message.body}</p></div>)}</div>
          </article>
        )) : <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-8 text-center text-sm text-stone-500">No support requests yet.</div>}
      </section>
    </div>
  );
}

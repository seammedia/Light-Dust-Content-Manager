import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clipboard,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Instagram,
  Loader2,
  MessageCircle,
  Save,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { OutreachDraft } from './types';

interface OutreachStudioProps {
  pin: string;
  drafts: OutreachDraft[];
  onChanged: () => Promise<void>;
}

interface OutreachForm {
  instagram_username: string;
  contact_name: string;
  business_name: string;
  industry: string;
  location: string;
  profile_notes: string;
  offer_focus: string;
  graphic_direction: string;
}

const EMPTY_FORM: OutreachForm = {
  instagram_username: '',
  contact_name: '',
  business_name: '',
  industry: '',
  location: '',
  profile_notes: '',
  offer_focus: 'Social media content and strategy',
  graphic_direction: '',
};

const normaliseUsername = (value: string) => value.trim().replace(/^@+/, '');

function DraftStatus({ draft }: { draft: OutreachDraft }) {
  if (draft.status === 'sent') {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">Sent</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">Ready to review</span>;
}

export function OutreachStudio({ pin, drafts, onChanged }: OutreachStudioProps) {
  const [form, setForm] = useState<OutreachForm>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(drafts[0]?.id || null);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const visibleDrafts = useMemo(
    () => drafts.filter((draft) => draft.status !== 'archived'),
    [drafts],
  );
  const selectedDraft = visibleDrafts.find((draft) => draft.id === selectedId) || visibleDrafts[0] || null;

  useEffect(() => {
    if (!selectedDraft) {
      setSelectedId(null);
      setMessage('');
      return;
    }
    if (selectedId !== selectedDraft.id) setSelectedId(selectedDraft.id);
    setMessage(selectedDraft.message);
  }, [selectedDraft?.id, selectedDraft?.message, selectedId]);

  const request = async (action: string, body: Record<string, unknown>) => {
    const response = await fetch('/api/agency-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-portal-pin': pin },
      body: JSON.stringify({ action, pin, ...body }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Outreach Studio is unavailable.');
    return result;
  };

  const updateForm = <K extends keyof OutreachForm>(key: K, value: OutreachForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const generateDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    setError('');
    try {
      const result = await request('generateOutreachDraft', {
        draft: {
          ...form,
          instagram_username: normaliseUsername(form.instagram_username),
        },
      });
      setForm(EMPTY_FORM);
      await onChanged();
      setSelectedId(result.draft.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The outreach draft could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  const saveMessage = async () => {
    if (!selectedDraft) return;
    setSaving(true);
    setError('');
    try {
      await request('updateOutreachDraft', { draft: { id: selectedDraft.id, message } });
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The message could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Your browser could not copy the message. You can still select and copy it from the message box.');
    }
  };

  const markSent = async () => {
    if (!selectedDraft) return;
    setMarkingSent(true);
    setError('');
    try {
      await request('markOutreachSent', { id: selectedDraft.id, message });
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The outreach could not be marked as sent.');
    } finally {
      setMarkingSent(false);
    }
  };

  return (
    <div className="mt-6 space-y-5">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-gradient-to-r from-[#F3F7F1] to-white px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-green p-3 text-white"><Sparkles className="h-5 w-5" /></div>
              <div>
                <h2 className="font-serif text-xl font-bold text-brand-dark">Instagram Outreach Studio</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
                  Add the details you can see on a new follower's profile. The studio prepares a tailored graphic and friendly first message for you to review and send manually.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Manual sending keeps the account safe
            </div>
          </div>
        </div>

        <form onSubmit={generateDraft} className="p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-semibold text-stone-700">
              Instagram username <span className="text-red-500">*</span>
              <div className="relative mt-1.5">
                <Instagram className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input required value={form.instagram_username} onChange={(event) => updateForm('instagram_username', event.target.value)} placeholder="@businessname" className="w-full rounded-lg border border-stone-300 py-2.5 pl-9 pr-3 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
              </div>
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Contact name
              <input value={form.contact_name} onChange={(event) => updateForm('contact_name', event.target.value)} placeholder="First name, if shown" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Business name <span className="text-red-500">*</span>
              <input required value={form.business_name} onChange={(event) => updateForm('business_name', event.target.value)} placeholder="Business name" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Industry
              <input value={form.industry} onChange={(event) => updateForm('industry', event.target.value)} placeholder="e.g. Builder, café, finance" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Location
              <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="e.g. Ballarat, Victoria" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-semibold text-stone-700 md:col-span-2">
              What should we offer?
              <input value={form.offer_focus} onChange={(event) => updateForm('offer_focus', event.target.value)} placeholder="Social media content and strategy" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-semibold text-stone-700 md:col-span-2 xl:col-span-4">
              Profile notes
              <textarea required rows={3} value={form.profile_notes} onChange={(event) => updateForm('profile_notes', event.target.value)} placeholder="Paste or summarise their bio, services, recent posts, visual style and anything specific worth mentioning." className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-semibold text-stone-700 md:col-span-2 xl:col-span-4">
              Graphic direction <span className="font-normal text-stone-400">(optional)</span>
              <input value={form.graphic_direction} onChange={(event) => updateForm('graphic_direction', event.target.value)} placeholder="e.g. A polished promo tile for their spring offer, premium and minimal" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-5">
            <p className="text-xs leading-5 text-stone-500">Nothing is sent to Instagram. You stay in control of the final message and attachment.</p>
            <button type="submit" disabled={generating} className="flex items-center gap-2 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? 'Creating graphic and message…' : 'Create outreach draft'}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto" aria-label="Dismiss error">×</button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-200 px-5 py-4">
            <h3 className="font-serif text-lg font-bold text-brand-dark">Draft queue</h3>
            <p className="mt-1 text-xs text-stone-500">{visibleDrafts.length} prepared outreach {visibleDrafts.length === 1 ? 'draft' : 'drafts'}</p>
          </div>
          <div className="max-h-[680px] divide-y divide-stone-100 overflow-y-auto">
            {visibleDrafts.map((draft) => (
              <button key={draft.id} type="button" onClick={() => setSelectedId(draft.id)} className={`w-full px-5 py-4 text-left transition-colors ${selectedDraft?.id === draft.id ? 'bg-[#F3F7F1]' : 'hover:bg-stone-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-brand-dark">{draft.business_name}</p>
                    <p className="mt-0.5 truncate text-sm text-stone-500">@{draft.instagram_username}</p>
                  </div>
                  <DraftStatus draft={draft} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">{draft.profile_notes || draft.industry || 'Custom outreach draft'}</p>
              </button>
            ))}
            {visibleDrafts.length === 0 && (
              <div className="px-6 py-14 text-center">
                <UserPlus className="mx-auto h-9 w-9 text-stone-300" />
                <p className="mt-3 font-semibold text-brand-dark">No drafts yet</p>
                <p className="mt-1 text-sm text-stone-500">Add a new follower above to prepare the first one.</p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          {selectedDraft ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-brand-dark">{selectedDraft.business_name}</h3>
                    <DraftStatus draft={selectedDraft} />
                  </div>
                  <p className="mt-1 text-xs text-stone-500">Prepared for @{selectedDraft.instagram_username}</p>
                </div>
                <a href={`https://www.instagram.com/${encodeURIComponent(selectedDraft.instagram_username)}/`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
                  <ExternalLink className="h-4 w-4" /> Open profile
                </a>
              </div>

              <div className="grid lg:grid-cols-2">
                <div className="border-b border-stone-200 p-5 lg:border-b-0 lg:border-r">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-brand-dark"><ImageIcon className="h-4 w-4 text-brand-green" /> Custom graphic</div>
                    {selectedDraft.graphic_url && (
                      <a href={selectedDraft.graphic_url} download={`${selectedDraft.instagram_username}-outreach.png`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold text-brand-green hover:text-emerald-800"><Download className="h-3.5 w-3.5" /> Download</a>
                    )}
                  </div>
                  {selectedDraft.graphic_url ? (
                    <img loading="lazy" src={selectedDraft.graphic_url} alt={`Custom outreach concept for ${selectedDraft.business_name}`} className="aspect-square w-full rounded-xl border border-stone-200 object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-400">Graphic unavailable</div>
                  )}
                  {selectedDraft.graphic_headline && <p className="mt-3 text-xs leading-5 text-stone-500"><span className="font-semibold text-stone-700">Concept:</span> {selectedDraft.graphic_headline}</p>}
                </div>

                <div className="flex flex-col p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-brand-dark"><MessageCircle className="h-4 w-4 text-brand-green" /> Message draft</div>
                    <button type="button" onClick={copyMessage} className="flex items-center gap-1.5 text-xs font-semibold text-brand-green hover:text-emerald-800">
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy message'}
                    </button>
                  </div>
                  <textarea value={message} onChange={(event) => setMessage(event.target.value.replace(/[—–]/g, ' - '))} rows={14} className="min-h-[300px] w-full flex-1 resize-y rounded-xl border border-stone-300 px-4 py-3 text-sm leading-6 text-stone-700 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={saveMessage} disabled={saving || message === selectedDraft.message} className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-40">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save edit
                    </button>
                    {selectedDraft.status !== 'sent' && (
                      <button type="button" onClick={markSent} disabled={markingSent} className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                        {markingSent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Mark sent
                      </button>
                    )}
                  </div>
                  {selectedDraft.status === 'sent' && (
                    <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-800">
                      Added to the lead pipeline and marked as contacted.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center px-6 text-center">
              <div>
                <Sparkles className="mx-auto h-10 w-10 text-stone-300" />
                <p className="mt-3 font-semibold text-brand-dark">Your review area will appear here</p>
                <p className="mt-1 text-sm text-stone-500">Create an outreach draft to review the graphic and message together.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { CalendarClock, DollarSign, X } from 'lucide-react';
import { AgencyLead, AgencyLeadStage, LEAD_SOURCES, LEAD_STAGES } from './types';

interface LeadModalProps {
  lead: AgencyLead | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (lead: Partial<AgencyLead>) => Promise<void>;
}

const emptyLead: Partial<AgencyLead> = {
  name: '',
  company: '',
  email: '',
  phone: '',
  stage: 'warm',
  source: 'manual',
  conversion_source: null,
  source_platform: null,
  source_campaign: null,
  owner: 'Heath',
  conversion_probability: 35,
  monthly_value: null,
  lifetime_value: null,
  client_status: 'active',
  churn_reason: '',
  next_action: '',
  last_contacted: null,
  follow_up_at: null,
  notes: '',
};

function toLocalDateTime(value?: string | null) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

export function LeadModal({ lead, open, saving, onClose, onSave }: LeadModalProps) {
  const [form, setForm] = useState<Partial<AgencyLead>>(emptyLead);

  useEffect(() => {
    setForm(lead ? { ...lead, client_status: lead.client?.provisioning_status === 'paused' || lead.client?.provisioning_status === 'cancelled' ? lead.client.provisioning_status : 'active' } : { ...emptyLead });
  }, [lead, open]);

  if (!open) return null;

  const update = <K extends keyof AgencyLead>(key: K, value: AgencyLead[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      ...form,
      id: lead?.id,
      last_contacted: toIsoDateTime(form.last_contacted),
      follow_up_at: toIsoDateTime(form.follow_up_at),
      monthly_value: form.monthly_value === null || form.monthly_value === undefined ? null : Number(form.monthly_value),
      lifetime_value: form.lifetime_value === null || form.lifetime_value === undefined ? null : Number(form.lifetime_value),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-brand-dark">{lead ? `Edit ${lead.name}` : 'Add warm lead'}</h2>
            <p className="mt-1 text-sm text-stone-500">Keep contact details, follow-ups and value in one place.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Close lead form">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              Name <span className="text-red-500">*</span>
              <input required value={form.name || ''} onChange={(event) => update('name', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Business
              <input value={form.company || ''} onChange={(event) => update('company', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Email
              <input type="email" value={form.email || ''} onChange={(event) => update('email', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Phone
              <input type="tel" value={form.phone || ''} onChange={(event) => update('phone', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Stage
              <select value={form.stage || 'warm'} onChange={(event) => update('stage', event.target.value as AgencyLeadStage)} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20">
                {LEAD_STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Lead source
              <select value={form.source || 'manual'} onChange={(event) => update('source', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20">
                {LEAD_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Conversion source
              <select value={form.conversion_source || ''} onChange={(event) => update('conversion_source', event.target.value || null)} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20">
                <option value="">Use lead source</option>
                {LEAD_SOURCES.filter((source) => source.value !== 'manual').map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
              </select>
              <span className="mt-1.5 block text-xs font-normal leading-5 text-stone-500">Set this when a lead converts. Leaving it blank credits the original lead source.</span>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Source platform
              <input value={form.source_platform || ''} onChange={(event) => update('source_platform', event.target.value || null)} placeholder="e.g. Instagram" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
              <span className="mt-1.5 block text-xs font-normal leading-5 text-stone-500">The platform where the lead submitted or responded.</span>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Source campaign
              <input value={form.source_campaign || ''} onChange={(event) => update('source_campaign', event.target.value || null)} placeholder="Exact campaign name from the ad platform" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
              <span className="mt-1.5 block text-xs font-normal leading-5 text-stone-500">Use the exact campaign label so results can be compared reliably.</span>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Owner
              <input value={form.owner || ''} onChange={(event) => update('owner', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Conversion probability: {form.conversion_probability || 0}%
              <input type="range" min="0" max="100" step="5" value={form.conversion_probability || 0} onChange={(event) => update('conversion_probability', Number(event.target.value))} className="mt-3 w-full accent-[#4F6B47]" />
            </label>
            {form.stage === 'converted' && lead?.client_id && (
              <>
                <label className="text-sm font-medium text-stone-700">
                  Client status
                  <select value={form.client_status || 'active'} onChange={(event) => update('client_status', event.target.value as AgencyLead['client_status'])} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20">
                    <option value="active">Active client</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled / offboarded</option>
                  </select>
                  <span className="mt-1.5 block text-xs font-normal leading-5 text-stone-500">Cancelling hides the client from active dashboards but preserves conversion and revenue history.</span>
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Sign-up date
                  <input type="date" value={form.sign_on_date || ''} onChange={(event) => update('sign_on_date', event.target.value || null)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
                </label>
                {(form.client_status === 'cancelled' || form.client_status === 'paused') && (
                  <>
                    <label className="text-sm font-medium text-stone-700">
                      Exit date
                      <input type="date" value={form.exit_date || ''} onChange={(event) => update('exit_date', event.target.value || null)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
                    </label>
                    <label className="text-sm font-medium text-stone-700">
                      Offboarding reason
                      <input value={form.churn_reason || ''} onChange={(event) => update('churn_reason', event.target.value)} placeholder="Reason for pausing or leaving" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
                    </label>
                  </>
                )}
              </>
            )}
          </div>

          <div className="my-6 border-t border-stone-200" />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-green" />Last contacted</span>
              <input type="datetime-local" value={toLocalDateTime(form.last_contacted)} onChange={(event) => update('last_contacted', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-orange-500" />Next follow-up</span>
              <input type="datetime-local" value={toLocalDateTime(form.follow_up_at)} onChange={(event) => update('follow_up_at', event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700 md:col-span-2">
              Next action
              <input value={form.next_action || ''} onChange={(event) => update('next_action', event.target.value)} placeholder="e.g. Call Thursday, send proposal, check budget" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
          </div>

          <div className="my-6 border-t border-stone-200" />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-brand-green" />Monthly value</span>
              <input type="number" min="0" step="0.01" value={form.monthly_value ?? ''} onChange={(event) => update('monthly_value', event.target.value ? Number(event.target.value) : null)} placeholder="0.00" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700">
              <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-amber-500" />Actual lifetime value</span>
              <input type="number" min="0" step="0.01" value={form.lifetime_value ?? ''} onChange={(event) => update('lifetime_value', event.target.value ? Number(event.target.value) : null)} placeholder="0.00" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
            <label className="text-sm font-medium text-stone-700 md:col-span-2">
              Notes
              <textarea value={form.notes || ''} onChange={(event) => update('notes', event.target.value)} rows={5} placeholder="Conversation notes, objections, context or anything useful for the next contact." className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-stone-200 pt-5">
            <button type="button" onClick={onClose} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50">
              {saving ? 'Saving...' : lead ? 'Save changes' : 'Add lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  HeartPulse,
  Loader2,
  Pencil,
  Search,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import {
  AgencyClientHealthUpdate,
  AgencyCurrentClient,
  ClientHealthConfidence,
  ClientIssueSeverity,
  ClientOnboardingStatus,
  ClientPaymentStatus,
  ClientRenewalSignal,
} from './types';

type CurrentClientsProps = {
  clients: AgencyCurrentClient[];
  saving: boolean;
  onSave: (client: AgencyClientHealthUpdate) => Promise<void>;
};

const money = (value: number) => value.toLocaleString('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const formatDate = (value?: string | null) => value
  ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Not recorded';

const relativeDate = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  return formatDate(value);
};

const healthTone = (score: number) => {
  if (score >= 90) return { label: 'Champion', className: 'bg-emerald-100 text-emerald-800' };
  if (score >= 75) return { label: 'Healthy', className: 'bg-green-100 text-green-800' };
  if (score >= 60) return { label: 'Watch', className: 'bg-amber-100 text-amber-800' };
  if (score >= 40) return { label: 'Concerned', className: 'bg-orange-100 text-orange-800' };
  return { label: 'Critical', className: 'bg-red-100 text-red-800' };
};

const riskTone: Record<AgencyCurrentClient['risk_level'], { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-emerald-100 text-emerald-800' },
  watch: { label: 'Watch', className: 'bg-amber-100 text-amber-800' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
};

const selectClass = 'mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20';
const inputClass = 'mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20';

function SummaryCard({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-brand-dark">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tone}`}><Icon className="h-5 w-5" /></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </div>
  );
}

export function CurrentClients({ clients, saving, onSave }: CurrentClientsProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'attention' | 'new' | 'missing_value'>('all');
  const [selected, setSelected] = useState<AgencyCurrentClient | null>(null);
  const [form, setForm] = useState<AgencyClientHealthUpdate | null>(null);

  const knownMrr = clients.reduce((sum, client) => sum + Number(client.monthly_value || 0), 0);
  const atRiskMrr = clients
    .filter((client) => client.churn_risk >= 50)
    .reduce((sum, client) => sum + Number(client.monthly_value || 0), 0);
  const attentionCount = clients.filter((client) => client.churn_risk >= 35 || client.delivery.outstanding > 0).length;
  const onboardingCount = clients.filter((client) => client.onboarding_status !== 'complete' || client.provisioning_status === 'pending_intake').length;
  const missingValueCount = clients.filter((client) => !client.monthly_value).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch = !query || [client.name, client.contact_name, client.plan_name]
        .some((value) => String(value || '').toLowerCase().includes(query));
      const matchesFilter = filter === 'all'
        || (filter === 'attention' && (client.churn_risk >= 35 || client.delivery.outstanding > 0))
        || (filter === 'new' && client.onboarding_status !== 'complete')
        || (filter === 'missing_value' && !client.monthly_value);
      return matchesSearch && matchesFilter;
    }).sort((a, b) => b.churn_risk - a.churn_risk || a.name.localeCompare(b.name));
  }, [clients, filter, search]);

  const openClient = (client: AgencyCurrentClient) => {
    setSelected(client);
    setForm({
      id: client.id,
      monthly_value: client.monthly_value,
      start_date: client.start_date,
      relationship_health: client.relationship_health,
      health_note: client.health_note,
      confidence: client.confidence,
      last_meaningful_contact: client.last_meaningful_contact,
      next_action: client.next_action,
      next_action_due: client.next_action_due,
      open_issue: client.open_issue,
      issue_severity: client.issue_severity,
      payment_status: client.payment_status,
      onboarding_status: client.onboarding_status,
      renewal_signal: client.renewal_signal,
      scope_pressure: client.scope_pressure,
      performance_concern: client.performance_concern,
      positive_feedback_at: client.positive_feedback_at,
      internal_notes: client.internal_notes,
    });
  };

  const setField = <K extends keyof AgencyClientHealthUpdate>(key: K, value: AgencyClientHealthUpdate[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    await onSave(form);
    setSelected(null);
    setForm(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="New service clients" value={clients.length.toLocaleString()} detail={`${onboardingCount} still need onboarding attention`} icon={Users} tone="bg-emerald-50 text-emerald-700" />
        <SummaryCard label="Known monthly revenue" value={money(knownMrr)} detail={`${missingValueCount} client values still need to be entered`} icon={CircleDollarSign} tone="bg-blue-50 text-blue-700" />
        <SummaryCard label="At-risk revenue" value={money(atRiskMrr)} detail="Known MRR attached to clients scoring 50 or higher" icon={ShieldAlert} tone="bg-orange-50 text-orange-700" />
        <SummaryCard label="Needs attention" value={attentionCount.toLocaleString()} detail="Risk signal or an overdue delivery commitment" icon={HeartPulse} tone="bg-rose-50 text-rose-700" />
      </div>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-brand-dark">New-service client health</h2>
            <p className="mt-1 text-xs text-stone-500">Health is a human assessment. Churn risk is an explainable warning score, not a statistical probability.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search current clients" className="w-full rounded-lg border border-stone-300 py-2.5 pl-9 pr-3 text-sm sm:w-64" />
            </label>
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-600">
              <option value="all">All new-service clients</option>
              <option value="attention">Needs attention</option>
              <option value="new">Onboarding</option>
              <option value="missing_value">Missing MRR</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3">Client</th>
                <th className="px-4 py-3">Package / MRR</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Churn risk</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Last contact</th>
                <th className="px-4 py-3">Next action</th>
                <th className="px-5 py-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((client) => {
                const health = healthTone(client.relationship_health);
                const risk = riskTone[client.risk_level];
                return (
                  <tr key={client.id} className="align-top hover:bg-stone-50/80">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-brand-dark">{client.name}</p>
                      <p className="mt-1 text-xs text-stone-500">{client.contact_name || 'Contact not recorded'} · since {formatDate(client.start_date)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-brand-dark">{client.monthly_value ? money(Number(client.monthly_value)) : 'MRR needed'}</p>
                      <p className="mt-1 text-xs text-stone-500">{client.plan_name || 'Legacy / custom'}{client.monthly_value_source === 'plan' ? ' · package estimate' : ''}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${health.className}`}>{client.relationship_health} · {health.label}</span>
                      <p className="mt-1 text-[11px] capitalize text-stone-400">{client.confidence} confidence</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${risk.className}`}>{client.churn_risk} · {risk.label}</span>
                      <p className="mt-1 max-w-[230px] text-xs leading-5 text-stone-500">{client.risk_reasons[0] || 'No material warning signals'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {client.delivery.outstanding > 0
                        ? <span className="font-semibold text-red-700">{client.delivery.outstanding} outstanding</span>
                        : client.delivery.total === 0
                          ? <span className="text-stone-500">No posts this week</span>
                          : <span className="font-semibold text-emerald-700">{client.delivery.posted}/{client.delivery.total} posted</span>}
                      {client.analytics.last_sent_at
                        ? <p className="mt-1 text-xs text-stone-400">Report sent {relativeDate(client.analytics.last_sent_at)}</p>
                        : <p className="mt-1 text-xs text-stone-400">No report sent</p>}
                    </td>
                    <td className="px-4 py-4 text-sm text-stone-600">{relativeDate(client.last_meaningful_contact)}</td>
                    <td className="max-w-[260px] px-4 py-4">
                      <p className="text-sm text-stone-700">{client.next_action || 'Add a next action'}</p>
                      <p className={`mt-1 text-xs ${client.next_action_due && client.next_action_due < new Date().toISOString().slice(0, 10) ? 'font-semibold text-red-600' : 'text-stone-400'}`}>
                        {client.next_action_due ? `Due ${formatDate(client.next_action_due)}` : 'No due date'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => openClient(client)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 hover:border-brand-green hover:text-brand-green">
                        <Pencil className="h-3.5 w-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <div className="px-6 py-12 text-center text-sm text-stone-500">No clients match this view.</div>}
      </section>

      {selected && form && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={submit} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-6 py-5">
              <div>
                <p className="text-sm font-medium text-brand-green">Client health review</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-brand-dark">{selected.name}</h2>
                <p className="mt-1 text-sm text-stone-500">Record what you know. The risk score will update from these signals after saving.</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setForm(null); }} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Close client health review"><X className="h-5 w-5" /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <label className="text-sm font-medium text-stone-700">
                  Monthly recurring revenue
                  <input type="number" min="0" step="0.01" value={form.monthly_value ?? ''} onChange={(event) => setField('monthly_value', event.target.value === '' ? null : Number(event.target.value))} className={inputClass} placeholder="e.g. 399" />
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Client start date
                  <input type="date" value={form.start_date?.slice(0, 10) || ''} onChange={(event) => setField('start_date', event.target.value || null)} className={inputClass} />
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Assessment confidence
                  <select value={form.confidence} onChange={(event) => setField('confidence', event.target.value as ClientHealthConfidence)} className={selectClass}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-stone-700 md:col-span-2">
                  Relationship health: <span className="text-brand-green">{form.relationship_health}/100</span>
                  <input type="range" min="0" max="100" step="5" value={form.relationship_health} onChange={(event) => setField('relationship_health', Number(event.target.value))} className="mt-3 w-full accent-emerald-700" />
                  <span className="mt-1 flex justify-between text-[11px] text-stone-400"><span>Critical</span><span>Watch</span><span>Healthy</span><span>Champion</span></span>
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Last meaningful contact
                  <input type="date" value={form.last_meaningful_contact?.slice(0, 10) || ''} onChange={(event) => setField('last_meaningful_contact', event.target.value ? `${event.target.value}T00:00:00.000Z` : null)} className={inputClass} />
                </label>

                <label className="text-sm font-medium text-stone-700 md:col-span-2 xl:col-span-3">
                  Health note
                  <input value={form.health_note || ''} onChange={(event) => setField('health_note', event.target.value)} className={inputClass} placeholder="What is making this relationship healthy or difficult?" />
                </label>

                <label className="text-sm font-medium text-stone-700">
                  Onboarding
                  <select value={form.onboarding_status} onChange={(event) => setField('onboarding_status', event.target.value as ClientOnboardingStatus)} className={selectClass}>
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="complete">Complete</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Payment
                  <select value={form.payment_status} onChange={(event) => setField('payment_status', event.target.value as ClientPaymentStatus)} className={selectClass}>
                    <option value="unknown">Unknown</option>
                    <option value="current">Current</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Renewal signal
                  <select value={form.renewal_signal} onChange={(event) => setField('renewal_signal', event.target.value as ClientRenewalSignal)} className={selectClass}>
                    <option value="unknown">Unknown</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-stone-700">
                  Issue severity
                  <select value={form.issue_severity} onChange={(event) => setField('issue_severity', event.target.value as ClientIssueSeverity)} className={selectClass}>
                    <option value="none">No open issue</option>
                    <option value="watch">Watch</option>
                    <option value="concern">Concern</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-700 md:col-span-2">
                  Open issue
                  <input value={form.open_issue || ''} onChange={(event) => setField('open_issue', event.target.value)} className={inputClass} placeholder="Complaint, expectation gap, delay or other concern" />
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 text-sm font-medium text-stone-700">
                  <input type="checkbox" checked={form.scope_pressure} onChange={(event) => setField('scope_pressure', event.target.checked)} className="h-4 w-4 rounded border-stone-300 text-brand-green focus:ring-brand-green" />
                  Scope or revision pressure
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-4 text-sm font-medium text-stone-700">
                  <input type="checkbox" checked={form.performance_concern} onChange={(event) => setField('performance_concern', event.target.checked)} className="h-4 w-4 rounded border-stone-300 text-brand-green focus:ring-brand-green" />
                  Performance concern
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Last positive feedback
                  <input type="date" value={form.positive_feedback_at?.slice(0, 10) || ''} onChange={(event) => setField('positive_feedback_at', event.target.value ? `${event.target.value}T00:00:00.000Z` : null)} className={inputClass} />
                </label>

                <label className="text-sm font-medium text-stone-700 md:col-span-2">
                  Next action
                  <input value={form.next_action || ''} onChange={(event) => setField('next_action', event.target.value)} className={inputClass} placeholder="What needs to happen next?" />
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Next action due
                  <input type="date" value={form.next_action_due?.slice(0, 10) || ''} onChange={(event) => setField('next_action_due', event.target.value || null)} className={inputClass} />
                </label>

                <label className="text-sm font-medium text-stone-700 md:col-span-2 xl:col-span-3">
                  Internal notes
                  <textarea value={form.internal_notes || ''} onChange={(event) => setField('internal_notes', event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="Agency-only context, preferences and history" />
                </label>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold text-amber-900">Keep the score explainable</p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">Relationship health is your judgement. Churn risk is calculated from the facts above plus delivery and reporting signals. It is a prioritisation tool, not a promise that a client will leave.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                {selected.risk_reasons.length
                  ? <><CalendarClock className="h-4 w-4" />Current top signal: {selected.risk_reasons[0]}</>
                  : <><CheckCircle2 className="h-4 w-4 text-emerald-600" />No material warning signal recorded</>}
              </div>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save health review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

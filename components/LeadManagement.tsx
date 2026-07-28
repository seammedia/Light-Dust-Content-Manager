import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Edit3,
  Filter,
  Flame,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { LeadModal } from './lead-management/LeadModal';
import {
  AgencyLead,
  AgencyLeadStage,
  AgencyMarketingPeriod,
  LEAD_SOURCES,
  LEAD_STAGES,
  STAGE_STYLES,
} from './lead-management/types';

interface LeadManagementProps {
  pin: string;
}

type LeadTab = 'overview' | 'leads' | 'performance';

const LOST_STAGES: AgencyLeadStage[] = ['not_interested', 'no_response', 'not_qualified'];
const WARM_STAGES: AgencyLeadStage[] = ['warm', 'interested', 'call_booked', 'proposal_sent'];
const PAGE_SIZE = 25;
const INITIAL_WINDOW_START = '2026-07-15';
const INITIAL_WINDOW_END = '2026-08-15';

const sourceLabel = (value: string) => LEAD_SOURCES.find((source) => source.value === value)?.label || value.replace(/_/g, ' ');
const money = (value: number) => value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: value >= 1000 ? 0 : 2 });
const ratio = (numerator: number, denominator: number) => denominator > 0 ? `${(numerator / denominator).toFixed(2)}x` : '—';
const cost = (spend: number, count: number) => count > 0 ? money(spend / count) : '—';

function relativeDate(value?: string | null) {
  if (!value) return 'Never';
  const difference = new Date(value).getTime() - Date.now();
  const days = Math.round(difference / 86_400_000);
  if (days === 0) return difference < 0 ? 'Due today' : 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 14) return `In ${days} days`;
  if (days < -1 && days > -14) return `${Math.abs(days)} days overdue`;
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'green' }: { label: string; value: string; detail: string; icon: typeof Users; tone?: 'green' | 'orange' | 'blue' | 'purple' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-brand-dark">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </div>
  );
}

interface CampaignPerformanceRow {
  key: string;
  source: string;
  platform: string;
  campaign: string;
  leads: number;
  conversions: number;
  spend: number;
  initialRevenue: number;
  lifetimeRevenue: number;
}

function CampaignPerformanceTable({ rows }: { rows: CampaignPerformanceRow[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-4">
        <h2 className="font-serif text-lg font-bold text-brand-dark">Campaign conversion performance</h2>
        <p className="mt-1 text-xs text-stone-500">Compares exact campaign labels while keeping channel and platform attribution separate.</p>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead><tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500"><th className="px-5 py-3">Campaign</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Platform</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3 text-right">Conversions</th><th className="px-4 py-3 text-right">Conversion rate</th><th className="px-4 py-3 text-right">Spend</th><th className="px-4 py-3 text-right">Initial revenue</th><th className="px-5 py-3 text-right">ROAS</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-stone-50/80">
                  <td className="px-5 py-3 font-semibold text-brand-dark">{row.campaign}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{sourceLabel(row.source)}</td>
                  <td className="px-4 py-3 text-sm text-stone-600">{row.platform || 'Not recorded'}</td>
                  <td className="px-4 py-3 text-right text-sm text-stone-600">{row.leads}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-brand-dark">{row.conversions}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-brand-green">{row.leads ? `${(row.conversions / row.leads * 100).toFixed(1)}%` : '—'}</td>
                  <td className="px-4 py-3 text-right text-sm text-stone-600">{money(row.spend)}</td>
                  <td className="px-4 py-3 text-right text-sm text-stone-600">{money(row.initialRevenue)}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-brand-dark">{row.spend > 0 ? ratio(row.initialRevenue, row.spend) : 'Spend not assigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-sm text-stone-500">Add an exact campaign name to a lead or ad-stat entry to compare campaign conversions.</div>
      )}
    </section>
  );
}

const shiftMonth = (value: string, amount: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
};

const defaultMarketingPeriod = (periodStart = INITIAL_WINDOW_START, periodEnd = INITIAL_WINDOW_END): Partial<AgencyMarketingPeriod> => {
  return {
    period_start: periodStart,
    period_end: periodEnd,
    source: 'meta_ads',
    source_platform: '',
    source_campaign: '',
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    conversions: 0,
    conversion_revenue: 0,
    lifetime_revenue: 0,
    notes: '',
    is_estimate: false,
  };
};

export function LeadManagement({ pin }: LeadManagementProps) {
  const [leads, setLeads] = useState<AgencyLead[]>([]);
  const [periods, setPeriods] = useState<AgencyMarketingPeriod[]>([]);
  const [tab, setTab] = useState<LeadTab>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingRevenue, setSyncingRevenue] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('active');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<AgencyLead | null>(null);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [performanceWindow, setPerformanceWindow] = useState({ start: INITIAL_WINDOW_START, end: INITIAL_WINDOW_END });
  const [marketingForm, setMarketingForm] = useState<Partial<AgencyMarketingPeriod>>(defaultMarketingPeriod());

  const request = useCallback(async (method: 'GET' | 'POST', body?: unknown) => {
    const response = await fetch('/api/agency-leads', {
      method,
      headers: { 'Content-Type': 'application/json', 'x-portal-pin': pin },
      body: body ? JSON.stringify({ ...body as object, pin }) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Lead management is unavailable.');
    return result;
  }, [pin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request('GET');
      setLeads(result.leads || []);
      setPeriods(result.periods || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Lead management is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveLead = async (lead: Partial<AgencyLead>) => {
    setSaving(true);
    setError('');
    try {
      await request('POST', { action: lead.id ? 'updateLead' : 'createLead', lead });
      setLeadModalOpen(false);
      setSelectedLead(null);
      await fetchData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The lead could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const updateLead = async (id: string, updates: Partial<AgencyLead>) => {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...updates } : lead));
    try {
      await request('POST', { action: 'updateLead', lead: { id, ...updates } });
      await fetchData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The lead could not be updated.');
      await fetchData();
    }
  };

  const markContacted = async (lead: AgencyLead) => {
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 2);
    const nextStage = lead.stage === 'warm' || lead.stage === 'new' ? 'contacted_1' : lead.stage;
    await updateLead(lead.id, { last_contacted: new Date().toISOString(), follow_up_at: followUp.toISOString(), stage: nextStage });
  };

  const saveMarketingPeriod = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await request('POST', { action: 'saveMarketingPeriod', period: marketingForm });
      setMarketingOpen(false);
      setMarketingForm(defaultMarketingPeriod(performanceWindow.start, performanceWindow.end));
      await fetchData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The ad statistics could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const syncRevenue = async () => {
    setSyncingRevenue(true);
    setError('');
    try {
      const response = await fetch('/api/revenue-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portal-pin': pin },
        body: JSON.stringify({ pin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Revenue could not be synchronised.');
      await fetchData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Revenue could not be synchronised.');
    } finally {
      setSyncingRevenue(false);
    }
  };

  const activeLeads = useMemo(() => leads.filter((lead) => !lead.archived && !LOST_STAGES.includes(lead.stage)), [leads]);
  const warmLeads = useMemo(() => activeLeads.filter((lead) => WARM_STAGES.includes(lead.stage)), [activeLeads]);
  const dueFollowUps = useMemo(() => activeLeads
    .filter((lead) => lead.follow_up_at && new Date(lead.follow_up_at).getTime() <= Date.now() && lead.stage !== 'converted')
    .sort((a, b) => new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime()), [activeLeads]);
  const convertedLeads = useMemo(() => leads.filter((lead) => lead.stage === 'converted'), [leads]);
  const sourcePerformance = useMemo(() => LEAD_SOURCES
    .map((source) => {
      const sourceLeads = leads.filter((lead) => lead.source === source.value);
      const sourceConversions = convertedLeads.filter((lead) => (lead.conversion_source || lead.source) === source.value);
      const sourcePeriods = periods.filter((period) => period.source === source.value);
      const reportedLeads = sourcePeriods.reduce((sum, period) => sum + Number(period.leads || 0), 0);
      const reportedConversions = sourcePeriods.reduce((sum, period) => sum + Number(period.conversions || 0), 0);
      const leadCount = Math.max(sourceLeads.length, reportedLeads);
      const conversionCount = Math.max(sourceConversions.length, reportedConversions);
      const sourceSpend = sourcePeriods.reduce((sum, period) => sum + Number(period.spend || 0), 0);
      return {
        ...source,
        // Marketing-period totals cover leads that may never have received an
        // individual CRM record. Use the larger verified count, not the sum,
        // so manually entered totals and CRM rows are not double-counted.
        leads: leadCount,
        conversions: conversionCount,
        conversionRate: leadCount ? conversionCount / leadCount * 100 : 0,
        monthlyRevenue: sourceConversions.reduce((sum, lead) => sum + Number(lead.monthly_value || 0), 0),
        lifetimeRevenue: sourceConversions.reduce((sum, lead) => sum + Number(lead.lifetime_value || 0), 0),
        spend: sourceSpend,
      };
    })
    .filter((source) => source.leads > 0 || source.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions || b.conversionRate - a.conversionRate || b.leads - a.leads), [convertedLeads, leads, periods]);
  const topConversionSource = sourcePerformance.find((source) => source.conversions > 0);
  const campaignPerformance = useMemo(() => {
    const grouped = new Map<string, CampaignPerformanceRow & { recordLeads: number; recordConversions: number; periodLeads: number; periodConversions: number }>();
    const ensure = (source: string, platform: string, campaign: string) => {
      const key = `${source}::${platform.toLowerCase()}::${campaign.toLowerCase()}`;
      const existing = grouped.get(key);
      if (existing) return existing;
      const created = { key, source, platform, campaign, leads: 0, conversions: 0, spend: 0, initialRevenue: 0, lifetimeRevenue: 0, recordLeads: 0, recordConversions: 0, periodLeads: 0, periodConversions: 0 };
      grouped.set(key, created);
      return created;
    };
    leads.forEach((lead) => {
      if (!lead.source_campaign) return;
      const row = ensure(lead.conversion_source || lead.source, lead.source_platform || '', lead.source_campaign);
      row.recordLeads += 1;
      if (lead.stage === 'converted') {
        row.recordConversions += 1;
        row.initialRevenue += Number(lead.monthly_value || 0);
        row.lifetimeRevenue += Number(lead.lifetime_value || 0);
      }
    });
    periods.forEach((period) => {
      if (!period.source_campaign) return;
      const row = ensure(period.source, period.source_platform || '', period.source_campaign);
      row.periodLeads += Number(period.leads || 0);
      row.periodConversions += Number(period.conversions || 0);
      row.spend += Number(period.spend || 0);
      if (row.initialRevenue === 0) row.initialRevenue += Number(period.conversion_revenue || 0);
      if (row.lifetimeRevenue === 0) row.lifetimeRevenue += Number(period.lifetime_revenue || 0);
    });
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      leads: Math.max(row.recordLeads, row.periodLeads),
      conversions: Math.max(row.recordConversions, row.periodConversions),
    })).sort((a, b) => b.conversions - a.conversions || b.initialRevenue - a.initialRevenue || a.campaign.localeCompare(b.campaign));
  }, [leads, periods]);
  const weightedPipeline = activeLeads.reduce((sum, lead) => sum + Number(lead.monthly_value || 0) * (lead.conversion_probability / 100), 0);
  const totalLifetimeValue = convertedLeads.reduce((sum, lead) => sum + Number(lead.lifetime_value || 0), 0);
  const windowPeriods = useMemo(() => periods.filter((period) => (
    period.period_start <= performanceWindow.end && period.period_end >= performanceWindow.start
  )), [performanceWindow.end, performanceWindow.start, periods]);
  const windowSpend = windowPeriods.reduce((sum, period) => sum + Number(period.spend || 0), 0);
  const windowLeads = windowPeriods.reduce((sum, period) => sum + Number(period.leads || 0), 0);
  const windowConversions = windowPeriods.reduce((sum, period) => sum + Number(period.conversions || 0), 0);
  const windowRevenue = windowPeriods.reduce((sum, period) => sum + Number(period.conversion_revenue || 0), 0);
  const windowLifetimeRevenue = windowPeriods.reduce((sum, period) => sum + Number(period.lifetime_revenue || 0), 0);

  const movePerformanceWindow = (amount: number) => {
    setPerformanceWindow((current) => ({
      start: shiftMonth(current.start, amount),
      end: shiftMonth(current.end, amount),
    }));
  };

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch = !query || [lead.name, lead.company, lead.email, lead.phone].some((value) => value?.toLowerCase().includes(query));
      const matchesStage = stageFilter === 'all'
        || (stageFilter === 'active' && !lead.archived && !LOST_STAGES.includes(lead.stage))
        || (stageFilter === 'archived' && (lead.archived || LOST_STAGES.includes(lead.stage)))
        || lead.stage === stageFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      return matchesSearch && matchesStage && matchesSource;
    }).sort((a, b) => {
      const aDue = a.follow_up_at ? new Date(a.follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.follow_up_at ? new Date(b.follow_up_at).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [leads, search, sourceFilter, stageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const pagedLeads = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, stageFilter, sourceFilter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const stageCounts = LEAD_STAGES.map((stage) => ({ ...stage, count: leads.filter((lead) => lead.stage === stage.value).length })).filter((stage) => stage.count > 0);
  const maxStageCount = Math.max(...stageCounts.map((stage) => stage.count), 1);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-green" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1700px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Agency only</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Lead Management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">Track warm leads, follow-ups, conversions and which acquisition channels create the best clients.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={fetchData} className="rounded-lg border border-stone-300 bg-white p-2.5 text-stone-500 hover:bg-stone-50" aria-label="Refresh leads"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={syncRevenue} disabled={syncingRevenue} className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">{syncingRevenue ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}<span className="hidden sm:inline">{syncingRevenue ? 'Syncing…' : 'Sync revenue'}</span></button>
          <button type="button" onClick={() => { setSelectedLead(null); setLeadModalOpen(true); }} className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"><Plus className="h-4 w-4" /> Add warm lead</button>
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto" aria-label="Dismiss error"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mt-6 flex gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm sm:w-fit">
        {([
          ['overview', 'Overview', BarChart3],
          ['leads', 'Lead pipeline', Users],
          ['performance', 'Ad performance', Megaphone],
        ] as Array<[LeadTab, string, typeof Users]>).map(([value, label, Icon]) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${tab === value ? 'bg-brand-green text-white' : 'text-stone-500 hover:bg-stone-50 hover:text-brand-dark'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active leads" value={activeLeads.length.toLocaleString()} detail={`${warmLeads.length} warm or high-intent opportunities`} icon={Users} />
            <MetricCard label="Follow-ups due" value={dueFollowUps.length.toLocaleString()} detail="Due now or overdue and needing attention" icon={CalendarClock} tone="orange" />
            <MetricCard label="Weighted monthly pipeline" value={money(weightedPipeline)} detail="Monthly value adjusted by conversion probability" icon={TrendingUp} tone="blue" />
            <MetricCard label="Collected lifetime revenue" value={money(totalLifetimeValue)} detail="Actual paid Stripe invoices plus any manual revenue adjustments" icon={Target} tone="purple" />
          </div>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-brand-dark">Source performance</h2>
                <p className="mt-1 text-xs text-stone-500">Compares original lead sources with the channel credited when each client converts.</p>
              </div>
              {topConversionSource && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <span className="font-semibold">Top conversion source:</span> {topConversionSource.label} · {topConversionSource.conversions} {topConversionSource.conversions === 1 ? 'client' : 'clients'}
                </div>
              )}
            </div>
            {sourcePerformance.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      <th className="px-5 py-3">Channel</th>
                      <th className="px-4 py-3 text-right">Leads</th>
                      <th className="px-4 py-3 text-right">Conversions</th>
                      <th className="px-4 py-3 text-right">Conversion rate</th>
                      <th className="px-4 py-3 text-right">Monthly revenue</th>
                      <th className="px-4 py-3 text-right">Lifetime revenue</th>
                      <th className="px-5 py-3 text-right">Lifetime ROAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {sourcePerformance.map((source) => (
                      <tr key={source.value} className="hover:bg-stone-50/80">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-brand-dark">{source.label}</div>
                          <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-stone-100">
                            <div className="h-full rounded-full bg-brand-green" style={{ width: `${source.conversions ? Math.min(100, Math.max(8, source.conversionRate)) : 0}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-stone-600">{source.leads}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-brand-dark">{source.conversions}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-brand-green">{source.leads ? `${source.conversionRate.toFixed(1)}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-600">{money(source.monthlyRevenue)}</td>
                        <td className="px-4 py-3 text-right text-sm text-stone-600">{money(source.lifetimeRevenue)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-brand-dark">{source.spend > 0 ? ratio(source.lifetimeRevenue, source.spend) : source.lifetimeRevenue > 0 ? 'Organic' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-sm text-stone-500">Add lead sources to begin comparing channel performance.</div>
            )}
          </section>

          <CampaignPerformanceTable rows={campaignPerformance} />

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
                <div><h2 className="font-serif text-lg font-bold text-brand-dark">Follow-up queue</h2><p className="mt-1 text-xs text-stone-500">The most overdue conversations appear first.</p></div>
                <button type="button" onClick={() => setTab('leads')} className="flex items-center gap-1 text-sm font-semibold text-brand-green hover:text-emerald-800">View pipeline <ArrowRight className="h-4 w-4" /></button>
              </div>
              {dueFollowUps.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-14 text-center"><CheckCircle2 className="h-9 w-9 text-emerald-500" /><p className="mt-3 font-semibold text-brand-dark">No overdue follow-ups</p><p className="mt-1 text-sm text-stone-500">Anything scheduled for later will appear here when it is due.</p></div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {dueFollowUps.slice(0, 8).map((lead) => (
                    <div key={lead.id} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-stone-50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">{lead.name.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-brand-dark">{lead.name}{lead.company ? ` · ${lead.company}` : ''}</p><p className="mt-0.5 truncate text-xs text-stone-500">{lead.next_action || 'Follow up and confirm the next step'}</p></div>
                      <span className="text-xs font-semibold text-red-600">{relativeDate(lead.follow_up_at)}</span>
                      <button type="button" onClick={() => markContacted(lead)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 hover:border-brand-green hover:text-brand-green">Mark contacted</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /><h2 className="font-serif text-lg font-bold text-brand-dark">Pipeline by stage</h2></div>
              <div className="mt-5 space-y-3">
                {stageCounts.map((stage) => (
                  <button key={stage.value} type="button" onClick={() => { setStageFilter(stage.value); setTab('leads'); }} className="block w-full text-left">
                    <div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold text-stone-600">{stage.label}</span><span className="text-stone-400">{stage.count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.max(2, stage.count / maxStageCount * 100)}%` }} /></div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
            <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, business, email or phone" className="w-full rounded-lg border border-stone-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20" /></div>
            <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-stone-400" /><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-600"><option value="active">Active leads</option><option value="all">All stages</option><option value="archived">Archived / lost</option>{LEAD_STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></div>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-600"><option value="all">All lead sources</option>{LEAD_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left">
              <thead><tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500"><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Next action</th><th className="px-4 py-3">Follow-up</th><th className="px-4 py-3">Last contacted</th><th className="px-4 py-3">Lead source</th><th className="px-4 py-3">Conversion source</th><th className="px-4 py-3">Platform / campaign</th><th className="px-4 py-3 text-right">Monthly value</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {pagedLeads.map((lead) => {
                  const overdue = Boolean(lead.follow_up_at && new Date(lead.follow_up_at).getTime() <= Date.now() && lead.stage !== 'converted');
                  return (
                    <tr key={lead.id} className="hover:bg-stone-50/80">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-sm font-bold text-brand-green">{lead.name.slice(0, 1).toUpperCase()}</div><div className="min-w-0"><button type="button" onClick={() => { setSelectedLead(lead); setLeadModalOpen(true); }} className="max-w-[220px] truncate font-semibold text-brand-dark hover:text-brand-green">{lead.name}</button><p className="max-w-[220px] truncate text-xs text-stone-500">{lead.company || lead.email || 'No business added'}</p></div></div></td>
                      <td className="px-4 py-3"><select value={lead.stage} onChange={(event) => updateLead(lead.id, { stage: event.target.value as AgencyLeadStage })} className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none ${STAGE_STYLES[lead.stage]}`}>{LEAD_STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></td>
                      <td className="max-w-[230px] px-4 py-3 text-sm text-stone-600"><span className="line-clamp-2">{lead.next_action || <span className="italic text-stone-400">No next action</span>}</span></td>
                      <td className={`px-4 py-3 text-xs font-semibold ${overdue ? 'text-red-600' : 'text-stone-500'}`}>{relativeDate(lead.follow_up_at)}</td>
                      <td className="px-4 py-3 text-xs text-stone-500">{relativeDate(lead.last_contacted)}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">{sourceLabel(lead.source)}</span></td>
                      <td className="px-4 py-3">{lead.stage === 'converted' ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{sourceLabel(lead.conversion_source || lead.source)}</span> : <span className="text-xs text-stone-400">Not converted</span>}</td>
                      <td className="max-w-[240px] px-4 py-3 text-xs text-stone-600"><div className="font-semibold text-brand-dark">{lead.source_platform || 'Not recorded'}</div><div className="mt-0.5 truncate text-stone-500">{lead.source_campaign || 'No campaign'}</div></td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-brand-dark">{lead.monthly_value ? money(Number(lead.monthly_value)) : '—'}</td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => markContacted(lead)} className="rounded-lg p-2 text-stone-400 hover:bg-emerald-50 hover:text-brand-green" title="Mark contacted"><CheckCircle2 className="h-4 w-4" /></button><button type="button" onClick={() => { setSelectedLead(lead); setLeadModalOpen(true); }} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-brand-dark" title="Edit lead"><Edit3 className="h-4 w-4" /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagedLeads.length === 0 && <div className="px-6 py-16 text-center"><UserRound className="mx-auto h-9 w-9 text-stone-300" /><p className="mt-3 font-semibold text-brand-dark">No leads match these filters</p><p className="mt-1 text-sm text-stone-500">Try a broader search or add a new warm lead.</p></div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 text-sm text-stone-500"><span>{filteredLeads.length.toLocaleString()} leads · Page {page} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div className="mr-auto flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-brand-green"><CalendarClock className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold text-brand-dark">Reporting window</p><p className="mt-0.5 text-xs text-stone-500">Performance totals below only include entries that overlap these dates.</p></div>
              </div>
              <label className="text-xs font-semibold text-stone-500">From<input type="date" value={performanceWindow.start} max={performanceWindow.end} onChange={(event) => setPerformanceWindow((current) => ({ ...current, start: event.target.value }))} className="mt-1 block rounded-lg border border-stone-300 px-3 py-2 text-sm text-brand-dark" /></label>
              <label className="text-xs font-semibold text-stone-500">To<input type="date" value={performanceWindow.end} min={performanceWindow.start} onChange={(event) => setPerformanceWindow((current) => ({ ...current, end: event.target.value }))} className="mt-1 block rounded-lg border border-stone-300 px-3 py-2 text-sm text-brand-dark" /></label>
              <div className="flex gap-2">
                <button type="button" onClick={() => movePerformanceWindow(-1)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">Previous window</button>
                <button type="button" onClick={() => movePerformanceWindow(1)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">Next window</button>
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Cost per lead" value={cost(windowSpend, windowLeads)} detail={`${windowLeads.toLocaleString()} tracked leads from ${money(windowSpend)} spend`} icon={DollarSign} />
            <MetricCard label="Cost per conversion" value={cost(windowSpend, windowConversions)} detail={`${windowConversions.toLocaleString()} conversions attributed to paid activity`} icon={Target} tone="purple" />
            <MetricCard label="Revenue ROAS" value={ratio(windowRevenue, windowSpend)} detail={`${money(windowRevenue)} initial conversion revenue`} icon={TrendingUp} tone="blue" />
            <MetricCard label="Lifetime ROAS" value={ratio(windowLifetimeRevenue, windowSpend)} detail={`${money(windowLifetimeRevenue)} customer lifetime revenue`} icon={BarChart3} tone="orange" />
          </div>

          <CampaignPerformanceTable rows={campaignPerformance} />

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4"><div><h2 className="font-serif text-lg font-bold text-brand-dark">Paid acquisition periods</h2><p className="mt-1 text-xs text-stone-500">Manually add Meta or Google totals for the selected reporting window.</p></div><button type="button" onClick={() => { setMarketingForm(defaultMarketingPeriod(performanceWindow.start, performanceWindow.end)); setMarketingOpen(true); }} className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add ad stats</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left"><thead><tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-bold uppercase tracking-wider text-stone-500"><th className="px-4 py-3">Period</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Platform / campaign</th><th className="px-4 py-3 text-right">Spend</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3 text-right">CPL</th><th className="px-4 py-3 text-right">Conversions</th><th className="px-4 py-3 text-right">CPA</th><th className="px-4 py-3 text-right">ROAS</th><th className="px-4 py-3 text-right">Lifetime ROAS</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-stone-100">{windowPeriods.map((period) => <tr key={period.id} className="hover:bg-stone-50"><td className="px-4 py-3 text-sm font-semibold text-brand-dark">{new Date(`${period.period_start}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {new Date(`${period.period_end}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}{period.is_estimate && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Estimate</span>}</td><td className="px-4 py-3 text-sm text-stone-600">{sourceLabel(period.source)}</td><td className="max-w-[240px] px-4 py-3 text-xs text-stone-600"><div className="font-semibold text-brand-dark">{period.source_platform || 'Not recorded'}</div><div className="mt-0.5 truncate text-stone-500">{period.source_campaign || 'Unassigned campaign'}</div></td><td className="px-4 py-3 text-right text-sm">{money(Number(period.spend))}</td><td className="px-4 py-3 text-right text-sm">{period.leads}</td><td className="px-4 py-3 text-right text-sm font-semibold">{cost(Number(period.spend), period.leads)}</td><td className="px-4 py-3 text-right text-sm">{period.conversions}</td><td className="px-4 py-3 text-right text-sm font-semibold">{cost(Number(period.spend), period.conversions)}</td><td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{ratio(Number(period.conversion_revenue), Number(period.spend))}</td><td className="px-4 py-3 text-right text-sm font-semibold text-orange-700">{ratio(Number(period.lifetime_revenue), Number(period.spend))}</td><td className="px-4 py-3"><button type="button" onClick={() => { setMarketingForm(period); setMarketingOpen(true); }} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-brand-dark" aria-label="Edit ad statistics"><Edit3 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
            {windowPeriods.length === 0 && <div className="px-6 py-16 text-center"><Megaphone className="mx-auto h-9 w-9 text-stone-300" /><p className="mt-3 font-semibold text-brand-dark">No ad stats for this window</p><p className="mt-1 text-sm text-stone-500">Add your Meta or Google totals manually when they are ready.</p></div>}
          </section>
        </div>
      )}

      <LeadModal lead={selectedLead} open={leadModalOpen} saving={saving} onClose={() => { setLeadModalOpen(false); setSelectedLead(null); }} onSave={saveLead} />

      {marketingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setMarketingOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4"><div><h2 className="font-serif text-xl font-bold text-brand-dark">{marketingForm.id ? 'Edit ad statistics' : 'Add ad statistics'}</h2><p className="mt-1 text-sm text-stone-500">Use the totals shown in Meta Ads Manager or Google Ads.</p></div><button type="button" onClick={() => setMarketingOpen(false)} className="rounded-lg p-2 text-stone-400 hover:bg-stone-100" aria-label="Close"><X className="h-5 w-5" /></button></div>
            <form onSubmit={saveMarketingPeriod} className="p-6"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-stone-700">Start date<input required type="date" value={marketingForm.period_start || ''} onChange={(event) => setMarketingForm((current) => ({ ...current, period_start: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-stone-700">End date<input required type="date" value={marketingForm.period_end || ''} onChange={(event) => setMarketingForm((current) => ({ ...current, period_end: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-stone-700">Source<select value={marketingForm.source || 'meta_ads'} onChange={(event) => setMarketingForm((current) => ({ ...current, source: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5">{LEAD_SOURCES.filter((source) => ['meta_ads', 'google_ads', 'other'].includes(source.value)).map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>
              <label className="text-sm font-medium text-stone-700">Platform<input value={marketingForm.source_platform || ''} onChange={(event) => setMarketingForm((current) => ({ ...current, source_platform: event.target.value }))} placeholder="e.g. Instagram" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-stone-700 sm:col-span-2">Campaign<input value={marketingForm.source_campaign || ''} onChange={(event) => setMarketingForm((current) => ({ ...current, source_campaign: event.target.value }))} placeholder="Exact campaign label" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              {([['spend', 'Ad spend ($)'], ['impressions', 'Impressions'], ['clicks', 'Clicks'], ['leads', 'Leads'], ['conversions', 'Conversions'], ['conversion_revenue', 'Initial revenue ($)'], ['lifetime_revenue', 'Lifetime revenue ($)']] as Array<[keyof AgencyMarketingPeriod, string]>).map(([key, label]) => <label key={key} className="text-sm font-medium text-stone-700">{label}<input required type="number" min="0" step={key.includes('revenue') || key === 'spend' ? '0.01' : '1'} value={Number(marketingForm[key] || 0)} onChange={(event) => setMarketingForm((current) => ({ ...current, [key]: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>)}
              <label className="text-sm font-medium text-stone-700 sm:col-span-2 lg:col-span-3">Notes<textarea rows={3} value={marketingForm.notes || ''} onChange={(event) => setMarketingForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              <label className="flex items-center gap-2 text-sm text-stone-600 sm:col-span-2 lg:col-span-3"><input type="checkbox" checked={Boolean(marketingForm.is_estimate)} onChange={(event) => setMarketingForm((current) => ({ ...current, is_estimate: event.target.checked }))} className="h-4 w-4 rounded border-stone-300 text-brand-green" /> Mark this period as estimated</label>
            </div><div className="mt-6 flex justify-end gap-3 border-t border-stone-200 pt-5"><button type="button" onClick={() => setMarketingOpen(false)} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-600">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save statistics'}</button></div></form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';

type ReportSettings = {
  client_id: string;
  enabled: boolean;
  recipient_email: string;
  recipient_name: string;
  timezone: string;
  send_weekday: number;
  send_time: string;
  lookback_days: number;
  transport: 'resend' | 'gmail';
  last_previewed_at?: string | null;
};

type ReportClient = {
  id: string;
  name: string;
  brand_name?: string;
  contact_name?: string;
  contact_email?: string;
  plan_name?: string;
  zernio_profile_id?: string;
  late_profile_ids?: string[];
  reportSettings: ReportSettings;
};

type SettingsResponse = {
  globalEnabled: boolean;
  timezone: string;
  recommendedTransport: string;
  readiness: {
    schedulerSecretConfigured: boolean;
    resendConfigured: boolean;
    zernioConfigured: boolean;
    legacyZernioFallbackConfigured: boolean;
  };
  runs: ReportRun[];
  clients: ReportClient[];
};

type ReportRun = {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  status: 'generated' | 'previewed' | 'sending' | 'sent' | 'failed' | 'skipped';
  transport: 'resend' | 'gmail' | 'preview';
  recipient_email?: string | null;
  subject: string;
  generated_at: string;
  sent_at?: string | null;
  error?: string | null;
};

type Preview = {
  mode: 'preview';
  sent: false;
  recipientEmail: string;
  report: { provider: string; hasData: boolean; periodStart: string; periodEnd: string };
  email: { subject: string; text: string; html: string };
};

export function ClientAnalyticsEmailSettings({ pin }: { pin: string }) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyClient, setBusyClient] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/client-analytics-report-settings', {
        headers: { 'x-portal-pin': pin },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Report settings could not be loaded.');
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Report settings could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pin]);

  const updateLocal = (clientId: string, changes: Partial<ReportSettings>) => {
    setData((current) => current ? {
      ...current,
      clients: current.clients.map((client) => client.id === clientId
        ? { ...client, reportSettings: { ...client.reportSettings, ...changes } }
        : client),
    } : current);
  };

  const save = async (client: ReportClient) => {
    setBusyClient(client.id);
    setError('');
    setNotice('');
    try {
      const settings = client.reportSettings;
      const response = await fetch('/api/client-analytics-report-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-portal-pin': pin },
        body: JSON.stringify({
          clientId: client.id,
          enabled: settings.enabled,
          recipientEmail: settings.recipient_email,
          recipientName: settings.recipient_name,
          sendTime: settings.send_time,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Settings could not be saved.');
      updateLocal(client.id, payload.settings);
      setNotice(`${client.brand_name || client.name} report settings saved. ${data?.globalEnabled ? 'Delivery is globally enabled, so review the saved opt-in carefully.' : 'Delivery remains globally disabled.'}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Settings could not be saved.');
    } finally {
      setBusyClient(null);
    }
  };

  const generatePreview = async (client: ReportClient, useMockData: boolean) => {
    setBusyClient(client.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/client-analytics-report-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portal-pin': pin },
        body: JSON.stringify({ clientId: client.id, useMockData }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Preview could not be generated.');
      setPreview(payload);
      setNotice(`${useMockData ? 'Example' : 'Live-data'} preview generated. No email was sent.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Preview could not be generated.');
    } finally {
      setBusyClient(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand-green" /></div>;
  }

  const optedInCount = data?.clients.filter((client) => client.reportSettings.enabled).length || 0;
  const connectedCount = data?.clients.filter((client) => client.zernio_profile_id && client.late_profile_ids?.length).length || 0;
  const clientNames = new Map(data?.clients.map((client) => [client.id, client.brand_name || client.name]) || []);
  const readinessItems = [
    {
      label: 'Global delivery',
      value: data?.globalEnabled ? 'Enabled' : 'Off',
      ready: Boolean(data?.globalEnabled),
      detail: data?.globalEnabled ? 'Weekly analytics delivery is enabled.' : 'Weekly analytics delivery is switched off.',
    },
    {
      label: 'Resend transport',
      value: data?.readiness.resendConfigured ? 'Configured' : 'Not configured',
      ready: Boolean(data?.readiness.resendConfigured),
      detail: 'Recommended for this weekly email volume.',
    },
    {
      label: 'Scheduler access',
      value: data?.readiness.schedulerSecretConfigured ? 'Secret present' : 'Not configured',
      ready: Boolean(data?.readiness.schedulerSecretConfigured),
      detail: data?.readiness.schedulerSecretConfigured
        ? 'Protected scheduler requests are authenticated.'
        : 'Set the scheduler secret before enabling scheduled delivery.',
    },
    {
      label: 'Zernio analytics',
      value: data?.readiness.zernioConfigured
        ? 'Dedicated key present'
        : data?.readiness.legacyZernioFallbackConfigured
          ? 'Legacy fallback only'
          : 'Not configured',
      ready: Boolean(data?.readiness.zernioConfigured),
      detail: `${connectedCount} of ${data?.clients.length || 0} eligible clients have a profile and connected account IDs.`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-7 lg:p-8">
      <div>
        <p className="text-sm font-medium text-brand-green">Agency automation</p>
        <h2 className="mt-1 font-serif text-3xl font-bold text-brand-dark">Monday analytics emails</h2>
        <p className="mt-2 max-w-3xl text-stone-500">Choose which signed social clients should receive a rolling 30-day performance update. Reports are prepared for Monday morning in Melbourne time.</p>
      </div>

      <section className={`rounded-2xl border p-5 ${data?.globalEnabled ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          {data?.globalEnabled
            ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            : <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />}
          <div>
            <h3 className={`font-semibold ${data?.globalEnabled ? 'text-red-900' : 'text-amber-900'}`}>
              {data?.globalEnabled ? 'Weekly analytics delivery is enabled' : 'Weekly analytics delivery is disabled'}
            </h3>
            <p className={`mt-1 text-sm leading-6 ${data?.globalEnabled ? 'text-red-800' : 'text-amber-800'}`}>
              {data?.globalEnabled
                ? 'Only opted-in clients are eligible for the next authorised Monday analytics run. Portal change-notification emails remain disabled.'
                : 'You can save opt-in choices and generate previews, but weekly analytics delivery is switched off. Portal change-notification emails remain disabled separately.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {readinessItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{item.label}</p>
              <span className={`h-2.5 w-2.5 rounded-full ${item.ready ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            </div>
            <p className="mt-2 font-semibold text-brand-dark">{item.value}</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="font-semibold text-brand-dark">{optedInCount} client{optedInCount === 1 ? '' : 's'} selected</p>
          <p className="mt-1 text-sm text-stone-500">
            {data?.globalEnabled
              ? 'Selected, connected clients are eligible for the next authorised Monday run.'
              : 'Selection alone cannot send while global delivery is off.'}
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh status
        </button>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="space-y-4">
        {data?.clients.map((client) => {
          const settings = client.reportSettings;
          const profileConnected = Boolean(client.zernio_profile_id);
          const accountsConnected = Boolean(client.late_profile_ids?.length);
          const connected = profileConnected && accountsConnected;
          const busy = busyClient === client.id;
          const lastRun = data.runs.find((run) => run.client_id === client.id);
          return (
            <section key={client.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-brand-dark">{client.brand_name || client.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {connected ? 'Zernio ready' : profileConnected ? 'Social account mapping pending' : 'Zernio profile pending'}
                    </span>
                    {client.plan_name && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{client.plan_name}</span>}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">Rolling 30 days, compared with the previous 30-day period.</p>
                  {lastRun && (
                    <p className="mt-2 text-xs text-stone-500">
                      Last run: <span className="font-medium text-stone-700">{lastRun.status}</span> for {lastRun.period_start} to {lastRun.period_end}
                    </p>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-stone-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    disabled={!connected}
                    onChange={(event) => updateLocal(client.id, { enabled: event.target.checked })}
                    className="h-4 w-4 rounded border-stone-300 text-brand-green focus:ring-brand-green disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-brand-dark">Opt client in</span>
                </label>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-sm text-stone-600">
                  Recipient name
                  <input
                    value={settings.recipient_name || ''}
                    onChange={(event) => updateLocal(client.id, { recipient_name: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-brand-dark outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  />
                </label>
                <label className="text-sm text-stone-600">
                  Recipient email
                  <input
                    type="email"
                    value={settings.recipient_email || ''}
                    onChange={(event) => updateLocal(client.id, { recipient_email: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-brand-dark outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  />
                </label>
                <label className="text-sm text-stone-600">
                  Monday send time
                  <input
                    type="time"
                    value={String(settings.send_time || '09:00').slice(0, 5)}
                    onChange={(event) => updateLocal(client.id, { send_time: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-brand-dark outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                  />
                </label>
                <div className="text-sm text-stone-600">
                  Schedule
                  <div className="mt-1.5 flex h-[42px] items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-brand-dark">
                    <Clock3 className="h-4 w-4 text-stone-400" />
                    Australia/Melbourne
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => save(client)}
                  disabled={busy || (settings.enabled && !connected)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save settings
                </button>
                <button
                  type="button"
                  onClick={() => generatePreview(client, false)}
                  disabled={busy || !connected}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-green px-4 py-2.5 text-sm font-medium text-brand-green transition hover:bg-emerald-50 disabled:opacity-50"
                >
                  <BarChart3 className="h-4 w-4" />
                  Preview available data
                </button>
                <button
                  type="button"
                  onClick={() => generatePreview(client, true)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" />
                  Preview example data
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {preview && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-brand-green"><Mail className="h-5 w-5" /><span className="text-sm font-medium">Email preview</span></div>
              <h3 className="mt-2 text-lg font-semibold text-brand-dark">{preview.email.subject}</h3>
              <p className="mt-1 text-sm text-stone-500">Recipient: {preview.recipientEmail || 'Not set'} · Provider: {preview.report.provider}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Not sent</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <iframe
              title="Rendered analytics email preview"
              srcDoc={preview.email.html}
              sandbox=""
              className="h-[620px] w-full bg-white"
            />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-stone-500">Plain-text fallback</p>
          <pre className="mt-5 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-5 font-sans text-sm leading-7 text-stone-700">{preview.email.text}</pre>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 h-5 w-5 text-brand-green" />
          <div>
            <h3 className="font-semibold text-brand-dark">Recent delivery history</h3>
            <p className="mt-1 text-sm text-stone-500">Run records are created before transport delivery and retained for duplicate-send protection and auditing.</p>
          </div>
        </div>
        {data?.runs.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="pb-3 pr-4 font-semibold">Client</th>
                  <th className="pb-3 pr-4 font-semibold">Period</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Transport</th>
                  <th className="pb-3 font-semibold">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.runs.slice(0, 20).map((run) => (
                  <tr key={run.id}>
                    <td className="py-3 pr-4 font-medium text-brand-dark">{clientNames.get(run.client_id) || 'Unavailable client'}</td>
                    <td className="py-3 pr-4 text-stone-600">{run.period_start} to {run.period_end}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        run.status === 'sent' ? 'bg-emerald-50 text-emerald-700'
                          : run.status === 'failed' ? 'bg-red-50 text-red-700'
                            : 'bg-stone-100 text-stone-600'
                      }`}>{run.status}</span>
                      {run.error && <p className="mt-1 max-w-md text-xs text-red-600">{run.error}</p>}
                    </td>
                    <td className="py-3 pr-4 text-stone-600">{run.transport}</td>
                    <td className="py-3 text-stone-600">{new Date(run.generated_at).toLocaleString('en-AU', { timeZone: data.timezone })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-stone-50 px-4 py-5 text-sm text-stone-500">No report runs have been recorded. Preview generation does not create a delivery run.</div>
        )}
      </section>
    </div>
  );
}

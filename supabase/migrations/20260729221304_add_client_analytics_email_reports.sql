create table if not exists public.client_analytics_report_settings (
  client_id uuid primary key references public.clients(id) on delete cascade,
  enabled boolean not null default false,
  recipient_email text,
  recipient_name text,
  timezone text not null default 'Australia/Melbourne',
  send_weekday smallint not null default 1 check (send_weekday between 0 and 6),
  send_time time not null default '09:00',
  lookback_days integer not null default 30 check (lookback_days between 7 and 90),
  transport text not null default 'resend' check (transport in ('resend', 'gmail')),
  last_previewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_analytics_report_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  scheduled_for timestamptz,
  status text not null default 'generated'
    check (status in ('generated', 'previewed', 'sending', 'sent', 'failed', 'skipped')),
  transport text not null default 'resend' check (transport in ('resend', 'gmail', 'preview')),
  recipient_email text,
  subject text not null,
  report_payload jsonb not null default '{}'::jsonb,
  provider_message_id text,
  generated_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, period_end)
);

create index if not exists client_analytics_report_settings_enabled_idx
  on public.client_analytics_report_settings(enabled, send_weekday, send_time);

create index if not exists client_analytics_report_runs_status_idx
  on public.client_analytics_report_runs(status, scheduled_for, created_at);

alter table public.client_analytics_report_settings enable row level security;
alter table public.client_analytics_report_runs enable row level security;

revoke all on public.client_analytics_report_settings from anon, authenticated;
revoke all on public.client_analytics_report_runs from anon, authenticated;

grant all on public.client_analytics_report_settings to service_role;
grant all on public.client_analytics_report_runs to service_role;

comment on table public.client_analytics_report_settings is
  'Agency-controlled opt-in settings for disabled-by-default weekly client analytics emails.';

comment on table public.client_analytics_report_runs is
  'Idempotent generation and delivery history for client analytics reports.';

comment on column public.client_analytics_report_settings.enabled is
  'Per-client opt-in. Global CLIENT_ANALYTICS_EMAILS_ENABLED must also be true before delivery can occur.';

comment on column public.client_analytics_report_runs.period_end is
  'Unique with client_id to prevent duplicate sends for the same reporting period.';

create table if not exists public.agency_client_health (
  client_id uuid primary key references public.clients(id) on delete cascade,
  monthly_value numeric(12,2) check (monthly_value is null or monthly_value >= 0),
  start_date date,
  relationship_health integer not null default 70
    check (relationship_health between 0 and 100),
  health_note text,
  confidence text not null default 'low'
    check (confidence in ('low', 'medium', 'high')),
  last_meaningful_contact timestamptz,
  next_action text,
  next_action_due date,
  open_issue text,
  issue_severity text not null default 'none'
    check (issue_severity in ('none', 'watch', 'concern', 'critical')),
  payment_status text not null default 'unknown'
    check (payment_status in ('unknown', 'current', 'overdue')),
  onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started', 'in_progress', 'complete', 'blocked')),
  renewal_signal text not null default 'unknown'
    check (renewal_signal in ('unknown', 'positive', 'neutral', 'negative')),
  scope_pressure boolean not null default false,
  performance_concern boolean not null default false,
  positive_feedback_at timestamptz,
  internal_notes text,
  updated_at timestamptz not null default now()
);

create index if not exists agency_client_health_next_action_idx
  on public.agency_client_health(next_action_due)
  where next_action_due is not null;

alter table public.agency_client_health enable row level security;
revoke all on table public.agency_client_health from anon, authenticated;
grant select, insert, update, delete on table public.agency_client_health to service_role;

drop policy if exists "Deny direct agency client health access" on public.agency_client_health;
create policy "Deny direct agency client health access"
  on public.agency_client_health
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.agency_client_health is
  'Agency-only commercial, relationship and retention context for current Seam Media clients.';
comment on column public.agency_client_health.relationship_health is
  'Human relationship-health assessment where 100 is healthiest.';
comment on column public.agency_client_health.confidence is
  'Confidence in the current health assessment, not a churn probability.';

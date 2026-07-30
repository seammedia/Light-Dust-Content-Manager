create table if not exists public.agency_outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  agency_lead_id uuid references public.agency_leads(id) on delete set null,
  instagram_username text not null,
  contact_name text,
  business_name text not null,
  industry text,
  location text,
  profile_notes text,
  offer_focus text,
  graphic_direction text,
  graphic_headline text,
  graphic_prompt text,
  graphic_url text,
  message text not null default '',
  status text not null default 'ready' check (status in ('ready', 'sent', 'archived')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_outreach_drafts_status_idx
  on public.agency_outreach_drafts(status, created_at desc);

create index if not exists agency_outreach_drafts_username_idx
  on public.agency_outreach_drafts(lower(instagram_username));

alter table public.agency_outreach_drafts enable row level security;

revoke all on table public.agency_outreach_drafts from anon, authenticated;
grant select, insert, update, delete on table public.agency_outreach_drafts to service_role;

drop policy if exists "Deny direct outreach draft access" on public.agency_outreach_drafts;
create policy "Deny direct outreach draft access" on public.agency_outreach_drafts
  as restrictive for all to anon, authenticated using (false) with check (false);

comment on table public.agency_outreach_drafts is
  'Agency-only Instagram outreach drafts. Accessed through the authenticated agency leads API.';

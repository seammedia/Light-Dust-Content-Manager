alter table public.agency_outreach_drafts
  add column if not exists generation_error text,
  add column if not exists generation_attempts integer not null default 0;

alter table public.agency_outreach_drafts
  drop constraint if exists agency_outreach_drafts_status_check;

alter table public.agency_outreach_drafts
  add constraint agency_outreach_drafts_status_check
  check (status in ('pending', 'generating', 'ready', 'failed', 'sent', 'archived'));

alter table public.agency_outreach_drafts
  drop constraint if exists agency_outreach_drafts_generation_attempts_check;

alter table public.agency_outreach_drafts
  add constraint agency_outreach_drafts_generation_attempts_check
  check (generation_attempts >= 0);

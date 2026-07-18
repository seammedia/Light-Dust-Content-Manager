-- A post must be claimed in the database before it is sent to Zernio. The
-- conditional claim in api/late-schedule.ts makes concurrent submissions for
-- the same content-manager post mutually exclusive across browsers and server
-- instances.
alter table public.posts
  add column if not exists late_scheduling_state text,
  add column if not exists late_scheduling_request_id uuid,
  add column if not exists late_scheduling_started_at timestamptz,
  add column if not exists late_scheduling_error text;

-- Older rows may contain an empty string from clients that did not receive a
-- provider ID. Normalize those rows so the atomic NULL predicate is reliable.
update public.posts
set late_post_id = null
where late_post_id is not null and btrim(late_post_id) = '';

alter table public.posts
  drop constraint if exists posts_late_scheduling_state_check;

alter table public.posts
  add constraint posts_late_scheduling_state_check
  check (late_scheduling_state is null or late_scheduling_state in ('processing', 'scheduled', 'failed'));

create index if not exists idx_posts_late_scheduling_state
  on public.posts (late_scheduling_state)
  where late_scheduling_state = 'processing';

create unique index if not exists idx_posts_late_scheduling_request_id
  on public.posts (late_scheduling_request_id)
  where late_scheduling_request_id is not null;

comment on column public.posts.late_scheduling_state is
  'Durable state for the one-time Zernio scheduling claim.';
comment on column public.posts.late_scheduling_request_id is
  'Stable x-request-id sent to Zernio for safe retries.';

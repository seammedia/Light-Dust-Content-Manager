create table if not exists public.client_memberships (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (client_id, user_id)
);

create index if not exists client_memberships_user_id_idx
  on public.client_memberships(user_id);

alter table public.client_memberships enable row level security;

revoke all on public.client_memberships from anon, authenticated;
grant select on public.client_memberships to authenticated;
grant all on public.client_memberships to service_role;

drop policy if exists "Users can read their own client memberships" on public.client_memberships;
create policy "Users can read their own client memberships"
  on public.client_memberships
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

insert into public.client_memberships (client_id, user_id, role)
select id, owner_user_id, 'owner'
from public.clients
where owner_user_id is not null
on conflict (client_id, user_id) do update set role = excluded.role;

comment on table public.client_memberships is
  'Maps additional authenticated users to an existing client workspace without changing the primary owner.';

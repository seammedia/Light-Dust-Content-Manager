alter table public.posts
add column if not exists target_profile_ids text[];

comment on column public.posts.target_profile_ids is
'Connected Zernio account IDs selected for this post. NULL uses all compatible client accounts.';

-- Dedicated NormalAnatomy project. Run this whole migration in one transaction.
begin;
create table public.mobile_members (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.mobile_members enable row level security;
revoke all on public.mobile_members from anon, authenticated;
grant select on public.mobile_members to authenticated;
create policy "Read own membership" on public.mobile_members for select to authenticated
  using (email = lower(auth.jwt()->>'email'));

create table public.mobile_lectures (
  owner_id uuid not null references auth.users(id),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  lesson_id text not null,
  title text not null,
  case_count integer not null check (case_count > 0),
  manifest jsonb not null,
  audio jsonb,
  timing jsonb,
  created_at timestamptz not null default now(),
  primary key (owner_id,fingerprint),
  check (manifest->>'fingerprint' = fingerprint)
);
alter table public.mobile_lectures enable row level security;
revoke all on public.mobile_lectures from anon, authenticated;
grant select, insert, update on public.mobile_lectures to authenticated;
create policy "Members own their lectures" on public.mobile_lectures for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')));

create table public.mobile_progress (
  owner_id uuid not null,
  fingerprint text not null,
  audio_sha256 text not null default '',
  position double precision not null default 0 check (position >= 0 and position < 86400),
  case_id text,
  image_id text,
  rate double precision not null default 1 check (rate >= 0.5 and rate <= 3),
  updated_at timestamptz not null default now(),
  primary key (owner_id,fingerprint),
  foreign key (owner_id,fingerprint) references public.mobile_lectures(owner_id,fingerprint)
);
alter table public.mobile_progress enable row level security;
revoke all on public.mobile_progress from anon, authenticated;
grant select,insert,update on public.mobile_progress to authenticated;
create policy "Members own their progress" on public.mobile_progress for all to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('lecture-media','lecture-media',false,52428800,
  array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp4','audio/wav','audio/x-wav']);
create policy "Members read own media" on storage.objects for select to authenticated
  using (bucket_id = 'lecture-media' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')));
create policy "Members upload own media" on storage.objects for insert to authenticated
  with check (bucket_id = 'lecture-media' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')));
-- Objects have immutable content-hash names. No client overwrite/delete policy.
commit;

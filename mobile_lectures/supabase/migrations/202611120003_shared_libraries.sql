-- Shared teaching content, private learner state. Apply as project administrator.
begin;
alter table public.mobile_lectures add column shared_from_owner_id uuid references auth.users(id);
alter table public.mobile_lectures add constraint shared_library_distinct_owner
  check (shared_from_owner_id is null or shared_from_owner_id <> owner_id);

create table public.mobile_library_shares (
  owner_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (owner_id,recipient_id),
  check (owner_id <> recipient_id)
);
alter table public.mobile_library_shares enable row level security;
revoke all on public.mobile_library_shares from public,anon,authenticated;
grant select on public.mobile_library_shares to authenticated;
create policy "Read own library grants" on public.mobile_library_shares for select to authenticated
  using ((owner_id = (select auth.uid()) or recipient_id = (select auth.uid()))
    and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email')));

-- The recipient's row holds only their own mutable card choices. The teaching
-- content is kept identical to the source and references its immutable media.
-- The existing progress foreign key and per-account CAS rules remain intact.
create function public.mobile_protect_shared_content() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated','anon') then
    if TG_OP = 'INSERT' then
      if new.shared_from_owner_id is not null then
        raise exception 'Only the project administrator can grant shared lectures';
      end if;
    else
      if new.shared_from_owner_id is distinct from old.shared_from_owner_id then
        raise exception 'Shared lecture ownership cannot be changed';
      end if;
      if old.shared_from_owner_id is not null and
        (to_jsonb(new) - 'card_choices' - 'card_revision') is distinct from
        (to_jsonb(old) - 'card_choices' - 'card_revision') then
        raise exception 'Shared lecture content is read-only; your card choices remain editable';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.mobile_protect_shared_content() from public,anon,authenticated;
create trigger mobile_protect_shared_content before insert or update on public.mobile_lectures
  for each row execute function public.mobile_protect_shared_content();

create function public.mobile_copy_shared_lecture(source_row public.mobile_lectures, recipient uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if source_row.shared_from_owner_id is not null then
    raise exception 'Shared content cannot be reshared';
  end if;
  if not exists (select 1 from public.mobile_library_shares s
      where s.owner_id = source_row.owner_id and s.recipient_id = recipient) then
    raise exception 'An administrator library grant is required';
  end if;
  if exists (select 1 from public.mobile_lectures l where l.owner_id = recipient
      and l.fingerprint = source_row.fingerprint
      and l.shared_from_owner_id is distinct from source_row.owner_id) then
    -- An independently uploaded copy is never overwritten, and cannot block
    -- the owner's upload or updates for everybody else.
    return;
  end if;
  insert into public.mobile_lectures(owner_id,fingerprint,lesson_id,title,case_count,manifest,audio,timing,created_at,shared_from_owner_id)
    values(recipient,source_row.fingerprint,source_row.lesson_id,source_row.title,source_row.case_count,
      source_row.manifest - 'cardReview',source_row.audio,source_row.timing,source_row.created_at,source_row.owner_id)
  on conflict(owner_id,fingerprint) do update set
    lesson_id=excluded.lesson_id,title=excluded.title,case_count=excluded.case_count,
    manifest=excluded.manifest,audio=excluded.audio,timing=excluded.timing;
  -- Neither the source's selections nor their playback progress are copied.
end;
$$;
revoke all on function public.mobile_copy_shared_lecture(public.mobile_lectures,uuid) from public,anon,authenticated;

create function public.mobile_populate_library_share() returns trigger
language plpgsql security definer set search_path = '' as $$
declare source_row public.mobile_lectures;
begin
  for source_row in select * from public.mobile_lectures
    where owner_id = new.owner_id and shared_from_owner_id is null loop
    perform public.mobile_copy_shared_lecture(source_row,new.recipient_id);
  end loop;
  return new;
end;
$$;
revoke all on function public.mobile_populate_library_share() from public,anon,authenticated;
create trigger mobile_populate_library_share after insert on public.mobile_library_shares
  for each row execute function public.mobile_populate_library_share();

create function public.mobile_sync_shared_lectures() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  if new.shared_from_owner_id is not null then return new; end if;
  for recipient in select s.recipient_id from public.mobile_library_shares s where s.owner_id = new.owner_id loop
    perform public.mobile_copy_shared_lecture(new,recipient);
  end loop;
  return new;
end;
$$;
revoke all on function public.mobile_sync_shared_lectures() from public,anon,authenticated;
create trigger mobile_sync_shared_lectures after insert or update of manifest,audio,timing,title,case_count,lesson_id
  on public.mobile_lectures for each row execute function public.mobile_sync_shared_lectures();

drop policy "Members own their lectures" on public.mobile_lectures;
create policy "Members own their lectures" on public.mobile_lectures for all to authenticated
  using (owner_id = (select auth.uid())
    and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email'))
    and (shared_from_owner_id is null or exists (select 1 from public.mobile_library_shares s
      where s.owner_id = shared_from_owner_id and s.recipient_id = (select auth.uid()))))
  with check (owner_id = (select auth.uid())
    and exists (select 1 from public.mobile_members where email = lower(auth.jwt()->>'email'))
    and (shared_from_owner_id is null or exists (select 1 from public.mobile_library_shares s
      where s.owner_id = shared_from_owner_id and s.recipient_id = (select auth.uid()))));

-- A grant exposes only media currently referenced by that shared lecture, not
-- the owner's whole bucket, old exports, other files or private learner state.
create policy "Members read granted lecture media" on storage.objects for select to authenticated
  using (bucket_id = 'lecture-media' and exists (
    select 1 from public.mobile_lectures l
    where l.owner_id = (select auth.uid()) and l.shared_from_owner_id is not null
      and (storage.foldername(name))[1] = l.shared_from_owner_id::text
      and (storage.foldername(name))[2] = l.fingerprint
      and (name = l.shared_from_owner_id::text || '/' || l.fingerprint || '/' || (l.audio->>'path')
        or exists (select 1 from jsonb_array_elements(l.manifest->'media') m
          where name = l.shared_from_owner_id::text || '/' || l.fingerprint || '/' || (m->>'path')))
  ));
commit;

-- Separate mutable choices; existing owner/member RLS remains in force.
begin;
alter table public.mobile_lectures add column card_choices jsonb;
alter table public.mobile_lectures add column card_revision integer not null default 0 check (card_revision >= 0);
alter table public.mobile_lectures add constraint card_choices_identity check (
  card_choices is null or (
    card_choices->>'version' = '1' and
    card_choices->'review'->>'lessonId' = lesson_id and
    card_choices->'desktopBase'->>'lessonId' = lesson_id and
    jsonb_typeof(card_choices->'review'->'images') = 'object' and
    (card_choices->>'channel') ~ '^mobile-[a-f0-9-]{36}$'
  ) is true
);
commit;

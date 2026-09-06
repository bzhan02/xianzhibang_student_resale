-- ============================================================
-- 002_reviews.sql — 信任体系：交易评价 + 真实评分 + 发布数统计
-- ============================================================

-- ---------- 1. reviews 表 ----------
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  item_id         uuid          references public.items(id) on delete set null,
  reviewer_id     uuid not null references public.profiles(id) on delete cascade,
  reviewee_id     uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  comment         text default '',
  reviewer_role   text not null check (reviewer_role in ('buyer','seller')),
  created_at      timestamptz not null default now(),

  -- 同一笔交易，同一个人只能评一次
  constraint reviews_once_per_deal unique (conversation_id, reviewer_id),
  -- 不能自评
  constraint reviews_no_self check (reviewer_id <> reviewee_id)
);

create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);
create index if not exists reviews_conversation_idx on public.reviews (conversation_id);

-- ---------- 2. profiles 增加评价数字段 ----------
alter table public.profiles
  add column if not exists review_count integer not null default 0;

-- ---------- 3. 评分重算触发器 ----------
create or replace function public.recalc_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.profiles p
  set rating = coalesce((
        select round(avg(r.rating)::numeric, 1)
        from public.reviews r
        where r.reviewee_id = target
      ), 0),
      review_count = (
        select count(*) from public.reviews r where r.reviewee_id = target
      ),
      updated_at = now()
  where p.id = target;
  return null;
end;
$$;

drop trigger if exists reviews_recalc_rating on public.reviews;
create trigger reviews_recalc_rating
after insert or update or delete on public.reviews
for each row execute function public.recalc_profile_rating();

-- ---------- 4. 发布数统计触发器 ----------
create or replace function public.recalc_items_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sellers uuid[];
  s uuid;
begin
  sellers := array_remove(array[
    case when tg_op in ('INSERT','UPDATE') then new.seller_id end,
    case when tg_op in ('UPDATE','DELETE') then old.seller_id end
  ], null);

  foreach s in array sellers loop
    update public.profiles p
    set items_count = (
          select count(*) from public.items i
          where i.seller_id = s and i.is_sold = false
        ),
        updated_at = now()
    where p.id = s;
  end loop;
  return null;
end;
$$;

drop trigger if exists items_recalc_count on public.items;
create trigger items_recalc_count
after insert or update of seller_id, is_sold or delete on public.items
for each row execute function public.recalc_items_count();

-- ---------- 5. 回填现有数据 ----------
update public.profiles p
set items_count = coalesce((
      select count(*) from public.items i
      where i.seller_id = p.id and i.is_sold = false
    ), 0);

-- 现有 rating 全是硬编码的假 5 分，归零（表示"暂无评价"）
update public.profiles
set rating = 0, review_count = 0
where not exists (select 1 from public.reviews r where r.reviewee_id = profiles.id);

-- ---------- 6. RLS ----------
alter table public.reviews enable row level security;

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read
  on public.reviews for select
  using (true);

-- 只能以自己的身份评价，且必须是这笔会话的参与方，且交易已确认（有 accepted 的 offer）
drop policy if exists reviews_participant_insert on public.reviews;
create policy reviews_participant_insert
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        and reviewee_id = case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end
    )
    and exists (
      select 1 from public.messages m
      where m.conversation_id = reviews.conversation_id
        and m.message_type = 'offer'
        and m.metadata->>'status' = 'accepted'
    )
  );

-- 允许本人修改/撤回自己的评价
drop policy if exists reviews_own_update on public.reviews;
create policy reviews_own_update
  on public.reviews for update
  to authenticated
  using (reviewer_id = auth.uid())
  with check (reviewer_id = auth.uid());

drop policy if exists reviews_own_delete on public.reviews;
create policy reviews_own_delete
  on public.reviews for delete
  to authenticated
  using (reviewer_id = auth.uid());

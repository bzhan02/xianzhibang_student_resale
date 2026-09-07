-- ============================================================
-- 002_conversations_messages.sql — 站内私信
-- 说明：本文件是对线上已有结构的补录（原先在 Dashboard 手工执行，未进版本库）。
--       内容与线上 schema 逐字段核对一致，可在空库上重放。
-- ============================================================

-- ---------- 会话 ----------
create table if not exists public.conversations (
  id         uuid primary key default uuid_generate_v4(),
  item_id    uuid not null references public.items(id)    on delete cascade,
  buyer_id   uuid not null references public.profiles(id) on delete cascade,
  seller_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 同一商品同一买家只有一个会话
  constraint conversations_item_id_buyer_id_key unique (item_id, buyer_id)
);

-- ---------- 消息 ----------
create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id)      on delete cascade,
  content         text not null,
  is_read         boolean not null default false,
  -- 'text' 普通消息；'offer' 购买请求，详情放在 metadata
  message_type    text not null default 'text',
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- ---------- 新消息时刷新会话时间，用于消息列表排序 ----------
create or replace function public.update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_update_conversation on public.messages;
create trigger messages_update_conversation
after insert on public.messages
for each row execute function public.update_conversation_timestamp();

-- ---------- RLS：只有买卖双方能读写自己的会话 ----------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

drop policy if exists conversations_participant on public.conversations;
create policy conversations_participant
  on public.conversations for all
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists messages_participant on public.messages;
create policy messages_participant
  on public.messages for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

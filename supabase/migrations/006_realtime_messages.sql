-- ============================================================
-- 006_realtime_messages.sql — 确保消息表开启 Realtime
-- 说明：lib/notifications.tsx 的全局订阅依赖这个 publication。
--       没有它，前端订阅能建立但永远收不到事件，只能退化到轮询。
--       之前聊天页加 10 秒轮询兜底，就是因为这项从未被显式保证过。
-- ============================================================

-- Supabase 的 Realtime 通过 supabase_realtime 这个 publication 推送变更。
-- 直接 alter publication ... add table 在表已存在时会报错，用 DO 块保证幂等。
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- 会话表也加上：消息列表按 updated_at 排序，新消息会刷新会话时间
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- UPDATE / DELETE 事件默认只带主键。设成 full 后 payload 里能拿到完整旧值，
-- 前端判断「这条消息是不是被标记已读」时才有依据。
alter table public.messages replica identity full;

-- ---------- 自检 ----------
-- 执行后应返回两行：messages 与 conversations
--   select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and schemaname = 'public'
--   order by tablename;

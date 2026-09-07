-- ============================================================
-- 004_search_indexes.sql — 全库模糊搜索所需的扩展与索引
-- 说明：补录。lib/search.ts 依赖这些索引，否则商品量大后 ilike 会全表扫描。
-- ============================================================

-- pg_trgm 让 ilike '%关键词%' 能走索引；三元组分词对中文同样有效
create extension if not exists pg_trgm;

create index if not exists items_title_trgm_idx
  on public.items using gin (title gin_trgm_ops);

create index if not exists items_desc_trgm_idx
  on public.items using gin (description gin_trgm_ops);

-- 首页/搜索页默认排序：过滤未售出 + 按时间倒序
create index if not exists items_browse_idx
  on public.items (is_sold, created_at desc);

-- ---------- 浏览量自增 ----------
-- 匿名用户也要能加浏览数，但不能改商品其它字段，所以走 security definer 函数
create or replace function public.increment_view_count(item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.items
     set view_count = coalesce(view_count, 0) + 1
   where id = item_id;
end;
$$;

grant execute on function public.increment_view_count(uuid) to anon, authenticated;

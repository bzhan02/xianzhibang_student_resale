-- ============================================================
-- 003_storage_buckets.sql — Storage bucket 与访问策略
-- 说明：补录。原先 bucket 在 Dashboard 手工创建，策略在 SQL Editor 临时执行。
-- ============================================================

-- ---------- Bucket ----------
-- 公开读：商品图和头像都需要能被匿名访问（分享卡片、搜索引擎抓取）
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- ---------- item-images 策略 ----------
-- 路径约定：{user_id}/{item_id}/{index}.{ext}，靠第一段目录名限制归属
drop policy if exists "Public can view images" on storage.objects;
create policy "Public can view images"
  on storage.objects for select
  using (bucket_id = 'item-images');

drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-images'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own images" on storage.objects;
create policy "Users can delete own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'item-images'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

-- ---------- avatars 策略 ----------
-- 路径约定：{user_id}/avatar.{ext}
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_auth_insert on storage.objects;
create policy avatars_auth_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists avatars_auth_update on storage.objects;
create policy avatars_auth_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_auth_delete on storage.objects;
create policy avatars_auth_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');

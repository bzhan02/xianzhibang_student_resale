# 闲置帮 — 从零复现指南

本文档描述如何从一个空的 Supabase 项目和空的 Vercel 账号，完整复现线上环境。
所有数据库对象都由 `supabase/migrations/` 下的 SQL 定义，没有任何需要手工点击的隐性步骤。

---

## 一、前置要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Supabase 项目 | 免费版即可 |

---

## 二、创建 Supabase 项目

1. 在 [supabase.com](https://supabase.com) 新建项目，记下项目 ref（形如 `abcdefghijklmn`）
2. 在 **Project Settings → API** 取得：
   - `Project URL`
   - `anon public` key

> 注意：本项目**只使用 anon key**，所有权限由 RLS 策略控制。
> 不要把 `service_role` key 放进前端环境变量。

---

## 三、执行数据库迁移

在 Supabase Dashboard 的 **SQL Editor** 里，**按编号顺序**逐个执行：

| 顺序 | 文件 | 内容 |
|------|------|------|
| 1 | `001_initial_schema.sql` | 枚举、profiles / items / favorites 表、注册触发器、基础 RLS |
| 2 | `002_conversations_messages.sql` | 私信的会话与消息表、会话时间触发器、参与方 RLS |
| 3 | `003_storage_buckets.sql` | `item-images` 与 `avatars` bucket 及其访问策略 |
| 4 | `004_search_indexes.sql` | pg_trgm 扩展、模糊搜索索引、浏览量自增函数 |
| 5 | `005_reviews.sql` | 评价表、评分与发布数触发器、防刷分 RLS |

每个文件都写成**幂等**的（`if not exists` / `on conflict` / `drop ... if exists`），
重复执行不会报错，也不会破坏已有数据。

### 验证迁移是否成功

在 SQL Editor 执行：

```sql
select
  (select count(*) from information_schema.tables
     where table_schema='public'
       and table_name in ('profiles','items','favorites','conversations','messages','reviews')) as 表数量_应为6,
  (select count(*) from pg_indexes
     where schemaname='public' and indexname like '%trgm%') as trgm索引_应为2,
  (select count(*) from storage.buckets
     where id in ('item-images','avatars')) as bucket数_应为2,
  (select count(*) from pg_extension where extname='pg_trgm') as pg_trgm_应为1;
```

四个数字应分别是 `6 / 2 / 2 / 1`。

---

## 四、本地运行

```bash
git clone https://github.com/bzhan02/xianzhibang_student_resale.git
cd xianzhibang_student_resale
npm install
cp .env.local.example .env.local
```

编辑 `.env.local`：

```
NEXT_PUBLIC_SUPABASE_URL=https://<你的项目ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<你的 anon key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev     # http://localhost:3000
```

> `NEXT_PUBLIC_SITE_URL` 影响分享卡片和 sitemap 里的绝对地址。
> 本地留 `http://localhost:3000`，线上必须改成真实域名。

---

## 五、部署到 Vercel

1. Vercel → **Add New Project** → 导入 GitHub 仓库
2. Framework 自动识别为 Next.js，无需改构建命令
3. 在 **Settings → Environment Variables** 添加三个变量（Production 环境）：

| 变量 | 值 |
|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | 你的正式域名，如 `https://xianzhibang.vercel.app` |

4. Deploy。之后每次 push 到 `main` 会自动部署。

### 部署后自检

```bash
curl -s https://<你的域名>/robots.txt          # 应看到 Sitemap: 行
curl -s https://<你的域名>/sitemap.xml | head  # 应看到商品 URL
```

打开任意商品页，查看源码里应有 `og:title`、`og:image` 和 `application/ld+json`。

---

## 六、代码结构

```
app/
  page.tsx                 首页：分类 + 热门搜索 + 推荐列表
  search/                  搜索结果页（筛选、排序、分页）
  items/[id]/
    layout.tsx             服务端 OG 标签 + Product JSON-LD
    page.tsx               商品详情
    edit/                  编辑商品
  users/[id]/              公开卖家主页（在售 / 评价）
  messages/[id]/           聊天（Realtime + 购买请求 + 评价入口）
  robots.ts, sitemap.ts    SEO

lib/
  supabase-rest.ts    ← REST 请求、请求头、Storage 上传的唯一入口
  item-mapper.ts      ← 数据库行 → Item 的唯一映射
  categories.ts       ← 分类定义的唯一来源
  types.ts            ← 领域类型与下拉常量的唯一来源
  uploads.ts          图片上传路径约定
  search.ts           服务端搜索 + 搜索历史
  reviews.ts          评价读写
  image-compress.ts   上传前压缩
  auth-context.tsx    登录态
  store.tsx           首页商品列表与收藏
```

**约定**：任何新增的数据访问都应走 `lib/supabase-rest.ts` 的 `rest()` / `restOr()`，
不要再在页面里直接拼 `process.env.NEXT_PUBLIC_SUPABASE_URL`。

---

## 七、数据库对象一览

供核对用，与迁移文件一一对应。

**表**：`profiles` `items` `favorites` `conversations` `messages` `reviews`

**枚举**：`category_slug` `item_condition` `delivery_method`

**函数**：
- `handle_new_user` — 注册时建 profile（001）
- `set_updated_at` — 通用时间戳（001）
- `update_conversation_timestamp` — 新消息刷新会话时间（002）
- `increment_view_count` — 匿名可调的浏览量自增（004）
- `recalc_profile_rating` — 评价变动时重算星级（005）
- `recalc_items_count` — 商品变动时重算在售数（005）

**Storage**：`item-images`（公开读，按 user_id 目录限制写）、`avatars`（公开读，登录可写）

---

## 八、已知取舍

- `next.config.mjs` 里开了 `typescript.ignoreBuildErrors`，因为 Supabase SDK 的泛型
  在 `lib/supabase.ts` 和 `auth-context.tsx` 上会产生与运行时无关的类型噪音。
  **业务代码本身是类型干净的**，可用 `npx tsc --noEmit` 验证。
- 学校筛选在客户端兜底（PostgREST 对 join 出来的字段做过滤较绕）。
- 图片压缩在浏览器端完成；不支持 canvas 的极老浏览器会退回上传原图。

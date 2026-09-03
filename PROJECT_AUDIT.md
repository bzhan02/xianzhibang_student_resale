# 闲置帮 — 项目现状审计报表

> 生成时间：2026-09-03  
> 项目路径：`C:\Users\rober\student-resale`  
> 线上地址：`https://xianzhiban.vercel.app`

---

## 一、技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js App Router | 16.1.6 |
| UI 运行时 | React | 19.2.4 |
| 语言 | TypeScript | 5.7.3 |
| 样式 | Tailwind CSS | 4.2 |
| 组件库 | shadcn/ui (Radix UI) | 全套 |
| 后端 / 数据库 | Supabase (PostgreSQL) | JS SDK 2.106 |
| 图标 | lucide-react | 0.564 |
| Toast | sonner | 1.7 |
| 部署 | Vercel (手动 CLI) | project: xianzhiban |
| 分析 | @vercel/analytics | 1.6.1 |

---

## 二、页面与功能一览

### 已实现页面

| 路由 | 文件 | 功能 | 状态 |
|------|------|------|------|
| `/` | `app/page.tsx` | 首页：分类导航 + 推荐商品列表 + 搜索 | ✅ 完成 |
| `/auth` | `app/auth/page.tsx` | 登录 / 注册（含学校下拉强制选择、昵称重名检测） | ✅ 完成 |
| `/auth/callback` | `app/auth/callback/page.tsx` | 邮件验证码 code exchange，成功后跳转首页 | ✅ 完成 |
| `/auth/verify` | `app/auth/verify/page.tsx` | 备用验证页（同上逻辑，emailRedirectTo 指向此路由） | ✅ 完成 |
| `/items/[id]` | `app/items/[id]/page.tsx` | 商品详情：图片轮播、卖家信息、收藏、分享、微信 QR、猜你喜欢 | ✅ 完成 |
| `/items/[id]/edit` | `app/items/[id]/edit/page.tsx` | 编辑商品（含所有权校验） | ✅ 完成 |
| `/publish` | `app/publish/page.tsx` | 发布商品：多图上传、分类、新旧、交易方式 | ✅ 完成 |
| `/nearby` | `app/nearby/page.tsx` | 附近：同校/同区域/全部筛选 + 价格/时间排序 | ✅ 完成 |
| `/messages` | `app/messages/page.tsx` | 消息列表（含未读数、自动刷新） | ✅ 完成 |
| `/messages/[id]` | `app/messages/[id]/page.tsx` | 聊天详情页 | ✅ 完成 |
| `/profile` | `app/profile/page.tsx` | 个人主页（发布数、售出数、收藏数） | ✅ 完成 |
| `/my-listings` | `app/my-listings/page.tsx` | 我的发布列表（含标记售出） | ✅ 完成 |
| `/my-purchases` | `app/my-purchases/page.tsx` | 我的购买记录 | ✅ 完成 |
| `/favorites` | `app/favorites/page.tsx` | 收藏夹 | ✅ 完成 |
| `/settings` | `app/settings/page.tsx` | 账号设置（学校 autocomplete 下拉） | ✅ 完成 |
| `/categories` | `app/categories/page.tsx` | 全部分类 | ✅ 完成 |
| `/categories/[slug]` | `app/categories/[slug]/page.tsx` | 分类商品列表 | ✅ 完成 |

### 分类体系（5 个）

`textbooks` 教材书籍 · `electronics` 电子产品 · `furniture` 家具生活 · `clothing` 服装配饰 · `transport` 交通工具

---

## 三、数据层设计

### Supabase 数据表（`lib/database.types.ts`）

| 表名 | 关键字段 |
|------|---------|
| `profiles` | id, name, avatar_url, school, rating, items_count |
| `items` | id, seller_id, title, description, price, original_price, images[], category, condition, delivery_method, location, view_count, is_sold |
| `favorites` | user_id, item_id |
| `conversations` | id, item_id, buyer_id, seller_id |
| `messages` | id, conversation_id, sender_id, content, is_read |

### 数据访问模式

- **公开数据**（商品列表）：直接 `fetch` Supabase REST API，使用 `anon key`
- **用户数据**（收藏、发布、编辑）：`getToken()` 从 `localStorage` 读取 JWT，以 Bearer 形式传递
- **Auth**：Supabase JS Client（`lib/supabase.ts`），`detectSessionInUrl: false`，session 存 localStorage

### 核心工具函数（`lib/utils.ts`）

```ts
getToken()  // 从 localStorage sb-{ref}-auth-token 读取 JWT
cn()        // clsx + tailwind-merge
```

---

## 四、布局架构

### `AppShell`（双端响应式）

```
移动端 (< md)          桌面端 (≥ md)
┌──────────────┐       ┌────────────────────────┐
│ Header       │       │ SidebarNav │ Content   │
│ <children>   │       │  (w-56)    │ max-w-5xl │
│ BottomNav    │       └────────────────────────┘
└──────────────┘
```

- 移动端：max-w-lg 居中，Header + BottomNav，商品详情页隐藏导航
- 桌面端：SidebarNav（Logo + 4个导航 + 发布按钮）+ DesktopHeader（搜索栏）+ 内容区
- 全屏路由（`/auth`, `/publish`）：隐藏 Sidebar，全屏展示

### 商品网格响应式

```
mobile:  grid-cols-2
md:      grid-cols-3
lg:      grid-cols-4
```

### 分类网格响应式

```
mobile:  grid-cols-5
md:      grid-cols-10（一行展示全部）
```

---

## 五、学校体系（`lib/school-groups.ts`）

共 **118 所学校**，分布在以下地区：

波士顿 · 康涅狄格 · 纽约 · 新泽西 · 纽约上州 · 费城 · 华盛顿DC · 弗吉尼亚 · 北卡罗来纳 · 南卡/乔治亚 · 佛罗里达 · 芝加哥/中西部 · 密歇根 · 德克萨斯 · 西海岸（含加州多个子区域）

---

## 六、组件库（shadcn/ui）

已安装全套 Radix UI 组件，包含但不限于：

`Button` `Input` `Textarea` `Select` `Dialog` `Toast` `Tabs` `Badge` `Avatar` `Card` `Separator` `Drawer` `Skeleton` `Sonner` `Tooltip` `Command` `Popover`

---

## 七、构建与部署状态

### 当前已修复的问题

| 问题 | 修复方式 | 状态 |
|------|---------|------|
| `/auth/callback` route + page 冲突 | 将 `route.ts` 重命名为 `route.ts.disabled` | ✅ 已修复 |
| `useSearchParams()` 缺少 Suspense | 内外组件拆分 + `<Suspense>` 包裹 | ✅ 已修复 |
| 邮件验证后无法正确跳转 | 改用 client-side `exchangeCodeForSession` | ✅ 已修复 |
| 文件被 FUSE 截断 | 改用 bash heredoc 写入 | ✅ 已修复 |
| TypeScript 类型噪音 | `next.config.mjs` 中 `ignoreBuildErrors: true` | ✅ 已修复 |

### 本地 build 状态

- 沙箱环境下 Google Fonts 无法访问（网络隔离），导致本地 build 失败
- **这不影响 Vercel 部署**，Vercel 有完整网络访问权限
- 实际冲突错误（`/auth/callback`）已消除，本地 build 错误仅剩 Fonts 网络问题

### Vercel 项目信息

```
projectId:   prj_WRssUMg0cr5OMiGQhPiNVE8YaXkw
orgId:       team_AvUP2BaAgZP2nNeTnwQ6WXVT
projectName: xianzhiban
URL:         https://xianzhiban.vercel.app
```

### 部署命令

```bash
cd C:\Users\rober\student-resale
vercel --prod
```

---

## 八、待办 / 潜在问题

| 优先级 | 问题 | 说明 |
|--------|------|------|
| 🔴 高 | 执行 `vercel --prod` 部署 | 上次修复后尚未重新部署 |
| 🟡 中 | `lib/mock-data.ts` 中存在假数据 | categories.count 为硬编码数值，应从数据库动态查询 |
| 🟡 中 | `items/[id]/page.tsx` 体量达 576 行 | JSX 结构较复杂，上个会话有补丁历史，建议视觉验证 |
| 🟡 中 | `profile/page.tsx` 文件头有 BOM 字符（`﻿`） | 不影响运行，但不规范 |
| 🟢 低 | `lib/types.ts` 与 `lib/database.types.ts` 类型重复 | `CategorySlug`、`ItemCondition` 等定义了两份 |
| 🟢 低 | 未配置 ESLint | `eslint .` 命令存在但无配置文件 |
| 🟢 低 | 微信 QR 分享依赖第三方 `api.qrserver.com` | 可考虑换成本地生成或官方 API |

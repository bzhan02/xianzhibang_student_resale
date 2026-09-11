# 闲置帮 · XianZhiBang

> 专为北美中国留学生打造的二手交易平台。同校同城，当面交易。

**线上地址**：https://xianzhibang.vercel.app

---

## 目录

- [技术栈](#技术栈)
- [功能全景](#功能全景)
- [核心流程](#核心流程)
- [页面路由](#页面路由)
- [代码结构](#代码结构)
- [数据模型](#数据模型)
- [快速开始](#快速开始)
- [待完善功能](#待完善功能)

---

## 技术栈

| 层 | 选型 | 版本 |
|---|---|---|
| 框架 | Next.js（App Router） | 16.1.6 |
| UI 运行时 | React | 19.2.4 |
| 语言 | TypeScript | 5.7.3 |
| 样式 | Tailwind CSS | 4.2 |
| 组件 | shadcn/ui（Radix UI） | — |
| 后端 | Supabase（PostgreSQL + Auth + Storage + Realtime） | — |
| 部署 | Vercel（push 到 main 自动部署） | — |

数据访问全部走 Supabase REST，**只使用 anon key**，权限由数据库的 RLS 策略控制。
前端不持有任何特权密钥。

---

## 功能全景

### 一、账号与身份

| 功能 | 说明 |
|---|---|
| 邮箱注册 / 登录 | Supabase Auth，注册触发器自动建 profile |
| 邮件验证 | 客户端 `exchangeCodeForSession`，`/auth/callback` 与 `/auth/verify` 双入口兜底 |
| 重复注册检测 | Supabase 防枚举会对已注册邮箱返回假成功，靠 `identities` 为空数组识别并引导去登录 |
| 密码重置 | `/auth/reset`，邮件链接换会话后设置新密码 |
| 重发验证邮件 | 登录页入口，供注册过但没收到邮件的用户自救 |
| 学校绑定 | 118 所北美高校、29 个地区分组，强制从下拉选择，避免自由输入导致同校匹配失效 |
| 昵称查重 | 注册与改名时校验全库唯一 |
| 头像上传 | 自动裁剪 512px 方图并压缩，存 Supabase Storage |

### 二、商品

| 功能 | 说明 |
|---|---|
| 发布 | 最多 6 图、5 分类、4 档成色、3 种交易方式、价格与原价 |
| 编辑 / 删除 | 带所有权校验，非本人无法编辑 |
| 标记售出 | 售出后从列表隐藏，并自动更新卖家在售数 |
| 图片压缩 | 上传前浏览器端处理，实测 2.2 MB → 215 KB（省 90%） |
| 浏览量 | 匿名可累加，走 `security definer` 函数避免开放写权限 |

### 三、发现商品

| 功能 | 说明 |
|---|---|
| 首页 | 分类导航 + 热门搜索 + 推荐流，分页加载 |
| 搜索 | **服务端全库搜索**，标题与描述模糊匹配，走 pg_trgm GIN 索引 |
| 筛选 | 分类 / 价格区间 / 成色 / 4 种排序，条件写进 URL 可分享可后退 |
| 搜索历史 | localStorage 存 10 条，可单条删除或清空 |
| 输入联想 | 250 ms 防抖，下拉展示匹配商品标题并高亮命中部分 |
| 附近 | 按同校 / 同区域 / 全部三级范围筛选 |
| 分类浏览 | 5 个分类各自独立页面 |

### 四、交易与沟通

| 功能 | 说明 |
|---|---|
| 站内私信 | 一对一会话，同商品同买家唯一会话 |
| 实时消息 | Supabase Realtime 订阅，10 秒轮询作为降级保障 |
| 未读计数 | 底部导航与消息列表红点 |
| 购买请求 | 结构化 offer 消息，含交易方式与期望时间 |
| 接受 / 拒绝 | 卖家接受后商品自动标记售出；拒绝需填原因 |

### 五、信任体系

| 功能 | 说明 |
|---|---|
| 交易评价 | 买卖双向，1–5 星 + 200 字评语 |
| 评价门槛 | 只有交易双方、且 offer 已被接受后才能评价，RLS 层强制 |
| 防重复 | 同一笔交易同一人只能评一次，数据库唯一约束保证 |
| 真实评分 | 触发器在评价增删改时自动重算星级与评价数 |
| 无评价状态 | 显示「暂无评价」而非默认 5 星 |
| 公开卖家主页 | `/users/[id]`，在售商品与评价双 Tab |

### 六、传播与 SEO

| 功能 | 说明 |
|---|---|
| 分享卡片 | 服务端 `generateMetadata`，商品链接在微信 / 小红书显示价格 + 标题 + 实拍图 |
| 结构化数据 | Product JSON-LD，Google 搜索结果展示价格与库存状态 |
| 原生分享 | `navigator.share` 唤起系统面板，不支持时降级复制链接 |
| 微信二维码 | 商品页可生成二维码供扫码打开 |
| sitemap | 每小时重新生成，自动收录在售商品与卖家主页 |
| robots | 屏蔽私信、设置、发布等私密路径 |
| 售出处理 | 已售商品自动加 `noindex`，不污染搜索结果 |

### 七、体验细节

响应式双端布局（移动端底部导航 / 桌面端侧边栏）、骨架屏、404 与错误边界、
Toast 提示、上传进度、暗色模式支持。

---

## 核心流程

### 发布到成交

```
卖家发布商品
  ├─ 选图 → 浏览器压缩（1600px / WebP）→ 上传 Storage
  ├─ 写入 items 表
  └─ 触发器更新 profiles.items_count
        ↓
买家发现商品
  ├─ 首页推荐 / 搜索 / 分类 / 附近
  └─ 商品详情页（浏览量 +1）
        ↓
买家发起会话
  ├─ 创建 conversation（同商品同买家唯一）
  ├─ 发送购买请求（message_type = 'offer'）
  └─ Realtime 推送给卖家
        ↓
卖家接受
  ├─ offer.metadata.status = 'accepted'
  ├─ items.is_sold = true
  └─ 触发器更新在售数
        ↓
双方互评
  ├─ RLS 校验：是参与方 且 offer 已接受
  ├─ 写入 reviews（唯一约束防重复）
  └─ 触发器重算 profiles.rating 与 review_count
```

### 搜索请求路径

```
SearchBar 输入
  └─ 防抖 250ms → fetchSuggestions()  ─→ items?title=ilike.*q*
提交
  └─ /search?q=&category=&min=&max=&sort=
       └─ searchItems() ─→ items?or=(title.ilike,description.ilike)&...
                              走 items_title_trgm_idx / items_desc_trgm_idx
```

---

## 页面路由

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | 静态 | 首页 |
| `/search` | 静态 | 搜索结果与筛选 |
| `/categories` | 静态 | 全部分类 |
| `/categories/[slug]` | 动态 | 分类商品列表（带 OG） |
| `/items/[id]` | 动态 | 商品详情（带 OG + JSON-LD） |
| `/items/[id]/edit` | 动态 | 编辑商品 |
| `/users/[id]` | 动态 | 公开卖家主页（带 OG） |
| `/nearby` | 静态 | 附近商品 |
| `/messages` | 静态 | 会话列表 |
| `/messages/[id]` | 动态 | 聊天详情 |
| `/publish` | 静态 | 发布商品 |
| `/profile` | 静态 | 我的主页 |
| `/my-listings` | 静态 | 我的发布 |
| `/my-purchases` | 静态 | 我的购买 |
| `/favorites` | 静态 | 收藏夹 |
| `/settings` | 静态 | 账号设置 |
| `/auth` | 静态 | 登录 / 注册 |
| `/auth/callback`、`/auth/verify` | 静态 | 邮件验证回调 |
| `/auth/reset` | 静态 | 密码重置 |
| `/robots.txt`、`/sitemap.xml` | 生成 | SEO |

---

## 代码结构

```
app/
  layout.tsx              站点级 metadata、OG 默认值、全局 Provider
  page.tsx                首页
  error.tsx               错误边界
  not-found.tsx           404
  robots.ts / sitemap.ts  SEO 生成
  items/[id]/layout.tsx   服务端 OG 标签 + Product JSON-LD
  ...

components/
  app-shell.tsx      双端布局外壳（移动端底栏 / 桌面端侧栏）
  search-bar.tsx     搜索框（历史、热门、联想）
  item-card.tsx      商品卡片
  seller-card.tsx    卖家信息卡
  review-dialog.tsx  评价弹窗与聊天页入口
  rating-display.tsx 星级组件与评价列表
  ...

lib/
  supabase-rest.ts   ← REST 请求 / 请求头 / Storage 上传的唯一入口
  item-mapper.ts     ← 数据库行 → Item 的唯一映射
  categories.ts      ← 分类定义的唯一来源
  types.ts           ← 领域类型与下拉常量的唯一来源
  uploads.ts         图片上传路径约定
  image-compress.ts  上传前压缩
  search.ts          服务端搜索 + 搜索历史
  reviews.ts         评价读写
  auth-context.tsx   登录态
  store.tsx          首页商品列表与收藏
  school-groups.ts   118 所高校 / 29 个地区
  use-unread-count.ts 未读消息数

supabase/migrations/   数据库的唯一真相来源，见 SETUP.md
```

**约定**：新增数据访问一律走 `lib/supabase-rest.ts` 的 `rest()` / `restOr()`，
不要在页面里直接拼 `process.env.NEXT_PUBLIC_SUPABASE_URL`。

---

## 数据模型

| 表 | 用途 | 关键约束 |
|---|---|---|
| `profiles` | 用户资料、学校、评分、在售数 | 注册触发器自动创建 |
| `items` | 商品 | 枚举约束分类 / 成色 / 交易方式 |
| `favorites` | 收藏 | 主键 (user_id, item_id) |
| `conversations` | 会话 | 唯一 (item_id, buyer_id) |
| `messages` | 消息 | `message_type` 区分 text / offer |
| `reviews` | 评价 | 唯一 (conversation_id, reviewer_id)、禁止自评 |

**触发器**：注册建档、时间戳维护、会话时间刷新、评分重算、在售数重算。

**RLS**：商品公开可读、仅本人可改；私信仅参与方可见；评价需交易确认后才能提交。

完整定义见 `supabase/migrations/`，共 5 个按序执行的迁移文件。

---

## 快速开始

```bash
git clone https://github.com/bzhan02/xianzhibang_student_resale.git
cd xianzhibang_student_resale
npm install
cp .env.local.example .env.local   # 填入 Supabase URL 与 anon key
npm run dev
```

数据库初始化、Storage 配置、Vercel 部署与环境变量的完整步骤见 **[SETUP.md](./SETUP.md)**，
其中包含一段自检 SQL 可验证迁移是否执行完整。

---

## 待完善功能

### 高优先级

- [ ] **自定义 SMTP** — **上线前必须做**。Supabase 内置邮件服务限
      [2 封/小时](https://supabase.com/docs/guides/auth/rate-limits)，
      且官方声明「仅供非生产用途，不保证送达」。注册验证与密码重置共用这个额度，
      意味着第 3 个注册的用户就收不到邮件，且是静默失败。
      需要一个邮件服务商（如 Resend）+ 自有域名。
- [ ] **离线消息通知** — 站内实时通知已完成（全局 Realtime 订阅 + 浏览器通知 +
      标题闪烁 + favicon 徽点），但**关掉浏览器就收不到**。
      补齐需要 Web Push（iOS 用户须手动「添加到主屏幕」）或邮件通知（须自有域名）。
- [ ] **举报与屏蔽** — 没有任何内容治理手段。上线后一旦出现虚假商品或骚扰，
      只能手工进数据库处理。
- [ ] **草稿保存** — 发布页刷新即丢失，长描述写到一半跳走就白写了。

### 中优先级

- [ ] **交易凭证** — 目前"接受 offer"只改状态，没有金额确认与交易记录留存，
      纠纷时无据可查。
- [ ] **搜索结果排序权重** — 现在只能单维度排序，无法综合考虑相关度、
      新鲜度、卖家评分。
- [ ] **图片懒加载与占位图** — 商品多了以后首屏会同时请求大量图片。
- [ ] **收藏夹分组 / 降价提醒** — 收藏目前只是列表，没有后续价值。
- [ ] **关闭 `ignoreBuildErrors`** — `next.config.mjs` 里为绕过 Supabase SDK
      泛型噪音而开启。业务代码本身类型干净（`npx tsc --noEmit` 可验证），
      但这个开关会掩盖未来的真实类型错误。

### 低优先级 / 待验证需求

- [ ] **多语言** — 目前全中文，英文界面对非中文母语的室友转卖场景有帮助。
- [ ] **地图选点** — 现在"所在地"是自由文本，无法按距离精确排序。
- [ ] **批量发布** — 毕业季清仓时逐件发布很繁琐。
- [ ] **支付集成** — 当前定位是撮合工具，线下当面交易。
      引入支付意味着要处理退款、纠纷、合规，需要先验证是否真有需求。

### 明确不做

- 抽成与佣金 — 会改变产品定位，且需要主体资质
- 物流对接 — 同校当面交易是核心场景，寄送属于低频边缘需求

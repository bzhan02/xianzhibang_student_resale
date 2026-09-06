import { getToken } from "./utils"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export type ReviewerRole = "buyer" | "seller"

export interface Review {
  id: string
  conversationId: string
  itemId: string | null
  reviewerId: string
  revieweeId: string
  rating: number
  comment: string
  reviewerRole: ReviewerRole
  createdAt: string
  reviewer?: {
    name: string
    avatar: string
    school: string
  }
  item?: {
    title: string
  }
}

export interface RatingSummary {
  rating: number
  reviewCount: number
}

type DbReview = {
  id: string
  conversation_id: string
  item_id: string | null
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  reviewer_role: string
  created_at: string
  reviewer?: { name: string | null; avatar_url: string | null; school: string | null } | null
  items?: { title: string | null } | null
}

function toReview(row: DbReview): Review {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    itemId: row.item_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment ?? "",
    reviewerRole: (row.reviewer_role as ReviewerRole) ?? "buyer",
    createdAt: row.created_at,
    reviewer: row.reviewer
      ? {
          name: row.reviewer.name ?? "用户",
          avatar: row.reviewer.avatar_url ?? "",
          school: row.reviewer.school ?? "",
        }
      : undefined,
    item: row.items ? { title: row.items.title ?? "" } : undefined,
  }
}

function anonHeaders(): Record<string, string> {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
}

function authHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  }
}

/** 拉取某人收到的评价（公开可见） */
export async function fetchReviewsFor(userId: string, limit = 20): Promise<Review[]> {
  try {
    const select = "*,reviewer:profiles!reviewer_id(name,avatar_url,school),items(title)"
    let res = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?reviewee_id=eq.${userId}&select=${encodeURIComponent(select)}&order=created_at.desc&limit=${limit}`,
      { headers: anonHeaders() }
    )
    if (!res.ok) {
      // 降级：不 join
      res = await fetch(
        `${SUPABASE_URL}/rest/v1/reviews?reviewee_id=eq.${userId}&select=*&order=created_at.desc&limit=${limit}`,
        { headers: anonHeaders() }
      )
    }
    if (!res.ok) return []
    const rows: DbReview[] = await res.json()
    return Array.isArray(rows) ? rows.map(toReview) : []
  } catch {
    return []
  }
}

/** 读取某人的评分概要 */
export async function fetchRatingSummary(userId: string): Promise<RatingSummary> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=rating,review_count`,
      { headers: anonHeaders() }
    )
    if (!res.ok) return { rating: 0, reviewCount: 0 }
    const rows: { rating: number | null; review_count: number | null }[] = await res.json()
    const row = Array.isArray(rows) ? rows[0] : null
    return { rating: row?.rating ?? 0, reviewCount: row?.review_count ?? 0 }
  } catch {
    return { rating: 0, reviewCount: 0 }
  }
}

/** 我在这笔会话里是否已评价过 */
export async function fetchMyReviewForConversation(
  conversationId: string,
  myUserId: string
): Promise<Review | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?conversation_id=eq.${conversationId}&reviewer_id=eq.${myUserId}&select=*`,
      { headers: authHeaders() }
    )
    if (!res.ok) return null
    const rows: DbReview[] = await res.json()
    return Array.isArray(rows) && rows[0] ? toReview(rows[0]) : null
  } catch {
    return null
  }
}

export interface SubmitReviewInput {
  conversationId: string
  itemId: string | null
  revieweeId: string
  rating: number
  comment?: string
  reviewerRole: ReviewerRole
}

export interface SubmitResult {
  ok: boolean
  error?: string
  review?: Review
}

/** 提交评价 */
export async function submitReview(
  input: SubmitReviewInput,
  myUserId: string
): Promise<SubmitResult> {
  if (input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "请选择 1-5 星" }
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        conversation_id: input.conversationId,
        item_id: input.itemId,
        reviewer_id: myUserId,
        reviewee_id: input.revieweeId,
        rating: input.rating,
        comment: (input.comment ?? "").trim(),
        reviewer_role: input.reviewerRole,
      }),
    })

    if (res.ok) {
      const rows: DbReview[] = await res.json()
      return { ok: true, review: Array.isArray(rows) && rows[0] ? toReview(rows[0]) : undefined }
    }

    const text = await res.text()
    if (text.includes("reviews_once_per_deal")) {
      return { ok: false, error: "你已经评价过这笔交易了" }
    }
    if (text.includes("row-level security")) {
      return { ok: false, error: "交易确认后才能评价" }
    }
    if (text.includes("reviews_no_self")) {
      return { ok: false, error: "不能给自己评价" }
    }
    return { ok: false, error: "提交失败，请稍后再试" }
  } catch {
    return { ok: false, error: "网络错误，请稍后再试" }
  }
}

/** 星级文案 */
export function ratingLabel(n: number): string {
  return ["", "很差", "较差", "一般", "满意", "非常满意"][Math.round(n)] ?? ""
}

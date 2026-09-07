import { rest, restOr } from "./supabase-rest"

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
  reviewer?: { name: string; avatar: string; school: string }
  item?: { title: string }
}

export interface RatingSummary {
  rating: number
  reviewCount: number
}

type ReviewRow = {
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

function toReview(r: ReviewRow): Review {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    itemId: r.item_id,
    reviewerId: r.reviewer_id,
    revieweeId: r.reviewee_id,
    rating: r.rating,
    comment: r.comment ?? "",
    reviewerRole: (r.reviewer_role as ReviewerRole) ?? "buyer",
    createdAt: r.created_at,
    reviewer: r.reviewer
      ? {
          name: r.reviewer.name ?? "用户",
          avatar: r.reviewer.avatar_url ?? "",
          school: r.reviewer.school ?? "",
        }
      : undefined,
    item: r.items ? { title: r.items.title ?? "" } : undefined,
  }
}

const REVIEW_SELECT = "*,reviewer:profiles!reviewer_id(name,avatar_url,school),items(title)"

/** 拉取某人收到的评价（公开可见） */
export async function fetchReviewsFor(userId: string, limit = 20): Promise<Review[]> {
  const query = `reviewee_id=eq.${userId}&order=created_at.desc&limit=${limit}`
  let rows = await restOr<ReviewRow[]>(`reviews?select=${encodeURIComponent(REVIEW_SELECT)}&${query}`, [])
  // join 失败时降级
  if (rows.length === 0) rows = await restOr<ReviewRow[]>(`reviews?select=*&${query}`, [])
  return rows.map(toReview)
}

/** 读取某人的评分概要 */
export async function fetchRatingSummary(userId: string): Promise<RatingSummary> {
  const rows = await restOr<{ rating: number | null; review_count: number | null }[]>(
    `profiles?id=eq.${userId}&select=rating,review_count`, []
  )
  return { rating: rows[0]?.rating ?? 0, reviewCount: rows[0]?.review_count ?? 0 }
}

/** 我在这笔会话里是否已评价过 */
export async function fetchMyReviewForConversation(
  conversationId: string,
  myUserId: string
): Promise<Review | null> {
  const rows = await restOr<ReviewRow[]>(
    `reviews?conversation_id=eq.${conversationId}&reviewer_id=eq.${myUserId}&select=*`,
    [], { auth: true }
  )
  return rows[0] ? toReview(rows[0]) : null
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

/** 把数据库约束/策略的报错翻译成用户看得懂的话 */
function explain(message: string): string {
  if (message.includes("reviews_once_per_deal")) return "你已经评价过这笔交易了"
  if (message.includes("row-level security")) return "交易确认后才能评价"
  if (message.includes("reviews_no_self")) return "不能给自己评价"
  return "提交失败，请稍后再试"
}

export async function submitReview(input: SubmitReviewInput, myUserId: string): Promise<SubmitResult> {
  if (input.rating < 1 || input.rating > 5) return { ok: false, error: "请选择 1-5 星" }
  try {
    const rows = await rest<ReviewRow[]>("reviews", {
      method: "POST",
      auth: true,
      prefer: "return=representation",
      body: {
        conversation_id: input.conversationId,
        item_id: input.itemId,
        reviewer_id: myUserId,
        reviewee_id: input.revieweeId,
        rating: input.rating,
        comment: (input.comment ?? "").trim(),
        reviewer_role: input.reviewerRole,
      },
    })
    return { ok: true, review: rows?.[0] ? toReview(rows[0]) : undefined }
  } catch (err) {
    return { ok: false, error: explain(err instanceof Error ? err.message : "") }
  }
}

export function ratingLabel(n: number): string {
  return ["", "很差", "较差", "一般", "满意", "非常满意"][Math.round(n)] ?? ""
}

"use client"

import { useState } from "react"
import { Star, X, Loader2, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { submitReview, ratingLabel, type ReviewerRole } from "@/lib/reviews"

export function ReviewDialog({
  open,
  onClose,
  onSubmitted,
  conversationId,
  itemId,
  revieweeId,
  revieweeName,
  itemTitle,
  reviewerRole,
  myUserId,
}: {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  conversationId: string
  itemId: string | null
  revieweeId: string
  revieweeName: string
  itemTitle: string
  reviewerRole: ReviewerRole
  myUserId: string
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const shown = hover || rating

  async function handleSubmit() {
    if (rating < 1) {
      setError("请先选择星级")
      return
    }
    setSubmitting(true)
    setError("")
    const res = await submitReview(
      { conversationId, itemId, revieweeId, rating, comment, reviewerRole },
      myUserId
    )
    setSubmitting(false)
    if (res.ok) {
      onSubmitted()
      onClose()
    } else {
      setError(res.error ?? "提交失败")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl">
        {/* 标题 */}
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-base font-semibold text-foreground">
            评价{reviewerRole === "buyer" ? "卖家" : "买家"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-xs text-muted-foreground">
          与 <span className="font-medium text-foreground">{revieweeName}</span> 的交易
          {itemTitle && <>：{itemTitle}</>}
        </p>

        {/* 星级 */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex gap-1.5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} 星`}
                onMouseEnter={() => setHover(n)}
                onClick={() => {
                  setRating(n)
                  setError("")
                }}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>
          <span className={cn("text-xs", shown ? "font-medium text-amber-500" : "text-muted-foreground")}>
            {shown ? ratingLabel(shown) : "点击星星评分"}
          </span>
        </div>

        {/* 评语 */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 200))}
          placeholder={
            reviewerRole === "buyer"
              ? "商品和描述相符吗？沟通是否顺畅？（选填）"
              : "买家是否守时、沟通顺畅？（选填）"
          }
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="mt-1 text-right text-[11px] text-muted-foreground">{comment.length}/200</div>

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        {/* 按钮 */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            稍后再说
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中
              </>
            ) : (
              "提交评价"
            )}
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          评价公开可见，提交后可在个人主页查看
        </p>
      </div>
    </div>
  )
}

/** 聊天页里的评价入口条 */
export function ReviewPrompt({
  reviewed,
  myRating,
  onOpen,
  counterpartName,
  role,
}: {
  reviewed: boolean
  myRating: number
  onOpen: () => void
  counterpartName: string
  role: ReviewerRole
}) {
  if (reviewed) {
    return (
      <div className="mx-auto my-3 flex max-w-sm items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-50 px-4 py-2.5 text-xs dark:bg-green-950/20">
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
        <span className="text-foreground">已评价</span>
        <span className="flex items-center gap-0.5 text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-3 w-3", i < myRating ? "fill-current" : "text-muted-foreground/30")}
            />
          ))}
        </span>
      </div>
    )
  }

  return (
    <div className="mx-auto my-3 max-w-sm rounded-xl border border-amber-500/30 bg-amber-50 p-3.5 text-center dark:bg-amber-950/20">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        交易完成了吗？
      </div>
      <p className="mb-2.5 text-xs text-muted-foreground">
        评价一下{role === "buyer" ? "卖家" : "买家"} {counterpartName}，帮助其他同学判断
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        评价这次交易
      </button>
    </div>
  )
}

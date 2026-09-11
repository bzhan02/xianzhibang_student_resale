"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Eye, EyeOff, KeyRound, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

type Stage = "exchanging" | "ready" | "invalid"

function ResetInner() {
  const router = useRouter()
  const params = useSearchParams()

  const [stage, setStage] = useState<Stage>("exchanging")
  const [reason, setReason] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  // 客户端设了 detectSessionInUrl: false，所以要手动用 code 换 session，
  // 与 /auth/verify 的做法保持一致。
  useEffect(() => {
    const code = params.get("code")
    const errDesc = params.get("error_description")

    if (errDesc) {
      setReason(errDesc)
      setStage("invalid")
      return
    }
    if (!code) {
      setReason("链接不完整，可能是邮箱客户端把链接截断了")
      setStage("invalid")
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setReason("链接已失效或已被使用过。重置链接通常 1 小时内有效")
        setStage("invalid")
      } else {
        setStage("ready")
      }
    })
  }, [params])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("密码至少需要 8 位")
      return
    }
    if (password !== confirm) {
      toast.error("两次输入的密码不一致")
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      toast.error("重置失败", { description: error.message })
      return
    }
    toast.success("密码已重置", { description: "已自动登录" })
    router.replace("/")
    router.refresh()
  }

  if (stage === "exchanging") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在验证重置链接…</p>
      </div>
    )
  }

  if (stage === "invalid") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-base font-semibold text-foreground">重置链接无法使用</h1>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{reason}</p>
        <Link
          href="/auth"
          className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          重新申请重置
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-10">
      <div className="mb-7 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">设置新密码</h1>
        <p className="text-sm text-muted-foreground">设置完成后会自动登录</p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <Label htmlFor="new-password">新密码</Label>
          <div className="relative mt-1.5">
            <Input
              id="new-password"
              type={show ? "text" : "password"}
              placeholder="至少 8 位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "隐藏密码" : "显示密码"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="confirm-password">确认新密码</Label>
          <Input
            id="confirm-password"
            type={show ? "text" : "password"}
            placeholder="再输入一次"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="mt-1.5"
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="mt-1 text-xs text-destructive">两次输入不一致</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full rounded-full"
          disabled={saving || password.length < 8 || password !== confirm}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中…
            </>
          ) : (
            "确认修改"
          )}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ResetInner />
    </Suspense>
  )
}

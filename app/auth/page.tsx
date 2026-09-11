"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, GraduationCap, CheckCircle2, XCircle, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { schoolGroups } from "@/lib/school-groups"

type NameStatus = "idle" | "checking" | "taken" | "available"

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 邮件回调验证失败时显示提示
  useEffect(() => {
    if (searchParams.get("error") === "verification_failed") {
      toast.error("邮件验证失败，请重新注册或联系支持")
    }
  }, [searchParams])

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 登录表单
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // 注册表单
  const [registerName, setRegisterName] = useState("")
  const [registerSchool, setRegisterSchool] = useState("")
  const [schoolConfirmed, setSchoolConfirmed] = useState(false)
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false)
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle")
  const [tab, setTab] = useState("login")

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const schoolInputRef = useRef<HTMLInputElement>(null)

  // 昵称重名检测
  useEffect(() => {
    const trimmed = registerName.trim()
    if (!trimmed) { setNameStatus("idle"); return }
    setNameStatus("checking")
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (abortRef.current) abortRef.current.abort()
    debounceTimer.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("name", trimmed)
          .limit(1)
          .abortSignal(controller.signal)
        clearTimeout(timeoutId)
        setNameStatus(data && data.length > 0 ? "taken" : "available")
      } catch {
        clearTimeout(timeoutId)
        setNameStatus("available")
      }
    }, 500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [registerName])

  // 学校模糊搜索过滤
  const filteredSchools = useMemo(() => {
    const q = registerSchool.trim().toLowerCase()
    if (!q) return []
    const results: Array<{ id: string; displayName: string; groupName: string }> = []
    for (const group of schoolGroups) {
      for (const s of group.schools) {
        if (
          s.displayName.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.includes(q) || q.includes(k))
        ) {
          results.push({ id: s.id, displayName: s.displayName, groupName: group.name })
        }
      }
    }
    return results.slice(0, 8)
  }, [registerSchool])

  function handleSchoolInput(value: string) {
    setRegisterSchool(value)
    setSchoolConfirmed(false)
    setShowSchoolDropdown(true)
  }

  function selectSchool(displayName: string) {
    setRegisterSchool(displayName)
    setSchoolConfirmed(true)
    setShowSchoolDropdown(false)
    schoolInputRef.current?.blur()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    setIsLoading(false)
    if (error) { toast.error("登录失败", { description: error.message }) }
    else { toast.success("登录成功！"); router.push("/"); router.refresh() }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!registerName.trim()) { toast.error("请填写昵称"); return }
    if (nameStatus === "taken") { toast.error("昵称已被使用，请换一个"); return }
    if (nameStatus === "checking") { toast.error("昵称检测中，请稍候"); return }
    if (!schoolConfirmed || !registerSchool.trim()) {
      toast.error("请从下拉列表中选择你的学校")
      schoolInputRef.current?.focus()
      return
    }
    if (registerPassword.length < 8) { toast.error("密码至少需要 8 位"); return }
    setIsLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: { name: registerName.trim(), school: registerSchool.trim() },
        emailRedirectTo: `${window.location.origin}/auth/verify`,
      },
    })
    setIsLoading(false)

    if (error) {
      toast.error("注册失败", { description: error.message })
      return
    }

    // Supabase 为防止邮箱枚举，对「已注册且已验证」的邮箱会返回假成功：
    // 不报错、不创建用户、也不发验证邮件，只是把 identities 返回成空数组。
    // 不检查这里的话，用户会看到"注册成功"却永远等不到邮件。
    // 参考 https://github.com/supabase/supabase-js/issues/296
    if (data.user && data.user.identities?.length === 0) {
      setLoginEmail(registerEmail)
      setTab("login")
      toast.error("这个邮箱已经注册过了", {
        description: "已帮你切到登录页，直接用原密码登录即可",
        duration: 7000,
      })
      return
    }

    // 走到这里有两种可能：新用户创建成功，或该邮箱注册过但从未验证、
    // Supabase 重发了一封验证邮件。两者在客户端返回上无法区分
    // （都是 user 非空 + identities 非空 + session 为 null），
    // 所以用一句对两种情况都成立的文案。
    toast.success("验证邮件已发送", {
      description: "请到邮箱点击验证链接，记得看一下垃圾邮件箱",
      duration: 6000,
    })
  }

  /** 注册过但没收到验证邮件时，重新发一封 */
  async function handleResendVerification() {
    if (!loginEmail.trim()) {
      toast.error("请先填写邮箱")
      return
    }
    setIsLoading(true)
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: loginEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/verify` },
    })
    setIsLoading(false)
    if (error) toast.error("发送失败", { description: error.message })
    else toast.success("验证邮件已重新发送", { description: "记得看一下垃圾邮件箱", duration: 6000 })
  }

  const canSubmitRegister =
    (nameStatus === "available" || nameStatus === "idle") &&
    schoolConfirmed &&
    registerSchool.trim().length > 0 &&
    !isLoading &&
    registerName.trim().length > 0

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">闲置帮</h1>
        <p className="text-sm text-muted-foreground">留学生二手交易平台</p>
      </div>
      <div className="w-full max-w-sm">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* ── 登录 ── */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="mt-4 flex flex-col gap-4">
              <div>
                <Label htmlFor="login-email">邮箱</Label>
                <Input id="login-email" type="email" placeholder="your@email.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="mt-1.5" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="login-password">密码</Label>
                <div className="relative mt-1.5">
                  <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="请输入密码" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={isLoading}>{isLoading ? "登录中..." : "登录"}</Button>

              <p className="text-center text-xs text-muted-foreground">
                没收到验证邮件？
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="ml-1 text-primary underline-offset-2 hover:underline disabled:opacity-50"
                >
                  重新发送
                </button>
              </p>
            </form>
          </TabsContent>

          {/* ── 注册 ── */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="mt-4 flex flex-col gap-4">

              {/* 昵称 */}
              <div>
                <Label htmlFor="reg-name">昵称 <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5">
                  <Input
                    id="reg-name"
                    placeholder="怎么称呼你？"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className={nameStatus === "taken" ? "border-destructive pr-10 focus-visible:ring-destructive" : nameStatus === "available" ? "border-green-500 pr-10 focus-visible:ring-green-500" : "pr-10"}
                    required
                    maxLength={20}
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {nameStatus === "taken" && <XCircle className="h-4 w-4 text-destructive" />}
                    {nameStatus === "available" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </div>
                </div>
                {nameStatus === "taken" && <p className="mt-1 text-xs text-destructive">昵称已被使用，请换一个</p>}
                {nameStatus === "available" && <p className="mt-1 text-xs text-green-600">昵称可用</p>}
              </div>

              {/* 学校（强制从下拉选择） */}
              <div>
                <Label htmlFor="reg-school">
                  学校 <span className="text-destructive">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    ref={schoolInputRef}
                    id="reg-school"
                    placeholder="搜索学校，例如：Duke、Rutgers、UCLA…"
                    value={registerSchool}
                    onChange={(e) => handleSchoolInput(e.target.value)}
                    onFocus={() => setShowSchoolDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 150)}
                    className={schoolConfirmed ? "border-green-500 pr-8 focus-visible:ring-green-500" : "pr-8"}
                    autoComplete="off"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    {schoolConfirmed
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>

                  {/* 下拉候选列表 */}
                  {showSchoolDropdown && filteredSchools.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      {filteredSchools.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            selectSchool(s.displayName)
                          }}
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent"
                        >
                          <span className="text-sm font-medium text-foreground">{s.displayName}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{s.groupName}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 无匹配结果提示 */}
                  {showSchoolDropdown && registerSchool.trim().length > 0 && filteredSchools.length === 0 && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
                      <p className="text-xs text-muted-foreground">没有找到匹配的学校，请尝试英文名称</p>
                    </div>
                  )}
                </div>
                {!schoolConfirmed && registerSchool.trim().length > 0 && (
                  <p className="mt-1 text-xs text-amber-600">请从下拉列表中选择学校</p>
                )}
                {schoolConfirmed && (
                  <p className="mt-1 text-xs text-green-600">学校已选择</p>
                )}
              </div>

              {/* 邮箱 */}
              <div>
                <Label htmlFor="reg-email">邮箱 <span className="text-destructive">*</span></Label>
                <Input id="reg-email" type="email" placeholder="your@email.com" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="mt-1.5" required autoComplete="email" />
              </div>

              {/* 密码 */}
              <div>
                <Label htmlFor="reg-password">密码 <span className="text-destructive">*</span></Label>
                <div className="relative mt-1.5">
                  <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="至少 8 位" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full rounded-full" disabled={!canSubmitRegister}>
                {isLoading ? "注册中..." : nameStatus === "checking" ? "检测昵称中..." : "创建账号"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">注册即代表你同意我们的服务条款和隐私政策</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}

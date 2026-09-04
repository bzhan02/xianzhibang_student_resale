"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, User, GraduationCap, Mail, Save, Check, Camera } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { getToken } from "@/lib/utils"
import { schoolGroups } from "@/lib/school-groups"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function uploadAvatar(userId: string, file: File): Promise<string> {
  const token = getToken()
  const ext = file.name.split(".").pop() ?? "jpg"
  const path = `${userId}/avatar.${ext}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? "头像上传失败")
  }
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`
}

export default function SettingsPage() {
  const { user, profile, isLoading, refreshProfile } = useAuth()
  const router = useRouter()

  const [name, setName] = useState("")
  const [school, setSchool] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const schoolInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const filteredSchools = useMemo(() => {
    const q = school.trim().toLowerCase()
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
  }, [school])

  useEffect(() => {
    if (!isLoading && !user) router.push("/auth")
  }, [user, isLoading, router])

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "")
      setSchool(profile.school ?? "")
    }
  }, [profile])

  useEffect(() => {
    if (!profile) return
    setHasChanges(
      name !== (profile.name ?? "") ||
      school !== (profile.school ?? "") ||
      avatarFile !== null
    )
  }, [name, school, profile, avatarFile])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("头像图片不超过 5MB"); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    e.target.value = ""
  }

  async function handleSave() {
    if (!user) return
    if (!name.trim()) { toast.error("昵称不能为空"); return }
    setIsSaving(true)
    try {
      const token = getToken()

      // 昵称重名检测
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?name=eq.${encodeURIComponent(name.trim())}&id=neq.${user.id}&select=id&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
      )
      if (checkRes.ok) {
        const existing = await checkRes.json()
        if (existing.length > 0) { toast.error("昵称重复，无法修改"); return }
      }

      // 上传头像（如有）
      let avatarUrl: string | undefined
      if (avatarFile) {
        setIsUploadingAvatar(true)
        avatarUrl = await uploadAvatar(user.id, avatarFile)
        setIsUploadingAvatar(false)
      }

      // 更新 profile
      const body: Record<string, string> = {
        name: name.trim(),
        school: school.trim(),
      }
      if (avatarUrl) body.avatar_url = avatarUrl

      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("保存失败")

      await refreshProfile()
      setAvatarFile(null)
      toast.success("个人信息已更新")
      setHasChanges(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败，请重试")
    } finally {
      setIsSaving(false)
      setIsUploadingAvatar(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return null

  const avatarLetter = (name || user.email || "U").charAt(0).toUpperCase()
  const currentAvatar = avatarPreview ?? profile?.avatar_url ?? null

  return (
    <div className="pb-10">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button type="button" onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-base font-semibold">账号设置</h1>
        {hasChanges && (
          <button type="button" onClick={handleSave} disabled={isSaving}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存
          </button>
        )}
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* 头像上传 */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="relative group"
          >
            <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border">
              {currentAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentAvatar} alt="头像" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-3xl font-bold">
                  {avatarLetter}
                </div>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploadingAvatar
                ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                : <Camera className="h-6 w-6 text-white" />
              }
            </div>
          </button>
          <p className="text-xs text-muted-foreground">点击更换头像（最大 5MB）</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* 表单 */}
        <div className="space-y-5">
          {/* 邮箱（只读） */}
          <div>
            <Label className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
              <Mail className="h-4 w-4" />邮箱
            </Label>
            <div className="flex items-center rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              {user.email}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">邮箱暂不支持修改</p>
          </div>

          {/* 昵称 */}
          <div>
            <Label htmlFor="name" className="flex items-center gap-1.5 text-sm mb-1.5">
              <User className="h-4 w-4" />
              昵称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入昵称"
              maxLength={20}
              className="rounded-xl"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{name.length}/20</p>
          </div>

          {/* 学校 */}
          <div>
            <Label htmlFor="school" className="flex items-center gap-1.5 text-sm mb-1.5">
              <GraduationCap className="h-4 w-4" />
              学校
            </Label>
            <div className="relative">
              <Input
                ref={schoolInputRef}
                id="school"
                value={school}
                onChange={(e) => { setSchool(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="搜索学校，例如：Duke、MIT、UCLA…"
                maxLength={80}
                className="rounded-xl"
                autoComplete="off"
              />
              {showDropdown && filteredSchools.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {filteredSchools.map((s) => (
                    <button key={s.id} type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSchool(s.displayName)
                        setShowDropdown(false)
                        schoolInputRef.current?.blur()
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-accent">
                      <span className="text-sm font-medium text-foreground">{s.displayName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.groupName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {school && filteredSchools.some(s => s.displayName === school) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                <Check className="h-3 w-3" />已匹配学校区域，附近功能可正常使用
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="w-full rounded-full" size="lg">
          {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</> : "保存修改"}
        </Button>
      </div>
    </div>
  )
}

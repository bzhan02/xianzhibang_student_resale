"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Camera, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { categories } from "@/lib/mock-data"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import type { ItemCondition, DeliveryMethod, CategorySlug } from "@/lib/types"
import { getToken } from "@/lib/utils"
import { compressImages, summarize, ITEM_IMAGE_PRESET } from "@/lib/image-compress"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const CONDITIONS: ItemCondition[] = ["全新", "仅拆封", "轻微使用", "明显使用"]
const DELIVERIES: DeliveryMethod[] = ["自取", "邮寄", "均可"]

async function sbFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? "请求失败")
  }
  return res.json()
}

async function uploadImage(userId: string, itemId: string, index: number, file: File): Promise<string> {
  const token = getToken()
  const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg"
  const path = `${userId}/${itemId}/${index}_${Date.now()}.${ext}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/item-images/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  })
  if (!res.ok) throw new Error("图片上传失败")
  return `${SUPABASE_URL}/storage/v1/object/public/item-images/${path}`
}

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [isLoadingItem, setIsLoadingItem] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)

  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [category, setCategory] = useState<CategorySlug | "">("")
  const [condition, setCondition] = useState<ItemCondition | "">("")
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | "">("")
  const [location, setLocation] = useState("")

  useEffect(() => {
    fetch(
      `${SUPABASE_URL}/rest/v1/items?id=eq.${id}&select=*&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${getToken()}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        const item = data[0]
        if (!item) { toast.error("商品不存在"); router.back(); return }
        if (item.seller_id !== user?.id) {
          toast.error("无权编辑此商品")
          router.back()
          return
        }
        setExistingImages(item.images ?? [])
        setTitle(item.title ?? "")
        setDescription(item.description ?? "")
        setPrice(String(item.price ?? ""))
        setOriginalPrice(item.original_price ? String(item.original_price) : "")
        setCategory(item.category ?? "")
        setCondition(item.condition ?? "")
        setDeliveryMethod(item.delivery_method ?? "")
        setLocation(item.location ?? "")
        setIsLoadingItem(false)
      })
      .catch(() => { toast.error("加载失败"); setIsLoadingItem(false) })
  }, [id, router])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 text-base font-medium">请先登录</p>
        <Button className="rounded-full" onClick={() => router.push("/auth")}>去登录</Button>
      </div>
    )
  }

  if (isLoadingItem) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  function removeExistingImage(index: number) {
    setExistingImages(existingImages.filter((_, i) => i !== index))
  }

  async function handleNewImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    const total = existingImages.length + newImageFiles.length + files.length
    if (total > 6) { toast.error("最多 6 张图片"); return }

    setIsCompressing(true)
    try {
      const results = await compressImages(files, ITEM_IMAGE_PRESET)
      const compressed = results.map((r) => r.file)
      setNewImageFiles((prev) => [...prev, ...compressed])
      setNewImagePreviews((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))])
      const msg = summarize(results)
      if (msg) toast.success(msg)
    } catch {
      setNewImageFiles((prev) => [...prev, ...files])
      setNewImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    } finally {
      setIsCompressing(false)
    }
  }

  function removeNewImage(index: number) {
    URL.revokeObjectURL(newImagePreviews[index])
    setNewImageFiles(newImageFiles.filter((_, i) => i !== index))
    setNewImagePreviews(newImagePreviews.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!title || !price || !category || !condition) {
      toast.error("请填写必填项", { description: "标题、价格、分类和新旧程度为必填" })
      return
    }
    setIsSubmitting(true)
    try {
      let uploadedUrls: string[] = []
      if (newImageFiles.length > 0) {
        uploadedUrls = await Promise.all(
          newImageFiles.map((f, i) =>
            uploadImage(user.id, id, existingImages.length + i, f)
          )
        )
      }
      const allImages = [...existingImages, ...uploadedUrls]

      await sbFetch(`items?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price),
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          images: allImages,
          category: category as CategorySlug,
          condition: condition as ItemCondition,
          delivery_method: (deliveryMethod || "均可") as DeliveryMethod,
          location: location.trim(),
        }),
      })

      toast.success("修改已保存！")
      router.push(`/items/${id}`)
    } catch (err) {
      toast.error("保存失败", { description: err instanceof Error ? err.message : "未知错误" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalImages = existingImages.length + newImageFiles.length

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button type="button" onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="flex-1 text-base font-semibold">编辑商品</h1>
      </div>

      <div className="px-4 py-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* 图片管理 */}
          <div>
            <Label className="mb-2 text-foreground">商品图片（最多 6 张）</Label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
              {existingImages.map((src, index) => (
                <div key={`existing-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(index)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-primary-foreground shadow-sm">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newImagePreviews.map((src, index) => (
                <div key={`new-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(index)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-primary-foreground shadow-sm">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {totalImages < 6 && (
                <label className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground ${isCompressing ? "cursor-wait opacity-60" : "cursor-pointer hover:border-primary hover:text-primary"}`}>
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-[10px]">处理中</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5" />
                      <span className="text-[10px]">{totalImages}/6</span>
                    </>
                  )}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={isCompressing} onChange={handleNewImageChange} />
                </label>
              )}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <Label htmlFor="title" className="text-foreground">标题 <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="请输入商品标题" value={title}
              onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={50} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{title.length}/50</p>
          </div>

          {/* 描述 */}
          <div>
            <Label htmlFor="description" className="text-foreground">描述</Label>
            <Textarea id="description" placeholder="描述商品的详细信息、使用状况等..."
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-24" maxLength={500} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          {/* 价格 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price" className="text-foreground">售价 ($) <span className="text-destructive">*</span></Label>
              <Input id="price" type="number" placeholder="0" value={price}
                onChange={(e) => setPrice(e.target.value)} className="mt-1.5" min={0} step="0.01" />
            </div>
            <div>
              <Label htmlFor="originalPrice" className="text-foreground">原价 ($)</Label>
              <Input id="originalPrice" type="number" placeholder="0" value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)} className="mt-1.5" min={0} step="0.01" />
            </div>
          </div>

          {/* 分类 */}
          <div>
            <Label className="text-foreground">分类 <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategorySlug)}>
              <SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="请选择分类" /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 新旧程度 */}
          <div>
            <Label className="text-foreground">新旧程度 <span className="text-destructive">*</span></Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button key={c} type="button" onClick={() => setCondition(c)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    condition === c ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 交易方式 */}
          <div>
            <Label className="text-foreground">交易方式</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DELIVERIES.map((m) => (
                <button key={m} type="button" onClick={() => setDeliveryMethod(m)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    deliveryMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-accent"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 所在地 */}
          <div>
            <Label htmlFor="location" className="text-foreground">所在地</Label>
            <Input id="location" placeholder="例如: Los Angeles, CA" value={location}
              onChange={(e) => setLocation(e.target.value)} className="mt-1.5" />
          </div>

          <Button type="submit" className="mt-2 w-full rounded-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</> : "保存修改"}
          </Button>
        </form>
      </div>
    </div>
  )
}

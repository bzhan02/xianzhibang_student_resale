"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CATEGORIES } from "@/lib/categories"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { CONDITIONS, DELIVERIES } from "@/lib/types"
import type { ItemCondition, DeliveryMethod, CategorySlug } from "@/lib/types"
import { rest } from "@/lib/supabase-rest"
import { compressImages, summarize, ITEM_IMAGE_PRESET } from "@/lib/image-compress"
import { uploadItemImage } from "@/lib/uploads"

export default function PublishPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [category, setCategory] = useState<CategorySlug | "">("")
  const [condition, setCondition] = useState<ItemCondition | "">("")
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | "">("")
  const [location, setLocation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressProgress, setCompressProgress] = useState({ done: 0, total: 0 })
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-4 text-base font-medium text-foreground">发布商品需要先登录</p>
        <Button className="rounded-full" onClick={() => router.push("/auth")}>去登录 / 注册</Button>
      </div>
    )
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = "" // 重置 input，允许重新选择同一文件或删除后重新选择
    if (files.length === 0) return
    if (imageFiles.length + files.length > 6) { toast.error("最多上传 6 张图片"); return }

    setIsCompressing(true)
    setCompressProgress({ done: 0, total: files.length })
    try {
      const results = await compressImages(files, ITEM_IMAGE_PRESET, (done, total) =>
        setCompressProgress({ done, total })
      )
      const compressed = results.map((r) => r.file)
      setImageFiles((prev) => [...prev, ...compressed])
      setImagePreviews((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))])

      const msg = summarize(results)
      if (msg) toast.success(msg)
    } catch {
      // 压缩失败也让用户能继续发布
      setImageFiles((prev) => [...prev, ...files])
      setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    } finally {
      setIsCompressing(false)
    }
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imagePreviews[index])
    setImageFiles(imageFiles.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
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
      const [item] = await rest<{ id: string }[]>("items?select=id", {
        method: "POST",
        auth: true,
        prefer: "return=representation",
        body: {
          seller_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price),
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          images: [],
          category: category as CategorySlug,
          condition: condition as ItemCondition,
          delivery_method: (deliveryMethod || "均可") as DeliveryMethod,
          location: location.trim(),
        },
      })

      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        setUploadProgress({ done: 0, total: imageFiles.length })
        let done = 0
        imageUrls = await Promise.all(
          imageFiles.map((f, i) =>
            uploadItemImage(user.id, item.id, i, f).then((url) => {
              done += 1
              setUploadProgress({ done, total: imageFiles.length })
              return url
            })
          )
        )
        await rest(`items?id=eq.${item.id}`, {
          method: "PATCH", auth: true, body: { images: imageUrls },
        })
      }

      toast.success("发布成功！")
      router.push(`/items/${item.id}`)
    } catch (err) {
      toast.error("发布失败", { description: err instanceof Error ? err.message : "未知错误" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <h1 className="mb-5 text-xl font-bold text-foreground">发布闲置</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* 图片上传 */}
        <div>
          <Label className="mb-2 text-foreground">商品图片（最多 6 张）</Label>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {imagePreviews.map((src, index) => (
              <div key={index} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeImage(index)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-primary-foreground shadow-sm">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {imagePreviews.length < 6 && (
              <label className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground ${isCompressing ? "cursor-wait opacity-60" : "cursor-pointer hover:border-primary hover:text-primary"}`}>
                {isCompressing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-[10px]">
                      {compressProgress.total > 1
                        ? `${compressProgress.done}/${compressProgress.total}`
                        : "处理中"}
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px]">{imagePreviews.length}/6</span>
                  </>
                )}
                <input type="file" accept="image/*" multiple className="hidden" disabled={isCompressing} onChange={handleImageChange} />
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
              {CATEGORIES.map((cat) => (
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

        <Button type="submit" className="mt-2 w-full rounded-full" size="lg" disabled={isSubmitting || isCompressing}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadProgress.total > 0 && uploadProgress.done < uploadProgress.total
                ? `上传图片 ${uploadProgress.done}/${uploadProgress.total}...`
                : "发布中..."}
            </>
          ) : isCompressing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />图片处理中...</>
          ) : (
            "发布商品"
          )}
        </Button>
      </form>
    </div>
  )
}

/**
 * 浏览器端图片压缩。
 * 手机拍的照片动辄 3-5MB，直传既慢又吃存储额度。
 * 这里在上传前用 canvas 缩放 + 重新编码，通常能压到原体积的 5-10%。
 */

export interface CompressOptions {
  /** 长边最大像素，超过则等比缩放 */
  maxDimension?: number
  /** 目标体积（字节），会迭代降质直到达标 */
  targetBytes?: number
  /** 初始质量 0-1 */
  quality?: number
  /** 裁成正方形（头像用） */
  square?: boolean
  /** 小于这个体积且尺寸达标就原样返回 */
  skipUnderBytes?: number
}

export interface CompressResult {
  file: File
  originalSize: number
  compressedSize: number
  width: number
  height: number
  /** 是否真的压缩了（false = 原图已经够小，直接沿用） */
  didCompress: boolean
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  targetBytes: 400 * 1024,
  quality: 0.82,
  square: false,
  skipUnderBytes: 150 * 1024,
}

let webpSupport: boolean | null = null

/** 检测浏览器 canvas 能否输出 WebP（Safari 14+ / Chrome / Firefox 都支持） */
function supportsWebP(): boolean {
  if (webpSupport !== null) return webpSupport
  try {
    const c = document.createElement("canvas")
    c.width = 1
    c.height = 1
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp")
  } catch {
    webpSupport = false
  }
  return webpSupport
}

/** 读取图片，尽量走 createImageBitmap 以正确处理 EXIF 旋转 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation: "from-image" 让浏览器按 EXIF 自动转正
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      /* 落到下面的 <img> 方案 */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("图片读取失败"))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function renameExt(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "image"
  // 去掉可能引起 Storage 路径问题的字符
  return `${base.replace(/[^\w一-龥-]/g, "_").slice(0, 40)}.${ext}`
}

/**
 * 压缩单张图片。任何异常都会回退成原文件，保证上传流程不中断。
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const opt = { ...DEFAULTS, ...options }
  const originalSize = file.size

  const fallback = (): CompressResult => ({
    file,
    originalSize,
    compressedSize: originalSize,
    width: 0,
    height: 0,
    didCompress: false,
  })

  // 非图片、或 SVG/GIF（压了会丢动画/矢量）直接跳过
  if (!file.type.startsWith("image/") || /svg|gif/i.test(file.type)) return fallback()

  try {
    const bitmap = await loadBitmap(file)
    const srcW = "width" in bitmap ? bitmap.width : 0
    const srcH = "height" in bitmap ? bitmap.height : 0
    if (!srcW || !srcH) return fallback()

    // 已经够小且尺寸不大 → 不折腾
    if (
      originalSize <= opt.skipUnderBytes &&
      Math.max(srcW, srcH) <= opt.maxDimension &&
      !opt.square
    ) {
      if ("close" in bitmap) bitmap.close()
      return fallback()
    }

    // 计算目标尺寸
    let dw: number
    let dh: number
    let sx = 0
    let sy = 0
    let sw = srcW
    let sh = srcH

    if (opt.square) {
      // 居中裁剪成正方形
      const side = Math.min(srcW, srcH)
      sx = Math.floor((srcW - side) / 2)
      sy = Math.floor((srcH - side) / 2)
      sw = side
      sh = side
      dw = dh = Math.min(side, opt.maxDimension)
    } else {
      const scale = Math.min(1, opt.maxDimension / Math.max(srcW, srcH))
      dw = Math.round(srcW * scale)
      dh = Math.round(srcH * scale)
    }

    const canvas = document.createElement("canvas")
    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      if ("close" in bitmap) bitmap.close()
      return fallback()
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    // 透明 PNG 转 JPEG 会变黑，先铺白底
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, dw, dh)
    ctx.drawImage(bitmap as CanvasImageSource, sx, sy, sw, sh, 0, 0, dw, dh)
    if ("close" in bitmap) bitmap.close()

    const useWebP = supportsWebP()
    const mime = useWebP ? "image/webp" : "image/jpeg"
    const ext = useWebP ? "webp" : "jpg"

    // 迭代降质直到达标（最多 4 次）
    let quality = opt.quality
    let blob = await canvasToBlob(canvas, mime, quality)
    for (let i = 0; i < 3 && blob && blob.size > opt.targetBytes && quality > 0.4; i++) {
      quality -= 0.12
      blob = await canvasToBlob(canvas, mime, quality)
    }

    if (!blob) return fallback()

    // 压完反而更大（原图本来就压得很好）→ 用原图
    if (blob.size >= originalSize) return fallback()

    const out = new File([blob], renameExt(file.name, ext), {
      type: mime,
      lastModified: Date.now(),
    })

    return {
      file: out,
      originalSize,
      compressedSize: out.size,
      width: dw,
      height: dh,
      didCompress: true,
    }
  } catch {
    return fallback()
  }
}

/** 批量压缩，逐张回调进度 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {},
  onProgress?: (done: number, total: number) => void
): Promise<CompressResult[]> {
  const out: CompressResult[] = []
  for (let i = 0; i < files.length; i++) {
    out.push(await compressImage(files[i], options))
    onProgress?.(i + 1, files.length)
  }
  return out
}

/** 人类可读体积 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** 汇总多张图的压缩效果，用于给用户看的提示文案 */
export function summarize(results: CompressResult[]): string | null {
  const compressed = results.filter((r) => r.didCompress)
  if (compressed.length === 0) return null
  const before = compressed.reduce((s, r) => s + r.originalSize, 0)
  const after = compressed.reduce((s, r) => s + r.compressedSize, 0)
  if (before <= after) return null
  const saved = Math.round((1 - after / before) * 100)
  return `图片已压缩 ${formatBytes(before)} → ${formatBytes(after)}（省 ${saved}%）`
}

/** 商品图预设 */
export const ITEM_IMAGE_PRESET: CompressOptions = {
  maxDimension: 1600,
  targetBytes: 400 * 1024,
  quality: 0.82,
}

/** 头像预设 */
export const AVATAR_PRESET: CompressOptions = {
  maxDimension: 512,
  targetBytes: 80 * 1024,
  quality: 0.85,
  square: true,
  skipUnderBytes: 0, // 头像一律裁方图
}

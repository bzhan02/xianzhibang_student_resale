/**
 * Supabase REST 访问的统一入口。
 * 此前 20 个文件各自声明 URL/KEY 和请求头，改动一处要改二十处。
 */
import { getToken } from "./utils"

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const REST = `${SUPABASE_URL}/rest/v1`

/** 匿名请求头：公开数据（商品、分类、卖家主页） */
export function anonHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  }
}

/** 登录态请求头：用户私有数据（收藏、私信、发布） */
export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  }
}

interface RestOptions extends Omit<RequestInit, "body"> {
  /** true 用登录态，false 用匿名。默认匿名 */
  auth?: boolean
  /** 对象会自动 JSON 序列化并补 Content-Type */
  body?: unknown
  /** PostgREST 的 Prefer 头，如 "return=representation" */
  prefer?: string
}

/**
 * 发起 REST 请求。path 不带前缀，例如 "items?select=*&limit=10"。
 * 失败时抛错，错误信息取 PostgREST 返回的 message。
 */
export async function rest<T = unknown>(path: string, options: RestOptions = {}): Promise<T> {
  const { auth = false, body, prefer, headers, ...init } = options

  const h: Record<string, string> = auth ? authHeaders() : anonHeaders()
  if (body !== undefined) h["Content-Type"] = "application/json"
  if (prefer) h.Prefer = prefer
  Object.assign(h, headers as Record<string, string> | undefined)

  const res = await fetch(`${REST}/${path}`, {
    ...init,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.message ?? `请求失败 (${res.status})`)
  }
  // DELETE 或 Prefer: return=minimal 时没有响应体
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

/** 同 rest，但失败返回兜底值而不抛错。用于「拿不到就显示空」的只读场景 */
export async function restOr<T>(path: string, fallback: T, options: RestOptions = {}): Promise<T> {
  try {
    const data = await rest<T>(path, options)
    return data ?? fallback
  } catch {
    return fallback
  }
}

/** Storage 上传，返回公开访问 URL */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
  opts: { upsert?: boolean; cacheBust?: boolean } = {}
): Promise<string> {
  const headers = authHeaders({ "Content-Type": file.type || "image/jpeg" })
  if (opts.upsert) headers["x-upsert"] = "true"

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers,
    body: file,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.message ?? "图片上传失败")
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
  // 头像会覆盖同名文件，加时间戳绕开浏览器缓存
  return opts.cacheBust ? `${url}?t=${Date.now()}` : url
}

/** 压缩后格式会变，从 MIME 推断扩展名比信任原文件名可靠 */
export function extFromMime(type: string): string {
  if (type === "image/webp") return "webp"
  if (type === "image/png") return "png"
  return "jpg"
}

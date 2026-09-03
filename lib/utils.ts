import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const _SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/** 从 localStorage 读取当前用户的 Supabase JWT */
export function getToken(): string {
  try {
    const key = `sb-${_SUPABASE_URL.split("//")[1].split(".")[0]}-auth-token`
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw).access_token ?? ""
  } catch {}
  return ""
}

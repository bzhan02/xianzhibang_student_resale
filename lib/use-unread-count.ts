"use client"

import { useNotifications } from "./notifications"

/**
 * 未读消息数。
 * 数据源已从「每 30 秒轮询」改为 NotificationProvider 里的全局 Realtime 订阅，
 * 这里只是保留旧的调用签名，避免改动所有导航组件。
 */
export function useUnreadCount(): number {
  return useNotifications().unreadCount
}

'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

// theme 用 "system" 跟随操作系统深浅色；配色变量来自 globals.css，
// 因此不需要 next-themes 这个额外依赖。
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="system"
    className="toaster group"
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
      } as React.CSSProperties
    }
    {...props}
  />
)

export { Toaster }

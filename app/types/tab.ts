export interface Tab {
  id: string
  name: string
  url?: string
  logoUrl?: string
  faviconUrl?: string
  isTemporary?: boolean
  userAgent?: string
  title?: string
  favicon?: { url: string; luminance: number }
  backgroundColor?: { color: string; textColor: string; isLowContrast: boolean } | null
  themeColor?: { color: string; textColor: string; isLowContrast: boolean } | null
}

export interface TabGroup {
  id: string
  name: string
  color: string
  tabIds: string[]
  collapsed: boolean
}

export const GROUP_COLORS = [
  { name: 'Grey', value: '#6b7280' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Orange', value: '#f97316' },
]

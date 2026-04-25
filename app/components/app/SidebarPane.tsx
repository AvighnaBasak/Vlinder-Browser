import React from 'react'
import { Sidebar } from '@/app/components/layout/Sidebar'
import { type Tab as Platform, type TabGroup } from '@/app/types/tab'
import type { WebviewContainerRef } from '@/app/components/views/WebviewContainer'

interface SidebarPaneProps {
  activePlatform: string
  enabledPlatforms: Record<string, boolean>
  onPlatformChange: (platformId: string) => void
  useOriginalLogos: boolean
  pinnedPlatforms: Record<string, boolean>
  mutedPlatforms: Record<string, boolean>
  notificationsEnabled: Record<string, boolean>
  notificationCounts: Record<string, number>
  globalNotificationsEnabled: boolean
  onTogglePinned: (platformId: string, pinned: boolean) => Promise<void>
  onToggleMuted: (platformId: string, muted: boolean) => Promise<void>
  onToggleNotifications: (platformId: string, enabled: boolean) => Promise<void>
  onUninstallPlatform: (platformId: string) => Promise<void>
  onReloadPlatform: (platformId: string) => void
  showBackButton: boolean
  showForwardButton: boolean
  showRefreshButton: boolean
  temporaryApps: Platform[]
  onCloseTemporaryApp: (id: string) => void
  onConvertToPermanent: (id: string) => Promise<void>
  onCloseAllTemporaryApps: () => void
  dynamicTitles: Record<string, string>
  customPlatforms: Platform[]
  platformOrder: string[]
  onReorderPlatforms: (order: string[]) => Promise<void>
  sidebarPosition?: 'left' | 'right'
  squarePinnedTabs: boolean
  // tabs
  tabs: Platform[]
  onSelectTab: (id: string) => void
  onNewTab: () => void
  onCloseTab: (id: string) => void
  onDuplicateTab?: (id: string) => void
  onCopyTabLink?: (id: string) => Promise<void> | void
  onCloseOtherTabs?: (id: string) => void
  onCloseTabsToRight?: (id: string) => void
  webviewRefs?: React.MutableRefObject<Record<string, WebviewContainerRef>>
  // split screen
  splitTabId: string | null
  onOpenSplitScreen: (tabId: string) => void
  // tab groups
  tabGroups: TabGroup[]
  onCreateTabGroup: (tabIds: string[], name?: string) => void
  onRenameTabGroup: (groupId: string, name: string) => void
  onSetGroupColor: (groupId: string, color: string) => void
  onToggleGroupCollapsed: (groupId: string) => void
  onAddToGroup: (groupId: string, tabId: string) => void
  onRemoveFromGroup: (tabId: string) => void
  onUnlinkGroup: (groupId: string) => void
  onCloseGroup: (groupId: string) => void
  isIncognito: boolean
}

export default function SidebarPane(props: SidebarPaneProps) {
  return <Sidebar {...props} />
}

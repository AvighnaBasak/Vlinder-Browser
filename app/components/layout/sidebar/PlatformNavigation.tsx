import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { type Tab as Platform } from '@/app/types/tab'
import {
  Pin,
  Volume2,
  VolumeX,
  RotateCw,
  ExternalLink,
  Trash2,
  Bell,
  BellOff,
  X,
  Plus,
  Globe,
  GripVertical,
  Copy,
  Link2,
  CopyPlus,
  XCircle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip'
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '@/app/components/ui/context-menu'
import { NotificationBadge } from '@/app/components/ui/notification-badge'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AppLogo from '@/app/components/ui/logo'

interface NavItem {
  id: string
  name: string
  icon: LucideIcon
  gradient: string
  isEnabled: boolean
}

export const PlatformNavigation = memo(PlatformNavigationComponent)

interface PlatformNavigationProps {
  activePlatform: string
  enabledPlatforms: Record<string, boolean> // legacy
  onPlatformChange: (platformId: string) => void // legacy
  useOriginalLogos: boolean
  pinnedPlatforms: Record<string, boolean> // legacy
  mutedPlatforms: Record<string, boolean> // legacy
  notificationsEnabled: Record<string, boolean> // legacy
  notificationCounts: Record<string, number> // legacy
  globalNotificationsEnabled: boolean // legacy
  onTogglePinned: (platformId: string, pinned: boolean) => void // legacy
  onToggleMuted: (platformId: string, muted: boolean) => void // legacy
  onToggleNotifications: (platformId: string, enabled: boolean) => void // legacy
  onUninstallPlatform: (platformId: string) => void // legacy
  onReloadPlatform: (platformId: string) => void // legacy
  compact: boolean
  temporaryApps: Platform[] // legacy
  onCloseTemporaryApp: (appId: string) => void // legacy
  onConvertToPermanent: (appId: string) => void // legacy
  onCloseAllTemporaryApps: () => void // legacy
  dynamicTitles: Record<string, string> // legacy
  customPlatforms: Platform[] // legacy
  platformOrder: string[] // legacy
  onReorderPlatforms: (newOrder: string[]) => void // legacy
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
}

function PlatformNavigationComponent({
  activePlatform,
  enabledPlatforms,
  onPlatformChange,
  useOriginalLogos,
  pinnedPlatforms,
  mutedPlatforms,
  notificationsEnabled,
  notificationCounts,
  globalNotificationsEnabled,
  onTogglePinned,
  onToggleMuted,
  onToggleNotifications,
  onUninstallPlatform,
  onReloadPlatform,
  compact,
  temporaryApps,
  onCloseTemporaryApp,
  onConvertToPermanent,
  onCloseAllTemporaryApps,
  dynamicTitles,
  customPlatforms,
  platformOrder,
  onReorderPlatforms,
  squarePinnedTabs,
  // tabs
  tabs,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onDuplicateTab,
  onCopyTabLink,
  onCloseOtherTabs,
  onCloseTabsToRight,
}: PlatformNavigationProps) {
  // State to track loaded favicons for custom platforms
  const [loadedFavicons, setLoadedFavicons] = useState<Record<string, string>>({})
  const [loadingFavicons, setLoadingFavicons] = useState<Record<string, boolean>>({})

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Function to load favicon for custom platform when it becomes active
  const loadFaviconForCustomPlatform = useCallback(
    (platformId: string) => {
      if (loadedFavicons[platformId] || loadingFavicons[platformId]) return // Already loaded or loading

      const customApp = customPlatforms.find((p) => p.id === platformId)
      if (customApp?.faviconUrl) {
        // Set loading state
        setLoadingFavicons((prev) => ({
          ...prev,
          [platformId]: true,
        }))

        // Preload the favicon
        const img = new Image()
        img.onload = () => {
          setLoadedFavicons((prev) => ({
            ...prev,
            [platformId]: customApp.faviconUrl!,
          }))
          setLoadingFavicons((prev) => ({
            ...prev,
            [platformId]: false,
          }))
        }
        img.onerror = () => {
          // If favicon fails to load, try logoUrl
          if (customApp.logoUrl) {
            const logoImg = new Image()
            logoImg.onload = () => {
              setLoadedFavicons((prev) => ({
                ...prev,
                [platformId]: customApp.logoUrl!,
              }))
              setLoadingFavicons((prev) => ({
                ...prev,
                [platformId]: false,
              }))
            }
            logoImg.onerror = () => {
              setLoadingFavicons((prev) => ({
                ...prev,
                [platformId]: false,
              }))
            }
            logoImg.src = customApp.logoUrl
          } else {
            setLoadingFavicons((prev) => ({
              ...prev,
              [platformId]: false,
            }))
          }
        }
        img.src = customApp.faviconUrl
      }
    },
    [customPlatforms, loadedFavicons, loadingFavicons]
  )

  // Load favicon when custom platform becomes active
  useEffect(() => {
    if (activePlatform.startsWith('custom_')) {
      loadFaviconForCustomPlatform(activePlatform)
    }
  }, [activePlatform, customPlatforms])

  // Build tab items (rendered with same UI as apps)
  // Use title from page if available, otherwise fall back to name (min-master style)
  // Sort: pinned tabs first (like QuickLinks), then regular tabs
  const allPlatformItems: NavItem[] = useMemo(() => {
    const items = tabs.map((t) => {
      // Use title from tab object first (updated by WebviewContainer), then dynamicTitles, then name
      // This ensures new tabs show their own title, not the parent page's (min-master style)
      const isNewTab = t.url === 'about:blank' || !t.url
      const displayName = (t as any).title || dynamicTitles[t.id] || (isNewTab ? 'New Tab' : t.name)

      return {
        id: t.id,
        name: displayName,
        icon: Globe,
        gradient: 'from-gray-500 to-gray-700', // Default, actual colors applied via inline styles
        isEnabled: true,
      }
    })

    // Sort: pinned tabs first (like QuickLinks), then regular tabs
    return items.sort((a, b) => {
      const aPinned = pinnedPlatforms?.[a.id] ?? false
      const bPinned = pinnedPlatforms?.[b.id] ?? false
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0 // Keep original order within pinned/unpinned groups
    })
  }, [tabs, dynamicTitles, pinnedPlatforms])

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = allPlatformItems.findIndex((item) => item.id === active.id)
        const newIndex = allPlatformItems.findIndex((item) => item.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(allPlatformItems, oldIndex, newIndex).map((item) => item.id)
          onReorderPlatforms(newOrder)
        }
      }
    },
    [allPlatformItems, onReorderPlatforms]
  )

  // Tabs list doubles as previous temporary items
  const temporaryItems: NavItem[] = useMemo(() => {
    return allPlatformItems
  }, [allPlatformItems])

  // Sortable item component - memoized for performance
  const SortableItem = memo(
    ({
      item,
      isTemporaryApp,
      isCustomPlatform,
    }: {
      item: NavItem
      isTemporaryApp: boolean
      isCustomPlatform: boolean
    }) => {
      const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

      const style = {
        transform: CSS.Transform.toString(transform),
        transition,
      }

      return (
        <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-50 z-50')}>
          {renderAppItem(item, isTemporaryApp, isCustomPlatform, attributes, listeners)}
        </div>
      )
    }
  )
  SortableItem.displayName = 'SortableItem'

  // Render individual app item - memoized for performance
  const renderAppItem = useCallback(
    (
      item: NavItem,
      isTemporaryApp: boolean,
      isCustomPlatform: boolean = false,
      dragAttributes?: any,
      dragListeners?: any
    ) => {
      const Icon = item.icon || Globe // Fallback to Globe icon if icon is undefined
      const isActive = activePlatform === item.id
      const isPinned = pinnedPlatforms?.[item.id] ?? false
      const isMuted = mutedPlatforms?.[item.id] ?? false
      const notifEnabled = notificationsEnabled?.[item.id] ?? true
      const notifCount = notificationCounts?.[item.id] ?? 0
      const showNotificationBadge = globalNotificationsEnabled && notifEnabled && notifCount > 0

      // Memoize tab lookup to avoid expensive find() in render
      const tabData = tabs.find((p) => p.id === item.id)
      const tabThemeColor = tabData ? (tabData as any).themeColor?.color : undefined
      const tabBackgroundColor = tabData ? (tabData as any).backgroundColor?.color : undefined
      const tabFavicon = tabData
        ? (tabData as any).favicon?.url || tabData.faviconUrl || tabData.logoUrl || AppLogo
        : AppLogo
      const isNewTabForItem = tabData ? tabData.url === 'about:blank' || !tabData.url : false

      const handleCloseTemporaryApp = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        onCloseTab(item.id)
      }

      const handleMiddleClick = (e: React.MouseEvent) => {
        if (e.button === 1) {
          // Middle mouse button - close tab (but not if pinned)
          e.preventDefault()
          e.stopPropagation()
          if (isTemporaryApp && !isPinned) {
            onCloseTab(item.id)
          }
        }
      }

      const button = (
        <button
          key={item.id}
          onClick={() => onSelectTab(item.id)}
          onMouseDown={handleMiddleClick}
          className={cn(
            'flex items-center rounded-md group relative w-full text-left',
            compact ? 'justify-center py-0.5' : 'px-1 py-0.5 gap-2.5',
            !compact && isActive
              ? 'bg-white/12 text-gray-100'
              : !compact
                ? 'hover:bg-white/6 text-gray-400'
                : isActive ? 'text-gray-100' : 'text-gray-400'
          )}
          title={item.name}
        >
          <div className="relative w-7 h-7 rounded-md flex-none">
            <div
              className={cn(
                'absolute inset-0 rounded-md transition-all duration-200',
                isActive
                  ? 'bg-white/15'
                  : 'bg-transparent group-hover:bg-white/8',
                compact && isActive ? 'ring-1 ring-white/20' : ''
              )}
              style={
                tabThemeColor
                  ? { background: tabThemeColor }
                  : tabBackgroundColor
                    ? { background: tabBackgroundColor }
                    : undefined
              }
            />
            <div
              className={cn(
                'absolute inset-[1px] rounded-[5px] overflow-hidden flex items-center justify-center',
                isActive
                  ? 'bg-[#2a2a2a]'
                  : 'bg-[#222] group-hover:bg-[#2a2a2a]'
              )}
            >
              {useOriginalLogos ? (
                <img
                  src={isNewTabForItem ? AppLogo : tabFavicon}
                  alt={item.name}
                  className="w-4 h-4 rounded object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const iconElement = e.currentTarget.nextElementSibling as HTMLElement
                    if (iconElement) iconElement.style.display = 'block'
                  }}
                />
              ) : null}
              {Icon && typeof Icon === 'function' && (
                <Icon
                  className={cn(
                    'w-4 h-4 rounded',
                    isActive ? 'text-gray-200' : 'text-gray-500',
                    useOriginalLogos && !isCustomPlatform ? 'hidden' : '',
                    // For custom platforms, show icon until favicon loads
                    useOriginalLogos && isCustomPlatform && loadedFavicons[item.id] ? 'hidden' : '',
                    // Add subtle opacity for loading state
                    isCustomPlatform && loadingFavicons[item.id] ? 'opacity-60' : ''
                  )}
                />
              )}
              {/* Loading indicator for custom platforms */}
              {isCustomPlatform && loadingFavicons[item.id] && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {/* Notification Badge */}
            {showNotificationBadge && (
              <div className="absolute -top-0.5 -right-0.5 z-10">
                <NotificationBadge count={notifCount} variant="compact" />
              </div>
            )}
          </div>
          <div
            className={cn(
              'overflow-hidden flex items-center gap-2 relative',
              compact ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100'
            )}
          >
            {/* Drag handle - only show in expanded mode and for non-temporary apps */}
            {!compact && !isTemporaryApp && dragListeners && (
              <div
                {...dragAttributes}
                {...dragListeners}
                className="opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing rounded pl-0.5"
                title="Drag to reorder"
              >
                <GripVertical className="w-3 h-3 text-gray-400" />
              </div>
            )}
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'font-medium whitespace-nowrap flex-1 truncate block text-[11px]',
                      isTemporaryApp ? 'pr-6' : 'pr-1',
                      isActive ? 'text-gray-200' : 'text-gray-500'
                    )}
                  >
                    {item.name}
                  </span>
                </TooltipTrigger>
                {item.name && item.name.length > 0 && (
                  <TooltipContent side="right" className="backdrop-blur-light max-w-xs">
                    <p className="break-words">{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {/* Status indicators */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isPinned && <Pin className="w-3 h-3 opacity-60" />}
              {isMuted && <VolumeX className="w-3 h-3 opacity-60" />}
            </div>
          </div>
          {/* Close button for temporary apps - positioned relative to button, not text container */}
          {/* Only show in expanded mode - in compact mode, use middle click to close */}
          {/* Hide close button for pinned tabs */}
          {isTemporaryApp && !compact && !isPinned && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleCloseTemporaryApp(e)
              }}
              onMouseDown={(e) => {
                // Prevent event from bubbling to button's onClick
                e.stopPropagation()
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded bg-white/5 hover:bg-white/15 opacity-0 group-hover:opacity-100 z-30 cursor-pointer pointer-events-auto"
              title="Close temporary app"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCloseTemporaryApp(e as any)
                }
              }}
            >
              <X className="w-2.5 h-2.5 text-gray-400" />
            </div>
          )}
        </button>
      )

      // Build comprehensive context menu for tabs
      const menuContent = isTemporaryApp ? (
        <>
          {/* Pin/Unpin - hide for new tab pages (about:blank) */}
          {tabData && tabData.url && tabData.url !== 'about:blank' && (
            <ContextMenuItem
              icon={Pin}
              label={isPinned ? 'Unpin' : 'Pin'}
              onClick={() => onTogglePinned(item.id, !isPinned)}
              showCheck={true}
              checked={isPinned}
            />
          )}

          {/* Mute/Unmute */}
          <ContextMenuItem
            icon={isMuted ? VolumeX : Volume2}
            label={isMuted ? 'Unmute' : 'Mute'}
            onClick={() => onToggleMuted(item.id, !isMuted)}
            showCheck={true}
            checked={isMuted}
          />

          <ContextMenuSeparator />

          {/* Duplicate */}
          {onDuplicateTab && (
            <ContextMenuItem icon={CopyPlus} label="Duplicate" onClick={() => onDuplicateTab(item.id)} />
          )}

          {/* Copy Link */}
          {onCopyTabLink && tabData && tabData.url && tabData.url !== 'about:blank' && (
            <ContextMenuItem icon={Link2} label="Copy Link" onClick={() => onCopyTabLink(item.id)} />
          )}

          <ContextMenuSeparator />

          {/* Reload */}
          <ContextMenuItem icon={RotateCw} label="Reload" onClick={() => onReloadPlatform(item.id)} />

          <ContextMenuSeparator />

          {/* Close Other Tabs - only show if not pinned */}
          {onCloseOtherTabs && tabs.length > 1 && !isPinned && (
            <ContextMenuItem icon={XCircle} label="Close Other Tabs" onClick={() => onCloseOtherTabs(item.id)} />
          )}

          {/* Close Tabs to the Right - only show if not pinned */}
          {onCloseTabsToRight &&
            tabs.length > 1 &&
            !isPinned &&
            (() => {
              const currentIndex = tabs.findIndex((t) => t.id === item.id)
              const hasTabsToRight = currentIndex !== -1 && currentIndex < tabs.length - 1
              return hasTabsToRight ? (
                <ContextMenuItem
                  icon={ChevronRight}
                  label="Close Tabs to the Bottom"
                  onClick={() => onCloseTabsToRight(item.id)}
                />
              ) : null
            })()}

          {/* Close - only show if not pinned */}
          {!isPinned && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem icon={X} label="Close" onClick={() => onCloseTab(item.id)} variant="danger" />
            </>
          )}
        </>
      ) : null

      return compact ? (
        <TooltipProvider key={item.id}>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <div className="relative">
                <ContextMenu trigger={button}>{menuContent}</ContextMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="backdrop-blur-light">
              <div className="flex items-center gap-2">
                {item.name}
                {showNotificationBadge && <NotificationBadge count={notifCount} variant="compact" />}
                {isPinned && <Pin className="w-3 h-3 opacity-60" />}
                {isMuted && <VolumeX className="w-3 h-3 opacity-60" />}
                {isTemporaryApp && <ExternalLink className="w-3 h-3 opacity-60" />}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div key={item.id} className="relative">
          <ContextMenu trigger={button}>{menuContent}</ContextMenu>
        </div>
      )
    },
    [
      activePlatform,
      compact,
      customPlatforms,
      dynamicTitles,
      globalNotificationsEnabled,
      loadedFavicons,
      loadingFavicons,
      mutedPlatforms,
      notificationCounts,
      notificationsEnabled,
      onSelectTab,
      onCloseTab,
      onDuplicateTab,
      onCopyTabLink,
      onCloseOtherTabs,
      onCloseTabsToRight,
      onReloadPlatform,
      onToggleMuted,
      onToggleNotifications,
      onTogglePinned,
      pinnedPlatforms,
      tabs,
      useOriginalLogos,
    ]
  )

  return (
    <nav className={cn('flex-1 pb-4 space-y-1 no-drag overflow-y-auto scrollbar-none', compact ? 'px-1' : 'px-1')}>
      {/* Pinned Tabs Section - Always at top (like QuickLinks) */}
      {allPlatformItems.filter((item) => pinnedPlatforms?.[item.id]).length > 0 && (
        <div className={cn(compact ? 'px-0' : 'px-0', squarePinnedTabs ? 'pb-1' : 'space-y-1')}>
          {squarePinnedTabs ? (
            // Square layout - professional grid based on tab count
            (() => {
              const pinnedItems = allPlatformItems.filter((item) => pinnedPlatforms?.[item.id])
              const pinnedCount = pinnedItems.length

              // Compact mode: keep current implementation
              if (compact) {
                return (
                  <div
                    className={cn(
                      'grid w-full overflow-visible',
                      'grid-cols-[repeat(auto-fit,minmax(40px,1fr))] gap-[2px]'
                    )}
                  >
                    {pinnedItems.map((item) => {
                      const tabData = tabs.find((p) => p.id === item.id)
                      const tabFavicon = tabData
                        ? (tabData as any).favicon?.url || tabData.faviconUrl || tabData.logoUrl
                        : null
                      const isActive = activePlatform === item.id
                      const isPinned = pinnedPlatforms?.[item.id] ?? false
                      const isMuted = mutedPlatforms?.[item.id] ?? false

                      // Build context menu for square pinned tabs (same as regular tabs)
                      const menuContent = (
                        <>
                          {/* Pin/Unpin - hide for new tab pages (about:blank) */}
                          {tabData && tabData.url && tabData.url !== 'about:blank' && (
                            <ContextMenuItem
                              icon={Pin}
                              label={isPinned ? 'Unpin' : 'Pin'}
                              onClick={() => onTogglePinned(item.id, !isPinned)}
                              showCheck={true}
                              checked={isPinned}
                            />
                          )}

                          {/* Mute/Unmute */}
                          <ContextMenuItem
                            icon={isMuted ? VolumeX : Volume2}
                            label={isMuted ? 'Unmute' : 'Mute'}
                            onClick={() => onToggleMuted(item.id, !isMuted)}
                            showCheck={true}
                            checked={isMuted}
                          />

                          <ContextMenuSeparator />

                          {/* Duplicate */}
                          {onDuplicateTab && (
                            <ContextMenuItem
                              icon={CopyPlus}
                              label="Duplicate"
                              onClick={() => onDuplicateTab(item.id)}
                            />
                          )}

                          {/* Copy Link */}
                          {onCopyTabLink && tabData && tabData.url && tabData.url !== 'about:blank' && (
                            <ContextMenuItem icon={Link2} label="Copy Link" onClick={() => onCopyTabLink(item.id)} />
                          )}

                          <ContextMenuSeparator />

                          {/* Reload */}
                          <ContextMenuItem icon={RotateCw} label="Reload" onClick={() => onReloadPlatform(item.id)} />
                        </>
                      )

                      const button = (
                        <button
                          key={item.id}
                          onClick={() => onSelectTab(item.id)}
                          className={cn(
                            'relative flex items-center justify-center',
                            'w-full h-[40px]', // Full width in compact mode
                            'rounded-[5px]',
                            'border border-solid',
                            // Background colors matching superpins style
                            isActive
                              ? 'bg-white/56 dark:bg-white/16 border-gray-300/80 dark:border-gray-600/80'
                              : 'bg-white/40 dark:bg-white/7 border-gray-200/50 dark:border-gray-700/50',
                            // Hover state
                            'hover:bg-white/43 dark:hover:bg-white/10',
                            // Selected hover state
                            isActive && 'hover:bg-white/58 dark:hover:bg-white/18',
                            'transition-colors duration-150 ease-out',
                            'cursor-pointer'
                          )}
                          title={item.name}
                        >
                          {/* Favicon/Logo - perfectly centered */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            {tabFavicon ? (
                              <img
                                src={tabFavicon}
                                alt={item.name}
                                className="w-[14px] h-[14px] object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const iconElement = e.currentTarget.nextElementSibling as HTMLElement
                                  if (iconElement) iconElement.style.display = 'block'
                                }}
                              />
                            ) : null}
                            <Globe
                              className={cn(
                                'w-[14px] h-[14px] text-gray-400 dark:text-gray-500',
                                tabFavicon ? 'hidden' : 'block'
                              )}
                            />
                          </div>
                        </button>
                      )

                      return (
                        <div key={item.id} className="relative m-0">
                          <ContextMenu trigger={button}>{menuContent}</ContextMenu>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // Normal mode: smart grid based on count
              let gridCols: string
              if (pinnedCount === 1) {
                gridCols = '1fr' // 1 tab: full width
              } else if (pinnedCount === 2) {
                gridCols = 'repeat(2, 1fr)' // 2 tabs: 2 columns, each 50%
              } else if (pinnedCount === 3) {
                gridCols = 'repeat(3, 1fr)' // 3 tabs: 3 columns, each 33.33%
              } else if (pinnedCount === 4) {
                gridCols = 'repeat(2, 1fr)' // 4 tabs: 2 columns, 2x2 grid
              } else if (pinnedCount === 6) {
                gridCols = 'repeat(3, 1fr)' // 6 tabs: 3 columns, 2x3 grid
              } else {
                // 5, 7+ tabs: 3 columns (wraps to rows)
                gridCols = 'repeat(3, 1fr)'
              }

              return (
                <div className="grid w-full overflow-visible gap-[3px] p-2" style={{ gridTemplateColumns: gridCols }}>
                  {pinnedItems.map((item) => {
                    const tabData = tabs.find((p) => p.id === item.id)
                    const tabFavicon = tabData
                      ? (tabData as any).favicon?.url || tabData.faviconUrl || tabData.logoUrl
                      : null
                    const isActive = activePlatform === item.id
                    const isPinned = pinnedPlatforms?.[item.id] ?? false
                    const isMuted = mutedPlatforms?.[item.id] ?? false

                    // Build context menu for square pinned tabs (same as regular tabs)
                    const menuContent = (
                      <>
                        {/* Pin/Unpin - hide for new tab pages (about:blank) */}
                        {tabData && tabData.url && tabData.url !== 'about:blank' && (
                          <ContextMenuItem
                            icon={Pin}
                            label={isPinned ? 'Unpin' : 'Pin'}
                            onClick={() => onTogglePinned(item.id, !isPinned)}
                            showCheck={true}
                            checked={isPinned}
                          />
                        )}

                        {/* Mute/Unmute */}
                        <ContextMenuItem
                          icon={isMuted ? VolumeX : Volume2}
                          label={isMuted ? 'Unmute' : 'Mute'}
                          onClick={() => onToggleMuted(item.id, !isMuted)}
                          showCheck={true}
                          checked={isMuted}
                        />

                        <ContextMenuSeparator />

                        {/* Duplicate */}
                        {onDuplicateTab && (
                          <ContextMenuItem icon={CopyPlus} label="Duplicate" onClick={() => onDuplicateTab(item.id)} />
                        )}

                        {/* Copy Link */}
                        {onCopyTabLink && tabData && tabData.url && tabData.url !== 'about:blank' && (
                          <ContextMenuItem icon={Link2} label="Copy Link" onClick={() => onCopyTabLink(item.id)} />
                        )}

                        <ContextMenuSeparator />

                        {/* Reload */}
                        <ContextMenuItem icon={RotateCw} label="Reload" onClick={() => onReloadPlatform(item.id)} />
                      </>
                    )

                    const button = (
                      <button
                        key={item.id}
                        onClick={() => onSelectTab(item.id)}
                        className={cn(
                          'relative flex items-center justify-center',
                          'w-full h-[50px]', // Full width to fill grid cell
                          'rounded-[5px]',
                          'border border-solid',
                          // Background colors matching superpins style
                          isActive
                            ? 'bg-white/56 dark:bg-white/16 border-gray-300/80 dark:border-gray-600/80'
                            : 'bg-white/40 dark:bg-white/7 border-gray-200/50 dark:border-gray-700/50',
                          // Hover state
                          'hover:bg-white/43 dark:hover:bg-white/10',
                          // Selected hover state
                          isActive && 'hover:bg-white/58 dark:hover:bg-white/18',
                          'transition-colors duration-150 ease-out',
                          'cursor-pointer'
                        )}
                        title={item.name}
                      >
                        {/* Favicon/Logo - perfectly centered */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {tabFavicon ? (
                            <img
                              src={tabFavicon}
                              alt={item.name}
                              className="w-[18px] h-[18px] object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const iconElement = e.currentTarget.nextElementSibling as HTMLElement
                                if (iconElement) iconElement.style.display = 'block'
                              }}
                            />
                          ) : null}
                          <Globe
                            className={cn(
                              'w-[18px] h-[18px] text-gray-400 dark:text-gray-500',
                              tabFavicon ? 'hidden' : 'block'
                            )}
                          />
                        </div>
                      </button>
                    )

                    return (
                      <div key={item.id} className="relative m-0">
                        <ContextMenu trigger={button}>{menuContent}</ContextMenu>
                      </div>
                    )
                  })}
                </div>
              )
            })()
          ) : (
            // List layout (default)
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={allPlatformItems.filter((item) => pinnedPlatforms?.[item.id]).map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {allPlatformItems
                  .filter((item) => pinnedPlatforms?.[item.id])
                  .map((item) => {
                    return <SortableItem key={item.id} item={item} isTemporaryApp={true} isCustomPlatform={false} />
                  })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
      {/* Add Tab Button - aligned with tab items */}
      <div className={cn(compact ? 'px-1' : 'px-1')}>
        <button
          onClick={onNewTab}
          className={cn(
            'group relative w-full text-left flex items-center gap-1 rounded-md transition-all duration-200',
            compact
              ? 'justify-center px-0 py-0.5'
              : 'px-1 py-0.5 hover:bg-white/6'
          )}
          title="New Tab"
        >
          <div className="relative w-7 h-7 rounded-md flex-none">
            <div className="absolute inset-[1px] rounded-[5px] overflow-hidden flex items-center justify-center bg-white/5 group-hover:bg-white/10">
              <Plus className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
          {!compact && <span className="text-[11px] text-gray-500 font-medium">New Tab</span>}
        </button>
      </div>

      {/* Divider between pinned and regular tabs */}
      {allPlatformItems.filter((item) => pinnedPlatforms?.[item.id]).length > 0 &&
        allPlatformItems.filter((item) => !pinnedPlatforms?.[item.id]).length > 0 && (
          <div className={cn('py-0', compact ? 'px-1' : 'px-1')}>
            <div className="w-full h-px bg-white/8" />
          </div>
        )}

      {/* Regular Tabs Section */}
      {allPlatformItems.filter((item) => !pinnedPlatforms?.[item.id]).length > 0 && (
        <div className={cn('space-y-1', compact ? 'px-1' : 'px-1')}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={allPlatformItems.filter((item) => !pinnedPlatforms?.[item.id]).map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {allPlatformItems
                .filter((item) => !pinnedPlatforms?.[item.id])
                .map((item) => {
                  return <SortableItem key={item.id} item={item} isTemporaryApp={true} isCustomPlatform={false} />
                })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </nav>
  )
}

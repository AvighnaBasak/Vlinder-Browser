import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { AppLogoToggle, NavigationButtons, PlatformNavigation, SpecialItems } from './sidebar/index'
import { type Tab as Platform } from '@/app/types/tab'

interface SidebarProps {
  activePlatform: string
  enabledPlatforms: Record<string, boolean>
  onPlatformChange: (platformId: string) => void
  useOriginalLogos: boolean
  pinnedPlatforms: Record<string, boolean>
  mutedPlatforms: Record<string, boolean>
  notificationsEnabled: Record<string, boolean>
  notificationCounts: Record<string, number>
  globalNotificationsEnabled: boolean
  onTogglePinned: (platformId: string, pinned: boolean) => void
  onToggleMuted: (platformId: string, muted: boolean) => void
  onToggleNotifications: (platformId: string, enabled: boolean) => void
  onUninstallPlatform: (platformId: string) => void
  onReloadPlatform: (platformId: string) => void
  showBackButton: boolean
  showForwardButton: boolean
  showRefreshButton: boolean
  temporaryApps: Platform[]
  onCloseTemporaryApp: (appId: string) => void
  onConvertToPermanent: (appId: string) => void
  onCloseAllTemporaryApps: () => void
  dynamicTitles: Record<string, string>
  customPlatforms: Platform[]
  platformOrder: string[]
  onReorderPlatforms: (newOrder: string[]) => void
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
}

type SidebarMode = 'expanded' | 'compact' | 'hidden'

function SidebarComponent({
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
  showBackButton,
  showForwardButton,
  showRefreshButton,
  temporaryApps,
  onCloseTemporaryApp,
  onConvertToPermanent,
  onCloseAllTemporaryApps,
  dynamicTitles,
  customPlatforms,
  platformOrder,
  onReorderPlatforms,
  sidebarPosition = 'left',
  squarePinnedTabs,
  tabs,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onDuplicateTab,
  onCopyTabLink,
  onCloseOtherTabs,
  onCloseTabsToRight,
}: SidebarProps) {
  // Initialize mode from localStorage immediately to prevent flash
  const [mode, setMode] = useState<SidebarMode>(() => {
    try {
      const stored = localStorage.getItem('sidebar-mode')
      if (stored === 'compact' || stored === 'hidden' || stored === 'expanded') {
        return stored as SidebarMode
      }
      // Migrate from old 'sidebar-compact' format
      const oldStored = localStorage.getItem('sidebar-compact')
      if (oldStored === '1') {
        localStorage.setItem('sidebar-mode', 'compact')
        localStorage.removeItem('sidebar-compact')
        return 'compact'
      }
      return 'expanded'
    } catch {
      return 'expanded'
    }
  })

  const [lastNonHiddenMode, setLastNonHiddenMode] = useState<'expanded' | 'compact'>(() => {
    try {
      const stored = localStorage.getItem('sidebar-mode')
      if (stored === 'compact') {
        return 'compact'
      } else if (stored === 'expanded') {
        return 'expanded'
      } else if (stored === 'hidden') {
        // If hidden, try to restore last non-hidden mode from storage
        const lastMode = localStorage.getItem('sidebar-last-mode')
        if (lastMode === 'compact' || lastMode === 'expanded') {
          return lastMode as 'expanded' | 'compact'
        }
      } else {
        // Migrate from old format
        const oldStored = localStorage.getItem('sidebar-compact')
        if (oldStored === '1') {
          return 'compact'
        }
      }
      return 'expanded'
    } catch {
      return 'expanded'
    }
  })

  const [isHoveringHidden, setIsHoveringHidden] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevModeRef = useRef<SidebarMode>(mode)

  // Cycle between compact and hidden only (for Ctrl+S)
  const handleCycleMode = useCallback(() => {
    setMode((current) => {
      let next: SidebarMode
      if (current === 'compact') {
        next = 'hidden'
      } else if (current === 'hidden') {
        next = 'compact'
      } else {
        // If expanded, go to compact
        next = 'compact'
      }

      try {
        localStorage.setItem('sidebar-mode', next)
        if (next !== 'hidden') {
          localStorage.setItem('sidebar-last-mode', next)
        }
      } catch {
        // Ignore errors
      }

      // Immediately clear hover state when switching from hidden to compact
      if (current === 'hidden' && next === 'compact') {
        setIsHoveringHidden(false)
      }

      // Update lastNonHiddenMode separately (defer to avoid render conflict)
      if (next === 'compact') {
        setTimeout(() => setLastNonHiddenMode('compact'), 0)
      }

      // Dispatch event to sync with App component state (defer to avoid render conflict)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sidebar-mode-changed', { detail: next }))
      }, 0)

      return next
    })
  }, [])

  // Toggle between expanded and compact only (for logo button)
  const handleToggleExpandedCompact = useCallback(() => {
    setMode((current) => {
      let next: SidebarMode
      if (current === 'expanded') {
        next = 'compact'
      } else if (current === 'compact') {
        next = 'expanded'
      } else {
        // If hidden, toggle to the opposite of last non-hidden mode
        next = lastNonHiddenMode === 'expanded' ? 'compact' : 'expanded'
      }
      try {
        localStorage.setItem('sidebar-mode', next)
        localStorage.setItem('sidebar-last-mode', next)
        if (next !== 'expanded' && next !== 'compact') {
          setLastNonHiddenMode(next === 'compact' ? 'compact' : 'expanded')
        } else {
          setLastNonHiddenMode(next)
        }
      } catch {
        // Ignore errors
      }
      return next
    })
  }, [lastNonHiddenMode])

  // Listen for sidebar toggle events from keyboard shortcuts
  useEffect(() => {
    const handleSidebarToggle = () => {
      handleCycleMode()
    }

    window.addEventListener('toggle-sidebar-visibility', handleSidebarToggle)
    return () => {
      window.removeEventListener('toggle-sidebar-visibility', handleSidebarToggle)
    }
  }, [handleCycleMode])

  // Listen for sidebar mode changes from settings
  useEffect(() => {
    const handleModeChange = (event: CustomEvent<SidebarMode>) => {
      const newMode = event.detail
      setMode(newMode)
      if (newMode !== 'hidden') {
        setLastNonHiddenMode(newMode === 'compact' ? 'compact' : 'expanded')
        // Clear hover state when switching away from hidden
        setIsHoveringHidden(false)
      }
    }

    window.addEventListener('sidebar-mode-changed', handleModeChange as EventListener)
    return () => {
      window.removeEventListener('sidebar-mode-changed', handleModeChange as EventListener)
    }
  }, [])

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  // Handle mouse hover for hidden mode
  useEffect(() => {
    if (mode !== 'hidden') {
      setIsHoveringHidden(false)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      const isNearSidebar = sidebarPosition === 'left' ? e.clientX <= 20 : e.clientX >= window.innerWidth - 20

      if (isNearSidebar) {
        clearHideTimeout()
        setIsHoveringHidden(true)
      }
      // Don't hide when mouse moves away from the edge - let onMouseLeave on the sidebar handle that
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      clearHideTimeout()
    }
  }, [mode, sidebarPosition, clearHideTimeout])

  // When hidden, always show as expanded
  const compact = mode === 'compact'
  const hidden = mode === 'hidden'
  const isVisible = hidden ? isHoveringHidden : true

  // Track previous mode to detect transitions from hidden
  const isTransitioningFromHidden = prevModeRef.current === 'hidden' && mode === 'compact'

  useEffect(() => {
    // Update ref after render to track for next transition
    prevModeRef.current = mode
  }, [mode])

  return (
    <div
      ref={sidebarRef}
      style={{ backgroundColor: 'var(--theme-chrome, #1a1a1a)' }}
      className={cn(
        'flex flex-col',
        // Hidden mode: fixed positioned overlay with acrylic effect
        hidden && [
          'fixed top-0 bottom-0 z-50 h-screen w-36',
          'backdrop-blur-3xl rounded-2xl',
          'border-r border-white/5 shadow-2xl',
          sidebarPosition === 'right' && 'border-r-0 border-l border-white/5',
          'transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
          sidebarPosition === 'left'
            ? isVisible
              ? 'left-0 opacity-100'
              : '-left-full opacity-0'
            : isVisible
              ? 'right-0 opacity-100'
              : '-right-full opacity-0',
        ],
        hidden && !isVisible && 'pointer-events-none',
        // Normal modes: relative positioning with transitions
        !hidden && [
          'relative',
          // When transitioning from hidden to compact, immediately set width to compact without transition
          isTransitioningFromHidden
            ? 'w-10'
            : mode === 'compact'
              ? 'w-10 transition-all duration-300 ease-out'
              : 'w-36 transition-all duration-300 ease-out',
        ]
      )}
      onMouseEnter={() => {
        if (hidden) {
          clearHideTimeout()
          setIsHoveringHidden(true)
        }
      }}
      onMouseLeave={() => {
        if (hidden) {
          // Only hide when mouse leaves the sidebar itself
          hideTimeoutRef.current = setTimeout(() => {
            setIsHoveringHidden(false)
          }, 300)
        }
      }}
    >
      {/* Draggable Top Section with Logo */}
      <div className="drag-region flex-shrink-0 relative">
        <div className="py-1.5 flex flex-col gap-1.5 transition-all duration-300 ease-out items-start">
          {/* Logo Row */}
          <div className={`flex items-center gap-1 w-full transition-all duration-300 ease-out ${compact ? 'justify-center' : 'justify-between pr-4'}`}>
            {/* App Logo Toggle */}
            <AppLogoToggle compact={compact} onToggleCompact={handleToggleExpandedCompact} />

            {/* Navigation Buttons */}
            <NavigationButtons
              compact={compact}
              activePlatform={activePlatform}
              showBackButton={showBackButton}
              showForwardButton={showForwardButton}
              showRefreshButton={showRefreshButton}
            />
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/8 transition-all duration-300 ease-out" />
        </div>
      </div>

      {/* Platform/Tab Navigation */}
      <PlatformNavigation
        activePlatform={activePlatform}
        enabledPlatforms={enabledPlatforms}
        onPlatformChange={onPlatformChange}
        useOriginalLogos={useOriginalLogos}
        pinnedPlatforms={pinnedPlatforms}
        mutedPlatforms={mutedPlatforms}
        notificationsEnabled={notificationsEnabled}
        notificationCounts={notificationCounts}
        globalNotificationsEnabled={globalNotificationsEnabled}
        onTogglePinned={onTogglePinned}
        onToggleMuted={onToggleMuted}
        onToggleNotifications={onToggleNotifications}
        onUninstallPlatform={onUninstallPlatform}
        onReloadPlatform={onReloadPlatform}
        compact={compact}
        temporaryApps={temporaryApps}
        onCloseTemporaryApp={onCloseTemporaryApp}
        onConvertToPermanent={onConvertToPermanent}
        onCloseAllTemporaryApps={onCloseAllTemporaryApps}
        dynamicTitles={dynamicTitles}
        customPlatforms={customPlatforms}
        platformOrder={platformOrder}
        onReorderPlatforms={onReorderPlatforms}
        squarePinnedTabs={squarePinnedTabs}
        // tabs
        tabs={tabs}
        onSelectTab={onSelectTab}
        onNewTab={onNewTab}
        onCloseTab={onCloseTab}
        onDuplicateTab={onDuplicateTab}
        onCopyTabLink={onCopyTabLink}
        onCloseOtherTabs={onCloseOtherTabs}
        onCloseTabsToRight={onCloseTabsToRight}
      />

      {/* Bottom Special Items (Store & Settings) */}
      <SpecialItems activePlatform={activePlatform} onPlatformChange={onPlatformChange} compact={compact} />
    </div>
  )
}

export const Sidebar = memo(SidebarComponent)

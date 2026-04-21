import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { type Tab as Platform } from '@/app/types/tab'
import { createTemporaryTab } from '@/app/utils/createTemporaryTab'
import { Globe } from 'lucide-react'
import { type WebviewContainerRef } from '@/app/components/views/WebviewContainer'
import AppFrame from '@/app/components/app/AppFrame'
import LoadingScreen from '@/app/components/app/LoadingScreen'
import SetupScreen from '@/app/components/app/SetupScreen'
import { CommandPalette } from '@/app/components/ui/command-palette'
import { useCommandPalette } from '@/app/hooks/useCommandPalette'
import { ShortcutsProvider } from '@/app/components/providers/shortcuts-provider'
import './styles/globals.css'
import { useMenuActions } from '@/app/hooks/useMenuActions'
import { useExternalLinkEvents } from '@/app/hooks/useExternalLinkEvents'
import { useWebviewTitleUpdates } from '@/app/hooks/useWebviewTitleUpdates'
import UpdaterToast from '@/app/components/app/UpdaterToast'
import { DownloadNotificationToast } from '@/app/components/app/DownloadNotificationToast'
import { DownloadWarningDialog } from '@/app/components/app/DownloadWarningDialog'
import { FloatingDownloadButton } from '@/app/components/app/FloatingDownloadButton'
import { PasswordSavePrompt } from '@/app/components/app/PasswordSavePrompt'

const getDomainName = (input: string): string => {
  try {
    const urlObj = new URL(input)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return input
  }
}

const buildFaviconUrl = (domain: string | null) =>
  domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : undefined

type ActiveView = string | 'first-time' | 'settings'

export default function App() {
  const conveyor = useConveyor()

  const [isSetup, setIsSetup] = useState<boolean | null>(null)
  const [activePlatform, setActivePlatform] = useState<ActiveView>('') // will set to first tab id
  const [enabledPlatforms, setEnabledPlatforms] = useState<Record<string, boolean>>({}) // deprecated with tabs
  const [pinnedPlatforms, setPinnedPlatforms] = useState<Record<string, boolean>>({})
  // Pinned tabs state (separate from platforms)
  const [pinnedTabs, setPinnedTabs] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('pinned-tabs')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })
  const [mutedPlatforms, setMutedPlatforms] = useState<Record<string, boolean>>({})
  const [notificationsEnabled, setNotificationsEnabled] = useState<Record<string, boolean>>({})
  const [notificationCounts, setNotificationCounts] = useState<Record<string, number>>({})
  const [globalNotificationsEnabled, setGlobalNotificationsEnabled] = useState<boolean>(true)
  // Initialize settings from localStorage immediately to prevent flash
  const [useOriginalLogos, setUseOriginalLogos] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('use-original-logos')
      return stored === null ? true : stored === '1'
    } catch {
      return true
    }
  })

  const [transparencyEnabled, setTransparencyEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('transparency-enabled')
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  const [loadingBarEnabled, setLoadingBarEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('loading-bar-enabled')
      return stored === null ? true : stored === '1'
    } catch {
      return true
    }
  })

  const [squarePinnedTabs, setSquarePinnedTabs] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('square-pinned-tabs')
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  const [reloadTrigger, setReloadTrigger] = useState<Record<string, number>>({})

  // Temporary apps state
  const [temporaryApps, setTemporaryApps] = useState<Platform[]>([])
  const [dynamicTitles, setDynamicTitles] = useState<Record<string, string>>({})
  const [customPlatforms, setCustomPlatforms] = useState<Platform[]>([]) // deprecated with tabs
  const [platformOrder, setPlatformOrder] = useState<string[]>([]) // deprecated with tabs
  const [tabs, setTabs] = useState<Platform[]>([])
  // Initialize recentlyClosedTabs from localStorage (like min-master)
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<Platform[]>(() => {
    try {
      const stored = localStorage.getItem('recently-closed-tabs')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Filter out blank tabs (like min-master does)
        return parsed.filter((tab: Platform) => tab.url && tab.url !== 'about:blank')
      }
    } catch {
      // Ignore errors
    }
    return []
  })

  // Use ref to track current state for rapid successive calls (like min-master)
  const recentlyClosedTabsRef = useRef<Platform[]>(recentlyClosedTabs)
  useEffect(() => {
    recentlyClosedTabsRef.current = recentlyClosedTabs
  }, [recentlyClosedTabs])

  const updateTab = useCallback(
    (tabId: string, updater: Partial<Platform> | ((tab: Platform) => Partial<Platform>)) => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab
          const patch = typeof updater === 'function' ? (updater as (tab: Platform) => Partial<Platform>)(tab) : updater
          return { ...tab, ...patch, isTemporary: false }
        })
      )
    },
    []
  )
  // Track which platforms have been opened/visited for tab cycling
  const [openedPlatforms, setOpenedPlatforms] = useState<Set<string>>(new Set())
  // Track recently closed platforms for reopening with state
  const [recentlyClosedPlatforms, setRecentlyClosedPlatforms] = useState<
    Array<
      Platform & {
        closedAt: number
        state?: {
          url?: string
          title?: string
          canGoBack?: boolean
          canGoForward?: boolean
        }
      }
    >
  >([])

  // Browser control settings - initialize from localStorage immediately
  const [showBackButton, setShowBackButton] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('show-back-button')
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  const [showForwardButton, setShowForwardButton] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('show-forward-button')
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  const [showRefreshButton, setShowRefreshButton] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('show-refresh-button')
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  // Initialize sidebar position from localStorage immediately to prevent flash
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    try {
      const stored = localStorage.getItem('sidebar-position')
      return stored === 'right' ? 'right' : 'left'
    } catch {
      return 'left'
    }
  })

  // Initialize sidebar mode from localStorage
  type SidebarMode = 'expanded' | 'compact' | 'hidden'
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    try {
      const stored = localStorage.getItem('sidebar-mode')
      if (stored === 'compact' || stored === 'hidden' || stored === 'expanded') {
        return stored as SidebarMode
      }
      // Migrate from old format
      const oldStored = localStorage.getItem('sidebar-compact')
      if (oldStored === '1') {
        return 'compact'
      }
      return 'expanded'
    } catch {
      return 'expanded'
    }
  })

  // Initialize command palette enabled from localStorage immediately to prevent flash
  const [commandPaletteEnabled, setCommandPaletteEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('command-palette-enabled')
      return stored === null ? true : stored === '1'
    } catch {
      return true
    }
  })

  // Initialize address bar enabled from localStorage immediately to prevent flash
  const [addressBarEnabled, setAddressBarEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('address-bar-enabled')
      return stored === null ? false : stored === '1'
    } catch {
      return false
    }
  })

  // Ad blocker state
  const [adBlockerMode, setAdBlockerMode] = useState<string>('disabled')

  // Command palette hook - must be after commandPaletteEnabled state
  const { isOpen: isCommandPaletteOpen, closeCommandPalette } = useCommandPalette({ enabled: commandPaletteEnabled })

  // Ref to track last normal tab
  const previousTabRef = useRef<ActiveView | null>(null)

  // Webview refs for navigation
  const webviewRefs = useRef<Record<string, WebviewContainerRef>>({})

  // Memoize enabled platforms array to prevent recreation on every render
  const enabledPlatformsArray = useMemo(() => {
    return [] // deprecated; use tabs instead
  }, [])

  // Save recently closed platforms to localStorage
  const saveRecentlyClosedPlatforms = useCallback((platforms: typeof recentlyClosedPlatforms) => {
    try {
      localStorage.setItem('recently-closed-platforms', JSON.stringify(platforms))
    } catch {
      // Ignore errors
    }
  }, [])

  // Load initial configuration
  useEffect(() => {
    const loadConfig = async () => {
      const hasSetup = await conveyor.config.hasSetup()
      setIsSetup(hasSetup)

      if (hasSetup) {
        // Load pinned tabs from localStorage and restore them (like QuickLinks - always persist)
        // But start with a new tab to avoid loading webviews on startup (saves resources)
        try {
          const storedPinnedTabs = localStorage.getItem('pinned-tabs-data')
          if (storedPinnedTabs) {
            const parsedPinnedTabs = JSON.parse(storedPinnedTabs)
            // Restore pinned tabs with their data (url, name, favicon, etc.) - like QuickLinks
            if (Array.isArray(parsedPinnedTabs) && parsedPinnedTabs.length > 0) {
              // Restore pinned tabs - these are always there (like QuickLinks)
              // But don't activate them - start with a new tab instead
              setTabs(parsedPinnedTabs)
              // Restore pinned state
              const pinnedState: Record<string, boolean> = {}
              parsedPinnedTabs.forEach((tab: any) => {
                pinnedState[tab.id] = true
              })
              setPinnedTabs(pinnedState)
              // Always start with a new tab (not a pinned tab) to avoid loading webviews on startup
              const initial = createTemporaryTab('about:blank', 'New Tab')
              setTabs((prev) => [initial, ...prev]) // Add new tab at top, keep pinned tabs
              setActivePlatform(initial.id as ActiveView)
            } else {
              // No pinned tabs, initialize with a single New Tab
              const initial = createTemporaryTab('about:blank', 'New Tab')
              setTabs([initial])
              setActivePlatform(initial.id as ActiveView)
            }
          } else {
            // No stored pinned tabs, initialize with a single New Tab
            const initial = createTemporaryTab('about:blank', 'New Tab')
            setTabs([initial])
            setActivePlatform(initial.id as ActiveView)
          }
        } catch {
          // If parsing fails, initialize with a single New Tab
          const initial = createTemporaryTab('about:blank', 'New Tab')
          setTabs([initial])
          setActivePlatform(initial.id as ActiveView)
        }

        // legacy config no longer drives tabs
        // const allEnabled = await conveyor.config.getAllEnabled()
        // setEnabledPlatforms(allEnabled)

        const allPinned = await conveyor.config.getAllPinned()
        setPinnedPlatforms(allPinned)

        const allMuted = await conveyor.config.getAllMuted()
        setMutedPlatforms(allMuted)

        const allNotificationsEnabled = await conveyor.config.getAllNotificationsEnabled()
        setNotificationsEnabled(allNotificationsEnabled)

        const allNotificationCounts = await conveyor.config.getAllNotificationCounts()
        setNotificationCounts(allNotificationCounts)

        const globalNotifications = await conveyor.config.getGlobalNotificationsEnabled()
        setGlobalNotificationsEnabled(globalNotifications)

        // Load ad blocker setting
        const adBlocker = await conveyor.config.getAdBlocker()
        setAdBlockerMode(adBlocker)

        // Load custom platforms
        // custom platforms disabled with tabs-only model

        // Load platform order
        // platform order disabled with tabs-only model

        // Load recently closed platforms from localStorage
        try {
          const storedRecentlyClosed = localStorage.getItem('recently-closed-platforms')
          if (storedRecentlyClosed) {
            const parsed = JSON.parse(storedRecentlyClosed)
            // Filter out old entries (older than 7 days)
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
            const validEntries = parsed.filter((entry: any) => entry.closedAt > sevenDaysAgo)
            setRecentlyClosedPlatforms(validEntries)
          }
        } catch {
          // Ignore errors
        }
      }

      // All settings are now initialized immediately to prevent flash

      // Load temporary apps from sessionStorage (legacy for background links)
      try {
        const storedTemporaryApps = sessionStorage.getItem('temporary-apps')
        if (storedTemporaryApps) {
          const parsedApps = JSON.parse(storedTemporaryApps)
          setTemporaryApps(parsedApps)
        }
      } catch {
        // If parsing fails, start with empty array
        setTemporaryApps([])
      }
    }

    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update pinned tabs data whenever tabs change (to preserve favicon and title)
  // This ensures pinned tabs persist like QuickLinks - always saved, always restored
  // Works exactly like QuickLinks: saves on every change, loads on every startup
  useEffect(() => {
    try {
      const pinnedTabIds = Object.keys(pinnedTabs).filter((id) => pinnedTabs[id])
      if (pinnedTabIds.length > 0) {
        // Get current pinned tabs data from tabs array
        const pinnedTabsData = tabs.filter((t) => pinnedTabs[t.id])
        // Always save pinned tabs (like QuickLinks) - they persist across restarts
        // Save even if some pinned tabs are missing from current tabs (they'll be restored on next startup)
        if (pinnedTabsData.length > 0) {
          localStorage.setItem('pinned-tabs-data', JSON.stringify(pinnedTabsData))
        } else {
          // If pinned tabs exist in state but not in tabs array, restore from localStorage
          // This ensures pinned tabs are always present (like QuickLinks)
          const storedPinnedTabs = localStorage.getItem('pinned-tabs-data')
          if (storedPinnedTabs) {
            const parsedPinnedTabs = JSON.parse(storedPinnedTabs)
            if (Array.isArray(parsedPinnedTabs) && parsedPinnedTabs.length > 0) {
              // Restore pinned tabs to tabs array
              setTabs((prev) => {
                // Merge: keep existing tabs, add missing pinned tabs
                const existingIds = new Set(prev.map((t) => t.id))
                const missingPinnedTabs = parsedPinnedTabs.filter((t: any) => !existingIds.has(t.id))
                return [...prev, ...missingPinnedTabs]
              })
            }
          }
        }
      }
      // Don't clear localStorage even if pinnedTabs is empty - let handleTogglePinned handle that
      // This ensures pinned tabs persist like QuickLinks - they're always there until explicitly removed
    } catch {
      // Ignore storage errors
    }
  }, [tabs, pinnedTabs])

  // External link/temporary apps events
  useExternalLinkEvents({
    tabs,
    setTabs,
    setActivePlatform: (id) => setActivePlatform(id as ActiveView),
    setDynamicTitles,
    createTemporaryPlatform: (url, title) => createTemporaryTab(url, title),
    conveyorApp: conveyor.app,
  })

  // Webview title updates from main
  useWebviewTitleUpdates(setDynamicTitles)

  // Listen for navigate to downloads page
  useEffect(() => {
    if (!(window as any)?.electronAPI) return

    const handleNavigateToDownloads = () => {
      setActivePlatform('downloads')
    }

    const electronAPI = (window as any).electronAPI
    if (electronAPI.onNavigateToDownloads) {
      electronAPI.onNavigateToDownloads(handleNavigateToDownloads)
    }

    return () => {
      // Cleanup handled by preload
    }
  }, [])

  const handlePlatformChange = async (platformId: string) => {
    // If clicking the currently active special view, toggle back to previous state
    if (activePlatform === platformId && ['settings', 'downloads'].includes(platformId) && previousTabRef.current) {
      const prev = previousTabRef.current;
      setActivePlatform(prev);
      await conveyor.config.setLastApp(prev);
      return;
    }

    // If leaving a non-special view, remember it
    if (!['settings', 'downloads', 'first-time'].includes(activePlatform)) {
      previousTabRef.current = activePlatform;
    }

    setActivePlatform(platformId)
    await conveyor.config.setLastApp(platformId)

    // Track that this platform has been opened (for tab cycling)
    setOpenedPlatforms((prev) => new Set(prev).add(platformId))

    // Clear notification count when switching to a platform
    if (notificationCounts[platformId] > 0) {
      await conveyor.config.clearNotificationCount(platformId)
      setNotificationCounts((prev) => {
        if (prev[platformId] === 0) return prev // Avoid unnecessary updates
        return {
          ...prev,
          [platformId]: 0,
        }
      })
    }
  }

  const handleTogglePlatform = useCallback(
    async (platformId: string, enabled: boolean) => {
      await conveyor.config.setEnabled(platformId, enabled)
      setEnabledPlatforms((prev) => {
        if (prev[platformId] === enabled) return prev // Avoid unnecessary updates
        return {
          ...prev,
          [platformId]: enabled,
        }
      })
    },
    [conveyor.config]
  )

  const handleToggleIconType = useCallback((useOriginal: boolean) => {
    setUseOriginalLogos(useOriginal)
    try {
      localStorage.setItem('use-original-logos', useOriginal ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleTransparency = useCallback((enabled: boolean) => {
    setTransparencyEnabled(enabled)
    try {
      localStorage.setItem('transparency-enabled', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleLoadingBar = useCallback((enabled: boolean) => {
    setLoadingBarEnabled(enabled)
    try {
      localStorage.setItem('loading-bar-enabled', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleCommandPalette = useCallback((enabled: boolean) => {
    setCommandPaletteEnabled(enabled)
    try {
      localStorage.setItem('command-palette-enabled', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleAddressBar = useCallback((enabled: boolean) => {
    setAddressBarEnabled(enabled)
    try {
      localStorage.setItem('address-bar-enabled', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleSquarePinnedTabs = useCallback((enabled: boolean) => {
    setSquarePinnedTabs(enabled)
    try {
      localStorage.setItem('square-pinned-tabs', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  // Track current URL for address bar
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [canGoBack, setCanGoBack] = useState<boolean>(false)
  const [canGoForward, setCanGoForward] = useState<boolean>(false)

  // Update current URL and navigation state when active platform changes or webview navigates
  useEffect(() => {
    const updateState = () => {
      const activeWebview = webviewRefs.current[activePlatform]
      if (activeWebview) {
        const url = activeWebview.getCurrentUrl()
        setCurrentUrl(url)

        // Update navigation state by checking the webview DOM element
        const allWebviews = document.querySelectorAll('webview')
        for (const webview of Array.from(allWebviews)) {
          const webviewAny = webview as any
          try {
            const activeTab = tabs.find((t) => t.id === activePlatform)
            const platformUrl = activeTab?.url

            if (platformUrl && webviewAny.src) {
              try {
                const webviewHost = new URL(webviewAny.src).hostname
                const platformHost = new URL(platformUrl).hostname
                if (webviewHost === platformHost || webviewAny.src.includes(activePlatform)) {
                  if (webviewAny.canGoBack && webviewAny.canGoForward) {
                    setCanGoBack(!!webviewAny.canGoBack())
                    setCanGoForward(!!webviewAny.canGoForward())
                    return
                  }
                }
              } catch {
                // Fallback check
                if (webviewAny.src.includes(activePlatform) || webviewAny.src === platformUrl) {
                  if (webviewAny.canGoBack && webviewAny.canGoForward) {
                    setCanGoBack(!!webviewAny.canGoBack())
                    setCanGoForward(!!webviewAny.canGoForward())
                    return
                  }
                }
              }
            }
          } catch {
            // Continue to next webview
            continue
          }
        }
      } else {
        const activeTab = tabs.find((t) => t.id === activePlatform)
        if (activeTab) {
          setCurrentUrl(activeTab.url || null)
        } else {
          setCurrentUrl(null)
        }
        setCanGoBack(false)
        setCanGoForward(false)
      }
    }

    updateState()

    // Poll for updates every 500ms when address bar is enabled
    if (addressBarEnabled) {
      const interval = setInterval(updateState, 500)
      return () => clearInterval(interval)
    }
  }, [activePlatform, tabs, addressBarEnabled])

  // Handle navigation
  const handleGoBack = useCallback(() => {
    const activeWebview = webviewRefs.current[activePlatform]
    if (activeWebview && canGoBack) {
      activeWebview.goBack()
    }
  }, [activePlatform, canGoBack])

  const handleGoForward = useCallback(() => {
    const activeWebview = webviewRefs.current[activePlatform]
    if (activeWebview && canGoForward) {
      activeWebview.goForward()
    }
  }, [activePlatform, canGoForward])

  const handleAdBlockerChange = useCallback(
    async (mode: string) => {
      setAdBlockerMode(mode)
      await conveyor.config.setAdBlocker(mode)
    },
    [conveyor.config]
  )

  const handleToggleBackButton = useCallback((enabled: boolean) => {
    setShowBackButton(enabled)
    try {
      localStorage.setItem('show-back-button', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleForwardButton = useCallback((enabled: boolean) => {
    setShowForwardButton(enabled)
    try {
      localStorage.setItem('show-forward-button', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleRefreshButton = useCallback((enabled: boolean) => {
    setShowRefreshButton(enabled)
    try {
      localStorage.setItem('show-refresh-button', enabled ? '1' : '0')
    } catch {
      // Ignore errors
    }
  }, [])

  const handleToggleSidebarPosition = useCallback((position: 'left' | 'right') => {
    setSidebarPosition(position)
    try {
      localStorage.setItem('sidebar-position', position)
    } catch {
      // Ignore errors
    }
  }, [])

  const handleChangeSidebarMode = useCallback((mode: SidebarMode) => {
    setSidebarMode(mode)
    try {
      localStorage.setItem('sidebar-mode', mode)
      // Also dispatch event for the Sidebar component to update
      window.dispatchEvent(new CustomEvent('sidebar-mode-changed', { detail: mode }))
    } catch {
      // Ignore errors
    }
  }, [])

  // Listen for sidebar mode changes from keyboard shortcuts (Ctrl+S)
  useEffect(() => {
    const handleModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<SidebarMode>
      const newMode = customEvent.detail
      if (newMode === 'compact' || newMode === 'hidden' || newMode === 'expanded') {
        setSidebarMode(newMode)
      }
    }

    window.addEventListener('sidebar-mode-changed', handleModeChange)
    return () => {
      window.removeEventListener('sidebar-mode-changed', handleModeChange)
    }
  }, [])

  const handleTogglePinned = useCallback(
    async (platformId: string, pinned: boolean) => {
      // Check if it's a tab (has tab_ prefix or exists in tabs array)
      const isTab = tabs.some((t) => t.id === platformId)

      if (isTab) {
        // Handle tab pinning (store in localStorage)
        setPinnedTabs((prev) => {
          const updated = {
            ...prev,
            [platformId]: pinned,
          }
          try {
            localStorage.setItem('pinned-tabs', JSON.stringify(updated))

            // Also store pinned tab data (url, name, favicon, etc.) for restoration
            if (pinned) {
              const tab = tabs.find((t) => t.id === platformId)
              if (tab) {
                try {
                  const storedPinnedTabsData = localStorage.getItem('pinned-tabs-data')
                  const pinnedTabsData = storedPinnedTabsData ? JSON.parse(storedPinnedTabsData) : []
                  // Remove if already exists, then add at the beginning
                  const filtered = pinnedTabsData.filter((t: any) => t.id !== platformId)
                  const updatedData = [tab, ...filtered]
                  localStorage.setItem('pinned-tabs-data', JSON.stringify(updatedData))
                } catch {
                  // Ignore storage errors
                }
              }
            } else {
              // Remove from pinned tabs data when unpinned
              try {
                const storedPinnedTabsData = localStorage.getItem('pinned-tabs-data')
                if (storedPinnedTabsData) {
                  const pinnedTabsData = JSON.parse(storedPinnedTabsData)
                  const filtered = pinnedTabsData.filter((t: any) => t.id !== platformId)
                  // Only clear if all pinned tabs are removed, otherwise save the remaining ones
                  if (filtered.length > 0) {
                    localStorage.setItem('pinned-tabs-data', JSON.stringify(filtered))
                  } else {
                    // All pinned tabs removed - clear storage
                    localStorage.removeItem('pinned-tabs-data')
                  }
                }
              } catch {
                // Ignore storage errors
              }
            }
          } catch {
            // Ignore storage errors
          }
          return updated
        })
      } else {
        // Handle platform pinning (legacy)
        await conveyor.config.setPinned(platformId, pinned)
        setPinnedPlatforms((prev) => {
          if (prev[platformId] === pinned) return prev // Avoid unnecessary updates
          return {
            ...prev,
            [platformId]: pinned,
          }
        })
      }
    },
    [conveyor.config, tabs]
  )

  const handleToggleMuted = useCallback(
    async (platformId: string, muted: boolean) => {
      await conveyor.config.setMuted(platformId, muted)
      setMutedPlatforms((prev) => {
        if (prev[platformId] === muted) return prev // Avoid unnecessary updates
        return {
          ...prev,
          [platformId]: muted,
        }
      })
    },
    [conveyor.config]
  )

  const handleUninstallPlatform = useCallback(
    async (platformId: string) => {
      // Check if it's a custom platform
      if (platformId.startsWith('custom_')) {
        // Remove from custom platforms
        await conveyor.config.removeCustomPlatform(platformId)
        setCustomPlatforms((prev) => prev.filter((p) => p.id !== platformId))
      }

      await conveyor.config.setEnabled(platformId, false)
      setEnabledPlatforms((prev) => {
        if (prev[platformId] === false) return prev // Avoid unnecessary updates
        return {
          ...prev,
          [platformId]: false,
        }
      })
      // If the uninstalled platform is active, switch to first-time
      if (activePlatform === platformId) {
        setActivePlatform('first-time')
        await conveyor.config.setLastApp('first-time')
      }
    },
    [activePlatform, conveyor.config]
  )

  const handleReloadPlatform = useCallback((platformId: string) => {
    setReloadTrigger((prev) => ({
      ...prev,
      [platformId]: (prev[platformId] || 0) + 1,
    }))
  }, [])

  // Temporary app handlers
  const handleCloseTemporaryApp = useCallback(
    (appId: string) => {
      const appToClose = temporaryApps.find((app) => app.id === appId)
      const updatedTemporaryApps = temporaryApps.filter((app) => app.id !== appId)
      setTemporaryApps(updatedTemporaryApps)

      // Add to recently closed platforms if it exists
      if (appToClose) {
        // Get the actual current URL and title from the webview
        const webviewRef = webviewRefs.current[appId]
        let currentUrl = appToClose.url // fallback to original URL
        let currentTitle = dynamicTitles[appId] || appToClose.name // fallback to dynamic title or name

        if (webviewRef) {
          try {
            const webviewUrl = webviewRef.getCurrentUrl()
            const webviewTitle = webviewRef.getCurrentTitle()
            if (webviewUrl) currentUrl = webviewUrl
            if (webviewTitle) currentTitle = webviewTitle
          } catch {
            // Ignore errors, use fallbacks
          }
        }

        const closedPlatform = {
          ...appToClose,
          closedAt: Date.now(),
          state: {
            url: currentUrl, // Store the actual current URL
            title: currentTitle,
          },
        }

        setRecentlyClosedPlatforms((prev) => {
          const updated = [closedPlatform, ...prev.slice(0, 9)] // Keep last 10
          saveRecentlyClosedPlatforms(updated)
          return updated
        })
      }

      // Remove from opened platforms set
      setOpenedPlatforms((prev) => {
        const newSet = new Set(prev)
        newSet.delete(appId)
        return newSet
      })

      // If the closed app is active, switch to another active tab
      if (activePlatform === appId) {
        // Find another active tab to switch to
        const remainingOpenedPlatforms = Array.from(openedPlatforms).filter((id) => id !== appId)
        const remainingTemporaryApps = updatedTemporaryApps // Use the updated list (without the closed app)

        // Check if there are any other opened platforms or temporary apps
        if (remainingOpenedPlatforms.length > 0) {
          // Switch to the first remaining opened platform
          const nextPlatform = remainingOpenedPlatforms[0]
          setActivePlatform(nextPlatform)
          conveyor.config.setLastApp(nextPlatform)
        } else if (remainingTemporaryApps.length > 0) {
          // Switch to the first remaining temporary app
          const nextApp = remainingTemporaryApps[0]
          setActivePlatform(nextApp.id)
          conveyor.config.setLastApp(nextApp.id)
        } else {
          // No other active tabs, go to homepage
          setActivePlatform('first-time')
        }
      }

      // Save to sessionStorage
      try {
        sessionStorage.setItem('temporary-apps', JSON.stringify(updatedTemporaryApps))
      } catch {
        // Ignore storage errors
      }
    },
    [temporaryApps, activePlatform, dynamicTitles, openedPlatforms, saveRecentlyClosedPlatforms, conveyor.config]
  )

  const handleCloseAllTemporaryApps = useCallback(() => {
    // If any temporary app is active, switch to first-time
    if (temporaryApps.some((app) => app.id === activePlatform)) {
      setActivePlatform('first-time')
    }

    // Remove all temporary apps from opened platforms set
    setOpenedPlatforms((prev) => {
      const newSet = new Set(prev)
      temporaryApps.forEach((app) => newSet.delete(app.id))
      return newSet
    })

    // Clear all temporary apps
    setTemporaryApps([])

    // Clear from sessionStorage
    try {
      sessionStorage.removeItem('temporary-apps')
    } catch {
      // Ignore storage errors
    }
  }, [temporaryApps, activePlatform])

  // Tabs: actions
  const handleNewTab = useCallback(() => {
    const t = createTemporaryTab('about:blank', 'New Tab')
    setTabs((prev) => {
      // Ensure pinned tabs are always preserved (like QuickLinks)
      // If no tabs exist, restore pinned tabs from localStorage first
      if (prev.length === 0) {
        try {
          const storedPinnedTabs = localStorage.getItem('pinned-tabs-data')
          if (storedPinnedTabs) {
            const parsedPinnedTabs = JSON.parse(storedPinnedTabs)
            if (Array.isArray(parsedPinnedTabs) && parsedPinnedTabs.length > 0) {
              // Restore pinned tabs and add new tab
              return [t, ...parsedPinnedTabs]
            }
          }
        } catch {
          // Ignore errors
        }
      }
      // Add new tab at top (pinned tabs will be sorted to top by PlatformNavigation)
      return [t, ...prev]
    })
    setActivePlatform(t.id as ActiveView)
  }, [])

  const handleSelectTab = useCallback(
    (tabId: string) => {
      // Remember previous tab before switching
      if (!['settings', 'downloads', 'first-time'].includes(activePlatform)) {
        previousTabRef.current = activePlatform;
      }
      setActivePlatform(tabId as ActiveView)
      conveyor.config.setLastApp(tabId)
    },
    [activePlatform, conveyor.config]
  )

  const handleCloseTab = useCallback(
    (id: string) => {
      // Prevent closing pinned tabs
      if (pinnedTabs[id]) {
        return
      }

      // Clean up webview and resources before removing tab
      const webviewRef = webviewRefs.current[id]
      if (webviewRef) {
        try {
          const webview = webviewRef as any
          // Stop any ongoing navigation
          if (webview.stop) {
            webview.stop()
          }
          // Clear the webview source to stop loading
          if (webview.src) {
            webview.src = 'about:blank'
          }
          // Remove from DOM (this triggers cleanup)
          if (webview.parentNode) {
            webview.parentNode.removeChild(webview)
          }
          // Destroy the webview if method exists
          if (webview.destroy) {
            webview.destroy()
          }
        } catch {
          // Ignore errors during cleanup
        }
        // Remove from refs
        delete webviewRefs.current[id]
      }

      // Clean up dynamic titles
      setDynamicTitles((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })

      setTabs((prev) => {
        const closing = prev.find((t) => t.id === id)
        const next = prev.filter((t) => t.id !== id)

        // Ensure pinned tabs are always preserved (like QuickLinks - always there)
        const pinnedTabsRemaining = next.filter((t) => pinnedTabs[t.id])

        // If we're closing the last non-pinned tab and no pinned tabs remain in state,
        // restore pinned tabs from localStorage (like QuickLinks - always persist)
        if (next.length === 0 || pinnedTabsRemaining.length === 0) {
          try {
            const storedPinnedTabs = localStorage.getItem('pinned-tabs-data')
            if (storedPinnedTabs) {
              const parsedPinnedTabs = JSON.parse(storedPinnedTabs)
              if (Array.isArray(parsedPinnedTabs) && parsedPinnedTabs.length > 0) {
                // Restore pinned tabs from localStorage (like QuickLinks)
                const pinnedState: Record<string, boolean> = {}
                parsedPinnedTabs.forEach((tab: any) => {
                  pinnedState[tab.id] = true
                })
                setPinnedTabs(pinnedState)
                // Return restored pinned tabs
                return parsedPinnedTabs
              }
            }
          } catch {
            // Ignore errors
          }
        }

        if (closing) {
          // Only save non-blank tabs (like min-master does)
          if (closing.url && closing.url !== 'about:blank') {
            setRecentlyClosedTabs((rc) => {
              // Push to end (like min-master's TabStack.push) - most recent at end
              const updated = [...rc, closing]
              // Remove oldest if exceeds depth (like min-master)
              const trimmed = updated.length > 10 ? updated.slice(-10) : updated
              // Save to localStorage immediately (like min-master)
              try {
                localStorage.setItem('recently-closed-tabs', JSON.stringify(trimmed))
              } catch {
                // Ignore storage errors
              }
              return trimmed
            })
          }
        }
        // if closing active, activate nearest
        if (activePlatform === id) {
          const idx = prev.findIndex((t) => t.id === id)
          const neighbor = next[Math.max(0, Math.min(idx, next.length - 1))]
          if (neighbor) {
            setActivePlatform(neighbor.id as ActiveView)
          } else {
            // If no neighbor, try to activate a pinned tab, or create new tab
            const pinnedTab = next.find((t) => pinnedTabs[t.id])
            if (pinnedTab) {
              setActivePlatform(pinnedTab.id as ActiveView)
            } else {
              // Try to restore pinned tabs from localStorage
              try {
                const storedPinnedTabs = localStorage.getItem('pinned-tabs-data')
                if (storedPinnedTabs) {
                  const parsedPinnedTabs = JSON.parse(storedPinnedTabs)
                  if (Array.isArray(parsedPinnedTabs) && parsedPinnedTabs.length > 0) {
                    const pinnedState: Record<string, boolean> = {}
                    parsedPinnedTabs.forEach((tab: any) => {
                      pinnedState[tab.id] = true
                    })
                    setPinnedTabs(pinnedState)
                    setActivePlatform(parsedPinnedTabs[0].id as ActiveView)
                    return parsedPinnedTabs
                  }
                }
              } catch {
                // Ignore errors
              }
              // Fallback: create new tab
              const nt = createTemporaryTab('about:blank', 'New Tab')
              setTimeout(() => {
                setTabs((_prevTabs) => {
                  // Merge with existing pinned tabs from localStorage
                  try {
                    const storedPinnedTabs = localStorage.getItem('pinned-tabs-data')
                    if (storedPinnedTabs) {
                      const parsedPinnedTabs = JSON.parse(storedPinnedTabs)
                      if (Array.isArray(parsedPinnedTabs) && parsedPinnedTabs.length > 0) {
                        return [...parsedPinnedTabs, nt]
                      }
                    }
                  } catch {
                    // Ignore errors
                  }
                  return [nt]
                })
                setActivePlatform(nt.id as ActiveView)
              }, 0)
            }
          }
        }
        return next
      })
    },
    [activePlatform, setDynamicTitles, pinnedTabs]
  )

  const handleReopenClosedTab = useCallback(() => {
    // Work exactly like min-master: pop from stack (LIFO) - instant, non-blocking
    // Use ref to get current state immediately (avoids stale closures for rapid calls)
    const rc = recentlyClosedTabsRef.current
    if (rc.length === 0) return

    // Pop the last closed tab (most recently closed) - like min-master's TabStack.pop()
    const restore = rc[rc.length - 1]
    const rest = rc.slice(0, -1)

    // Update all state immediately and synchronously (like min-master)
    // These are all synchronous and non-blocking - tabs load in background
    setTabs((prev) => {
      // Check if tab already exists to prevent duplicates
      if (prev.find((t) => t.id === restore.id)) {
        return prev
      }
      return [...prev, restore]
    })

    // Activate immediately - tabs load in background (like min-master)
    setActivePlatform(restore.id as ActiveView)

    // Update state immediately
    setRecentlyClosedTabs(rest)

    // Save to localStorage asynchronously (non-blocking, like min-master)
    // Use requestIdleCallback or setTimeout to avoid blocking
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        try {
          localStorage.setItem('recently-closed-tabs', JSON.stringify(rest))
        } catch {
          // Ignore storage errors
        }
      })
    } else {
      setTimeout(() => {
        try {
          localStorage.setItem('recently-closed-tabs', JSON.stringify(rest))
        } catch {
          // Ignore storage errors
        }
      }, 0)
    }
  }, [])

  const handleCommandPaletteOpenUrl = useCallback(
    async (rawUrl: string) => {
      const targetUrl = rawUrl.trim()
      if (!targetUrl) return

      const existingTab = tabs.find((t) => t.url === targetUrl)
      if (existingTab) {
        setActivePlatform(existingTab.id as ActiveView)
        return
      }

      const domain = getDomainName(targetUrl)
      const favicon = buildFaviconUrl(domain)
      const activeTab = tabs.find((t) => t.id === activePlatform)

      if (activeTab && (!activeTab.url || activeTab.url === 'about:blank')) {
        updateTab(activeTab.id, (tab) => ({
          url: targetUrl,
          name: tab.name === 'New Tab' || !tab.name ? domain || tab.name : tab.name,
          logoUrl: favicon ?? tab.logoUrl,
        }))
        setActivePlatform(activeTab.id as ActiveView)
        const ref = webviewRefs.current[activeTab.id]
        ref?.navigate(targetUrl)
        return
      }

      const newTab = createTemporaryTab(targetUrl, domain || '')
      newTab.isTemporary = false
      if (favicon) {
        newTab.logoUrl = favicon
      }
      setTabs((prev) => [newTab, ...prev]) // Add new tab at top
      setActivePlatform(newTab.id as ActiveView)
    },
    [tabs, activePlatform, updateTab, webviewRefs]
  )

  const handleAddressBarNavigate = useCallback(
    async (rawUrl: string) => {
      const targetUrl = rawUrl.trim()
      if (!targetUrl) return

      if (activePlatform === 'settings' || activePlatform === 'downloads') {
        await handleCommandPaletteOpenUrl(targetUrl)
        return
      }

      const domain = getDomainName(targetUrl)
      const favicon = buildFaviconUrl(domain)
      let targetTabId = activePlatform
      const activeTab = tabs.find((t) => t.id === activePlatform)

      if (activeTab) {
        updateTab(activeTab.id, (tab) => ({
          url: targetUrl,
          name: tab.name === 'New Tab' || !tab.name ? domain || tab.name : tab.name,
          logoUrl: favicon ?? tab.logoUrl,
        }))
      } else {
        const newTab = createTemporaryTab(targetUrl, domain || '')
        newTab.isTemporary = false
        if (favicon) {
          newTab.logoUrl = favicon
        }
        setTabs((prev) => [newTab, ...prev]) // Add new tab at top
        setActivePlatform(newTab.id as ActiveView)
        targetTabId = newTab.id
      }

      const ref = webviewRefs.current[targetTabId]
      ref?.navigate(targetUrl)
    },
    [activePlatform, tabs, updateTab, handleCommandPaletteOpenUrl, webviewRefs]
  )

  const handleConvertToPermanent = async (_appId: string) => {
    // Feature removed with store/platform system
    return
  }

  const handleToggleNotifications = async (platformId: string, enabled: boolean) => {
    await conveyor.config.setNotificationsEnabled(platformId, enabled)
    setNotificationsEnabled((prev) => ({
      ...prev,
      [platformId]: enabled,
    }))
    // Clear count when disabling notifications
    if (!enabled && notificationCounts[platformId] > 0) {
      await conveyor.config.clearNotificationCount(platformId)
      setNotificationCounts((prev) => ({
        ...prev,
        [platformId]: 0,
      }))
    }
  }

  const handleIncrementNotification = async (platformId: string) => {
    // Only increment if global notifications are enabled, platform notifications are enabled, and platform is not active
    const isGlobalEnabled = globalNotificationsEnabled
    const isPlatformEnabled = notificationsEnabled[platformId] ?? true
    if (isGlobalEnabled && isPlatformEnabled && activePlatform !== platformId) {
      const newCount = await conveyor.config.incrementNotificationCount(platformId)
      setNotificationCounts((prev) => ({
        ...prev,
        [platformId]: newCount,
      }))
    }
  }

  const handleToggleGlobalNotifications = async (enabled: boolean) => {
    await conveyor.config.setGlobalNotificationsEnabled(enabled)
    setGlobalNotificationsEnabled(enabled)

    // If disabling global notifications, clear all notification counts
    if (!enabled) {
      const allEnabledPlatforms = Object.keys(enabledPlatforms).filter((id) => enabledPlatforms[id])
      for (const platformId of allEnabledPlatforms) {
        await conveyor.config.clearNotificationCount(platformId)
      }
      setNotificationCounts({})
    }
  }

  const handleReorderPlatforms = async (newOrder: string[]) => {
    try {
      await conveyor.config.setPlatformOrder(newOrder)
      setPlatformOrder(newOrder)
    } catch {
      console.error('Error reordering platforms')
    }
  }

  // Tab context menu handlers
  const handleDuplicateTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) return

      // Get current URL from webview if available
      const webviewRef = webviewRefs.current[tabId]
      let url = tab.url || 'about:blank'
      if (webviewRef) {
        try {
          const currentUrl = webviewRef.getCurrentUrl()
          if (currentUrl) url = currentUrl
        } catch {
          // Use tab.url as fallback
        }
      }

      // Create duplicate tab with same URL
      const newTab = createTemporaryTab(url, tab.name || 'New Tab')
      newTab.isTemporary = false
      newTab.logoUrl = tab.logoUrl
      setTabs((prev) => [newTab, ...prev]) // Add at top
      setActivePlatform(newTab.id as ActiveView)
    },
    [tabs, webviewRefs]
  )

  const handleCopyTabLink = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) return

      // Get current URL from webview if available
      const webviewRef = webviewRefs.current[tabId]
      let url = tab.url || 'about:blank'
      if (webviewRef) {
        try {
          const currentUrl = webviewRef.getCurrentUrl()
          if (currentUrl && currentUrl !== 'about:blank') {
            url = currentUrl
          }
        } catch {
          // Use tab.url as fallback
        }
      }

      // Copy to clipboard
      try {
        if ((window as any).electronAPI?.writeText) {
          await (window as any).electronAPI.writeText(url)
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url)
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea')
          textArea.value = url
          textArea.style.position = 'fixed'
          textArea.style.opacity = '0'
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
        }
      } catch {
        // Failed to copy
      }
    },
    [tabs, webviewRefs]
  )

  const handleCloseOtherTabs = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const keepTab = prev.find((t) => t.id === tabId)
        if (!keepTab) return prev

        // Close all tabs except the selected one and pinned tabs
        const tabsToClose = prev.filter((t) => t.id !== tabId && !pinnedTabs[t.id])
        tabsToClose.forEach((tab) => {
          handleCloseTab(tab.id)
        })

        return prev.filter((t) => t.id === tabId || pinnedTabs[t.id])
      })
      setActivePlatform(tabId as ActiveView)
    },
    [handleCloseTab, pinnedTabs]
  )

  const handleCloseTabsToRight = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const currentIndex = prev.findIndex((t) => t.id === tabId)
        if (currentIndex === -1) return prev

        // Close all tabs to the right, but keep pinned tabs
        const tabsToClose = prev.slice(currentIndex + 1).filter((tab) => !pinnedTabs[tab.id])
        tabsToClose.forEach((tab) => {
          handleCloseTab(tab.id)
        })

        // Keep all tabs up to current index, plus any pinned tabs to the right
        const keepTabs = prev.slice(0, currentIndex + 1)
        const pinnedTabsToRight = prev.slice(currentIndex + 1).filter((tab) => pinnedTabs[tab.id])
        return [...keepTabs, ...pinnedTabsToRight]
      })
    },
    [handleCloseTab, pinnedTabs]
  )

  // IPC-driven menu actions
  useMenuActions({
    activeTabId: activePlatform,
    tabs,
    recentlyClosedTabs,
    webviewRefs,
    isCommandPaletteOpen,
    closeCommandPalette,
    setActiveTab: (id) => setActivePlatform(id as ActiveView),
    onReopenClosedTab: handleReopenClosedTab,
    onCloseTab: handleCloseTab,
  })

  // Show loading state while checking setup
  if (isSetup === null) {
    return <LoadingScreen />
  }

  // Show welcome page if not set up
  if (!isSetup) {
    return <SetupScreen />
  }

  // Main application view with new layout
  return (
    <ShortcutsProvider>
      <AppFrame
        sidebarPosition={sidebarPosition}
        activePlatform={activePlatform}
        tabs={tabs}
        onSelectTab={handleSelectTab}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onReopenClosedTab={handleReopenClosedTab}
        onDuplicateTab={handleDuplicateTab}
        onCopyTabLink={handleCopyTabLink}
        onCloseOtherTabs={handleCloseOtherTabs}
        onCloseTabsToRight={handleCloseTabsToRight}
        updateTab={updateTab}
        enabledPlatforms={enabledPlatforms}
        onPlatformChange={handlePlatformChange}
        useOriginalLogos={useOriginalLogos}
        pinnedPlatforms={{ ...pinnedPlatforms, ...pinnedTabs }}
        mutedPlatforms={mutedPlatforms}
        notificationsEnabled={notificationsEnabled}
        notificationCounts={notificationCounts}
        globalNotificationsEnabled={globalNotificationsEnabled}
        onTogglePinned={handleTogglePinned}
        onToggleMuted={handleToggleMuted}
        onToggleNotifications={handleToggleNotifications}
        onUninstallPlatform={handleUninstallPlatform}
        onReloadPlatform={handleReloadPlatform}
        showBackButton={showBackButton}
        showForwardButton={showForwardButton}
        showRefreshButton={showRefreshButton}
        temporaryApps={temporaryApps}
        onCloseTemporaryApp={handleCloseTemporaryApp}
        onConvertToPermanent={handleConvertToPermanent}
        onCloseAllTemporaryApps={handleCloseAllTemporaryApps}
        dynamicTitles={dynamicTitles}
        customPlatforms={customPlatforms}
        platformOrder={platformOrder}
        onReorderPlatforms={handleReorderPlatforms}
        transparencyEnabled={transparencyEnabled}
        webviewRefs={webviewRefs}
        reloadTrigger={reloadTrigger}
        onNotification={handleIncrementNotification}
        onToggleIconType={handleToggleIconType}
        onToggleTransparency={handleToggleTransparency}
        loadingBarEnabled={loadingBarEnabled}
        onToggleLoadingBar={handleToggleLoadingBar}
        commandPaletteEnabled={commandPaletteEnabled}
        onToggleCommandPalette={handleToggleCommandPalette}
        onToggleGlobalNotifications={handleToggleGlobalNotifications}
        onToggleBackButton={handleToggleBackButton}
        onToggleForwardButton={handleToggleForwardButton}
        onToggleRefreshButton={handleToggleRefreshButton}
        adBlockerMode={adBlockerMode}
        onAdBlockerChange={handleAdBlockerChange}
        onToggleSidebarPosition={handleToggleSidebarPosition}
        sidebarMode={sidebarMode}
        onChangeSidebarMode={handleChangeSidebarMode}
        onTogglePlatform={handleTogglePlatform}
        addressBarEnabled={addressBarEnabled}
        onToggleAddressBar={handleToggleAddressBar}
        squarePinnedTabs={squarePinnedTabs}
        onToggleSquarePinnedTabs={handleToggleSquarePinnedTabs}
        currentUrl={currentUrl}
        onAddressBarNavigate={handleAddressBarNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onOpenUrl={handleCommandPaletteOpenUrl}
      />
      {/* Global updater toast */}
      <GlobalUpdaterToast />
      {/* Download notification toast */}
      <DownloadNotificationToast />
      {/* Download warning dialog */}
      <DownloadWarningDialog />
      {/* Password save prompt */}
      <PasswordSavePrompt />
      {/* Floating download button - shows when sidebar is hidden */}
      {sidebarMode === 'hidden' && (
        <FloatingDownloadButton
          sidebarPosition={sidebarPosition}
          onNavigateToDownloads={() => setActivePlatform('downloads')}
        />
      )}
    </ShortcutsProvider>
  )
}

// Internal component to manage updater events and show the toast globally
function GlobalUpdaterToast() {
  const [phase, setPhase] = useState<'hidden' | 'available' | 'downloading' | 'downloaded'>('hidden')
  const [version, setVersion] = useState<string | undefined>(undefined)
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    if (!(window as any)?.electronAPI) return
    ;(window as any).electronAPI.onUpdaterAvailable((_e: any, info: any) => {
      setVersion(info?.version)
      setPhase('available')
    })
    ;(window as any).electronAPI.onUpdaterProgress((_e: any, p: any) => {
      const pct = Math.round(p?.percent ?? 0)
      setProgress(pct)
      setPhase('downloading')
    })
    ;(window as any).electronAPI.onUpdaterDownloaded((_e: any, info: any) => {
      setVersion(info?.version)
      setPhase('downloaded')
    })
    ;(window as any).electronAPI.onUpdaterNotAvailable(() => {
      setPhase('hidden')
    })
    ;(window as any).electronAPI.onUpdaterError((_e: any, err: string) => {
      console.error('[UPDATER-TOAST] Error:', err)
    })
  }, [])

  const handleInstallNow = async () => {
    if (!(window as any)?.electronAPI) return
    await (window as any).electronAPI.quitAndInstall()
  }

  const handleMaybeLater = () => {
    setPhase('hidden')
  }

  return (
    <UpdaterToast
      phase={phase}
      version={version}
      progress={progress}
      onInstallNow={handleInstallNow}
      onMaybeLater={handleMaybeLater}
    />
  )
}

/*
Source - https://stackoverflow.com/questions/55785565/how-do-i-blur-an-electron-browserwindow-with-transparency
Posted by Emil Walser
Retrieved 11/4/2025, License - CC-BY-SA 4.0
*/

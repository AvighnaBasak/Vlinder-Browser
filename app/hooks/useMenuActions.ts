import { useEffect } from 'react'

interface UseMenuActionsOptions {
  activeTabId: string
  tabs: Array<{ id: string; url?: string }>
  recentlyClosedTabs: Array<{ id: string }>
  webviewRefs: React.MutableRefObject<Record<string, any>>
  isCommandPaletteOpen: boolean
  closeCommandPalette: () => void
  setActiveTab: (id: string) => void
  onReopenClosedTab: () => void
  onCloseTab: (id: string) => void
}

export function useMenuActions(opts: UseMenuActionsOptions) {
  const {
    activeTabId,
    tabs,
    recentlyClosedTabs,
    webviewRefs,
    isCommandPaletteOpen,
    closeCommandPalette,
    setActiveTab,
    onReopenClosedTab,
    onCloseTab,
  } = opts

  useEffect(() => {
    const handleNavigateToSettings = () => {
      setActiveTab('settings')
    }

    const handleNavigateToDownloads = () => {
      setActiveTab('downloads')
    }

    const handleToggleSidebar = () => {
      window.dispatchEvent(new CustomEvent('toggle-sidebar-visibility'))
    }

    const handleToggleCommandPalette = () => {
      if (isCommandPaletteOpen) closeCommandPalette()
      else window.dispatchEvent(new CustomEvent('open-command-palette'))
    }

    const handleNextTab = () => {
      const opened = tabs
      if (opened.length <= 1) return
      const idx = opened.findIndex((p) => p.id === activeTabId)
      if (idx === -1) {
        setActiveTab(opened[0].id)
        return
      }
      const next = opened[(idx + 1) % opened.length]
      setActiveTab(next.id)
    }

    const handleReopenClosedTab = () => {
      // Don't check length here - let the callback handle it (avoids stale closure)
      // This allows rapid successive calls (like min-master)
      onReopenClosedTab()
    }

    const handleReloadPlatform = () => {
      if (!activeTabId) return
      const ref = webviewRefs.current[activeTabId]
      ref?.reload?.()
    }

    const handleForceReloadPlatform = () => {
      if (!activeTabId) return
      const ref = webviewRefs.current[activeTabId]
      ref?.forceReload?.()
    }

    const handleGoBack = () => {
      if (!activeTabId) return
      const ref = webviewRefs.current[activeTabId]
      ref?.goBack?.()
    }

    const handleGoForward = () => {
      if (!activeTabId) return
      const ref = webviewRefs.current[activeTabId]
      ref?.goForward?.()
    }

    const handleClosePlatform = () => {
      if (!activeTabId) return
      onCloseTab(activeTabId)
    }

    if ((window as any).electronAPI) {
      // Remove all listeners first to prevent duplicates (like min-master)
      ;(window as any).electronAPI.removeMenuActionListeners()

      // Then add new listeners
      ;(window as any).electronAPI.onNavigateToSettings(handleNavigateToSettings)
      ;(window as any).electronAPI.onNavigateToDownloads(handleNavigateToDownloads)
      ;(window as any).electronAPI.onToggleSidebar(handleToggleSidebar)
      ;(window as any).electronAPI.onToggleCommandPalette(handleToggleCommandPalette)
      ;(window as any).electronAPI.onNextTab(handleNextTab)
      ;(window as any).electronAPI.onReopenClosedTab(handleReopenClosedTab)
      ;(window as any).electronAPI.onReloadPlatform(handleReloadPlatform)
      ;(window as any).electronAPI.onForceReloadPlatform(handleForceReloadPlatform)
      ;(window as any).electronAPI.onGoBack(handleGoBack)
      ;(window as any).electronAPI.onGoForward(handleGoForward)
      ;(window as any).electronAPI.onClosePlatform(handleClosePlatform)
    }

    return () => {
      if ((window as any).electronAPI) {
        ;(window as any).electronAPI.removeMenuActionListeners()
      }
    }
  }, [
    activeTabId,
    tabs,
    recentlyClosedTabs,
    webviewRefs,
    isCommandPaletteOpen,
    closeCommandPalette,
    setActiveTab,
    onReopenClosedTab,
    onCloseTab,
  ])
}

import { useEffect } from 'react'

interface UseExternalLinkEventsOptions<TPlatform> {
  tabs: TPlatform[]
  setTabs: (next: TPlatform[] | ((prev: TPlatform[]) => TPlatform[])) => void
  setActivePlatform: (id: string) => void
  setDynamicTitles: (updater: (prev: Record<string, string>) => Record<string, string>) => void
  createTemporaryPlatform: (url: string, title: string) => TPlatform & { id: string; url: string }
  conveyorApp: any
}

export function useExternalLinkEvents<TPlatform extends { id: string; url: string }>(
  opts: UseExternalLinkEventsOptions<TPlatform>
) {
  const { tabs, setTabs, setActivePlatform, setDynamicTitles, createTemporaryPlatform, conveyorApp } = opts

  useEffect(() => {
    // Use global tracking set (shared with WebviewContainer) to prevent will-navigate from focusing background tabs
    if (!(window as any).__UF_BACKGROUND_URLS__) {
      ;(window as any).__UF_BACKGROUND_URLS__ = new Set<string>()
    }
    const backgroundUrls = (window as any).__UF_BACKGROUND_URLS__ as Set<string>

    const handleExternalLink = (data: { url: string; currentUrl: string; title: string }) => {
      const { url, title } = data

      // Check if this URL was recently opened as a background tab
      if (backgroundUrls.has(url)) {
        // Don't switch focus - this is a background tab
        backgroundUrls.delete(url) // Clean up after use
        return
      }

      // Check if tab with this URL already exists
      const existing = tabs.find((t) => t.url === url)
      if (existing) {
        setActivePlatform(existing.id)
        return
      }

      // Create new tab - don't use parent page title, let it use domain name initially
      // The title will be updated when the page loads (min-master style)
      const newTab = createTemporaryPlatform(url, '') // Empty title = use domain name
      // External links should be regular tabs (isTemporary is optional)
      if ('isTemporary' in newTab) {
        ;(newTab as any).isTemporary = false
      }
      setTabs((prev) => [newTab, ...prev]) // Add new tab at top
      setActivePlatform(newTab.id)

      // Don't set dynamicTitles here - let the page load and update it naturally
      // This ensures the new tab shows its own title, not the parent's
    }

    const handleOpenInNewApp = (event: CustomEvent) => {
      const { url, title } = event.detail
      const existing = tabs.find((t) => t.url === url)
      if (existing) {
        setActivePlatform(existing.id)
        return
      }
      // Don't use provided title - let page load and set its own title (min-master style)
      const newTab = createTemporaryPlatform(url, '') // Empty title = use domain name
      // External links should be regular tabs (isTemporary is optional)
      if ('isTemporary' in newTab) {
        ;(newTab as any).isTemporary = false
      }
      setTabs((prev) => [newTab, ...prev]) // Add new tab at top
      setActivePlatform(newTab.id)
      // Don't set dynamicTitles - let the page load and update it naturally
    }

    const handleExternalLinkBackground = (event: CustomEvent) => {
      const { url, title } = event.detail

      // URL should already be in backgroundUrls (added by WebviewContainer before dispatching)
      // But ensure it's there just in case
      backgroundUrls.add(url)

      // Don't switch focus - create tab in background
      const existing = tabs.find((t) => t.url === url)
      if (existing) {
        // Tab already exists, don't switch to it
        return
      }
      const newTab = createTemporaryPlatform(url, title || '')
      // Background tabs should be regular tabs (isTemporary is optional)
      if ('isTemporary' in newTab) {
        ;(newTab as any).isTemporary = false
      }
      setTabs((prev) => [newTab, ...prev]) // Add new tab at top
      // Don't call setActivePlatform - keep current tab focused
      if (title && title.trim()) {
        setDynamicTitles((prev) => ({ ...prev, [newTab.id]: title }))
      }
    }

    const handleExternalLinkNavigation = (event: CustomEvent) => {
      const { url, currentUrl, title } = event.detail
      handleExternalLink({ url, currentUrl, title })
    }

    const removeListener = conveyorApp.onExternalLink(handleExternalLink)
    const removeBackgroundListener = conveyorApp.onExternalLinkBackground(handleExternalLinkBackground)
    window.addEventListener('open-in-new-app', handleOpenInNewApp as EventListener)
    window.addEventListener('external-link-navigation', handleExternalLinkNavigation as EventListener)
    window.addEventListener('external-link-navigation-background', handleExternalLinkBackground as EventListener)

    return () => {
      removeListener()
      removeBackgroundListener()
      window.removeEventListener('open-in-new-app', handleOpenInNewApp as EventListener)
      window.removeEventListener('external-link-navigation', handleExternalLinkNavigation as EventListener)
      window.removeEventListener('external-link-navigation-background', handleExternalLinkBackground as EventListener)
    }
  }, [tabs, setTabs, setActivePlatform, setDynamicTitles, createTemporaryPlatform, conveyorApp])
}

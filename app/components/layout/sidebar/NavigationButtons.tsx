import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavigationButtonsProps {
  compact: boolean
  activePlatform: string
  showBackButton?: boolean
  showForwardButton?: boolean
  showRefreshButton?: boolean
}

function NavigationButtonsComponent({
  compact,
  activePlatform,
  showBackButton = false,
  showForwardButton = false,
  showRefreshButton = false,
}: NavigationButtonsProps) {
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({})
  const rafRef = useRef<number | null>(null)
  const activeWebviewRef = useRef<any | null>(null)

  const findActiveWebview = useCallback(() => {
    const webviews = Array.from(document.querySelectorAll('webview')) as any[]
    return webviews.find((webview) => {
      const parent = webview.parentElement
      return (
        parent &&
        !parent.classList.contains('opacity-0') &&
        parent.style.display !== 'none' &&
        webview.style.display !== 'none'
      )
    })
  }, [])

  const scheduleUpdateNavigationState = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const view = activeWebviewRef.current
      if (!view) {
        setCanGoBack(false)
        setCanGoForward(false)
        return
      }
      try {
        if (view.canGoBack && view.canGoForward) {
          setCanGoBack(!!view.canGoBack())
          setCanGoForward(!!view.canGoForward())
        } else {
          setCanGoBack(false)
          setCanGoForward(false)
        }
      } catch {
        setCanGoBack(false)
        setCanGoForward(false)
      }
    })
  }, [])

  // Attach listeners only to the currently active webview
  useEffect(() => {
    if (activePlatform === 'first-time' || activePlatform === 'settings') {
      activeWebviewRef.current = null
      setCanGoBack(false)
      setCanGoForward(false)
      return
    }

    const view = findActiveWebview()
    activeWebviewRef.current = view || null
    scheduleUpdateNavigationState()

    if (!view) return

    const handleChange = () => scheduleUpdateNavigationState()
    view.addEventListener('did-navigate', handleChange)
    view.addEventListener('did-navigate-in-page', handleChange)
    view.addEventListener('did-start-loading', handleChange)
    view.addEventListener('did-stop-loading', handleChange)

    return () => {
      view.removeEventListener('did-navigate', handleChange)
      view.removeEventListener('did-navigate-in-page', handleChange)
      view.removeEventListener('did-start-loading', handleChange)
      view.removeEventListener('did-stop-loading', handleChange)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [activePlatform, findActiveWebview, scheduleUpdateNavigationState])

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when a webview platform is active
      if (activePlatform === 'first-time' || activePlatform === 'settings') {
        return
      }

      // Ctrl+R - Refresh
      if (event.ctrlKey && event.key === 'r' && !event.shiftKey) {
        event.preventDefault()
        handleRefresh()
      }

      // Ctrl+Shift+R - Force refresh
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault()
        handleForceRefresh()
      }

      // Alt+Left Arrow - Go back
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        handleGoBack()
      }

      // Alt+Right Arrow - Go forward
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        handleGoForward()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePlatform, canGoBack, canGoForward])

  const getActiveWebview = useCallback(() => activeWebviewRef.current, [])

  const handleGoBack = useCallback(() => {
    if (!canGoBack) return
    try {
      setIsLoading(true)
      const webview = getActiveWebview()
      if (webview) {
        webview.goBack()
      }
    } catch (error) {
      // Failed to go back
    } finally {
      // Clear existing timeout to prevent memory leaks
      if (timeoutRefs.current.goBack) {
        clearTimeout(timeoutRefs.current.goBack)
      }
      timeoutRefs.current.goBack = setTimeout(() => setIsLoading(false), 500)
    }
  }, [canGoBack, getActiveWebview])

  const handleGoForward = useCallback(() => {
    if (!canGoForward) return
    try {
      setIsLoading(true)
      const webview = getActiveWebview()
      if (webview) {
        webview.goForward()
      }
    } catch (error) {
      // Failed to go forward
    } finally {
      // Clear existing timeout to prevent memory leaks
      if (timeoutRefs.current.goForward) {
        clearTimeout(timeoutRefs.current.goForward)
      }
      timeoutRefs.current.goForward = setTimeout(() => setIsLoading(false), 500)
    }
  }, [canGoForward, getActiveWebview])

  const handleRefresh = useCallback(() => {
    try {
      setIsLoading(true)
      const webview = getActiveWebview()
      if (webview) {
        webview.reload()
      }
    } catch (error) {
      // Failed to refresh
    } finally {
      // Clear existing timeout to prevent memory leaks
      if (timeoutRefs.current.refresh) {
        clearTimeout(timeoutRefs.current.refresh)
      }
      timeoutRefs.current.refresh = setTimeout(() => setIsLoading(false), 1000)
    }
  }, [getActiveWebview])

  const handleForceRefresh = useCallback(() => {
    try {
      setIsLoading(true)
      const webview = getActiveWebview()
      if (webview) {
        // Force refresh by reloading (clearCache method may not be available)
        if (webview.reloadIgnoringCache) {
          webview.reloadIgnoringCache()
        } else if (webview.reload) {
          webview.reload()
        }
      }
    } catch (error) {
      // Failed to force refresh
    } finally {
      // Clear existing timeout to prevent memory leaks
      if (timeoutRefs.current.forceRefresh) {
        clearTimeout(timeoutRefs.current.forceRefresh)
      }
      timeoutRefs.current.forceRefresh = setTimeout(() => setIsLoading(false), 1500)
    }
  }, [getActiveWebview])

  if (compact) return null

  return (
    <div className="flex items-center gap-2">
      {/* Back button - only show if enabled */}
      {showBackButton && (
        <button
          onClick={handleGoBack}
          disabled={!canGoBack}
          className={cn(
            'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 ease-out no-drag',
            'hover:bg-white/10 hover:scale-105 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
            canGoBack ? 'text-gray-300' : 'text-gray-600'
          )}
          title={canGoBack ? 'Go back' : 'Cannot go back'}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}

      {/* Forward button - only show if enabled */}
      {showForwardButton && (
        <button
          onClick={handleGoForward}
          disabled={!canGoForward}
          className={cn(
            'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 ease-out no-drag',
            'hover:bg-white/10 hover:scale-105 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
            canGoForward ? 'text-gray-300' : 'text-gray-600'
          )}
          title={canGoForward ? 'Go forward' : 'Cannot go forward'}
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {/* Refresh button - only show if enabled */}
      {showRefreshButton && (
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={cn(
            'h-6 w-6 flex items-center justify-center rounded-full transition-all duration-200 ease-out no-drag',
            'hover:bg-white/10 hover:scale-105 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
            isLoading ? 'text-gray-600' : 'text-gray-300'
          )}
          title="Refresh"
        >
          <RotateCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      )}
    </div>
  )
}

export const NavigationButtons = memo(NavigationButtonsComponent)

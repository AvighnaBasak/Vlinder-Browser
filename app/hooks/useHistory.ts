import { useEffect, useCallback, useRef } from 'react'
import { addHistoryEntry, type HistoryEntry, searchHistory, getAllHistory } from '@/app/services/history'

interface UseHistoryOptions {
  platformId?: string
  enabled?: boolean
}

/**
 * Hook to track navigation history for webviews
 */
export function useHistory(options: UseHistoryOptions = {}) {
  const { platformId, enabled = true } = options
  const lastUrlRef = useRef<string | null>(null)
  const lastTitleRef = useRef<string | null>(null)

  /**
   * Track a URL visit
   */
  const trackVisit = useCallback(
    (url: string, title?: string, isTyped: boolean = false) => {
      if (!enabled || !url || url === lastUrlRef.current) return
      
      lastUrlRef.current = url
      if (title) {
        lastTitleRef.current = title
      }
      
      addHistoryEntry(url, title || url, isTyped, platformId)
    },
    [enabled, platformId]
  )

  /**
   * Track title update for current URL
   */
  const trackTitleUpdate = useCallback(
    (url: string, title: string) => {
      if (!enabled || !url) return
      
      if (url === lastUrlRef.current && title !== lastTitleRef.current) {
        lastTitleRef.current = title
        // Update history entry with new title
        addHistoryEntry(url, title, false, platformId)
      }
    },
    [enabled, platformId]
  )

  /**
   * Search history
   */
  const search = useCallback((query: string, limit?: number) => {
    return searchHistory(query, limit)
  }, [])

  /**
   * Get all history
   */
  const getAll = useCallback((limit?: number) => {
    return getAllHistory(limit)
  }, [])

  return {
    trackVisit,
    trackTitleUpdate,
    search,
    getAll,
  }
}

/**
 * Hook to track webview navigation events
 */
export function useWebviewHistory(
  webviewRef: React.RefObject<any>,
  platformId?: string,
  enabled: boolean = true
) {
  const { trackVisit, trackTitleUpdate } = useHistory({ platformId, enabled })

  useEffect(() => {
    if (!enabled || !webviewRef.current) return

    const webview = webviewRef.current

    const handleDidNavigate = (event: any) => {
      if (event && event.url) {
        trackVisit(event.url, undefined, false)
      }
    }

    const handleDidNavigateInPage = (event: any) => {
      if (event && event.url && event.isMainFrame) {
        trackVisit(event.url, undefined, false)
      }
    }

    const handleTitleUpdated = (event: any) => {
      if (event && event.title && webview.getURL) {
        try {
          const url = webview.getURL()
          if (url) {
            trackTitleUpdate(url, event.title)
          }
        } catch {
          // Ignore errors
        }
      }
    }

    const handleDidFinishLoad = async () => {
      try {
        if (webview.getURL && webview.getTitle) {
          const url = webview.getURL()
          const title = webview.getTitle()
          if (url && url !== 'about:blank') {
            trackVisit(url, title || undefined, false)
          }
        }
      } catch {
        // Ignore errors
      }
    }

    webview.addEventListener('did-navigate', handleDidNavigate)
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage)
    webview.addEventListener('page-title-updated', handleTitleUpdated)
    webview.addEventListener('did-finish-load', handleDidFinishLoad)

    return () => {
      webview.removeEventListener('did-navigate', handleDidNavigate)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage)
      webview.removeEventListener('page-title-updated', handleTitleUpdated)
      webview.removeEventListener('did-finish-load', handleDidFinishLoad)
    }
  }, [enabled, webviewRef, trackVisit, trackTitleUpdate])
}

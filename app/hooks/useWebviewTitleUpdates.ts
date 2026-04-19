import { useEffect } from 'react'

export function useWebviewTitleUpdates(
  setDynamicTitles: (updater: (prev: Record<string, string>) => Record<string, string>) => void
) {
  useEffect(() => {
    const handleTitleUpdate = (data: { platformId: string; title: string }) => {
      setDynamicTitles((prev) => ({ ...prev, [data.platformId]: data.title }))
    }
    if ((window as any).electronAPI) {
      ;(window as any).electronAPI.onWebviewTitleUpdated(handleTitleUpdate)
    }
    return () => {
      if ((window as any).electronAPI) {
        ;(window as any).electronAPI.removeWebviewTitleUpdatedListener()
      }
    }
  }, [setDynamicTitles])
}

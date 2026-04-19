import { useState, useEffect, useCallback, useRef } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConveyor } from '@/app/hooks/use-conveyor'

interface FloatingDownloadButtonProps {
  sidebarPosition: 'left' | 'right'
  onNavigateToDownloads: () => void
}

interface DownloadState {
  activeCount: number
  totalProgress: number
  hasCompleted: boolean
  hasNewCompleted: boolean
}

export function FloatingDownloadButton({ sidebarPosition, onNavigateToDownloads }: FloatingDownloadButtonProps) {
  const conveyor = useConveyor()
  const [downloadState, setDownloadState] = useState<DownloadState>({
    activeCount: 0,
    totalProgress: 0,
    hasCompleted: false,
    hasNewCompleted: false,
  })
  const [hasSeenCompleted, setHasSeenCompleted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevActiveCountRef = useRef(0)

  const loadDownloadState = useCallback(async () => {
    try {
      const state = await conveyor.config.getDownloadState()
      const prevActiveCount = prevActiveCountRef.current
      setDownloadState(state)
      prevActiveCountRef.current = state.activeCount

      // Show button when download starts (activeCount goes from 0 to > 0)
      if (state.activeCount > 0 && prevActiveCount === 0) {
        setIsVisible(true)
        // Clear any existing hide timeout
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
        }
        // Hide after 5 seconds
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false)
          hideTimeoutRef.current = null
        }, 2000)
      }

      if (state.hasNewCompleted && !hasSeenCompleted) {
        setTimeout(() => {
          setHasSeenCompleted(true)
        }, 2000)
      }
    } catch {
      // Ignore errors
    }
  }, [conveyor.config, hasSeenCompleted])

  useEffect(() => {
    loadDownloadState()
    const interval = setInterval(loadDownloadState, 500)
    return () => {
      clearInterval(interval)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [loadDownloadState])

  useEffect(() => {
    if (!(window as any)?.electronAPI) return

    const handleDownloadStarted = () => {
      setIsVisible(true)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
        hideTimeoutRef.current = null
      }, 2000)
      loadDownloadState()
    }

    const handleDownloadUpdated = () => {
      loadDownloadState()
    }

    const handleDownloadCompleted = () => {
      loadDownloadState()
    }

    ;(window as any).electronAPI.onDownloadStarted(handleDownloadStarted)
    ;(window as any).electronAPI.onDownloadUpdated(handleDownloadUpdated)
    ;(window as any).electronAPI.onDownloadCompleted(handleDownloadCompleted)

    return () => {
      ;(window as any).electronAPI.removeDownloadListeners()
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [loadDownloadState])

  const handleClick = useCallback(() => {
    if (downloadState.hasNewCompleted) {
      setHasSeenCompleted(true)
    }
    onNavigateToDownloads()
  }, [downloadState.hasNewCompleted, onNavigateToDownloads])

  const hasActiveDownloads = downloadState.activeCount > 0
  const isCompleted =
    downloadState.hasCompleted && !hasActiveDownloads && downloadState.hasNewCompleted && !hasSeenCompleted
  const progress = downloadState.totalProgress
  const showProgress = hasActiveDownloads
  const showCompleted = isCompleted

  if (!isVisible) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 z-[100] pointer-events-auto transition-all duration-300 ease-out',
        sidebarPosition === 'left' ? 'left-6' : 'right-6',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}
    >
      <button
        onClick={handleClick}
        aria-label="Downloads"
        className={cn(
          'relative w-10 h-10 rounded-2xl transition-all duration-300 ease-out group hover:scale-110 active:scale-95 shadow-lg',
          hasActiveDownloads && 'animate-shake-infinite'
        )}
      >
        {showProgress && (
          <>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/30 to-purple-500/30 opacity-100 z-0" />
            <div
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-100 transition-all duration-300 z-0 overflow-hidden"
              style={{
                clipPath: `inset(0 ${100 - progress}% 0 0)`,
              }}
            />
          </>
        )}

        {showCompleted && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-100 transition-all duration-300 z-0" />
        )}

        <div
          className={cn(
            'absolute inset-0 rounded-2xl bg-gradient-to-r transition-all duration-300 ease-out z-10',
            showProgress
              ? 'from-blue-500 to-purple-500 opacity-100 shadow-lg shadow-blue-500/30'
              : showCompleted
                ? 'from-green-500 to-emerald-500 opacity-100 shadow-lg shadow-green-500/30'
                : 'from-blue-500 to-purple-500 opacity-100 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30'
          )}
        />

        <div
          className={cn(
            'absolute inset-[3px] rounded-[13px] flex items-center justify-center transition-all duration-300 ease-out z-20 pointer-events-none',
            'bg-white dark:bg-gray-900'
          )}
        >
          {showCompleted ? (
            <CheckCircle2
              className={cn('w-5 h-5 transition-all duration-300 ease-out', 'text-green-600 dark:text-green-400')}
            />
          ) : (
            <Download
              className={cn(
                'w-5 h-5 transition-all duration-300 ease-out',
                showProgress ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
              )}
            />
          )}
        </div>
      </button>
    </div>
  )
}

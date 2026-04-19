import { Download, Settings, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip'
import { useState, useEffect, useCallback } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'

const SIDEBAR_SPECIAL_ITEMS = [
  {
    id: 'downloads',
    name: 'Downloads',
    icon: Download,
    gradient: 'from-gray-500 to-gray-600',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    gradient: 'from-gray-500 to-gray-600',
  },
] as const

interface SpecialItemsProps {
  activePlatform: string
  onPlatformChange: (platformId: string) => void
  compact: boolean
}

interface DownloadState {
  activeCount: number
  totalProgress: number
  hasCompleted: boolean
  hasNewCompleted: boolean
}

export function SpecialItems({ activePlatform, onPlatformChange, compact }: SpecialItemsProps) {
  const conveyor = useConveyor()
  const [downloadState, setDownloadState] = useState<DownloadState>({
    activeCount: 0,
    totalProgress: 0,
    hasCompleted: false,
    hasNewCompleted: false,
  })
  const [isShaking, setIsShaking] = useState(false)
  const [hasSeenCompleted, setHasSeenCompleted] = useState(false)

  const loadDownloadState = useCallback(async () => {
    try {
      const state = await conveyor.config.getDownloadState()
      const prevActiveCount = downloadState.activeCount
      setDownloadState(state)
      
      // Trigger shake animation when download starts
      if (state.activeCount > 0 && prevActiveCount === 0) {
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 1000)
      }
      
      // Reset completed state after 5 seconds
      if (state.hasNewCompleted && !hasSeenCompleted) {
        setTimeout(() => {
          setHasSeenCompleted(true)
        }, 5000)
      }
    } catch (error) {
      console.error('Failed to load download state:', error)
    }
  }, [conveyor.config, downloadState.activeCount, hasSeenCompleted])

  useEffect(() => {
    loadDownloadState()
    const interval = setInterval(loadDownloadState, 500) // Update every 500ms
    return () => clearInterval(interval)
  }, [loadDownloadState])

  // Listen for download events
  useEffect(() => {
    if (!(window as any)?.electronAPI) return

    const handleDownloadStarted = () => {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 1000)
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
    }
  }, [loadDownloadState])

  // Mark completed as seen when clicking downloads
  const handleDownloadsClick = useCallback(() => {
    if (downloadState.hasNewCompleted) {
      setHasSeenCompleted(true)
    }
    onPlatformChange('downloads')
  }, [downloadState.hasNewCompleted, onPlatformChange])

  const hasActiveDownloads = downloadState.activeCount > 0
  const isCompleted = downloadState.hasCompleted && !hasActiveDownloads && downloadState.hasNewCompleted && !hasSeenCompleted
  const progress = downloadState.totalProgress

  return (
    <div
      className={cn(
        'flex-shrink-0 border-t border-white/8 no-drag transition-all duration-300 ease-out',
        compact ? 'p-2' : 'p-1'
      )}
    >
      {compact ? (
        // Compact mode - vertical stack
        <div className="flex flex-col gap-2">
          {SIDEBAR_SPECIAL_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePlatform === item.id
            const isDownloads = item.id === 'downloads'
            const showProgress = isDownloads && hasActiveDownloads
            const showCompleted = isDownloads && isCompleted
            
            return (
              <TooltipProvider key={item.id}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => (isDownloads ? handleDownloadsClick() : onPlatformChange(item.id))}
                      aria-label={item.name}
                      className={cn(
                        'relative w-7 h-7 rounded-lg transition-all duration-300 ease-out group hover:scale-105 active:scale-95',
                        isShaking && isDownloads && 'animate-shake'
                      )}
                    >
                      {/* Progress gradient overlay */}
                      {showProgress && (
                        <>
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-500/30 to-gray-600/30 opacity-100 z-0" />
                          <div
                            className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 opacity-100 transition-all duration-300 z-0 overflow-hidden"
                            style={{
                              clipPath: `inset(0 ${100 - progress}% 0 0)`,
                            }}
                          />
                        </>
                      )}
                      
                      {/* Completed gradient overlay */}
                      {showCompleted && (
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-400 to-gray-500 opacity-100 transition-all duration-300 z-0" />
                      )}
                      
                      {/* Gradient border wrapper */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-lg bg-gradient-to-r transition-all duration-300 ease-out z-10',
                          showProgress
                            ? 'from-gray-500 to-gray-600 opacity-100 shadow-lg shadow-gray-500/20'
                            : showCompleted
                            ? 'from-gray-400 to-gray-500 opacity-100 shadow-lg shadow-gray-400/20'
                            : isActive
                            ? `${item.gradient} opacity-100 shadow-lg shadow-gray-500/20`
                            : 'opacity-0 group-hover:opacity-100 group-hover:' + item.gradient
                        )}
                      />
                      {/* Inner content */}
                      <div
                        className={cn(
                          'absolute inset-[2px] rounded-[6px] flex items-center justify-center transition-all duration-300 ease-out z-20 pointer-events-none',
                          isActive || showProgress || showCompleted
                            ? 'bg-[#2a2a2a]'
                            : 'bg-[#222] group-hover:bg-[#2a2a2a]'
                        )}
                      >
                        {showCompleted ? (
                          <CheckCircle2
                            className={cn(
                              'w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110',
                              'text-gray-600 dark:text-gray-400'
                            )}
                          />
                        ) : (
                          <Icon
                            className={cn(
                              'w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110',
                              isActive || showProgress
                                ? 'text-gray-200'
                                : 'text-gray-500'
                            )}
                          />
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="backdrop-blur-light">
                    {isDownloads && hasActiveDownloads
                      ? `${item.name} (${downloadState.activeCount} active, ${progress.toFixed(0)}%)`
                      : item.name}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      ) : (
        // Expanded mode - horizontal layout (icons only)
        <div className="flex gap-2 justify-center">
          {SIDEBAR_SPECIAL_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activePlatform === item.id
            const isDownloads = item.id === 'downloads'
            const showProgress = isDownloads && hasActiveDownloads
            const showCompleted = isDownloads && isCompleted
            
            return (
              <TooltipProvider key={item.id}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => (isDownloads ? handleDownloadsClick() : onPlatformChange(item.id))}
                      aria-label={item.name}
                      className={cn(
                        'relative w-7 h-7 rounded-lg transition-all duration-300 ease-out group hover:scale-105 active:scale-95',
                        isShaking && isDownloads && 'animate-shake'
                      )}
                    >
                      {/* Progress gradient overlay */}
                      {showProgress && (
                        <>
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-500/30 to-gray-600/30 opacity-100 z-0" />
                          <div
                            className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 opacity-100 transition-all duration-300 z-0 overflow-hidden"
                            style={{
                              clipPath: `inset(0 ${100 - progress}% 0 0)`,
                            }}
                          />
                        </>
                      )}
                      
                      {/* Completed gradient overlay */}
                      {showCompleted && (
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-gray-400 to-gray-500 opacity-100 transition-all duration-300 z-0" />
                      )}
                      
                      {/* Gradient border wrapper */}
                      <div
                        className={cn(
                          'absolute inset-0 rounded-lg bg-gradient-to-r transition-all duration-300 ease-out z-10',
                          showProgress
                            ? 'from-gray-500 to-gray-600 opacity-100 shadow-lg shadow-gray-500/20'
                            : showCompleted
                            ? 'from-gray-400 to-gray-500 opacity-100 shadow-lg shadow-gray-400/20'
                            : isActive
                            ? `${item.gradient} opacity-100 shadow-lg shadow-gray-500/20`
                            : 'opacity-0 group-hover:opacity-100 group-hover:' + item.gradient
                        )}
                      />
                      {/* Inner content */}
                      <div
                        className={cn(
                          'absolute inset-[2px] rounded-[6px] flex items-center justify-center transition-all duration-300 ease-out z-20 pointer-events-none',
                          isActive || showProgress || showCompleted
                            ? 'bg-[#2a2a2a]'
                            : 'bg-[#222] group-hover:bg-[#2a2a2a]'
                        )}
                      >
                        {showCompleted ? (
                          <CheckCircle2
                            className={cn(
                              'w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110',
                              'text-gray-600 dark:text-gray-400'
                            )}
                          />
                        ) : (
                          <Icon
                            className={cn(
                              'w-4 h-4 transition-all duration-300 ease-out group-hover:scale-110',
                              isActive || showProgress
                                ? 'text-gray-200'
                                : 'text-gray-500'
                            )}
                          />
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="backdrop-blur-light">
                    {isDownloads && hasActiveDownloads
                      ? `${item.name} (${downloadState.activeCount} active, ${progress.toFixed(0)}%)`
                      : item.name}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      )}
    </div>
  )
}

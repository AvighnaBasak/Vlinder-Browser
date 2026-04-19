import { useState, useEffect } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { CheckCircle2, X, FolderOpen, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DownloadNotification {
  filename: string
  path: string
  downloadId: string
}

export function DownloadNotificationToast() {
  const conveyor = useConveyor()
  const [notification, setNotification] = useState<DownloadNotification | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!(window as any)?.electronAPI) return

    const handleDownloadCompleted = (data: DownloadNotification) => {
      setNotification(data)
      setIsVisible(true)
      
      // Auto-hide after 8 seconds (longer than update popup)
      setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => setNotification(null), 300) // Wait for fade out
      }, 8000)
    }

    // Listen for download completion notifications
    const ipcRenderer = (window as any).electronAPI
    if (ipcRenderer.onDownloadCompletedNotification) {
      ipcRenderer.onDownloadCompletedNotification(handleDownloadCompleted)
    }

    return () => {
      // Cleanup handled by preload
    }
  }, [])

  const handleOpen = async () => {
    if (!notification) return
    try {
      await conveyor.config.openDownload(notification.downloadId)
      setIsVisible(false)
      setTimeout(() => setNotification(null), 300)
    } catch (error) {
      console.error('Failed to open download:', error)
    }
  }

  const handleShowInFolder = async () => {
    if (!notification) return
    try {
      await conveyor.config.showDownloadInFolder(notification.downloadId)
      setIsVisible(false)
      setTimeout(() => setNotification(null), 300)
    } catch (error) {
      console.error('Failed to show in folder:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => setNotification(null), 300)
  }

  if (!notification) return null

  return (
    <div className="fixed right-4 bottom-4 z-[1000] w-[320px]">
      <div
        className={cn(
          'rounded-xl shadow-lg border border-green-200 dark:border-green-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur p-4 transition-all duration-300 ease-out relative',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-green-900 dark:text-green-100 pr-6">Download Complete</div>
        <div className="text-xs text-green-700 dark:text-green-300 mt-1 truncate">{notification.filename}</div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleOpen}
            className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs flex items-center gap-1.5"
          >
            <PlayCircle className="h-3 w-3" />
            Open file
          </button>
          <button
            onClick={handleShowInFolder}
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs flex items-center gap-1.5"
          >
            <FolderOpen className="h-3 w-3" />
            Show in folder
          </button>
        </div>
      </div>
    </div>
  )
}


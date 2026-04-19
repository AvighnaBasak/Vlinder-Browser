import { useState, useEffect } from 'react'
import { X, Download, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DownloadWarningDialog() {
  const [isVisible, setIsVisible] = useState(false)
  const [activeDownloadCount, setActiveDownloadCount] = useState(0)

  useEffect(() => {
    if (!(window as any)?.electronAPI) return

    const handleShowWarning = (count: number) => {
      setActiveDownloadCount(count)
      setIsVisible(true)
    }

    const handleHideWarning = () => {
      setIsVisible(false)
    }

    const ipcRenderer = (window as any).electronAPI
    if (ipcRenderer.onDownloadWarningShow) {
      ipcRenderer.onDownloadWarningShow(handleShowWarning)
    }
    if (ipcRenderer.onDownloadWarningHide) {
      ipcRenderer.onDownloadWarningHide(handleHideWarning)
    }

    return () => {
      // Cleanup handled by preload
    }
  }, [])

  const handleOpenDownloads = async () => {
    if ((window as any)?.electronAPI?.openDownloadsPage) {
      ;(window as any).electronAPI.openDownloadsPage()
    }
    setIsVisible(false)
  }

  const handleCloseAnyway = async () => {
    if ((window as any)?.electronAPI?.confirmQuitWithDownloads) {
      ;(window as any).electronAPI.confirmQuitWithDownloads()
    }
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          'rounded-xl shadow-2xl border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-900 backdrop-blur p-6 w-[400px] transition-all duration-300 ease-out relative',
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Downloads in Progress
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {activeDownloadCount === 1
                ? 'You have 1 download in progress. Closing the app will cancel this download.'
                : `You have ${activeDownloadCount} downloads in progress. Closing the app will cancel these downloads.`}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenDownloads}
                className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors min-w-0"
              >
                <Download className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Open Downloads</span>
              </button>
              <button
                onClick={handleCloseAnyway}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors min-w-0"
              >
                <span className="truncate">Close Anyway</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


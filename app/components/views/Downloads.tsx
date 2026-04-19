import { useState, useEffect, useCallback, useMemo } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { DownloadCloud, FolderOpen, Trash2, CheckCircle2, AlertCircle, Loader2, PlayCircle, Pause, Play, Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { settingsStyles } from './settings/settings-design-system'

interface DownloadInfo {
  id: string
  url: string
  filename: string
  path: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'paused'
  startTime: number
  endTime?: number
  mimeType?: string
  error?: string
  downloadRateBytesPerSecond?: number
  estimatedTimeRemainingSeconds?: number
  percentCompleted?: number
}

interface DownloadsProps {
  isActive: boolean
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export default function Downloads({ isActive }: DownloadsProps) {
  const conveyor = useConveyor()
  const [downloads, setDownloads] = useState<DownloadInfo[]>([])
  const [downloadPath, setDownloadPath] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'progressing' | 'completed' | 'cancelled' | 'paused'>('all')

  const loadDownloads = useCallback(async () => {
    try {
      const allDownloads = await conveyor.config.getAllDownloads()
      setDownloads(allDownloads)
    } catch (error) {
      console.error('Failed to load downloads:', error)
    }
  }, [conveyor.config])

  const loadDownloadPath = useCallback(async () => {
    try {
      const path = await conveyor.config.getDownloadPath()
      setDownloadPath(path)
    } catch (error) {
      console.error('Failed to load download path:', error)
    }
  }, [conveyor.config])

  useEffect(() => {
    if (isActive) {
      loadDownloads()
      loadDownloadPath()
      conveyor.config.initDownloadPath()
    }
  }, [isActive, loadDownloads, loadDownloadPath, conveyor.config])

  useEffect(() => {
    if (!isActive || !(window as any)?.electronAPI) return

    const handleDownloadStarted = (data: DownloadInfo) => {
      setDownloads((prev) => [{ ...data }, ...prev.filter((d) => d.id !== data.id)])
    }

    const handleDownloadUpdated = (data: DownloadInfo) => {
      setDownloads((prev) => {
        const index = prev.findIndex((d) => d.id === data.id)
        if (index === -1) return [{ ...data }, ...prev]
        const newArray = [...prev]
        newArray[index] = { ...data }
        return newArray
      })
    }

    const handleDownloadCompleted = (data: DownloadInfo) => {
      setDownloads((prev) => {
        const index = prev.findIndex((d) => d.id === data.id)
        if (index === -1) return [{ ...data }, ...prev]
        const newArray = [...prev]
        newArray[index] = { ...data }
        return newArray
      })
    }

    ;(window as any).electronAPI.onDownloadStarted(handleDownloadStarted)
    ;(window as any).electronAPI.onDownloadUpdated(handleDownloadUpdated)
    ;(window as any).electronAPI.onDownloadCompleted(handleDownloadCompleted)

    return () => {
      ;(window as any).electronAPI.removeDownloadListeners()
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) return
    const pollActiveDownloads = async () => {
      try {
        const allDownloads = await conveyor.config.getAllDownloads()
        const activeDownloads = allDownloads.filter((d) => d.state === 'progressing' || d.state === 'paused')
        if (activeDownloads.length > 0) {
          setDownloads((prev) => {
            const updated = new Map(prev.map((d) => [d.id, d]))
            let hasChanges = false
            activeDownloads.forEach((download) => {
              const existing = updated.get(download.id)
              if (!existing || existing.receivedBytes !== download.receivedBytes || existing.state !== download.state) {
                updated.set(download.id, { ...download })
                hasChanges = true
              }
            })
            return hasChanges ? Array.from(updated.values()).sort((a, b) => b.startTime - a.startTime) : prev
          })
        }
      } catch (error) {
        console.error('Failed to poll downloads:', error)
      }
    }
    const interval = setInterval(pollActiveDownloads, 500)
    return () => clearInterval(interval)
  }, [isActive, conveyor.config])

  const handlePause = async (downloadId: string) => { await conveyor.config.pauseDownload(downloadId) }
  const handleResume = async (downloadId: string) => { await conveyor.config.resumeDownload(downloadId) }
  const handleCancel = async (downloadId: string) => { await conveyor.config.cancelDownload(downloadId); await loadDownloads() }
  const handleRemove = async (downloadId: string) => { await conveyor.config.removeDownload(downloadId); await loadDownloads() }
  const handleOpen = async (downloadId: string) => { await conveyor.config.openDownload(downloadId) }
  const handleShowInFolder = async (downloadId: string) => { await conveyor.config.showDownloadInFolder(downloadId) }
  const handleClearCompleted = async () => { await conveyor.config.clearCompletedDownloads(); await loadDownloads() }

  const filteredDownloads = useMemo(() => {
    return downloads.filter((d) => filter === 'all' || d.state === filter)
  }, [downloads, filter])

  if (!isActive) return null

  return (
    <div className="absolute inset-0 bg-[#080808] flex flex-col pt-0">
      <style>{settingsStyles}</style>
      <style>{`
        .s-dl-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #141414;
          background: #0a0a0a;
        }

        .s-dl-tabs {
          display: flex;
          gap: 2px;
          background: #111;
          padding: 2px;
          border-radius: 3px;
          border: 1px solid #1f1f1f;
        }

        .s-dl-tab {
          padding: 6px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .s-dl-tab.active {
          color: #e5e5e5;
          background: rgba(255,255,255,0.08);
          font-weight: 500;
        }
        
        .s-dl-tab:hover:not(.active) {
          color: #888;
          background: rgba(255,255,255,0.02);
        }

        .s-dl-item {
          display: flex;
          align-items: center;
          padding: 14px 20px;
          gap: 16px;
          border-bottom: 1px solid #0f0f0f;
          transition: background 0.1s ease;
          position: relative;
        }

        .s-dl-item:hover {
          background: rgba(255,255,255,0.02);
        }

        .s-dl-item:hover .s-dl-actions {
          opacity: 1;
        }

        .s-dl-icon {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background: #111;
          border: 1px solid #222;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #666;
        }

        .s-dl-icon.completed {
          background: #111611;
          border-color: #263326;
          color: #5a8a5a;
        }

        .s-dl-icon.cancelled {
          background: #161111;
          border-color: #332626;
          color: #8a4a4a;
        }

        .s-dl-icon.progressing {
          background: #111316;
          border-color: #262a33;
          color: #4a6a8a;
        }

        .s-dl-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .s-dl-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .s-dl-title {
          font-size: 12px;
          color: #c8c8c8;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .s-dl-status-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
        }

        .s-dl-meta {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #555;
          display: flex;
          gap: 12px;
        }

        .s-dl-progress-bar {
          width: 100%;
          height: 3px;
          background: #1a1a1a;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 4px;
        }

        .s-dl-progress-fill {
          height: 100%;
          background: #555;
          transition: width 0.3s ease;
        }

        .s-dl-progress-fill.progressing {
          background: #4a8acc;
        }

        .s-dl-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .s-dl-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          background: transparent;
          border: 1px solid #1f1f1f;
          color: #888;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .s-dl-btn:hover {
          background: #1a1a1a;
          border-color: #333;
          color: #e5e5e5;
        }

        .s-dl-btn.danger:hover {
          background: #2a1515;
          border-color: #442222;
          color: #cc6666;
        }

        .s-dl-btn.success:hover {
          background: #152a15;
          border-color: #224422;
          color: #66cc66;
        }
      `}</style>

      {/* Header */}
      <div className="s-panel-header" style={{ background: '#0e0e0e', borderBottom: '1px solid #141414', flexShrink: 0 }}>
        <div className="s-panel-icon">
          <DownloadCloud className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="s-panel-title">DOWNLOADS MANAGER</div>
          <div className="s-panel-desc">INDEXING {downloads.length} TRANSFERS • DESTINATION: {downloadPath || 'NULL'}</div>
        </div>
        {downloads.filter(d => d.state === 'completed').length > 0 && (
          <button className="s-action-btn s-btn-danger" onClick={handleClearCompleted}>
            <Trash2 className="w-3.5 h-3.5" />
            PURGE COMPLETED
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="s-dl-toolbar flex-shrink-0">
        <div className="s-dl-tabs">
          {(['all', 'progressing', 'paused', 'completed', 'cancelled'] as const).map(f => (
            <div 
              key={f} 
              className={cn("s-dl-tab", filter === f && "active")}
              onClick={() => setFilter(f)}
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none" style={{ background: '#080808' }}>
        {filteredDownloads.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
            <DownloadCloud className="w-12 h-12 text-[#1a1a1a] mb-4" />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#444', letterSpacing: '0.1em' }}>
              NO TRANSFERS FOUND
            </div>
          </div>
        ) : (
          filteredDownloads.map(download => {
            const isCompleted = download.state === 'completed'
            const isProgressing = download.state === 'progressing'
            const isPaused = download.state === 'paused'
            const isCancelled = download.state === 'cancelled'
            const isInterrupted = download.state === 'interrupted'
            const canPauseResume = !download.url.startsWith('blob:')
            
            const progress = download.percentCompleted !== undefined 
              ? download.percentCompleted 
              : (download.totalBytes > 0 ? (download.receivedBytes / download.totalBytes) * 100 : 0)

            return (
              <div key={download.id} className="s-dl-item">
                <div className={cn("s-dl-icon", isCompleted && "completed", isCancelled && "cancelled", isProgressing && "progressing")}>
                  {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  {isCancelled && <X className="w-4 h-4" />}
                  {isInterrupted && <AlertCircle className="w-4 h-4" />}
                  {isPaused && <Pause className="w-4 h-4" />}
                  {isProgressing && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>

                <div className="s-dl-content">
                  <div className="s-dl-top">
                    <div className="s-dl-title" style={{ opacity: isCancelled ? 0.5 : 1 }}>{download.filename}</div>
                    <div className="s-dl-status-text" style={{ color: isCompleted ? '#5a8a5a' : isCancelled ? '#8a4a4a' : isProgressing ? '#4a8acc' : '#555' }}>
                      {download.state}
                    </div>
                  </div>

                  <div className="s-dl-meta">
                    <span>{formatBytes(download.receivedBytes)} / {formatBytes(download.totalBytes)}</span>
                    {(isProgressing || isPaused) && download.totalBytes > 0 && <span>{progress.toFixed(1)}%</span>}
                    {isProgressing && download.downloadRateBytesPerSecond && <span>{formatBytes(download.downloadRateBytesPerSecond)}/s</span>}
                  </div>

                  {(isProgressing || isPaused) && (
                    <div className="s-dl-progress-bar">
                      <div className={cn("s-dl-progress-fill", isProgressing && "progressing")} style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>

                <div className="s-dl-actions">
                  {isCompleted && (
                    <>
                      <button className="s-dl-btn success" onClick={() => handleOpen(download.id)} title="Open">
                        <PlayCircle className="w-3.5 h-3.5" />
                      </button>
                      <button className="s-dl-btn" onClick={() => handleShowInFolder(download.id)} title="Show in folder">
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {isProgressing && canPauseResume && (
                    <>
                      <button className="s-dl-btn" onClick={() => handlePause(download.id)} title="Pause">
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button className="s-dl-btn danger" onClick={() => handleCancel(download.id)} title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {isProgressing && !canPauseResume && (
                    <button className="s-dl-btn danger" onClick={() => handleCancel(download.id)} title="Cancel">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isPaused && canPauseResume && (
                    <>
                      <button className="s-dl-btn success" onClick={() => handleResume(download.id)} title="Resume">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button className="s-dl-btn danger" onClick={() => handleCancel(download.id)} title="Cancel">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button className="s-dl-btn danger" onClick={() => handleRemove(download.id)} title="Remove record">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

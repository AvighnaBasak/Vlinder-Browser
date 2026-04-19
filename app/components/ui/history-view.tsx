import { useState, useEffect, useMemo } from 'react'
import { Search, Trash2, Clock, ExternalLink, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllHistory, searchHistory, deleteHistoryEntry, clearHistory, type HistoryEntry } from '@/app/services/history'
import { settingsStyles } from '../views/settings/settings-design-system'

interface HistoryViewProps {
  onNavigate?: (url: string) => void
  className?: string
}

export function HistoryView({ onNavigate, className }: HistoryViewProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadHistory = () => {
    setIsLoading(true)
    try {
      const history = searchQuery.trim() ? searchHistory(searchQuery, 500) : getAllHistory(500)
      setEntries(history)
    } catch {
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [searchQuery])

  const handleDelete = (url: string) => {
    deleteHistoryEntry(url)
    loadHistory()
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      clearHistory()
      setEntries([])
      setSearchQuery('')
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'TODAY'
    } else if (days === 1) {
      return 'YESTERDAY'
    } else if (days < 7) {
      return `${days} DAYS AGO`
    } else if (days < 30) {
      const weeks = Math.floor(days / 7)
      return `${weeks} ${weeks === 1 ? 'WEEK' : 'WEEKS'} AGO`
    } else if (days < 365) {
      const months = Math.floor(days / 30)
      return `${months} ${months === 1 ? 'MONTH' : 'MONTHS'} AGO`
    } else {
      return date.toLocaleDateString().toUpperCase()
    }
  }

  const groupedEntries = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {}
    
    entries.forEach((entry) => {
      const date = formatDate(entry.lastVisitTime)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(entry)
    })

    return groups
  }, [entries])

  return (
    <div className={cn('flex flex-col h-full bg-[#080808]', className)}>
      <style>{settingsStyles}</style>

      {/* Internal localized noir styles for table/list */}
      <style>{`
        .s-history-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #141414;
          background: #0a0a0a;
        }

        .s-history-search {
          position: relative;
          width: 250px;
        }

        .s-history-search input {
          width: 100%;
          background: #111;
          border: 1px solid #1f1f1f;
          border-radius: 3px;
          color: #e5e5e5;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          padding: 8px 10px 8px 30px;
          transition: border-color 0.15s ease;
        }

        .s-history-search input:focus {
          outline: none;
          border-color: #333;
        }

        .s-history-search input::placeholder {
          color: #444;
        }

        .s-history-search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          color: #555;
        }

        .s-history-clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 14px;
          height: 14px;
          color: #555;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .s-history-clear-btn:hover {
          color: #e5e5e5;
        }

        .s-day-header {
          font-size: 9px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.15em;
          color: #444;
          padding: 16px 20px 8px;
          text-transform: uppercase;
          background: #080808;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .s-history-item {
          display: flex;
          align-items: center;
          padding: 10px 20px;
          gap: 16px;
          transition: background 0.1s ease;
          border-bottom: 1px solid #0f0f0f;
          position: relative;
          cursor: pointer;
        }

        .s-history-item:hover {
          background: rgba(255,255,255,0.02);
        }

        .s-history-item:hover .s-history-actions {
          opacity: 1;
        }

        .s-history-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #555;
          width: 60px;
          flex-shrink: 0;
        }

        .s-history-content {
          flex: 1;
          min-w: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .s-history-title {
          font-size: 11px;
          color: #c8c8c8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .s-history-url {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #4a4a4a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .s-history-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .s-history-action-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          color: #666;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .s-history-action-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #aaa;
        }

        .s-history-action-btn.danger:hover {
          background: rgba(255, 80, 80, 0.05);
          border-color: #4a2020;
          color: #cc6666;
        }

        .s-history-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
        }

        .s-history-empty-icon {
          width: 48px;
          height: 48px;
          color: #1a1a1a;
          margin-bottom: 16px;
        }

        .s-history-empty-text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #444;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}</style>

      {/* Header */}
      <div className="s-panel-header" style={{ background: '#0e0e0e', borderBottom: '1px solid #141414', flexShrink: 0 }}>
        <div className="s-panel-icon">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="flex-1">
          <div className="s-panel-title">History LOG</div>
          <div className="s-panel-desc">{entries.length} RECORDS INDEXED</div>
        </div>
        {entries.length > 0 && (
          <button
            className="s-action-btn s-btn-danger"
            onClick={handleClearAll}
          >
            <Trash2 className="w-3.5 h-3.5" />
            PURGE ALL
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="s-history-toolbar">
        <div className="s-history-search">
          <Search className="s-history-search-icon" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            spellCheck={false}
          />
          {searchQuery && (
            <div className="s-history-clear-btn" onClick={() => setSearchQuery('')}>
              <X className="w-3 h-3" />
            </div>
          )}
        </div>
        <button className="s-action-btn" onClick={loadHistory} disabled={isLoading}>
          <RefreshCw className={cn("w-3h-3", isLoading && "animate-spin")} />
          SYNC
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none" style={{ background: '#080808' }}>
        {isLoading ? (
          <div className="s-history-empty">
            <RefreshCw className="s-history-empty-icon animate-spin mx-auto" />
            <div className="s-history-empty-text">SYNCING RECORDS...</div>
          </div>
        ) : entries.length === 0 ? (
          <div className="s-history-empty">
            <Clock className="s-history-empty-icon mx-auto" />
            <div className="s-history-empty-text">
              {searchQuery ? 'NO MATCHING RECORDS FOUND' : 'LOG ARCHIVE EMPTY'}
            </div>
          </div>
        ) : (
          <div>
            {Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="s-day-header">{date}</div>
                <div>
                  {dateEntries.map((entry) => (
                    <div key={entry.id} className="s-history-item" onClick={() => onNavigate?.(entry.url)}>
                      <div className="s-history-time">
                        {new Date(entry.lastVisitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                      <div className="s-history-content">
                        <div className="s-history-title">{entry.title || entry.url}</div>
                        <div className="s-history-url">{entry.url}</div>
                      </div>
                      <div className="s-history-actions">
                        {onNavigate && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onNavigate(entry.url); }}
                            className="s-history-action-btn"
                            title="Open Link"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.url); }}
                          className="s-history-action-btn danger"
                          title="Purge Record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

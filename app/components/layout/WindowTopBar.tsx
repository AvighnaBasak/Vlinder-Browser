import React, { useState, useCallback } from 'react'
import { Minimize2, X, Square, Maximize2 } from 'lucide-react'

interface WindowTopBarProps {
  onClose?: () => void
  onMinimize?: () => void
  onMaximize?: () => void
}

export function WindowTopBar({ onClose, onMinimize, onMaximize }: WindowTopBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      window.conveyor?.window?.windowClose?.()
    }
  }, [onClose])

  const handleMinimize = useCallback(() => {
    if (onMinimize) {
      onMinimize()
    } else {
      window.conveyor?.window?.windowMinimize?.()
    }
  }, [onMinimize])

  const handleMaximize = useCallback(() => {
    if (onMaximize) {
      onMaximize()
    } else {
      window.conveyor?.window?.windowMaximizeToggle?.()
      setIsMaximized((prev) => !prev)
    }
  }, [onMaximize])

  const handleDoubleClick = useCallback(() => {
    handleMaximize()
  }, [handleMaximize])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      onDoubleClick={handleDoubleClick}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div style={{ backgroundColor: 'var(--theme-chrome, #1a1a1a)' }}>
        <div className="flex items-center justify-end h-6">
          <div
            className="flex items-center gap-2 no-drag relative z-10"
            style={{ marginRight: '20px' } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={handleMinimize}
              title="Minimize"
              className="titlebar-button titlebar-min rounded-full cursor-pointer border-0 p-0 flex-shrink-0"
              style={
                {
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(100, 100, 100, 0.4)',
                  transition: 'all 200ms ease-out',
                } as React.CSSProperties
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.width = '13px'
                e.currentTarget.style.height = '16px'
                e.currentTarget.style.borderRadius = '4px'
                e.currentTarget.style.backgroundColor = 'hsl(130, 50%, 40%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.width = '13px'
                e.currentTarget.style.height = '13px'
                e.currentTarget.style.borderRadius = '50%'
                e.currentTarget.style.backgroundColor = 'rgba(100, 100, 100, 0.4)'
              }}
            >
              <Minimize2 className="hidden" style={{ visibility: 'collapse' } as React.CSSProperties} />
            </button>

            <button
              type="button"
              onClick={handleMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className={`titlebar-button ${isMaximized ? 'titlebar-restore' : 'titlebar-max'} rounded-full cursor-pointer border-0 p-0 flex-shrink-0`}
              style={
                {
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(100, 100, 100, 0.4)',
                  transition: 'all 200ms ease-out',
                } as React.CSSProperties
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.width = '13px'
                e.currentTarget.style.height = '16px'
                e.currentTarget.style.borderRadius = '4px'
                e.currentTarget.style.backgroundColor = 'hsl(60, 50%, 50%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.width = '13px'
                e.currentTarget.style.height = '13px'
                e.currentTarget.style.borderRadius = '50%'
                e.currentTarget.style.backgroundColor = 'rgba(100, 100, 100, 0.4)'
              }}
            >
              {isMaximized ? (
                <Square className="hidden" style={{ visibility: 'collapse' } as React.CSSProperties} />
              ) : (
                <Maximize2 className="hidden" style={{ visibility: 'collapse' } as React.CSSProperties} />
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              title="Close"
              className="titlebar-button titlebar-close rounded-full cursor-pointer border-0 p-0 flex-shrink-0"
              style={
                {
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(100, 100, 100, 0.4)',
                  transition: 'all 200ms ease-out',
                } as React.CSSProperties
              }
              onMouseEnter={(e) => {
                e.currentTarget.style.width = '13px'
                e.currentTarget.style.height = '16px'
                e.currentTarget.style.borderRadius = '4px'
                e.currentTarget.style.backgroundColor = 'hsl(0, 50%, 50%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.width = '13px'
                e.currentTarget.style.height = '13px'
                e.currentTarget.style.borderRadius = '50%'
                e.currentTarget.style.backgroundColor = 'rgba(100, 100, 100, 0.4)'
              }}
            >
              <X className="hidden" style={{ visibility: 'collapse' } as React.CSSProperties} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

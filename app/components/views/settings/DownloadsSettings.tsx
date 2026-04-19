import { useState, useEffect, useCallback } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { DownloadCloud, FolderOpen, Terminal } from 'lucide-react'
import { settingsStyles } from './settings-design-system'

export default function DownloadsSettings() {
  const conveyor = useConveyor()
  const [downloadPath, setDownloadPath] = useState<string>('')

  const loadDownloadPath = useCallback(async () => {
    try {
      const path = await conveyor.config.getDownloadPath()
      setDownloadPath(path)
    } catch (error) {
      console.error('Failed to load download path:', error)
    }
  }, [conveyor.config])

  useEffect(() => {
    loadDownloadPath()
    conveyor.config.initDownloadPath().then((path) => {
      if (path) setDownloadPath(path)
    })
  }, [loadDownloadPath, conveyor.config])

  const handleSelectPath = async () => {
    try {
      const path = await conveyor.config.selectDownloadPath()
      if (path) {
        setDownloadPath(path)
      }
    } catch (error) {
      console.error('Failed to select download path:', error)
    }
  }

  return (
    <>
      <style>{settingsStyles}</style>
      <style>{`
        .s-dl-path-container {
          background: #080808;
          border: 1px dashed #2a2a2a;
          border-radius: 4px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
          margin-top: 10px;
        }

        .s-dl-target-output {
          background: #111;
          border: 1px solid #1f1f1f;
          padding: 12px 16px;
          width: 100%;
          border-radius: 3px;
          display: flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
          overflow: hidden;
        }

        .s-dl-path-text {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #a0a0a0;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
        }

        .s-dl-path-text span {
          color: #555;
        }

        .s-dl-prompt {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #444;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          align-self: flex-start;
        }
      `}</style>
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <DownloadCloud className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div>
            <div className="s-panel-title">Download Configuration</div>
            <div className="s-panel-desc">Manage local storage pathways for retrieved assets</div>
          </div>
        </div>
        <div className="s-panel-body" style={{ padding: '24px' }}>
          
          <div className="s-dl-prompt">Target Directory Mapping:</div>
          
          <div className="s-dl-path-container">
            <div className="w-10 h-10 rounded bg-[#111] border border-[#1f1f1f] flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-gray-600" />
            </div>

            <div className="s-dl-target-output">
              <Terminal className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <div className="s-dl-path-text">
                <span>EXPORT_PATH=</span>{downloadPath || 'NULL_REFERENCE_ERROR'}
              </div>
              <button className="s-action-btn s-btn-primary" onClick={handleSelectPath}>
                REASSIGN
              </button>
            </div>

            <div style={{ fontSize: '10px', color: '#3d3d3d', letterSpacing: '0.04em', fontFamily: "'JetBrains Mono', monospace" }}>
              * ALL INCOMING BINARY DATA WILL BE WRITTEN TO THIS VOLUME
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

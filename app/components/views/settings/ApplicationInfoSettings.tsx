import { useEffect, useMemo, useState } from 'react'
import { Info, RefreshCw, Download } from 'lucide-react'
import { settingsStyles } from './settings-design-system'

export default function ApplicationInfoSettings() {
  const [version] = useState<string>('v2.0')
  const [updateStatus, setUpdateStatus] = useState<string>('Idle')
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false)
  const isElectron = useMemo(() => typeof window !== 'undefined' && !!(window as any).electronAPI, [])

  useEffect(() => {
    if (!isElectron) return
    ;(window as any).electronAPI.onUpdaterChecking(() => {
      setUpdateStatus('Checking for updates...')
    })
    ;(window as any).electronAPI.onUpdaterAvailable((_e: any, info: any) => {
      setUpdateStatus(`Update available: ${info?.version}. Downloading...`)
    })
    ;(window as any).electronAPI.onUpdaterNotAvailable((_e: any, _info: any) => {
      setUpdateStatus('You are up to date.')
    })
    ;(window as any).electronAPI.onUpdaterError((_e: any, err: string) => {
      console.error('[SETTINGS] Update error:', err)
      setUpdateStatus('Update error: ' + err)
    })
    ;(window as any).electronAPI.onUpdaterProgress((_e: any, p: any) => {
      const pct = Math.round(p?.percent ?? 0)
      setUpdateStatus(`Downloading update... ${pct}%`)
    })
    ;(window as any).electronAPI.onUpdaterDownloaded((_e: any, _info: any) => {
      setUpdateStatus('Update downloaded. Restart to install.')
      setIsDownloaded(true)
    })
  }, [isElectron])

  const checkForUpdates = async () => {
    if (!isElectron) {
      setUpdateStatus('Updater not available in web')
      return
    }
    setUpdateStatus('Checking for updates...')
    setIsDownloaded(false)
    await (window as any).electronAPI.checkForUpdates()
  }

  const quitAndInstall = async () => {
    if (!isElectron) return
    await (window as any).electronAPI.quitAndInstall()
  }

  return (
    <>
      <style>{settingsStyles}</style>
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Info className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">About vlinder</div>
            <div className="s-panel-desc">Version, build, and update information</div>
          </div>
        </div>

        <div className="s-panel-body" style={{ gap: '0' }}>
          {/* Version hero block */}
          <div
            style={{
              padding: '20px 16px 16px',
              borderBottom: '1px solid #141414',
            }}
          >
            {/* Large version display */}
            <div className="s-version-display">
              <span style={{ color: '#c8c8c8' }}>vlinder</span>
              {'  '}
              <span>{version}</span>
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '10px',
                color: '#333',
                letterSpacing: '0.06em',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Made by Avighna Basak
            </div>

            {/* Build info grid */}
            <div style={{ marginTop: '14px', display: 'flex', gap: '16px' }}>
              {[
                { label: 'PRODUCT', value: 'vlinder v2' },
                { label: 'AUTHOR', value: 'Avighna Basak' },
                { label: 'ENGINE', value: 'Electron' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: '8px',
                      letterSpacing: '0.14em',
                      color: '#888888',
                      textTransform: 'uppercase',
                      marginBottom: '3px',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#bbbbbb',
                      letterSpacing: '0.04em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Update actions */}
          <div className="s-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div className="s-row-label">Software Updates</div>
              <div className="s-update-status">{updateStatus}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              <button className="s-action-btn s-btn-primary" onClick={checkForUpdates}>
                <RefreshCw className="w-3 h-3" />
                CHECK
              </button>
              {isDownloaded && (
                <button className="s-action-btn s-btn-primary" onClick={quitAndInstall}>
                  <Download className="w-3 h-3" />
                  RESTART
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

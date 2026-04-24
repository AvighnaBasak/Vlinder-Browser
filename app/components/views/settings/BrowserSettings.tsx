import { useState, useEffect } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { Globe, CheckCircle, XCircle } from 'lucide-react'
import { settingsStyles } from './settings-design-system'

interface BrowserSettingsProps {
  isActive: boolean
}

export default function BrowserSettings({ isActive }: BrowserSettingsProps) {
  const conveyor = useConveyor()
  const [isDefaultBrowser, setIsDefaultBrowser] = useState<boolean>(false)
  const [isSettingDefault, setIsSettingDefault] = useState<boolean>(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    if (isActive) {
      loadDefaultBrowserStatus()
    }
  }, [isActive])

  const loadDefaultBrowserStatus = async () => {
    try {
      const isDefault = await conveyor.app.isDefaultBrowser()
      setIsDefaultBrowser(isDefault)
    } catch (error) {
      console.error('Failed to check default browser status:', error)
    }
  }

  const handleSetDefaultBrowser = async () => {
    setIsSettingDefault(true)
    setLastError(null)
    try {
      const result = await conveyor.app.setDefaultBrowser()
      if (result.success) {
        setIsDefaultBrowser(true)
        setTimeout(() => { loadDefaultBrowserStatus() }, 1000)
      } else {
        setLastError(
          result.error ||
            'Failed to set as default browser. Try running as administrator or check Windows Default Apps settings.'
        )
      }
    } catch (error) {
      setLastError(
        error instanceof Error ? error.message : 'Unknown error occurred. Basic protocol registration may still work.'
      )
    } finally {
      setIsSettingDefault(false)
    }
  }

  if (!isActive) return null

  return (
    <>
      <style>{settingsStyles}</style>

      {/* Default Browser */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Globe className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Default Browser</div>
            <div className="s-panel-desc">Set vlinder as your system default for web links</div>
          </div>
        </div>
        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ flex: 1 }}>
              <div className="s-row-label">Browser Status</div>
              <div style={{ marginTop: '4px' }}>
                {isDefaultBrowser ? (
                  <span className="s-status-ok">
                    <span className="s-status-dot" />
                    vlinder is your default browser
                  </span>
                ) : (
                  <span className="s-status-err">
                    <span className="s-status-dot" />
                    Not set as default browser
                  </span>
                )}
              </div>
            </div>
            <button
              className="s-action-btn s-btn-primary"
              onClick={handleSetDefaultBrowser}
              disabled={isDefaultBrowser || isSettingDefault}
            >
              {isSettingDefault ? 'SETTING...' : isDefaultBrowser ? 'ALREADY SET' : 'SET DEFAULT'}
            </button>
          </div>

          {lastError && (
            <div className="s-info-box warning" style={{ margin: '0 0 4px' }}>
              {lastError}
            </div>
          )}

          <div className="s-info-box" style={{ margin: '4px 0 0' }}>
            <div>· Windows — Registers with system registry and Default Apps</div>
            <div>· macOS — Shows system dialog to confirm</div>
            <div>· Linux — Uses xdg-settings to assign handler</div>
            <div style={{ marginTop: '6px', color: '#888888' }}>
              Note: Even if registration fails, basic protocol handling (http/https) should still work.
            </div>
          </div>
        </div>
      </div>

      {/* Supported Protocols */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Globe className="w-3.5 h-3.5" style={{ color: '#555' }} />
          </div>
          <div>
            <div className="s-panel-title">Supported Protocols</div>
            <div className="s-panel-desc">vlinder handles these protocols when set as default</div>
          </div>
        </div>
        <div className="s-panel-body" style={{ padding: '12px 20px 16px' }}>
          <div className="s-grid-2">
            <div className="s-grid-cell">
              <div className="s-grid-cell-title">Web Protocols</div>
              <ul className="s-grid-cell-list">
                <li>HTTP (http://)</li>
                <li>HTTPS (https://)</li>
              </ul>
            </div>
            <div className="s-grid-cell">
              <div className="s-grid-cell-title">File Types</div>
              <ul className="s-grid-cell-list">
                <li>HTML (.html, .htm)</li>
                <li>XHTML (.xhtml, .xhtm)</li>
                <li>MHTML (.mhtml)</li>
                <li>SHTML (.shtml)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

import { useState } from 'react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { Database, Trash2, RotateCcw } from 'lucide-react'
import { settingsStyles } from './settings-design-system'

export default function DataManagementSettings() {
  const conveyor = useConveyor()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleClearData = async () => {
    if (showClearConfirm) {
      localStorage.removeItem('transparency-enabled')
      localStorage.removeItem('use-original-logos')
      localStorage.removeItem('show-back-button')
      localStorage.removeItem('show-forward-button')
      localStorage.removeItem('show-refresh-button')
      localStorage.removeItem('sidebar-position')
      sessionStorage.clear()
      await conveyor.config.clearData()
      window.location.reload()
    } else {
      setShowClearConfirm(true)
      setTimeout(() => setShowClearConfirm(false), 3000)
    }
  }

  const handleResetApp = async () => {
    if (showResetConfirm) {
      await conveyor.config.resetApp()
    } else {
      setShowResetConfirm(true)
      setTimeout(() => setShowResetConfirm(false), 3000)
    }
  }

  return (
    <>
      <style>{settingsStyles}</style>

      {/* Clear Data */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Database className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Clear Application Data</div>
            <div className="s-panel-desc">Remove cache, cookies, and authentication — settings preserved</div>
          </div>
        </div>
        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <Trash2 className="w-3.5 h-3.5" style={{ color: '#444' }} />
              <div>
                <div className="s-row-label">Cache & Authentication</div>
                <div className="s-row-desc">
                  You'll need to sign in again to your apps
                </div>
              </div>
            </div>
            <button
              className={`s-action-btn s-btn-danger ${showClearConfirm ? 'confirmed' : ''}`}
              onClick={handleClearData}
            >
              <Trash2 className="w-3 h-3" />
              {showClearConfirm ? 'CONFIRM?' : 'CLEAR DATA'}
            </button>
          </div>
        </div>
      </div>

      {/* Reset App */}
      <div className="s-panel" style={{ borderColor: '#1f1515' }}>
        <div className="s-panel-header" style={{ borderBottomColor: '#1a1212' }}>
          <div className="s-panel-icon" style={{ background: 'rgba(255,60,60,0.04)', borderColor: '#2a1a1a' }}>
            <RotateCcw className="w-3.5 h-3.5" style={{ color: '#663333' }} />
          </div>
          <div>
            <div className="s-panel-title" style={{ color: '#884444' }}>Factory Reset</div>
            <div className="s-panel-desc">Wipe all settings, data, and installed apps</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: '#4a2020',
              textTransform: 'uppercase',
              border: '1px solid #2a1515',
              padding: '2px 6px',
              borderRadius: '2px',
            }}
          >
            DANGER ZONE
          </span>
        </div>
        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ flex: 1 }}>
              <div className="s-row-label" style={{ color: '#774444' }}>Application Reset</div>
              <div className="s-row-desc">
                All settings, data, and apps cleared — returns to onboarding screen
              </div>
            </div>
            <button
              className={`s-action-btn s-btn-danger ${showResetConfirm ? 'confirmed' : ''}`}
              onClick={handleResetApp}
            >
              <RotateCcw className="w-3 h-3" />
              {showResetConfirm ? 'CONFIRM?' : 'RESET APP'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

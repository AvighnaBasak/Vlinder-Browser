import { Shield } from 'lucide-react'
import { settingsStyles } from './settings-design-system'

interface PrivacySettingsProps {
  adBlockerMode: string
  onAdBlockerChange: (mode: string) => void
}

const modes = [
  {
    id: 'disabled',
    name: 'Disabled',
    description: 'No content blocking active',
    tag: 'OFF',
  },
  {
    id: 'adsOnly',
    name: 'Block Ads',
    description: 'Block advertisements only',
    tag: 'L1',
  },
  {
    id: 'adsAndTrackers',
    name: 'Block Ads & Trackers',
    description: 'Block ads and tracking scripts',
    tag: 'L2',
  },
  {
    id: 'all',
    name: 'Block All',
    description: 'Block ads, trackers, and cookie notices',
    tag: 'MAX',
  },
]

export default function PrivacySettings({ adBlockerMode, onAdBlockerChange }: PrivacySettingsProps) {
  return (
    <>
      <style>{settingsStyles}</style>
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Shield className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Privacy & Content Blocking</div>
            <div className="s-panel-desc">Powered by Ghostery — control what content is blocked</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: adBlockerMode !== 'disabled' ? '#5a8a5a' : '#3a3a3a',
              textTransform: 'uppercase',
            }}
          >
            {modes.find((m) => m.id === adBlockerMode)?.tag ?? 'OFF'}
          </span>
        </div>

        <div className="s-panel-body">
          <div className="s-radio-group">
            {modes.map((mode) => {
              const isSelected = adBlockerMode === mode.id
              return (
                <label
                  key={mode.id}
                  className={`s-radio-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onAdBlockerChange(mode.id)}
                >
                  <input
                    type="radio"
                    name="adBlocker"
                    value={mode.id}
                    checked={isSelected}
                    onChange={() => onAdBlockerChange(mode.id)}
                    style={{ display: 'none' }}
                  />
                  <div className="s-radio-dot">
                    <div className="s-radio-inner" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="s-radio-label">{mode.name}</span>
                      <span
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.09em',
                          padding: '1px 5px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid #1f1f1f',
                          borderRadius: '2px',
                          color: isSelected ? '#666' : '#2a2a2a',
                        }}
                      >
                        {mode.tag}
                      </span>
                    </div>
                    <div className="s-radio-subdesc">{mode.description}</div>
                  </div>
                </label>
              )
            })}
          </div>

          <div className="s-info-box" style={{ marginTop: '8px' }}>
            Changes take effect immediately. Blocked content may require a page refresh to apply.
          </div>
        </div>
      </div>
    </>
  )
}

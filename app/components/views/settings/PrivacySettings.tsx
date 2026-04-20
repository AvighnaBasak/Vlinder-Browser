import { useState, useEffect, useCallback } from 'react'
import { Shield, Globe, Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react'
import { settingsStyles, SToggle } from './settings-design-system'
import { useConveyor } from '@/app/hooks/use-conveyor'

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
    description: 'Block advertisements including YouTube video ads',
    tag: 'L1',
  },
  {
    id: 'adsAndTrackers',
    name: 'Block Ads & Trackers',
    description: 'Block ads, tracking scripts, and strip tracking parameters from URLs',
    tag: 'L2',
  },
  {
    id: 'adsTrackersAndCookies',
    name: 'Block Ads, Trackers & Cookies',
    description: 'L2 plus block third-party cookies and auto-dismiss cookie consent banners',
    tag: 'L3',
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Maximum blocking — all ads, trackers, cookies, consent popups, and cosmetic filtering',
    tag: 'MAX',
  },
]

export default function PrivacySettings({ adBlockerMode, onAdBlockerChange }: PrivacySettingsProps) {
  const conveyor = useConveyor()
  const [vpnEnabled, setVpnEnabled] = useState(false)
  const [vpnConnecting, setVpnConnecting] = useState(false)
  const [vpnIp, setVpnIp] = useState<string | null>(null)
  const [vpnError, setVpnError] = useState<string | null>(null)

  const loadVpnStatus = useCallback(async () => {
    try {
      const status = await conveyor.config.getVpnStatus()
      setVpnEnabled(status.enabled)
      setVpnIp(status.ip || null)
      setVpnConnecting(status.connecting || false)
      setVpnError(null)
    } catch {
      // VPN not available
    }
  }, [conveyor.config])

  useEffect(() => {
    loadVpnStatus()
  }, [loadVpnStatus])

  const handleVpnToggle = async (enabled: boolean) => {
    setVpnError(null)
    if (enabled) {
      setVpnConnecting(true)
      try {
        const result = await conveyor.config.enableVpn()
        if (result.success) {
          setVpnEnabled(true)
          setVpnIp(result.ip || null)
        } else {
          setVpnError(result.error || 'Failed to connect')
        }
      } catch (err: any) {
        setVpnError(err.message || 'Connection failed')
      }
      setVpnConnecting(false)
    } else {
      try {
        await conveyor.config.disableVpn()
        setVpnEnabled(false)
        setVpnIp(null)
      } catch {
        setVpnError('Failed to disconnect')
      }
    }
  }

  const handleNewIdentity = async () => {
    if (!vpnEnabled) return
    setVpnConnecting(true)
    setVpnError(null)
    try {
      const result = await conveyor.config.vpnNewIdentity()
      if (result.success) {
        setVpnIp(result.ip || null)
      } else {
        setVpnError(result.error || 'Failed to get new identity')
      }
    } catch (err: any) {
      setVpnError(err.message || 'Failed to get new identity')
    }
    setVpnConnecting(false)
  }

  return (
    <>
      <style>{settingsStyles}</style>

      {/* Content Blocking Panel */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground, #888)' }} />
          </div>
          <div>
            <div className="s-panel-title">Content Blocking</div>
            <div className="s-panel-desc">Block ads, trackers, cookies, and consent popups</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: adBlockerMode !== 'disabled' ? '#5a8a5a' : 'var(--theme-text-muted, #3a3a3a)',
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
                          border: '1px solid var(--theme-border, #1f1f1f)',
                          borderRadius: '2px',
                          color: isSelected ? 'var(--theme-text-dim, #666)' : 'var(--theme-text-muted, #2a2a2a)',
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
            Changes take effect immediately. YouTube ads are blocked at both the network and player level. A page refresh may be needed for existing tabs.
          </div>
        </div>
      </div>

      {/* VPN / Tor Proxy Panel */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            {vpnEnabled ? (
              <Globe className="w-3.5 h-3.5" style={{ color: '#5a8a5a' }} />
            ) : (
              <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--muted-foreground, #888)' }} />
            )}
          </div>
          <div>
            <div className="s-panel-title">VPN — Tor Network</div>
            <div className="s-panel-desc">Route browsing traffic through the Tor anonymity network</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: vpnEnabled ? '#5a8a5a' : 'var(--theme-text-muted, #3a3a3a)',
              textTransform: 'uppercase',
            }}
          >
            {vpnConnecting ? 'CONNECTING' : vpnEnabled ? 'ACTIVE' : 'OFF'}
          </span>
        </div>

        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              {vpnConnecting ? (
                <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" style={{ color: 'var(--theme-text-dim, #666)' }} />
              ) : vpnEnabled ? (
                <Wifi className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5a8a5a' }} />
              ) : (
                <WifiOff className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--theme-text-muted, #2f2f2f)' }} />
              )}
              <div>
                <div className="s-row-label">Tor Proxy</div>
                <div className={`s-row-desc ${vpnEnabled ? 'active' : ''}`}>
                  {vpnConnecting
                    ? 'Establishing Tor circuit...'
                    : vpnEnabled
                      ? 'Traffic routed through Tor'
                      : 'Direct connection active'}
                </div>
              </div>
            </div>
            <SToggle
              checked={vpnEnabled}
              onCheckedChange={handleVpnToggle}
              disabled={vpnConnecting}
            />
          </div>

          {vpnEnabled && vpnIp && (
            <div className="s-row" style={{ borderTop: '1px solid var(--theme-border, #1a1a1a)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--theme-text-dim, #666)' }} />
                <div>
                  <div className="s-row-label">Exit Node IP</div>
                  <div className="s-row-desc active" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {vpnIp}
                  </div>
                </div>
              </div>
              <button
                className="s-action-btn s-btn-primary"
                onClick={handleNewIdentity}
                disabled={vpnConnecting}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw className="w-3 h-3" />
                NEW IDENTITY
              </button>
            </div>
          )}

          {vpnError && (
            <div className="s-info-box" style={{ marginTop: '0', color: '#c44', borderColor: '#442222' }}>
              {vpnError}
            </div>
          )}

          <div className="s-info-box" style={{ marginTop: '8px' }}>
            Routes all browser traffic through the Tor network for anonymity. Connection speed will be reduced. Tor must be installed on your system.
          </div>
        </div>
      </div>
    </>
  )
}

import { Bell, BellOff } from 'lucide-react'
import { settingsStyles, SToggle } from './settings-design-system'

interface NotificationSettingsProps {
  globalNotificationsEnabled: boolean
  onToggleGlobalNotifications: (enabled: boolean) => void
}

export default function NotificationSettings({
  globalNotificationsEnabled,
  onToggleGlobalNotifications,
}: NotificationSettingsProps) {
  return (
    <>
      <style>{settingsStyles}</style>
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            {globalNotificationsEnabled ? (
              <Bell className="w-3.5 h-3.5" style={{ color: '#888' }} />
            ) : (
              <BellOff className="w-3.5 h-3.5" style={{ color: '#444' }} />
            )}
          </div>
          <div>
            <div className="s-panel-title">Notifications</div>
            <div className="s-panel-desc">Control notification settings for all platforms</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: globalNotificationsEnabled ? '#5a8a5a' : '#3a3a3a',
              textTransform: 'uppercase',
            }}
          >
            {globalNotificationsEnabled ? '● ACTIVE' : '○ MUTED'}
          </span>
        </div>

        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ flex: 1 }}>
              <div className="s-row-label">Global Notifications</div>
              <div className={`s-row-desc ${globalNotificationsEnabled ? 'active' : ''}`}>
                {globalNotificationsEnabled ? 'All notifications enabled' : 'All notifications disabled'}
              </div>
            </div>
            <SToggle checked={globalNotificationsEnabled} onCheckedChange={onToggleGlobalNotifications} />
          </div>
        </div>
      </div>
    </>
  )
}

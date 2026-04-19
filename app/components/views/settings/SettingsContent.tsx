import NotificationSettings from './NotificationSettings'
import AppearanceSettings from './AppearanceSettings'
import BrowserSettings from './BrowserSettings'
import BrowserControlsSettings from './BrowserControlsSettings'
import PrivacySettings from './PrivacySettings'
import DataManagementSettings from './DataManagementSettings'
import ApplicationInfoSettings from './ApplicationInfoSettings'
import { ShortcutsSettings } from './sections/ShortcutsSettings'
import { PasswordsPage } from './sections/passwords/PasswordsPage'
import { HistoryView } from '@/app/components/ui/history-view'
import DownloadsSettings from './DownloadsSettings'
import { settingsSections } from './SettingsSidebar'

interface SettingsContentProps {
  activeSection: string
  useOriginalLogos: boolean
  onToggleIconType: (useOriginal: boolean) => void
  transparencyEnabled: boolean
  onToggleTransparency: (enabled: boolean) => void
  loadingBarEnabled: boolean
  onToggleLoadingBar: (enabled: boolean) => void
  commandPaletteEnabled: boolean // New prop
  onToggleCommandPalette: (enabled: boolean) => void // New prop
  globalNotificationsEnabled: boolean
  onToggleGlobalNotifications: (enabled: boolean) => void
  showBackButton: boolean
  showForwardButton: boolean
  showRefreshButton: boolean
  onToggleBackButton: (enabled: boolean) => void
  onToggleForwardButton: (enabled: boolean) => void
  onToggleRefreshButton: (enabled: boolean) => void
  sidebarPosition: 'left' | 'right'
  onToggleSidebarPosition: (position: 'left' | 'right') => void
  sidebarMode: 'expanded' | 'compact' | 'hidden'
  onChangeSidebarMode: (mode: 'expanded' | 'compact' | 'hidden') => void
  adBlockerMode: string
  onAdBlockerChange: (mode: string) => void
  addressBarEnabled: boolean
  onToggleAddressBar: (enabled: boolean) => void
  squarePinnedTabs: boolean
  onToggleSquarePinnedTabs: (enabled: boolean) => void
  onNavigate?: (url: string) => void
}

export default function SettingsContent({
  activeSection,
  useOriginalLogos,
  onToggleIconType,
  transparencyEnabled,
  onToggleTransparency,
  loadingBarEnabled,
  onToggleLoadingBar,
  commandPaletteEnabled, // Destructure new prop
  onToggleCommandPalette, // Destructure new prop
  globalNotificationsEnabled,
  onToggleGlobalNotifications,
  showBackButton,
  showForwardButton,
  showRefreshButton,
  onToggleBackButton,
  onToggleForwardButton,
  onToggleRefreshButton,
  sidebarPosition,
  onToggleSidebarPosition,
  sidebarMode,
  onChangeSidebarMode,
  adBlockerMode,
  onAdBlockerChange,
  addressBarEnabled,
  onToggleAddressBar,
  squarePinnedTabs,
  onToggleSquarePinnedTabs,
  onNavigate,
}: SettingsContentProps) {

  const currentSection = settingsSections.find(s => s.id === activeSection)

  const renderSection = () => {
    switch (activeSection) {
      case 'notifications':
        return (
          <NotificationSettings
            globalNotificationsEnabled={globalNotificationsEnabled}
            onToggleGlobalNotifications={onToggleGlobalNotifications}
          />
        )
      case 'appearance':
        return (
          <AppearanceSettings
            useOriginalLogos={useOriginalLogos}
            onToggleIconType={onToggleIconType}
            transparencyEnabled={transparencyEnabled}
            onToggleTransparency={onToggleTransparency}
            loadingBarEnabled={loadingBarEnabled}
            onToggleLoadingBar={onToggleLoadingBar}
            commandPaletteEnabled={commandPaletteEnabled} // Pass new prop
            onToggleCommandPalette={onToggleCommandPalette} // Pass new prop
            addressBarEnabled={addressBarEnabled}
            onToggleAddressBar={onToggleAddressBar}
            squarePinnedTabs={squarePinnedTabs}
            onToggleSquarePinnedTabs={onToggleSquarePinnedTabs}
          />
        )
      case 'browser-settings':
        return <BrowserSettings isActive={true} />
      case 'browser':
        return (
          <BrowserControlsSettings
            showBackButton={showBackButton}
            showForwardButton={showForwardButton}
            showRefreshButton={showRefreshButton}
            sidebarPosition={sidebarPosition}
            onToggleBackButton={onToggleBackButton}
            onToggleForwardButton={onToggleForwardButton}
            onToggleRefreshButton={onToggleRefreshButton}
            onToggleSidebarPosition={onToggleSidebarPosition}
            sidebarMode={sidebarMode}
            onChangeSidebarMode={onChangeSidebarMode}
          />
        )
      case 'shortcuts':
        return <ShortcutsSettings />
      case 'passwords':
        return <PasswordsPage />
      case 'privacy':
        return <PrivacySettings adBlockerMode={adBlockerMode} onAdBlockerChange={onAdBlockerChange} />
      case 'data':
        return <DataManagementSettings />
      case 'history':
        return <HistoryView onNavigate={onNavigate} className="h-full" />
      case 'downloads':
        return <DownloadsSettings />
      case 'about':
        return <ApplicationInfoSettings />
      default:
        return (
          <NotificationSettings
            globalNotificationsEnabled={globalNotificationsEnabled}
            onToggleGlobalNotifications={onToggleGlobalNotifications}
          />
        )
    }
  }

  return (
    <>
      <style>{`
        .settings-content-area {
          background: linear-gradient(160deg, #0c0c0c 0%, #0a0a0a 100%);
          font-family: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
        }
        .settings-content-topbar {
          border-bottom: 1px solid #1a1a1a;
          background: rgba(10,10,10,0.95);
        }
        .settings-breadcrumb-sep {
          color: #2a2a2a;
          font-size: 12px;
        }
        .settings-path-label {
          font-size: 10px;
          letter-spacing: 0.12em;
          color: #3a3a3a;
        }
        .settings-path-current {
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #888;
        }
        .settings-indicator-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #3a3a3a;
        }
        .settings-indicator-dot.active {
          background: #e5e5e5;
          box-shadow: 0 0 6px #e5e5e5aa;
        }
        .settings-content-scroll {
          scrollbar-width: thin;
          scrollbar-color: #1f1f1f transparent;
        }
        .settings-content-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .settings-content-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .settings-content-scroll::-webkit-scrollbar-thumb {
          background: #1f1f1f;
          border-radius: 2px;
        }
        .settings-content-scroll::-webkit-scrollbar-thumb:hover {
          background: #2f2f2f;
        }
        .settings-section-badge {
          font-size: 9px;
          letter-spacing: 0.1em;
          padding: 2px 7px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #555;
          border-radius: 2px;
        }
      `}</style>
      <div className="settings-content-area flex-1 flex flex-col overflow-hidden">
        {/* Top bar breadcrumb */}
        {activeSection !== 'history' && (
          <div className="settings-content-topbar flex items-center gap-3 px-6 py-3 flex-shrink-0">
            <div className={`settings-indicator-dot ${activeSection ? 'active' : ''}`} />
            <span className="settings-path-label">config</span>
            <span className="settings-breadcrumb-sep">/</span>
            <span className="settings-path-current">{currentSection?.label ?? activeSection}</span>
            {currentSection?.tag && (
              <span className="settings-section-badge ml-auto">{currentSection.tag}</span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeSection === 'history' ? (
            <HistoryView onNavigate={onNavigate} className="h-full" />
          ) : (
            <div className="settings-content-scroll h-full overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-6">
                <div className="space-y-4">{renderSection()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

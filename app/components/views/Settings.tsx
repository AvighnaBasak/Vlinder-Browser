import { useState, useEffect } from 'react'
import SettingsSidebar from './settings/SettingsSidebar'
import SettingsContent from './settings/SettingsContent'

interface SettingsProps {
  isActive: boolean
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

export default function Settings({
  isActive,
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
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState('notifications')

  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent).detail
      if (section) setActiveSection(section)
    }
    window.addEventListener('navigate-settings-section', handler)
    return () => window.removeEventListener('navigate-settings-section', handler)
  }, [])

  if (!isActive) return null

  return (
    <div
      className="absolute inset-0 flex animate-fade-in overflow-hidden"
      style={{
        background: 'var(--theme-surface, #080808)',
        fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace",
      }}
    >
      <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <SettingsContent
        activeSection={activeSection}
        useOriginalLogos={useOriginalLogos}
        onToggleIconType={onToggleIconType}
        transparencyEnabled={transparencyEnabled}
        onToggleTransparency={onToggleTransparency}
        loadingBarEnabled={loadingBarEnabled}
        onToggleLoadingBar={onToggleLoadingBar}
        commandPaletteEnabled={commandPaletteEnabled} // Pass new prop
        onToggleCommandPalette={onToggleCommandPalette} // Pass new prop
        globalNotificationsEnabled={globalNotificationsEnabled}
        onToggleGlobalNotifications={onToggleGlobalNotifications}
        showBackButton={showBackButton}
        showForwardButton={showForwardButton}
        showRefreshButton={showRefreshButton}
        onToggleBackButton={onToggleBackButton}
        onToggleForwardButton={onToggleForwardButton}
        onToggleRefreshButton={onToggleRefreshButton}
        sidebarPosition={sidebarPosition}
        onToggleSidebarPosition={onToggleSidebarPosition}
        sidebarMode={sidebarMode}
        onChangeSidebarMode={onChangeSidebarMode}
        adBlockerMode={adBlockerMode}
        onAdBlockerChange={onAdBlockerChange}
        addressBarEnabled={addressBarEnabled}
        onToggleAddressBar={onToggleAddressBar}
        squarePinnedTabs={squarePinnedTabs}
        onToggleSquarePinnedTabs={onToggleSquarePinnedTabs}
        onNavigate={onNavigate}
      />
    </div>
  )
}

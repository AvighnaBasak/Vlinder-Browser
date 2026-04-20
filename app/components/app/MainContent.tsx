import WebviewContainer, { type WebviewContainerRef } from '@/app/components/views/WebviewContainer'
import InitialPage from '@/app/components/views/InitialPage'
import Settings from '@/app/components/views/Settings'
import Downloads from '@/app/components/views/Downloads'
import { AddressBar } from '@/app/components/ui/address-bar'
import { type Tab as Platform } from '@/app/types/tab'
import { useMemo, memo } from 'react'

interface MainContentProps {
  transparencyEnabled: boolean
  tabs: Platform[]
  activePlatform: string
  webviewRefs: React.MutableRefObject<Record<string, WebviewContainerRef>>
  mutedPlatforms: Record<string, boolean>
  pinnedPlatforms: Record<string, boolean>
  reloadTrigger: Record<string, number>
  onNotification: (platformId: string) => Promise<void> | void
  useOriginalLogos: boolean
  onToggleIconType: (useOriginal: boolean) => void
  onToggleTransparency: (enabled: boolean) => void
  loadingBarEnabled: boolean
  onToggleLoadingBar: (enabled: boolean) => void
  commandPaletteEnabled: boolean
  onToggleCommandPalette: (enabled: boolean) => void
  globalNotificationsEnabled: boolean
  onToggleGlobalNotifications: (enabled: boolean) => Promise<void> | void
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
  onAdBlockerChange: (mode: string) => Promise<void> | void
  addressBarEnabled: boolean
  onToggleAddressBar: (enabled: boolean) => void
  squarePinnedTabs: boolean
  onToggleSquarePinnedTabs: (enabled: boolean) => void
  currentUrl: string | null
  onAddressBarNavigate: (url: string) => Promise<void> | void
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  updateTab?: (tabId: string, updater: Partial<Platform> | ((tab: Platform) => Partial<Platform>)) => void
}

function MainContentComponent({
  transparencyEnabled,
  tabs,
  activePlatform,
  webviewRefs,
  mutedPlatforms,
  pinnedPlatforms,
  reloadTrigger,
  onNotification,
  useOriginalLogos,
  onToggleIconType,
  onToggleTransparency,
  loadingBarEnabled,
  onToggleLoadingBar,
  commandPaletteEnabled,
  onToggleCommandPalette,
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
  currentUrl,
  onAddressBarNavigate,
  onGoBack,
  onGoForward,
  canGoBack,
  canGoForward,
  updateTab,
}: MainContentProps) {
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activePlatform), [tabs, activePlatform])
  const isActiveNewTab = activeTab?.url === 'about:blank'
  const webviewTabs = useMemo(() => tabs.filter((tab) => tab.url && tab.url !== 'about:blank'), [tabs])

  return (
    <div
      className="relative h-full"
      style={{
        color: 'var(--foreground, #afc3e2)',
        background: 'var(--background, #1a1a1a)',
      }}
    >
      {webviewTabs.map((platform) => (
        <WebviewContainer
          key={platform.id}
          ref={(ref) => {
            if (ref) {
              webviewRefs.current[platform.id] = ref
            } else {
              delete webviewRefs.current[platform.id]
            }
          }}
          platform={platform}
          isActive={activePlatform === platform.id}
          isMuted={mutedPlatforms[platform.id] ?? false}
          isPinned={pinnedPlatforms[platform.id] ?? false}
          reloadTrigger={reloadTrigger[platform.id] || 0}
          onNotification={() => onNotification(platform.id)}
          transparencyEnabled={transparencyEnabled}
          loadingBarEnabled={loadingBarEnabled}
          onTabUpdate={updateTab ? (updates) => updateTab(platform.id, updates) : undefined}
        />
      ))}

      <InitialPage isActive={isActiveNewTab} onNavigate={onAddressBarNavigate} />

      <Settings
        isActive={activePlatform === 'settings'}
        useOriginalLogos={useOriginalLogos}
        onToggleIconType={onToggleIconType}
        transparencyEnabled={transparencyEnabled}
        onToggleTransparency={onToggleTransparency}
        loadingBarEnabled={loadingBarEnabled}
        onToggleLoadingBar={onToggleLoadingBar}
        commandPaletteEnabled={commandPaletteEnabled}
        onToggleCommandPalette={onToggleCommandPalette}
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
        onNavigate={onAddressBarNavigate}
      />

      {/* Store removed */}

      <Downloads isActive={activePlatform === 'downloads'} />

      {/* Only show address bar on webview pages, not on settings/downloads/new tab */}
      {addressBarEnabled &&
      activePlatform !== 'settings' &&
      activePlatform !== 'downloads' &&
      !isActiveNewTab &&
      !!activeTab ? (
        <AddressBar
          currentUrl={currentUrl}
          onNavigate={onAddressBarNavigate}
          enabled={addressBarEnabled}
          sidebarPosition={sidebarPosition}
          onGoBack={onGoBack}
          onGoForward={onGoForward}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />
      ) : null}
    </div>
  )
}

export default memo(MainContentComponent)

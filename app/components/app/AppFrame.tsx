import { AppLayout } from '@/app/components/layout/AppLayout'
import SidebarPane from '@/app/components/app/SidebarPane'
import MainContent from '@/app/components/app/MainContent'
import { type Tab as Platform, type TabGroup } from '@/app/types/tab'
import { type WebviewContainerRef } from '@/app/components/views/WebviewContainer'
// TabsBar removed; tabs are now in the sidebar

interface AppFrameProps {
  sidebarPosition: 'left' | 'right'
  activePlatform: string
  enabledPlatforms: Record<string, boolean>
  onPlatformChange: (platformId: string) => Promise<void> | void
  useOriginalLogos: boolean
  pinnedPlatforms: Record<string, boolean>
  mutedPlatforms: Record<string, boolean>
  notificationsEnabled: Record<string, boolean>
  notificationCounts: Record<string, number>
  globalNotificationsEnabled: boolean
  onTogglePinned: (platformId: string, pinned: boolean) => Promise<void>
  onToggleMuted: (platformId: string, muted: boolean) => Promise<void>
  onToggleNotifications: (platformId: string, enabled: boolean) => Promise<void>
  onUninstallPlatform: (platformId: string) => Promise<void>
  onReloadPlatform: (platformId: string) => void
  showBackButton: boolean
  showForwardButton: boolean
  showRefreshButton: boolean
  temporaryApps: Platform[]
  onCloseTemporaryApp: (id: string) => void
  onConvertToPermanent: (id: string) => Promise<void>
  onCloseAllTemporaryApps: () => void
  dynamicTitles: Record<string, string>
  customPlatforms: Platform[]
  platformOrder: string[]
  onReorderPlatforms: (order: string[]) => Promise<void>
  transparencyEnabled: boolean
  webviewRefs: React.MutableRefObject<Record<string, WebviewContainerRef>>
  reloadTrigger: Record<string, number>
  onNotification: (platformId: string) => Promise<void> | void
  onToggleIconType: (useOriginal: boolean) => void
  onToggleTransparency: (enabled: boolean) => void
  loadingBarEnabled: boolean
  onToggleLoadingBar: (enabled: boolean) => void
  commandPaletteEnabled: boolean
  onToggleCommandPalette: (enabled: boolean) => void
  onToggleGlobalNotifications: (enabled: boolean) => Promise<void>
  onToggleBackButton: (enabled: boolean) => void
  onToggleForwardButton: (enabled: boolean) => void
  onToggleRefreshButton: (enabled: boolean) => void
  adBlockerMode: string
  onAdBlockerChange: (mode: string) => Promise<void> | void
  onToggleSidebarPosition: (position: 'left' | 'right') => void
  sidebarMode: 'expanded' | 'compact' | 'hidden'
  onChangeSidebarMode: (mode: 'expanded' | 'compact' | 'hidden') => void
  onTogglePlatform: (platformId: string, enabled: boolean) => Promise<void> | void
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
  // tabs
  tabs: Platform[]
  onSelectTab: (id: string) => void
  onNewTab: () => void
  onCloseTab: (id: string) => void
  onReopenClosedTab?: () => void
  onDuplicateTab?: (id: string) => void
  onCopyTabLink?: (id: string) => Promise<void> | void
  onCloseOtherTabs?: (id: string) => void
  onCloseTabsToRight?: (id: string) => void
  updateTab?: (tabId: string, updater: Partial<Platform> | ((tab: Platform) => Partial<Platform>)) => void
  // split screen
  splitTabId: string | null
  onOpenSplitScreen: (tabId: string) => void
  onCloseSplitScreen: () => void
  // tab groups
  tabGroups: TabGroup[]
  onCreateTabGroup: (tabIds: string[], name?: string) => void
  onRenameTabGroup: (groupId: string, name: string) => void
  onSetGroupColor: (groupId: string, color: string) => void
  onToggleGroupCollapsed: (groupId: string) => void
  onAddToGroup: (groupId: string, tabId: string) => void
  onRemoveFromGroup: (tabId: string) => void
  onUnlinkGroup: (groupId: string) => void
  onCloseGroup: (groupId: string) => void
  isIncognito: boolean
}

export default function AppFrame(props: AppFrameProps) {
  const {
    tabs,
    onSelectTab,
    onNewTab,
    onCloseTab,
    onReopenClosedTab,
    onDuplicateTab,
    onCopyTabLink,
    onCloseOtherTabs,
    onCloseTabsToRight,
    activePlatform,
    enabledPlatforms,
    onPlatformChange,
    useOriginalLogos,
    pinnedPlatforms,
    mutedPlatforms,
    notificationsEnabled,
    notificationCounts,
    globalNotificationsEnabled,
    onTogglePinned,
    onToggleMuted,
    onToggleNotifications,
    onUninstallPlatform,
    onReloadPlatform,
    showBackButton,
    showForwardButton,
    showRefreshButton,
    temporaryApps,
    onCloseTemporaryApp,
    onConvertToPermanent,
    onCloseAllTemporaryApps,
    dynamicTitles,
    customPlatforms,
    platformOrder,
    onReorderPlatforms,
    transparencyEnabled,
    webviewRefs,
    reloadTrigger,
    onNotification,
    onToggleIconType,
    onToggleTransparency,
    loadingBarEnabled,
    onToggleLoadingBar,
    commandPaletteEnabled,
    onToggleCommandPalette,
    onToggleGlobalNotifications,
    onToggleBackButton,
    onToggleForwardButton,
    onToggleRefreshButton,
    sidebarPosition: sidebarPos,
    sidebarMode,
    onChangeSidebarMode,
    adBlockerMode,
    onAdBlockerChange,
    onToggleSidebarPosition,
    onTogglePlatform,
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
    splitTabId,
    onOpenSplitScreen,
    onCloseSplitScreen,
    tabGroups,
    onCreateTabGroup,
    onRenameTabGroup,
    onSetGroupColor,
    onToggleGroupCollapsed,
    onAddToGroup,
    onRemoveFromGroup,
    onUnlinkGroup,
    onCloseGroup,
    isIncognito,
  } = props

  return (
    <div className="h-full text-foreground text-gray-300" style={{ backgroundColor: 'var(--theme-chrome, #1a1a1a)' }}>
      <div
        className={`flex z-10 overflow-hidden h-full gap-0 ${sidebarPos === 'right' ? 'flex-row-reverse' : ''}`}
      >
        <SidebarPane
          activePlatform={activePlatform}
          tabs={tabs}
          onSelectTab={onSelectTab}
          onNewTab={onNewTab}
          onCloseTab={onCloseTab}
          onDuplicateTab={onDuplicateTab}
          onCopyTabLink={onCopyTabLink}
          onCloseOtherTabs={onCloseOtherTabs}
          onCloseTabsToRight={onCloseTabsToRight}
          enabledPlatforms={enabledPlatforms}
          onPlatformChange={onPlatformChange}
          useOriginalLogos={useOriginalLogos}
          pinnedPlatforms={pinnedPlatforms}
          mutedPlatforms={mutedPlatforms}
          notificationsEnabled={notificationsEnabled}
          notificationCounts={notificationCounts}
          globalNotificationsEnabled={globalNotificationsEnabled}
          onTogglePinned={onTogglePinned}
          onToggleMuted={onToggleMuted}
          onToggleNotifications={onToggleNotifications}
          onUninstallPlatform={onUninstallPlatform}
          onReloadPlatform={onReloadPlatform}
          showBackButton={showBackButton}
          showForwardButton={showForwardButton}
          showRefreshButton={showRefreshButton}
          temporaryApps={temporaryApps}
          onCloseTemporaryApp={onCloseTemporaryApp}
          onConvertToPermanent={onConvertToPermanent}
          onCloseAllTemporaryApps={onCloseAllTemporaryApps}
          dynamicTitles={dynamicTitles}
          customPlatforms={customPlatforms}
          platformOrder={platformOrder}
          onReorderPlatforms={onReorderPlatforms}
          sidebarPosition={sidebarPos}
          squarePinnedTabs={squarePinnedTabs}
          webviewRefs={webviewRefs}
          splitTabId={splitTabId}
          onOpenSplitScreen={onOpenSplitScreen}
          tabGroups={tabGroups}
          onCreateTabGroup={onCreateTabGroup}
          onRenameTabGroup={onRenameTabGroup}
          onSetGroupColor={onSetGroupColor}
          onToggleGroupCollapsed={onToggleGroupCollapsed}
          onAddToGroup={onAddToGroup}
          onRemoveFromGroup={onRemoveFromGroup}
          onUnlinkGroup={onUnlinkGroup}
          onCloseGroup={onCloseGroup}
          isIncognito={isIncognito}
        />

        <AppLayout>
          <MainContent
            transparencyEnabled={transparencyEnabled}
            tabs={tabs}
            activePlatform={activePlatform}
            webviewRefs={webviewRefs}
            mutedPlatforms={mutedPlatforms}
            pinnedPlatforms={pinnedPlatforms}
            reloadTrigger={reloadTrigger}
            onNotification={onNotification}
            useOriginalLogos={useOriginalLogos}
            onToggleIconType={onToggleIconType}
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
            sidebarPosition={sidebarPos}
            onToggleSidebarPosition={onToggleSidebarPosition}
            sidebarMode={sidebarMode}
            onChangeSidebarMode={onChangeSidebarMode}
            adBlockerMode={adBlockerMode}
            onAdBlockerChange={onAdBlockerChange}
            addressBarEnabled={addressBarEnabled}
            onToggleAddressBar={onToggleAddressBar}
            squarePinnedTabs={squarePinnedTabs}
            onToggleSquarePinnedTabs={onToggleSquarePinnedTabs}
            currentUrl={currentUrl}
            onAddressBarNavigate={onAddressBarNavigate}
            onGoBack={onGoBack}
            onGoForward={onGoForward}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            updateTab={updateTab}
            splitTabId={splitTabId}
            onCloseSplitScreen={onCloseSplitScreen}
          />
        </AppLayout>
      </div>
    </div>
  )
}

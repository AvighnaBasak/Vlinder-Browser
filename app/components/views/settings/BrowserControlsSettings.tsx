import { ArrowLeft, ArrowRight, RotateCw, PanelLeft, PanelRight, Maximize2, Minimize2, EyeOff, Navigation } from 'lucide-react'
import { settingsStyles, SToggle } from './settings-design-system'

type SidebarMode = 'expanded' | 'compact' | 'hidden'

interface BrowserControlsSettingsProps {
  showBackButton: boolean
  showForwardButton: boolean
  showRefreshButton: boolean
  sidebarPosition: 'left' | 'right'
  sidebarMode: SidebarMode
  onToggleBackButton: (enabled: boolean) => void
  onToggleForwardButton: (enabled: boolean) => void
  onToggleRefreshButton: (enabled: boolean) => void
  onToggleSidebarPosition: (position: 'left' | 'right') => void
  onChangeSidebarMode: (mode: SidebarMode) => void
}

export default function BrowserControlsSettings({
  showBackButton,
  showForwardButton,
  showRefreshButton,
  sidebarPosition,
  sidebarMode,
  onToggleBackButton,
  onToggleForwardButton,
  onToggleRefreshButton,
  onToggleSidebarPosition,
  onChangeSidebarMode,
}: BrowserControlsSettingsProps) {
  const modeOptions: { id: SidebarMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'expanded', label: 'Expanded', Icon: Maximize2 },
    { id: 'compact', label: 'Compact', Icon: Minimize2 },
    { id: 'hidden', label: 'Hidden', Icon: EyeOff },
  ]

  return (
    <>
      <style>{settingsStyles}</style>

      {/* Nav Buttons */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Navigation className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Navigation Controls</div>
            <div className="s-panel-desc">Toggle the visibility of navigation buttons</div>
          </div>
        </div>
        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <ArrowLeft className="w-3.5 h-3.5" style={{ color: showBackButton ? '#666' : '#2f2f2f' }} />
              <div>
                <div className="s-row-label">Back Button</div>
                <div className={`s-row-desc ${showBackButton ? 'active' : ''}`}>
                  {showBackButton ? 'Visible in sidebar' : 'Hidden'}
                </div>
              </div>
            </div>
            <SToggle checked={showBackButton} onCheckedChange={onToggleBackButton} />
          </div>
          <div className="s-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: showForwardButton ? '#666' : '#2f2f2f' }} />
              <div>
                <div className="s-row-label">Forward Button</div>
                <div className={`s-row-desc ${showForwardButton ? 'active' : ''}`}>
                  {showForwardButton ? 'Visible in sidebar' : 'Hidden'}
                </div>
              </div>
            </div>
            <SToggle checked={showForwardButton} onCheckedChange={onToggleForwardButton} />
          </div>
          <div className="s-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <RotateCw className="w-3.5 h-3.5" style={{ color: showRefreshButton ? '#666' : '#2f2f2f' }} />
              <div>
                <div className="s-row-label">Refresh Button</div>
                <div className={`s-row-desc ${showRefreshButton ? 'active' : ''}`}>
                  {showRefreshButton ? 'Visible in sidebar' : 'Hidden'}
                </div>
              </div>
            </div>
            <SToggle checked={showRefreshButton} onCheckedChange={onToggleRefreshButton} />
          </div>
        </div>
      </div>

      {/* Sidebar Position */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            {sidebarPosition === 'left' ? (
              <PanelLeft className="w-3.5 h-3.5" style={{ color: '#888' }} />
            ) : (
              <PanelRight className="w-3.5 h-3.5" style={{ color: '#888' }} />
            )}
          </div>
          <div>
            <div className="s-panel-title">Sidebar Position</div>
            <div className="s-panel-desc">Choose which side the sidebar appears on</div>
          </div>
        </div>
        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ flex: 1 }}>
              <div className="s-row-label">Position</div>
              <div className={`s-row-desc active`}>
                {sidebarPosition === 'left' ? 'Sidebar is on the left' : 'Sidebar is on the right'}
              </div>
            </div>
            <div className="s-seg-group">
              <button
                className={`s-seg-btn ${sidebarPosition === 'left' ? 'active' : ''}`}
                onClick={() => onToggleSidebarPosition('left')}
              >
                <PanelLeft className="w-3 h-3" />
                Left
              </button>
              <button
                className={`s-seg-btn ${sidebarPosition === 'right' ? 'active' : ''}`}
                onClick={() => onToggleSidebarPosition('right')}
              >
                <PanelRight className="w-3 h-3" />
                Right
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Mode */}
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            {sidebarMode === 'expanded' ? (
              <Maximize2 className="w-3.5 h-3.5" style={{ color: '#888' }} />
            ) : sidebarMode === 'compact' ? (
              <Minimize2 className="w-3.5 h-3.5" style={{ color: '#888' }} />
            ) : (
              <EyeOff className="w-3.5 h-3.5" style={{ color: '#888' }} />
            )}
          </div>
          <div>
            <div className="s-panel-title">Sidebar Mode</div>
            <div className="s-panel-desc">Control how the sidebar is displayed</div>
          </div>
        </div>
        <div className="s-panel-body">
          <div className="s-row">
            <div style={{ flex: 1 }}>
              <div className="s-row-label">Display Mode</div>
              <div className={`s-row-desc active`}>
                {sidebarMode === 'expanded'
                  ? 'Fully expanded sidebar'
                  : sidebarMode === 'compact'
                    ? 'Compact icon-only sidebar'
                    : 'Hidden — slides in on hover'}
              </div>
            </div>
            <div className="s-seg-group">
              {modeOptions.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`s-seg-btn ${sidebarMode === id ? 'active' : ''}`}
                  onClick={() => onChangeSidebarMode(id)}
                  title={label}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

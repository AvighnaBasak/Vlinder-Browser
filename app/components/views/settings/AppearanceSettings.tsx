import { Eye, BarChart3, Search, Globe, Square } from 'lucide-react'
import { settingsStyles, SToggle } from './settings-design-system'

interface AppearanceSettingsProps {
  useOriginalLogos: boolean
  onToggleIconType: (useOriginal: boolean) => void
  transparencyEnabled: boolean
  onToggleTransparency: (enabled: boolean) => void
  loadingBarEnabled: boolean
  onToggleLoadingBar: (enabled: boolean) => void
  commandPaletteEnabled: boolean // New prop
  onToggleCommandPalette: (enabled: boolean) => void // New prop
  addressBarEnabled: boolean
  onToggleAddressBar: (enabled: boolean) => void
  squarePinnedTabs: boolean
  onToggleSquarePinnedTabs: (enabled: boolean) => void
}

const rows = [
  {
    key: 'transparency',
    label: 'Transparency Effect',
    descOn: 'Transparent background active',
    descOff: 'Solid background active',
    Icon: Eye,
  },
  {
    key: 'loadingBar',
    label: 'Loading Progress Bar',
    descOn: 'Show loading progress at top',
    descOff: 'Loading progress bar hidden',
    Icon: BarChart3,
  },
  {
    key: 'commandPalette',
    label: 'Command Palette',
    descOn: 'Ctrl+T opens quick search',
    descOff: 'Command palette disabled',
    Icon: Search,
  },
  {
    key: 'addressBar',
    label: 'Address Bar',
    descOn: 'Show URL bar at bottom of page',
    descOff: 'Address bar hidden',
    Icon: Globe,
  },
  {
    key: 'squarePinnedTabs',
    label: 'Square Pinned Tabs',
    descOn: 'Pinned tabs displayed as squares',
    descOff: 'Pinned tabs as list items',
    Icon: Square,
  },
]

export default function AppearanceSettings({
  useOriginalLogos,
  onToggleIconType,
  transparencyEnabled,
  onToggleTransparency,
  loadingBarEnabled,
  onToggleLoadingBar,
  commandPaletteEnabled,
  onToggleCommandPalette,
  addressBarEnabled,
  onToggleAddressBar,
  squarePinnedTabs,
  onToggleSquarePinnedTabs,
}: AppearanceSettingsProps) {
  const values: Record<string, boolean> = {
    transparency: transparencyEnabled,
    loadingBar: loadingBarEnabled,
    commandPalette: commandPaletteEnabled,
    addressBar: addressBarEnabled,
    squarePinnedTabs: squarePinnedTabs,
  }

  const handlers: Record<string, (v: boolean) => void> = {
    transparency: onToggleTransparency,
    loadingBar: onToggleLoadingBar,
    commandPalette: onToggleCommandPalette,
    addressBar: onToggleAddressBar,
    squarePinnedTabs: onToggleSquarePinnedTabs,
  }

  const enabledCount = Object.values(values).filter(Boolean).length

  return (
    <>
      <style>{settingsStyles}</style>
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Eye className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Appearance</div>
            <div className="s-panel-desc">Customize the visual appearance of the browser</div>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: '#555',
              textTransform: 'uppercase',
            }}
          >
            {enabledCount}/{rows.length} ON
          </span>
        </div>

        <div className="s-panel-body">
          {rows.map(({ key, label, descOn, descOff, Icon }) => {
            const isOn = values[key]
            return (
              <div className="s-row" key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isOn ? '#666' : '#2f2f2f' }} />
                  <div>
                    <div className="s-row-label">{label}</div>
                    <div className={`s-row-desc ${isOn ? 'active' : ''}`}>{isOn ? descOn : descOff}</div>
                  </div>
                </div>
                <SToggle checked={isOn} onCheckedChange={handlers[key]} />
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

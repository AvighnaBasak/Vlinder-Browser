import { Palette, Check } from 'lucide-react'
import { themes, type ThemeDefinition } from '@/app/utils/themes'
import { settingsStyles } from './settings-design-system'

interface ThemeCustomizationProps {
  currentTheme: string
  onThemeChange: (themeId: string) => void
}

function ThemeCard({
  theme,
  isActive,
  onClick,
}: {
  theme: ThemeDefinition
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="s-theme-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px',
        borderRadius: '4px',
        border: `1px solid ${isActive ? 'var(--theme-text-dim, #555)' : 'var(--theme-border, #1f1f1f)'}`,
        background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        textAlign: 'left',
        width: '100%',
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'var(--theme-text-bright, #e5e5e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check style={{ width: '10px', height: '10px', color: 'var(--theme-surface, #0e0e0e)' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '4px' }}>
        {theme.palette.map((color, i) => (
          <div
            key={i}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '3px',
              backgroundColor: color,
              border: theme.isTransparent && i === 0
                ? '1px solid rgba(255,255,255,0.15)'
                : '1px solid rgba(255,255,255,0.06)',
              backdropFilter: theme.isTransparent ? 'blur(8px)' : undefined,
            }}
          />
        ))}
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: isActive ? 'var(--theme-text-bright, #e5e5e5)' : 'var(--foreground, #a0a0a0)',
          }}
        >
          {theme.name}
        </div>
        <div
          style={{
            fontSize: '9px',
            letterSpacing: '0.04em',
            color: 'var(--theme-text-dim, #555)',
            marginTop: '2px',
            textTransform: 'uppercase',
          }}
        >
          {theme.isTransparent ? 'Glassmorphism' : theme.id === 'default' ? 'Default' : 'Monochrome'}
        </div>
      </div>
    </button>
  )
}

export default function ThemeCustomization({ currentTheme, onThemeChange }: ThemeCustomizationProps) {
  return (
    <>
      <style>{settingsStyles}</style>
      <div className="s-panel">
        <div className="s-panel-header">
          <div className="s-panel-icon">
            <Palette className="w-3.5 h-3.5" style={{ color: '#888' }} />
          </div>
          <div>
            <div className="s-panel-title">Customization</div>
            <div className="s-panel-desc">Select a color theme for the browser interface</div>
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
            THEME
          </span>
        </div>

        <div className="s-panel-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
            }}
          >
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={currentTheme === theme.id}
                onClick={() => onThemeChange(theme.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

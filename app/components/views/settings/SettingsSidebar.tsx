import {
  Bell,
  Image,
  Database,
  Info,
  Settings as SettingsIcon,
  Navigation,
  Shield,
  Globe,
  Keyboard,
  Lock,
  Clock,
  Download,
} from 'lucide-react'

export interface SettingsSection {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  tag?: string
}

export const settingsSections: SettingsSection[] = [
  { id: 'notifications', label: 'Notifications', icon: Bell, tag: 'SYS' },
  { id: 'appearance', label: 'Appearance', icon: Image, tag: 'UI' },
  { id: 'browser-settings', label: 'Browser', icon: Globe, tag: 'NET' },
  { id: 'browser', label: 'Browser Controls', icon: Navigation, tag: 'CTRL' },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, tag: 'IO' },
  { id: 'passwords', label: 'Passwords', icon: Lock, tag: 'SEC' },
  { id: 'privacy', label: 'Privacy', icon: Shield, tag: 'SEC' },
  { id: 'data', label: 'Data Management', icon: Database, tag: 'DB' },
  { id: 'history', label: 'History', icon: Clock, tag: 'LOG' },
  { id: 'downloads', label: 'Downloads', icon: Download, tag: 'IO' },
  { id: 'about', label: 'About', icon: Info, tag: 'VER' },
]

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (sectionId: string) => void
}

export default function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div
      style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Consolas', monospace" }}
      className="w-56 flex flex-col h-full overflow-hidden select-none"
    >
      {/* Scanline overlay */}
      <style>{`
        .settings-sidebar-inner {
          background: var(--theme-sidebar-bg, linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 100%));
          border-right: 1px solid var(--theme-border, #1f1f1f);
        }
        .settings-nav-item {
          position: relative;
          transition: all 0.15s ease;
        }
        .settings-nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: transparent;
          transition: all 0.15s ease;
        }
        .settings-nav-item.active::before {
          background: #e5e5e5;
        }
        .settings-nav-item:hover::before {
          background: #444;
        }
        .settings-nav-item.active {
          background: rgba(255,255,255,0.07);
        }
        .settings-nav-item:hover:not(.active) {
          background: rgba(255,255,255,0.03);
        }
        .settings-header-rule {
          height: 1px;
          background: linear-gradient(90deg, #2a2a2a 0%, transparent 100%);
        }
        .settings-tag {
          font-size: 9px;
          letter-spacing: 0.08em;
          padding: 1px 5px;
          border-radius: 2px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #555;
          line-height: 1.4;
        }
        .settings-tag.active {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.2);
          color: #999;
        }
        .settings-cursor {
          display: inline-block;
          width: 6px;
          height: 11px;
          background: #e5e5e5;
          animation: blink 1.2s step-end infinite;
          vertical-align: middle;
          margin-left: 2px;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .settings-section-label {
          font-size: 9px;
          letter-spacing: 0.15em;
          color: #2f2f2f;
          padding: 12px 12px 4px;
          text-transform: uppercase;
        }
        .settings-version {
          font-size: 9px;
          color: #2a2a2a;
          letter-spacing: 0.1em;
        }
        .settings-prompt {
          font-size: 10px;
          color: #3a3a3a;
        }
      `}</style>

      <div className="settings-sidebar-inner flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 flex items-center justify-center">
              <SettingsIcon className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <span
              style={{ fontSize: '11px', letterSpacing: '0.15em', color: '#d4d4d4' }}
              className="font-bold uppercase tracking-widest"
            >
              CONFIG
            </span>
            <span className="settings-cursor" />
          </div>
          <div className="settings-prompt mt-0.5">
            <span style={{ color: '#444' }}>~/settings</span>{' '}
            <span style={{ color: '#2a2a2a' }}>$_</span>
          </div>
        </div>

        <div className="settings-header-rule mx-3 mb-1 flex-shrink-0" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
          {settingsSections.map((section, idx) => {
            const Icon = section.icon
            const isActive = activeSection === section.id

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`settings-nav-item ${isActive ? 'active' : ''} w-full flex items-center gap-2.5 px-3 py-2.5 rounded-none text-left group`}
              >
                <Icon
                  className={`w-3.5 h-3.5 flex-shrink-0 transition-colors duration-150 ${
                    isActive ? 'text-gray-200' : 'text-gray-600 group-hover:text-gray-400'
                  }`}
                />
                <span
                  className={`flex-1 min-w-0 truncate transition-colors duration-150 ${
                    isActive ? 'text-gray-100' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                  style={{ fontSize: '11px', letterSpacing: '0.03em' }}
                >
                  {section.label}
                </span>
                {section.tag && (
                  <span className={`settings-tag flex-shrink-0 ${isActive ? 'active' : ''}`}>
                    {section.tag}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="settings-header-rule mx-3 mt-1 mb-0 flex-shrink-0" />
        <div className="px-4 py-3 flex-shrink-0">
          <div className="settings-version">vlinder / v2.0</div>
          <div className="settings-version mt-0.5">ESC to exit</div>
        </div>
      </div>
    </div>
  )
}

// Centralized Theme Management System
// This script is loaded by all browser pages to apply consistent theming

// Complete theme definitions with ALL customizable color variables
const THEME_DEFINITIONS = {
  default: {
    name: 'Midnight',
    description: 'Dark and sleek',
    colors: {
      // Main colors
      '--bg-color': '#111112',
      '--text-color': '#e0e0e0',
      '--text-secondary': '#a0a0a0',

      // Tab colors
      '--tab-color': '#232324',
      '--tab-active-color': '#2c2c2e',
      '--tab-hover-color': '#29292b',

      // Input colors
      '--input-bg': '#18181a',
      '--input-border': '#333335',
      '--input-focus': '#444448',

      // Toolbar colors
      '--toolbar-control-color': '#444448',

      // Sidebar colors
      '--sidebar-bg': '#1a1a1b',

      // AI Panel colors
      '--ai-panel-bg': '#18181a',
      '--ai-panel-border': '#333335',

      // Button colors
      '--button-bg': '#232324',
      '--button-hover': '#2c2c2e',
      '--button-active': '#3a3a3c',

      // Error page colors
      '--error-bg': '#111112',
      '--error-text': '#e0e0e0',
      '--error-icon': '#666668',
    },
  },
  ocean: {
    name: 'Ocean Breeze',
    description: 'Cool and refreshing',
    colors: {
      '--bg-color': '#0a1929',
      '--text-color': '#e3f2fd',
      '--text-secondary': '#90caf9',

      '--tab-color': '#1e3a8a',
      '--tab-active-color': '#3b82f6',
      '--tab-hover-color': '#1d4ed8',

      '--input-bg': '#1e40af',
      '--input-border': '#3b82f6',
      '--input-focus': '#60a5fa',

      '--toolbar-control-color': '#60a5fa',

      '--sidebar-bg': '#0f2d4a',

      '--ai-panel-bg': '#1e40af',
      '--ai-panel-border': '#3b82f6',

      '--button-bg': '#1e3a8a',
      '--button-hover': '#3b82f6',
      '--button-active': '#60a5fa',

      '--error-bg': '#0a1929',
      '--error-text': '#e3f2fd',
      '--error-icon': '#3b82f6',
    },
  },
  forest: {
    name: 'Forest Green',
    description: 'Natural and calming',
    colors: {
      '--bg-color': '#0d1b2a',
      '--text-color': '#f1faee',
      '--text-secondary': '#95d5b2',

      '--tab-color': '#2d5016',
      '--tab-active-color': '#52b788',
      '--tab-hover-color': '#4ade80',

      '--input-bg': '#166534',
      '--input-border': '#52b788',
      '--input-focus': '#6ee7b7',

      '--toolbar-control-color': '#6ee7b7',

      '--sidebar-bg': '#152b3c',

      '--ai-panel-bg': '#166534',
      '--ai-panel-border': '#52b788',

      '--button-bg': '#2d5016',
      '--button-hover': '#52b788',
      '--button-active': '#6ee7b7',

      '--error-bg': '#0d1b2a',
      '--error-text': '#f1faee',
      '--error-icon': '#52b788',
    },
  },
  sunset: {
    name: 'Sunset Glow',
    description: 'Warm and vibrant',
    colors: {
      '--bg-color': '#2d1b69',
      '--text-color': '#fff5f5',
      '--text-secondary': '#fca5a5',

      '--tab-color': '#7c2d12',
      '--tab-active-color': '#f97316',
      '--tab-hover-color': '#fb923c',

      '--input-bg': '#9a3412',
      '--input-border': '#f97316',
      '--input-focus': '#fb923c',

      '--toolbar-control-color': '#fb923c',

      '--sidebar-bg': '#3c2a7a',

      '--ai-panel-bg': '#9a3412',
      '--ai-panel-border': '#f97316',

      '--button-bg': '#7c2d12',
      '--button-hover': '#f97316',
      '--button-active': '#fb923c',

      '--error-bg': '#2d1b69',
      '--error-text': '#fff5f5',
      '--error-icon': '#f97316',
    },
  },
  lavender: {
    name: 'Lavender Dreams',
    description: 'Elegant and mystical',
    colors: {
      '--bg-color': '#1a0b2e',
      '--text-color': '#faf5ff',
      '--text-secondary': '#d8b4fe',

      '--tab-color': '#581c87',
      '--tab-active-color': '#a855f7',
      '--tab-hover-color': '#c084fc',

      '--input-bg': '#6b21a8',
      '--input-border': '#a855f7',
      '--input-focus': '#c084fc',

      '--toolbar-control-color': '#c084fc',

      '--sidebar-bg': '#2a1a3e',

      '--ai-panel-bg': '#6b21a8',
      '--ai-panel-border': '#a855f7',

      '--button-bg': '#581c87',
      '--button-hover': '#a855f7',
      '--button-active': '#c084fc',

      '--error-bg': '#1a0b2e',
      '--error-text': '#faf5ff',
      '--error-icon': '#a855f7',
    },
  },
  cherry: {
    name: 'Cherry Blossom',
    description: 'Bold and romantic',
    colors: {
      '--bg-color': '#2d1b1b',
      '--text-color': '#fef2f2',
      '--text-secondary': '#fca5a5',

      '--tab-color': '#7f1d1d',
      '--tab-active-color': '#ef4444',
      '--tab-hover-color': '#f87171',

      '--input-bg': '#991b1b',
      '--input-border': '#ef4444',
      '--input-focus': '#f87171',

      '--toolbar-control-color': '#f87171',

      '--sidebar-bg': '#3d2a2a',

      '--ai-panel-bg': '#991b1b',
      '--ai-panel-border': '#ef4444',

      '--button-bg': '#7f1d1d',
      '--button-hover': '#ef4444',
      '--button-active': '#f87171',

      '--error-bg': '#2d1b1b',
      '--error-text': '#fef2f2',
      '--error-icon': '#ef4444',
    },
  },
}

// Get all unique color variable names across all themes
function getAllColorVariables() {
  const variables = new Set()
  Object.values(THEME_DEFINITIONS).forEach((theme) => {
    Object.keys(theme.colors).forEach((varName) => variables.add(varName))
  })
  return Array.from(variables).sort()
}

// Apply theme to the current page
function applyTheme(themeName, customColors = null) {
  const root = document.documentElement

  let colors
  if (customColors) {
    // Custom theme
    colors = customColors
  } else if (THEME_DEFINITIONS[themeName]) {
    // Preset theme
    colors = THEME_DEFINITIONS[themeName].colors
  } else {
    // Fallback to default
    colors = THEME_DEFINITIONS.default.colors
  }

  // Apply all color variables
  Object.entries(colors).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })

  console.log('[Theme] Applied:', themeName, customColors ? '(custom)' : '(preset)')
}

// Load theme from localStorage or fetch from current-theme.json
async function loadAndApplyTheme() {
  try {
    // Try to load from current-theme.json (persistent across all windows)
    const response = await fetch('./current-theme.json')
    const themeData = await response.json()

    console.log('[Theme] Loaded from current-theme.json:', themeData)

    if (themeData.theme === 'custom' && themeData.themeData) {
      applyTheme('custom', themeData.themeData)
    } else if (themeData.theme) {
      applyTheme(themeData.theme)
    } else {
      applyTheme('default')
    }
  } catch (error) {
    console.log('[Theme] Failed to load from file, using localStorage')
    // Fallback to localStorage
    const savedTheme = localStorage.getItem('browser-theme') || 'default'
    applyTheme(savedTheme)
  }
}

// Save theme to localStorage and notify other windows
function saveTheme(themeName, customColors = null) {
  localStorage.setItem('browser-theme', themeName)

  if (customColors) {
    localStorage.setItem('browser-theme-custom', JSON.stringify(customColors))
  }

  // Notify main process to update current-theme.json
  if (window.electronAPI && window.electronAPI.send) {
    const themeData = {
      theme: themeName,
      themeData:
        customColors || (THEME_DEFINITIONS[themeName] ? THEME_DEFINITIONS[themeName].colors : null),
    }
    window.electronAPI.send('apply-theme', themeData)
  }

  // Broadcast to other windows via localStorage event
  localStorage.setItem('theme-update-trigger', Date.now().toString())
}

// Listen for theme changes from other windows
window.addEventListener('storage', (e) => {
  if (e.key === 'theme-update-trigger') {
    loadAndApplyTheme()
  }
})

// Auto-load theme when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndApplyTheme)
} else {
  loadAndApplyTheme()
}

// Export for use in other scripts
window.ThemeManager = {
  themes: THEME_DEFINITIONS,
  applyTheme,
  loadAndApplyTheme,
  saveTheme,
  getAllColorVariables,
}

console.log('[Theme] Theme loader initialized')

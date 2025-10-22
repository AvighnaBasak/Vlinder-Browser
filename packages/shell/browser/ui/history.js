let __historyCache = []

async function loadHistory() {
  try {
    if (window.electronAPI && typeof window.electronAPI.invoke === 'function') {
      const history = await window.electronAPI.invoke('get-history')
      __historyCache = Array.isArray(history) ? history : []
      renderHistory(__historyCache)
      return
    }
    // Fallback: no preload invoke available
    __historyCache = []
    renderHistory([])
  } catch (error) {
    console.error('Error in loadHistory:', error)
    __historyCache = []
    renderHistory([])
    document.getElementById('empty-state').textContent = 'Could not load history.'
  }
}

function renderHistory(history) {
  const list = document.getElementById('history-list')
  const emptyState = document.getElementById('empty-state')
  list.innerHTML = ''

  const query = document.getElementById('history-search')?.value?.trim().toLowerCase() || ''

  let filtered = Array.isArray(history) ? [...history] : []
  if (query) {
    filtered = filtered.filter(
      (h) =>
        (h.title || '').toLowerCase().includes(query) ||
        (h.url || '').toLowerCase().includes(query),
    )
  }

  if (!filtered.length) {
    emptyState.style.display = 'block'
    list.style.display = 'none'
    return
  }

  emptyState.style.display = 'none'
  list.style.display = 'block'

  filtered.sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at))

  const groups = groupByDate(filtered)
  for (const group of groups) {
    const header = document.createElement('li')
    header.style.listStyle = 'none'
    header.style.padding = '10px 0'
    header.style.color = 'var(--text-color)'
    header.style.fontWeight = 'bold'
    header.textContent = group.label
    list.appendChild(header)

    group.items.forEach((item) => {
      const li = document.createElement('li')
      li.classList.add('history-item')

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.className = 'history-checkbox'
      checkbox.setAttribute('data-id', item.id)

      const favicon = document.createElement('img')
      favicon.style.width = '16px'
      favicon.style.height = '16px'
      favicon.style.marginRight = '8px'
      favicon.style.borderRadius = '2px'
      try {
        const url = new URL(item.url)
        favicon.src = `https://www.google.com/s2/favicons?sz=16&domain=${url.hostname}`
      } catch {
        favicon.src = ''
      }

      const link = document.createElement('a')
      link.href = item.url
      link.setAttribute('data-url', item.url)
      link.textContent = item.title || item.url
      link.addEventListener('click', (e) => {
        e.preventDefault()
        window.electronAPI.send('open-url-in-tab', e.currentTarget.getAttribute('data-url'))
      })

      const time = document.createElement('span')
      time.className = 'history-time'
      time.textContent = getTimeAgo(new Date(item.visited_at))

      li.appendChild(checkbox)
      li.appendChild(favicon)
      li.appendChild(link)
      li.appendChild(time)
      list.appendChild(li)
    })
  }
}

function getTimeAgo(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

function showSection(sectionName) {
  document
    .querySelectorAll('.content-section')
    .forEach((section) => section.classList.remove('active'))
  document.querySelectorAll('.sidebar-item').forEach((item) => item.classList.remove('active'))
  document.getElementById(`${sectionName}-section`)?.classList.add('active')
  document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active')
}

function clearHistory() {
  const duration = document.getElementById('history-clear-select').value
  if (window.electronAPI) {
    window.electronAPI.invoke('clear-history-invoke', duration).then((list) => {
      const data = Array.isArray(list) ? list : []
      window.electronAPI.send('update-history-file', JSON.stringify(data))
      renderHistory(data)
    })
  }
}

function deleteSelectedHistory() {
  const checkboxes = document.querySelectorAll('.history-checkbox:checked')
  const ids = Array.from(checkboxes).map((cb) => Number(cb.dataset.id))
  if (ids.length > 0) {
    if (window.electronAPI) {
      window.electronAPI.invoke('delete-history-entries-invoke', ids).then((list) => {
        const data = Array.isArray(list) ? list : []
        window.electronAPI.send('update-history-file', JSON.stringify(data))
        renderHistory(data)
      })
    }
  } else {
    alert('Please select entries to delete first.')
  }
}

function selectTheme(themeName) {
  document.querySelectorAll('.theme-card').forEach((card) => card.classList.remove('active'))
  document.querySelector(`[data-theme="${themeName}"]`)?.classList.add('active')

  // Use ThemeManager from theme-loader.js
  if (window.ThemeManager) {
    window.ThemeManager.applyTheme(themeName)
    window.ThemeManager.saveTheme(themeName)
  }
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem('browser-theme') || 'default'
  document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active')
}

// Advanced Theme Customization
function initializeAdvancedTheme() {
  const toggleBtn = document.getElementById('toggle-advanced')
  const advancedSection = document.getElementById('advanced-theme-section')
  const colorGrid = document.getElementById('color-variables-grid')
  const saveBtn = document.getElementById('save-custom-theme')
  const resetBtn = document.getElementById('reset-to-preset')

  if (!toggleBtn || !advancedSection || !colorGrid) return

  // Toggle advanced section
  toggleBtn.addEventListener('click', () => {
    const isVisible = advancedSection.style.display !== 'none'
    advancedSection.style.display = isVisible ? 'none' : 'block'
    toggleBtn.textContent = isVisible ? 'Advanced Customization' : 'Hide Advanced'

    if (!isVisible) {
      populateColorVariables()
    }
  })

  // Populate color variable inputs
  function populateColorVariables() {
    if (!window.ThemeManager) return

    colorGrid.innerHTML = ''
    const variables = window.ThemeManager.getAllColorVariables()
    const currentTheme = localStorage.getItem('browser-theme') || 'default'
    const themeColors = window.ThemeManager.themes[currentTheme]?.colors || {}

    variables.forEach((varName) => {
      const currentValue =
        getComputedStyle(document.documentElement).getPropertyValue(varName).trim() ||
        themeColors[varName] ||
        '#000000'

      const container = document.createElement('div')
      container.style.cssText = 'display: flex; flex-direction: column; gap: 6px;'

      const label = document.createElement('label')
      label.textContent = varName
      label.style.cssText = 'font-size: 13px; color: var(--text-color); font-weight: 500;'

      const inputWrapper = document.createElement('div')
      inputWrapper.style.cssText = 'display: flex; gap: 8px; align-items: center;'

      const colorInput = document.createElement('input')
      colorInput.type = 'color'
      colorInput.value = currentValue.startsWith('#') ? currentValue : '#000000'
      colorInput.style.cssText =
        'width: 50px; height: 36px; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;'
      colorInput.dataset.varName = varName

      const textInput = document.createElement('input')
      textInput.type = 'text'
      textInput.value = currentValue
      textInput.style.cssText =
        'flex: 1; padding: 8px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text-color); font-size: 13px; font-family: monospace;'
      textInput.dataset.varName = varName

      // Sync inputs
      colorInput.addEventListener('input', (e) => {
        textInput.value = e.target.value
        document.documentElement.style.setProperty(varName, e.target.value)
      })

      textInput.addEventListener('input', (e) => {
        const value = e.target.value
        if (value.startsWith('#') && (value.length === 4 || value.length === 7)) {
          colorInput.value = value
        }
        document.documentElement.style.setProperty(varName, value)
      })

      inputWrapper.appendChild(colorInput)
      inputWrapper.appendChild(textInput)
      container.appendChild(label)
      container.appendChild(inputWrapper)
      colorGrid.appendChild(container)
    })
  }

  // Save custom theme
  saveBtn?.addEventListener('click', () => {
    const customColors = {}
    const inputs = colorGrid.querySelectorAll('input[type="text"]')
    inputs.forEach((input) => {
      customColors[input.dataset.varName] = input.value
    })

    if (window.ThemeManager) {
      window.ThemeManager.applyTheme('custom', customColors)
      window.ThemeManager.saveTheme('custom', customColors)
    }

    document.querySelectorAll('.theme-card').forEach((card) => card.classList.remove('active'))
    alert('Custom theme saved! This theme will apply to the entire browser.')
  })

  // Reset to current preset
  resetBtn?.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('browser-theme') || 'default'
    if (currentTheme !== 'custom' && window.ThemeManager) {
      window.ThemeManager.applyTheme(currentTheme)
      populateColorVariables()
    }
  })
}

// Background Management
const BACKGROUND_IMAGES = [
  '01.png',
  '016.png',
  '017.png',
  '023.png',
  '027.png',
  '028.png',
  '030.png',
  '033.png',
  '039.png',
  '04.png',
  '05.png',
  '068.png',
  '069.png',
  '07.png',
  '075.png',
  '076.png',
  '078.png',
  '079.png',
  '080.png',
  '081.webp',
  '089.png',
  '09.png',
  '091.png',
  'image 28.png',
  'image 29.png',
  'image 30.png',
  'image 31.png',
  'image 32.png',
  'image 33.png',
  'image 34.png',
  'image 35.png',
  'image 36.png',
  'image 37.png',
  'image 38.png',
  'image 39.png',
  'image 40.png',
  'image 41.png',
  'image 42.png',
  'image 43.png',
  'image 44.png',
  'image 45.png',
  'image 46.png',
  'image 47.png',
  'image 48.png',
  'image 49.png',
  'image 50.png',
  'image 51.png',
]

function loadBackgroundImages() {
  const stillsGrid = document.getElementById('stills-grid')
  if (!stillsGrid) return

  stillsGrid.innerHTML = ''

  // Create cards with lazy-loaded thumbnail previews
  BACKGROUND_IMAGES.forEach((filename, index) => {
    const card = document.createElement('div')
    card.className = 'background-card'
    card.dataset.type = 'still'
    card.dataset.value = filename

    const preview = document.createElement('div')
    preview.className = 'background-preview'
    preview.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    `

    // Create actual image with lazy loading
    const img = document.createElement('img')
    img.src = `./backgrounds/${filename}`
    img.loading = 'lazy'
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.3s ease;
    `

    // Show image once loaded
    img.onload = () => {
      img.style.opacity = '1'
    }

    // Remove card if image fails to load (file deleted)
    img.onerror = () => {
      card.remove()
    }

    preview.appendChild(img)
    card.appendChild(preview)
    stillsGrid.appendChild(card)

    card.addEventListener('click', () => {
      selectBackground('still', filename)
    })
  })

  // Add upload box
  const uploadCard = document.createElement('div')
  uploadCard.className = 'background-card'
  uploadCard.id = 'upload-background'

  const uploadPreview = document.createElement('div')
  uploadPreview.className = 'background-preview upload-box'
  uploadPreview.innerHTML =
    '<div style="font-size: 48px; font-weight: 300; color: var(--text-color);">+</div>'

  uploadCard.appendChild(uploadPreview)
  stillsGrid.appendChild(uploadCard)

  uploadCard.addEventListener('click', handleCustomUpload)

  // Load saved background to show active state
  loadSavedBackground()
}

function selectBackground(type, value) {
  console.log('[Background] Selecting:', type, value)

  // Remove active class from all background cards
  document.querySelectorAll('.background-card').forEach((card) => card.classList.remove('active'))

  // Add active class to selected card
  const selectedCard = document.querySelector(`[data-type="${type}"][data-value="${value}"]`)
  if (selectedCard) {
    selectedCard.classList.add('active')
  }

  // Use IPC - same pattern as themes!
  const backgroundData = {
    type: type,
    value: value,
    customData: type === 'custom' ? localStorage.getItem('newtab-background-custom') : null,
    updated_at: new Date().toISOString(),
  }

  console.log('[Background] Sending via IPC:', backgroundData)

  if (window.electronAPI && window.electronAPI.send) {
    window.electronAPI.send('apply-background', backgroundData)
  } else {
    console.error('[Background] electronAPI not available!')
  }
}

function handleCustomUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'

  input.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target.result

      // Update upload card to show preview
      const uploadCard = document.getElementById('upload-background')
      if (uploadCard) {
        uploadCard.dataset.type = 'custom'
        uploadCard.dataset.value = 'user-upload'
        uploadCard.classList.add('active')
        const preview = uploadCard.querySelector('.background-preview')
        if (preview) {
          preview.style.backgroundImage = `url('${dataUrl}')`
          preview.textContent = ''
          preview.classList.remove('upload-box')
        }
      }

      // Trigger background change with custom data
      window.__backgroundChange = {
        type: 'custom',
        value: 'user-upload',
        customData: dataUrl,
        timestamp: Date.now(),
      }

      console.log('[Background] Custom image uploaded')
    }

    reader.readAsDataURL(file)
  })

  input.click()
}

async function loadSavedBackground() {
  try {
    const response = await fetch('./background-settings.json')
    const settings = await response.json()

    console.log('[Background] Loaded settings:', settings)

    const { type, value, customData } = settings
    const card = document.querySelector(`[data-type="${type}"][data-value="${value}"]`)
    if (card) {
      card.classList.add('active')
      console.log('[Background] Marked active:', type, value)
    }

    // Load custom image preview if needed
    if (type === 'custom' && customData) {
      const uploadCard = document.getElementById('upload-background')
      if (uploadCard) {
        uploadCard.dataset.type = 'custom'
        uploadCard.dataset.value = 'user-upload'
        uploadCard.classList.add('active')
        const preview = uploadCard.querySelector('.background-preview')
        if (preview) {
          preview.style.backgroundImage = `url('${customData}')`
          preview.textContent = ''
          preview.classList.remove('upload-box')
        }
      }
    }
  } catch (err) {
    console.error('[Background] Failed to load saved background:', err)
  }
}

// Color picker handling
async function initializeColorPicker() {
  const colorPicker = document.getElementById('color-picker')
  const solidCard = document.getElementById('solid-color-card')
  const solidPreview = document.getElementById('solid-color-preview')

  if (!colorPicker || !solidCard || !solidPreview) return

  solidCard.addEventListener('click', () => {
    colorPicker.click()
  })

  colorPicker.addEventListener('input', (e) => {
    const color = e.target.value
    solidPreview.style.background = color
    selectBackground('solid', color)
  })

  // Load saved color from background-settings.json
  try {
    const response = await fetch('./background-settings.json')
    const settings = await response.json()

    if (settings.type === 'solid') {
      solidPreview.style.background = settings.value
      colorPicker.value = settings.value
      solidCard.classList.add('active')
      console.log('[Background] Loaded solid color:', settings.value)
    }
  } catch (err) {
    console.error('[Background] Failed to load color:', err)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadHistory()
  loadSavedTheme()
  initializeAdvancedTheme()
  loadBackgroundImages()
  initializeColorPicker()

  if (window.electronAPI && typeof window.electronAPI.on === 'function') {
    window.electronAPI.on('history-updated', () => {
      loadHistory()
    })
  }

  // Wire controls and sidebar via event listeners (MV3 CSP-safe)
  document.getElementById('btn-clear')?.addEventListener('click', clearHistory)
  document.getElementById('btn-delete')?.addEventListener('click', deleteSelectedHistory)
  document.getElementById('history-search')?.addEventListener('input', () => {
    renderHistory(__historyCache)
  })
  document.querySelectorAll('.sidebar-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.getAttribute('data-section')
      if (section) showSection(section)
    })
  })
  document.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', () => {
      const theme = card.getAttribute('data-theme')
      if (theme) selectTheme(theme)
    })
  })

  // Add click handler for animated background
  document.querySelectorAll('.background-card[data-type="animated"]').forEach((card) => {
    card.addEventListener('click', () => {
      const value = card.getAttribute('data-value')
      selectBackground('animated', value)
      console.log('[Background] Clicked animated:', value)
    })
  })
})

function groupByDate(history) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const map = new Map()
  for (const h of history) {
    const d = new Date(h.visited_at)
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(h)
  }
  const groups = []
  Array.from(map.keys())
    .sort((a, b) => new Date(b) - new Date(a))
    .forEach((key) => {
      const date = new Date(key)
      const label = getGroupLabel(date, today, yesterday)
      groups.push({ label, items: map.get(key) })
    })
  return groups
}

function getGroupLabel(date, today, yesterday) {
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  const formatted = date.toLocaleDateString(undefined, opts)
  if (sameDay(date, today)) return `Today - ${formatted}`
  if (sameDay(date, yesterday)) return `Yesterday - ${formatted}`
  return formatted
}

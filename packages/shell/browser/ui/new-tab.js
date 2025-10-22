;(() => {
  const canvas = document.getElementById('vanta')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  function resize() {
    canvas.width = innerWidth
    canvas.height = innerHeight
  }
  addEventListener('resize', resize)
  resize()
  const dots = Array.from({ length: 80 }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 60 + Math.random() * 140,
    dx: (Math.random() * 2 - 1) * 0.3,
    dy: (Math.random() * 2 - 1) * 0.3,
    c: `rgba(${87 + Math.random() * 40},${87 + Math.random() * 40},${87 + Math.random() * 40},0.08)`,
  }))
  function tick() {
    ctx.fillStyle = '#121212'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    dots.forEach((d) => {
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r)
      g.addColorStop(0, d.c)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fill()
      d.x += d.dx
      d.y += d.dy
      if (d.x < -d.r) d.x = canvas.width + d.r
      if (d.x > canvas.width + d.r) d.x = -d.r
      if (d.y < -d.r) d.y = canvas.height + d.r
      if (d.y > canvas.height + d.r) d.y = -d.r
    })
    requestAnimationFrame(tick)
  }
  tick()

  const form = document.getElementById('search-form')
  const input = document.getElementById('q')
  if (form && input) {
    // Focus the glass search input immediately with small retries
    const focusInput = () => {
      try {
        input.focus({ preventScroll: true })
        input.select()
      } catch {}
    }
    setTimeout(focusInput, 0)
    setTimeout(focusInput, 60)
    requestAnimationFrame(focusInput)
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const raw = (input.value || '').trim()
      if (!raw) return
      const hasProtocol = /^(https?:|file:|mailto:|chrome:|about:)/i.test(raw)
      const looksLikeDomain =
        /^(localhost|\d+\.\d+\.\d+\.\d+|([\w-]+\.)+[a-z]{2,})(:\d+)?(\/|$)/i.test(raw)
      let url
      if (hasProtocol) url = raw
      else if (looksLikeDomain) url = 'http://' + raw
      else url = 'https://www.google.com/search?q=' + encodeURIComponent(raw)
      if (window.electronAPI) {
        window.electronAPI.send('open-url-in-tab', url)
      } else {
        location.href = url
      }
    })
  }
})()

// Quick Links Management
console.log('[QuickLink] Script loaded')

const MAX_QUICK_LINKS = 5

function getQuickLinks() {
  try {
    const links = localStorage.getItem('quick-links')
    return links ? JSON.parse(links) : []
  } catch {
    return []
  }
}

function saveQuickLinks(links) {
  localStorage.setItem('quick-links', JSON.stringify(links))
}

function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
  } catch {
    return './document.png'
  }
}

function openQuickLink(url) {
  console.log('[QuickLink] Opening:', url)
  if (window.electronAPI) {
    window.electronAPI.send('open-url-in-tab', url)
  } else {
    location.href = url
  }
}

function showAddDialog() {
  const overlay = document.getElementById('dialog-overlay')
  const dialog = document.getElementById('add-link-dialog')
  const input = document.getElementById('link-url-input')

  overlay.classList.add('show')
  dialog.classList.add('show')
  input.value = ''
  input.focus()
}

function hideAddDialog() {
  const overlay = document.getElementById('dialog-overlay')
  const dialog = document.getElementById('add-link-dialog')

  overlay.classList.remove('show')
  dialog.classList.remove('show')
}

function addQuickLinkFromDialog() {
  const input = document.getElementById('link-url-input')
  const url = input.value.trim()

  console.log('[QuickLink] Adding URL:', url)

  if (!url) {
    console.log('[QuickLink] Empty URL')
    return
  }

  let fullUrl = url
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = 'http://' + fullUrl
  }

  try {
    new URL(fullUrl)
    const links = getQuickLinks()
    if (links.length >= MAX_QUICK_LINKS) {
      alert(`Maximum ${MAX_QUICK_LINKS} quick links allowed`)
      return
    }
    links.push({ url: fullUrl })
    saveQuickLinks(links)
    console.log('[QuickLink] Saved successfully')
    hideAddDialog()
    renderQuickLinks()
  } catch (err) {
    console.error('[QuickLink] Invalid URL:', err)
    alert('Invalid URL. Please enter a valid website address.')
  }
}

function renderQuickLinks() {
  console.log('[QuickLink] Starting render...')
  const container = document.getElementById('quick-links')
  if (!container) {
    console.error('[QuickLink] Container not found!')
    return
  }

  const links = getQuickLinks()
  console.log('[QuickLink] Links:', links)
  container.innerHTML = ''

  // Render existing links
  links.forEach((link, index) => {
    console.log('[QuickLink] Creating link element for:', link.url)
    const linkEl = document.createElement('div')
    linkEl.className = 'quick-link'
    linkEl.innerHTML = `<img src="${getFaviconUrl(link.url)}" alt="${link.url}" onerror="this.src='./document.png'" />`

    const removeBtn = document.createElement('div')
    removeBtn.className = 'remove-btn'
    // × is now added via CSS ::before, no need for textContent
    linkEl.appendChild(removeBtn)

    linkEl.onclick = (e) => {
      if (e.target.className !== 'remove-btn') {
        openQuickLink(link.url)
      }
    }

    removeBtn.onclick = (e) => {
      e.stopPropagation()
      const updatedLinks = getQuickLinks()
      updatedLinks.splice(index, 1)
      saveQuickLinks(updatedLinks)
      renderQuickLinks()
    }

    container.appendChild(linkEl)
  })

  // Always show add button if less than MAX_QUICK_LINKS
  if (links.length < MAX_QUICK_LINKS) {
    console.log('[QuickLink] Creating add button')
    const addBtn = document.createElement('div')
    addBtn.className = 'quick-link add-link'
    addBtn.textContent = '+'
    addBtn.style.display = 'flex' // Force display
    addBtn.onclick = () => {
      console.log('[QuickLink] Add button clicked!')
      showAddDialog()
    }
    container.appendChild(addBtn)
    console.log('[QuickLink] Add button appended to container')
  }

  console.log('[QuickLink] Render complete. Container has', container.children.length, 'children')
}

// Initialize when DOM is ready
setTimeout(() => {
  console.log('[QuickLink] Initializing...')
  renderQuickLinks()

  // Set up dialog button handlers
  const dialogAdd = document.getElementById('dialog-add')
  const dialogCancel = document.getElementById('dialog-cancel')
  const dialogOverlay = document.getElementById('dialog-overlay')
  const linkInput = document.getElementById('link-url-input')

  if (dialogAdd) {
    dialogAdd.onclick = addQuickLinkFromDialog
  }

  if (dialogCancel) {
    dialogCancel.onclick = hideAddDialog
  }

  if (dialogOverlay) {
    dialogOverlay.onclick = hideAddDialog
  }

  // Allow Enter key to submit
  if (linkInput) {
    linkInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        addQuickLinkFromDialog()
      } else if (e.key === 'Escape') {
        hideAddDialog()
      }
    }
  }

  console.log('[QuickLink] Dialog handlers set up')
}, 100)

// Load and apply saved background (reads from background-settings.json)
window.loadBackground = async function () {
  try {
    console.log('[NewTab] Loading background from background-settings.json')

    const vantaEl = document.getElementById('vanta')
    const customBg = document.getElementById('custom-background')
    const body = document.body

    // Fetch background settings from JSON file (with cache busting!)
    const response = await fetch(`./background-settings.json?t=${Date.now()}`)
    const settings = await response.json()

    console.log('[NewTab] Settings loaded:', settings)

    const { type, value, customData } = settings

    if (type === 'animated' && value === 'vanta-smoke') {
      // Default - vanta is already enabled
      console.log('[NewTab] Applying animated vanta')
      if (vantaEl) vantaEl.style.display = 'block'
      if (customBg) customBg.style.display = 'none'
      body.classList.remove('solid-bg')
    } else if (type === 'still') {
      // Show still image
      console.log('[NewTab] Applying still image:', value)
      if (vantaEl) vantaEl.style.display = 'none'
      if (customBg) {
        customBg.style.display = 'block'
        customBg.style.backgroundImage = `url('./backgrounds/${value}')`
        console.log('[NewTab] ✓ Background set to:', value)
      }
      body.classList.remove('solid-bg')
    } else if (type === 'custom') {
      // Show custom uploaded image
      console.log('[NewTab] Applying custom image')
      if (customData) {
        if (vantaEl) vantaEl.style.display = 'none'
        if (customBg) {
          customBg.style.display = 'block'
          customBg.style.backgroundImage = `url('${customData}')`
          console.log('[NewTab] ✓ Custom background applied')
        }
        body.classList.remove('solid-bg')
      }
    } else if (type === 'solid') {
      // Solid color
      console.log('[NewTab] Applying solid color:', value)
      if (vantaEl) vantaEl.style.display = 'none'
      if (customBg) customBg.style.display = 'none'
      body.style.backgroundColor = value
      body.classList.add('solid-bg')
      console.log('[NewTab] ✓ Solid color applied')
    }
  } catch (err) {
    console.error('[NewTab] Failed to load background:', err)
    // Fallback to default vanta
    const vantaEl = document.getElementById('vanta')
    const customBg = document.getElementById('custom-background')
    if (vantaEl) vantaEl.style.display = 'block'
    if (customBg) customBg.style.display = 'none'
    document.body.classList.remove('solid-bg')
  }
}

// Load background immediately
window.loadBackground()

// Poll for background reload requests (set by main process)
let lastBackgroundReload = 0
setInterval(() => {
  if (window.__reloadBackground && window.__reloadBackground !== lastBackgroundReload) {
    lastBackgroundReload = window.__reloadBackground
    console.log('[NewTab] Background reload triggered by polling')
    window.loadBackground()
  }
}, 100)

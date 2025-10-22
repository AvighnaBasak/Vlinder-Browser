// --- Downloads UI wired to main process (CSP-safe) ---

let downloads = []

function renderDownloads() {
  const list = document.getElementById('downloads-list')
  const emptyState = document.getElementById('empty-state')
  list.innerHTML = ''
  if (!downloads || downloads.length === 0) {
    emptyState.style.display = 'block'
    return
  }
  emptyState.style.display = 'none'
  downloads.forEach((item) => {
    const li = document.createElement('li')
    li.classList.add('downloads-item')
    li.dataset.id = item.id
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    li.appendChild(checkbox)
    const progressBar = document.createElement('div')
    progressBar.className = 'progress-bar'
    const progressInner = document.createElement('div')
    progressInner.className = 'progress'
    progressInner.style.width = `${progressPercent(item)}%`
    progressBar.appendChild(progressInner)
    const filenameSpan = document.createElement('span')
    filenameSpan.className = 'filename'
    filenameSpan.textContent = item.filename || item.url
    const timeSpan = document.createElement('span')
    timeSpan.className = 'downloads-time'
    timeSpan.textContent = getTimeAgo(new Date(item.started_at))
    li.appendChild(filenameSpan)
    li.appendChild(progressBar)
    li.appendChild(timeSpan)

    const makeBtn = (label, id, action) => {
      const b = document.createElement('button')
      b.textContent = label
      b.addEventListener('click', () => action(id))
      return b
    }

    if (item.state === 'downloading') {
      li.appendChild(makeBtn('Pause', item.id, pauseDownload))
      li.appendChild(makeBtn('Cancel', item.id, cancelDownload))
    } else if (item.state === 'paused') {
      li.appendChild(makeBtn('Resume', item.id, resumeDownload))
      li.appendChild(makeBtn('Cancel', item.id, cancelDownload))
    } else if (item.state === 'complete') {
      const span = document.createElement('span')
      span.style.color = '#4dabf7'
      span.textContent = 'Complete'
      li.appendChild(span)
    } else if (item.state === 'cancelled') {
      const span = document.createElement('span')
      span.style.color = '#f87171'
      span.textContent = 'Cancelled'
      li.appendChild(span)
    }
    list.appendChild(li)
  })
}

function getTimeAgo(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function progressPercent(item) {
  if (!item || !item.totalBytes) return 0
  const pct = Math.floor((item.receivedBytes / item.totalBytes) * 100)
  return isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0
}

function pauseDownload(id) {
  window.electronAPI?.send('pause-download', id)
}
function resumeDownload(id) {
  window.electronAPI?.send('resume-download', id)
}
function cancelDownload(id) {
  window.electronAPI?.send('cancel-download', id)
}

async function loadDownloads() {
  try {
    const list = await window.electronAPI?.invoke('get-downloads')
    downloads = Array.isArray(list) ? list : []
    renderDownloads()
  } catch (e) {
    downloads = []
    renderDownloads()
  }
}

function subscribeToUpdates() {
  window.electronAPI?.on?.('download-updated', (payload) => {
    const idx = downloads.findIndex((d) => d.id === payload.id)
    if (idx >= 0) {
      downloads[idx] = { ...downloads[idx], ...payload }
      const row = document.querySelector(`#downloads-list li[data-id="${payload.id}"]`)
      if (row) {
        const bar = row.querySelector('.progress')
        if (bar) bar.style.width = `${progressPercent(downloads[idx])}%`
        const time = row.querySelector('.downloads-time')
        if (time && payload.started_at) time.textContent = getTimeAgo(new Date(payload.started_at))
      } else {
        renderDownloads()
      }
    } else {
      downloads.unshift(payload)
      renderDownloads()
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  loadDownloads()
  subscribeToUpdates()
  // Auto-refresh downloads list every 400ms for real-time progress updates
  setInterval(async () => {
    try {
      const list = await window.electronAPI?.invoke('get-downloads')
      downloads = Array.isArray(list) ? list : []
      renderDownloads() // Full re-render every 400ms
    } catch {}
  }, 400)
  document.getElementById('start-download')?.addEventListener('click', () => {
    const url = document.getElementById('download-url')?.value?.trim()
    if (url) window.electronAPI?.send('start-download', url)
  })
  document.getElementById('clear-downloads')?.addEventListener('click', async () => {
    const list = await window.electronAPI?.invoke('clear-downloads')
    downloads = Array.isArray(list) ? list : []
    renderDownloads()
  })
  document.getElementById('delete-selected')?.addEventListener('click', async () => {
    const ids = Array.from(
      document.querySelectorAll('#downloads-list li input[type="checkbox"]:checked'),
    )
      .map((cb) => cb.closest('li')?.dataset.id)
      .filter(Boolean)
    const list = await window.electronAPI?.invoke('delete-downloads', ids)
    downloads = Array.isArray(list) ? list : []
    renderDownloads()
  })
})

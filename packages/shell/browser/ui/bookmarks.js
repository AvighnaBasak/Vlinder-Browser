let bookmarks = []

// Load bookmarks from JSON file
async function loadBookmarks() {
  try {
    const response = await fetch('./bookmarks-data.json')
    bookmarks = await response.json()
    console.log('Loaded bookmarks:', bookmarks.length, 'entries')
    renderBookmarks()
  } catch (error) {
    console.error('Error loading bookmarks:', error)
    bookmarks = []
    renderBookmarks()
  }
}

// Render bookmarks list
function renderBookmarks() {
  const list = document.getElementById('bookmarks-list')
  const emptyState = document.getElementById('empty-state')

  if (bookmarks.length === 0) {
    list.style.display = 'none'
    emptyState.style.display = 'block'
    return
  }

  list.style.display = 'block'
  emptyState.style.display = 'none'
  list.innerHTML = ''

  bookmarks.forEach((bookmark) => {
    const li = document.createElement('li')

    const info = document.createElement('div')
    info.className = 'bookmark-info'
    info.innerHTML = `
      <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
      <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
    `
    info.addEventListener('click', () => openBookmark(bookmark.url))

    const date = document.createElement('div')
    date.className = 'bookmark-date'
    date.textContent = formatDate(bookmark.added_at)

    li.appendChild(info)
    li.appendChild(date)
    list.appendChild(li)
  })
}

// Open bookmark in new tab
function openBookmark(url) {
  if (window.electronAPI) {
    window.electronAPI.send('open-url-in-tab', url)
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return months === 1 ? '1 month ago' : `${months} months ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return years === 1 ? '1 year ago' : `${years} years ago`
  }
}

// Load bookmarks when page loads
loadBookmarks()

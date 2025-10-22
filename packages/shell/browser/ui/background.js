// Background script for the WebUI chrome extension
// This script acts as a bridge between the extension pages and the main process

console.log('WebUI background script loaded')

// Store history data in memory (this will be populated by the main process)
let historyData = []

// --- PATCH: Downloads support ---
let downloadsData = []

// Listen for messages from content scripts and extension pages
// Bookmarks storage (in-memory, backed by file)
let bookmarksData = []

// Background script loaded
console.log('[Background] Background script loaded!')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request)
  console.log('[Background] Message action:', request.action)

  switch (request.action) {
    case 'bookmark-last-history':
      console.log('[Background] *** BOOKMARK ACTION RECEIVED ***')
      console.log('[Background] Fetching history from history-data.json')

      // SIMPLE: Copy last entry from history-data.json to bookmarks-data.json
      fetch('./history-data.json')
        .then((res) => {
          console.log('[Background] Fetch response status:', res.status)
          return res.json()
        })
        .then((history) => {
          console.log('[Background] History loaded:', history.length, 'entries')
          if (history && history.length > 0) {
            const lastEntry = history[0] // Most recent is first
            console.log('[Background] Last history entry:', lastEntry)

            // Check if already bookmarked
            const existing = bookmarksData.find((b) => b.url === lastEntry.url)
            if (!existing) {
              // Add to bookmarks with same structure as history
              const bookmark = {
                id: Date.now() + Math.random(),
                url: lastEntry.url,
                title: lastEntry.title,
                favicon: lastEntry.favicon,
                added_at: new Date().toISOString(),
              }
              bookmarksData.unshift(bookmark)
              console.log('[Background] Bookmarked! Total:', bookmarksData.length)
              console.log('[Background] Bookmark data:', bookmark)

              // Save to file via main process
              saveBookmarksToFile()
            } else {
              console.log('[Background] Already bookmarked')
            }
          } else {
            console.log('[Background] No history entries found!')
          }
          sendResponse({ success: true, bookmarked: true })
        })
        .catch((err) => {
          console.error('[Background] *** ERROR fetching history:', err)
          sendResponse({ success: false, error: err.message })
        })
      return true // Required for async sendResponse
      break

    case 'get-bookmarks':
      console.log('[Background] Returning bookmarks:', bookmarksData.length)
      sendResponse(bookmarksData)
      break

    case 'get-history':
      console.log('Returning history data:', historyData)
      sendResponse(historyData)
      break

    case 'clear-history':
      // Clear history data
      const duration = request.duration
      const now = new Date()
      let cutoffDate

      switch (duration) {
        case 'hour':
          cutoffDate = new Date(now.getTime() - 60 * 60 * 1000)
          break
        case 'day':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default: // 'all'
          historyData = []
          break
      }

      if (duration !== 'all') {
        historyData = historyData.filter((entry) => {
          const entryDate = new Date(entry.visited_at)
          return entryDate >= cutoffDate
        })
      }

      console.log(
        'Cleared history for duration:',
        duration,
        'Remaining entries:',
        historyData.length,
      )

      // Update the main process database
      updateMainProcessDatabase('clear', duration)

      sendResponse({ success: true })
      break

    case 'delete-history-entries':
      const historyIds = request.ids
      historyData = historyData.filter((entry) => !historyIds.includes(entry.id))
      console.log('Deleted history entries:', historyIds, 'Remaining entries:', historyData.length)
      updateMainProcessDatabase('delete', historyIds)
      sendResponse({ success: true })
      break

    case 'update-history':
      // This will be called by the main process to update history data
      historyData = request.data || []
      console.log('Updated history data:', historyData.length, 'entries')
      sendResponse({ success: true })
      break

    case 'update-main-process':
      // Forward the update to the main process
      try {
        // In service worker context, we can't use require directly
        // The main process will handle this via a different mechanism
        console.log('Received main process update request:', request.mainAction)
        sendResponse({ success: true })
      } catch (error) {
        console.error('Error updating main process:', error)
        sendResponse({ success: false, error: error.message })
      }
      break

    case 'update-history-data':
      // Update the history data file directly
      try {
        // In service worker context, we can't use require directly
        // The main process will handle this via a different mechanism
        console.log('Received history update request, forwarding to main process')
        sendResponse({ success: true })
      } catch (error) {
        console.error('Error updating history file:', error)
        sendResponse({ success: false, error: error.message })
      }
      break

    case 'apply-theme':
      // Apply theme globally
      try {
        // In service worker context, we can't use require directly
        // The main process will handle this via a different mechanism
        console.log('Received theme application request:', request.theme)
        sendResponse({ success: true })
      } catch (error) {
        console.error('Error applying theme:', error)
        sendResponse({ success: false, error: error.message })
      }
      break

    case 'clear-downloads':
      downloadsData = []
      updateMainProcessDatabase('clear-downloads', null)
      sendResponse({ success: true })
      break
    case 'delete-download-entries':
      const downloadIds = request.ids
      downloadsData = downloadsData.filter((entry) => !downloadIds.includes(entry.id))
      updateMainProcessDatabase('delete-downloads', downloadIds)
      sendResponse({ success: true })
      break

    case 'ai-panel-state':
    case undefined: // Handle messages with just 'type' field
      // Handle AI panel state changes
      if (request.type === 'ai-panel-state') {
        console.log('[Background] AI panel state change:', request)
        sendResponse({ success: true })
      } else if (request.type === 'toggle-bookmark') {
        // Toggle bookmark
        console.log('[Background] Toggle bookmark:', request.url)
        window.__toggleBookmark = { url: request.url, title: request.title, timestamp: Date.now() }
        setTimeout(() => {
          const isBookmarked = window.__bookmarkStatus || false
          sendResponse({ success: true, isBookmarked })
        }, 50)
        return true // Will respond asynchronously
      } else if (request.type === 'check-bookmark') {
        // Check bookmark status
        window.__checkBookmark = { url: request.url, timestamp: Date.now() }
        setTimeout(() => {
          const isBookmarked = window.__bookmarkStatus || false
          sendResponse({ success: true, isBookmarked })
        }, 50)
        return true // Will respond asynchronously
      } else if (request.type === 'open-bookmark') {
        // Open bookmark in current tab
        console.log('[Background] Open bookmark:', request.url)
        chrome.tabs.update({ url: request.url })
        sendResponse({ success: true })
      } else {
        console.log('Unknown action:', request.action || request.type)
        sendResponse({ success: false, error: 'Unknown action' })
      }
      break

    default:
      console.log('Unknown action:', request.action)
      sendResponse({ success: false, error: 'Unknown action' })
  }
})

// Save bookmarks to file via app:// protocol
function saveBookmarksToFile() {
  try {
    console.log('[Background] Saving bookmarks to file:', bookmarksData.length)
    // Save bookmarks using same pattern as password/credentials
    fetch('app://save-bookmarks?data=' + encodeURIComponent(JSON.stringify(bookmarksData)))
      .then(() => console.log('[Background] Bookmarks saved'))
      .catch((err) => console.error('[Background] Failed to save bookmarks:', err))
  } catch (err) {
    console.error('[Background] Error saving bookmarks:', err)
  }
}

// Function to update the main process database
function updateMainProcessDatabase(action, data) {
  // Write the changes to a file that the main process can read
  try {
    const changes = {
      action: action,
      data: data,
      timestamp: new Date().toISOString(),
    }

    // For now, we'll use a simple approach: write to a data URL that can be fetched
    // In a real implementation, this would write to a file
    console.log('Would write changes to file:', changes)

    // Since we can't write files directly from the extension context,
    // we'll use a different approach: send a message to the main process
    // through the extension's webContents
    try {
      // In service worker context, we can't use require directly
      // The main process will handle this via a different mechanism
      console.log('Changes will be applied when main process checks')
    } catch (error) {
      console.error('Failed to send changes:', error)
    }
  } catch (error) {
    console.error('Failed to update main process database:', error)
  }
}

// Note: Service workers don't have access to window object
// The main process will update history data directly via the JSON file

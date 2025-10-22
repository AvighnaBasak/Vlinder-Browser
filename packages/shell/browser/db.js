const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const historyPath = path.join(app.getPath('userData'), 'history.json')
const bookmarksPath = path.join(app.getPath('userData'), 'bookmarks.json')

class HistoryDB {
  constructor() {
    this.data = this.loadData()
    this.bookmarks = this.loadBookmarks()
  }

  loadData() {
    try {
      if (fs.existsSync(historyPath)) {
        const content = fs.readFileSync(historyPath, 'utf8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
    return []
  }

  loadBookmarks() {
    try {
      if (fs.existsSync(bookmarksPath)) {
        const content = fs.readFileSync(bookmarksPath, 'utf8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
    }
    return []
  }

  saveData() {
    try {
      console.log('[HistoryDB] Writing DB file:', historyPath)
      fs.writeFileSync(historyPath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Failed to save history:', error)
    }
  }

  insert(url, title) {
    const entry = {
      id: Date.now() + Math.random(), // Simple unique ID
      url,
      title: title || url,
      visited_at: new Date().toISOString(),
    }
    this.data.unshift(entry) // Add to beginning
    this.saveData()
  }

  getAll() {
    return this.data
  }

  deleteByIds(ids) {
    this.data = this.data.filter((entry) => !ids.includes(entry.id))
    this.saveData()
  }

  clearByDuration(duration) {
    const now = new Date()
    let cutoffDate

    switch (duration) {
      case 'hour':
        cutoffDate = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case 'day':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default: // 'all'
        this.data = []
        this.saveData()
        return
    }

    // Keep entries OLDER than the cutoff (delete recent entries within the time range)
    this.data = this.data.filter((entry) => {
      const entryDate = new Date(entry.visited_at)
      return entryDate < cutoffDate
    })
    this.saveData()
  }

  // Bookmark methods
  saveBookmarks() {
    try {
      console.log('[BookmarksDB] Writing bookmarks file:', bookmarksPath)
      fs.writeFileSync(bookmarksPath, JSON.stringify(this.bookmarks, null, 2))
    } catch (error) {
      console.error('Failed to save bookmarks:', error)
    }
  }

  addBookmark(url, title) {
    // Check if already bookmarked
    if (this.bookmarks.some((b) => b.url === url)) {
      return false
    }
    const bookmark = {
      id: Date.now() + Math.random(),
      url,
      title: title || url,
      added_at: new Date().toISOString(),
    }
    this.bookmarks.unshift(bookmark)
    this.saveBookmarks()
    return true
  }

  removeBookmark(url) {
    this.bookmarks = this.bookmarks.filter((b) => b.url !== url)
    this.saveBookmarks()
  }

  removeBookmarksByIds(ids) {
    this.bookmarks = this.bookmarks.filter((b) => !ids.includes(b.id))
    this.saveBookmarks()
  }

  isBookmarked(url) {
    return this.bookmarks.some((b) => b.url === url)
  }

  getAllBookmarks() {
    return this.bookmarks
  }
}

module.exports = new HistoryDB()

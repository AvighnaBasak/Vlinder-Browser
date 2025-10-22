// AI Chat Panel JavaScript
class AIChat {
  constructor() {
    this.messages = []
    this.attachedFiles = []
    this.isGenerating = false
    this.apiKey = null
    this.currentStreamContent = ''
    this.selectedModel = 'openai/gpt-3.5-turbo'
    this.availableModels = []
    this.currentTab = 'api-key'

    this.init()
  }

  async init() {
    this.loadFromLocalStorage()
    this.setupEventListeners()
    await this.checkApiKey()
    this.renderMessages()
  }

  setupEventListeners() {
    // Settings button
    const settingsBtn = document.getElementById('ai-settings-btn')
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings())
    }

    // Settings close button
    const settingsClose = document.getElementById('ai-settings-close')
    if (settingsClose) {
      settingsClose.addEventListener('click', () => this.closeSettings())
    }

    // Settings tabs
    document.querySelectorAll('.ai-settings-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab))
    })

    // Settings save API key
    const settingsSaveKeyBtn = document.getElementById('ai-settings-save-key')
    if (settingsSaveKeyBtn) {
      settingsSaveKeyBtn.addEventListener('click', () => this.saveApiKeyFromSettings())
    }

    // Model search
    const modelSearch = document.getElementById('ai-model-search')
    if (modelSearch) {
      modelSearch.addEventListener('input', (e) => this.filterModels(e.target.value))
    }

    // New Chat button
    const newChatBtn = document.getElementById('ai-new-chat-btn')
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => this.newChat())
    }

    // Send button
    const sendBtn = document.getElementById('ai-send-btn')
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage())
    }

    // File upload button
    const fileBtn = document.getElementById('ai-file-btn')
    const fileInput = document.getElementById('ai-file-input')
    if (fileBtn && fileInput) {
      fileBtn.addEventListener('click', () => fileInput.click())
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e))
    }

    // Textarea input
    const textarea = document.getElementById('ai-input-textarea')
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          this.sendMessage()
        }
      })

      // Auto-resize
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      })
    }

    // API Key modal
    const saveKeyBtn = document.getElementById('ai-api-key-save')
    if (saveKeyBtn) {
      saveKeyBtn.addEventListener('click', () => this.saveApiKey())
    }

    const keyInput = document.getElementById('ai-api-key-input')
    if (keyInput) {
      keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.saveApiKey()
        }
      })
    }
  }

  async checkApiKey() {
    try {
      // Try localStorage first (simpler and always works)
      const savedKey = localStorage.getItem('openrouter-api-key')
      if (savedKey) {
        this.apiKey = savedKey
        this.hideApiKeyModal()
        console.log('[AI Chat] ✓ API key loaded from localStorage')
      } else {
        this.showApiKeyModal()
        console.log('[AI Chat] No API key found, showing modal')
      }
    } catch (error) {
      console.error('Error checking API key:', error)
      this.showApiKeyModal()
    }
  }

  showApiKeyModal() {
    const modal = document.getElementById('ai-api-key-modal')
    if (modal) {
      modal.classList.remove('hidden')
    }
  }

  hideApiKeyModal() {
    const modal = document.getElementById('ai-api-key-modal')
    if (modal) {
      modal.classList.add('hidden')
    }
  }

  async saveApiKey() {
    const input = document.getElementById('ai-api-key-input')
    const errorDiv = document.getElementById('ai-api-key-error')
    const saveBtn = document.getElementById('ai-api-key-save')

    if (!input || !errorDiv || !saveBtn) {
      console.error('[AI Chat] Missing elements:', { input, errorDiv, saveBtn })
      return
    }

    const key = input.value.trim()

    // Validate key format
    if (!key) {
      errorDiv.textContent = 'Please enter an API key'
      errorDiv.classList.add('visible')
      return
    }

    if (!key.startsWith('sk-')) {
      errorDiv.textContent = 'Invalid API key format. Key should start with "sk-"'
      errorDiv.classList.add('visible')
      return
    }

    try {
      saveBtn.disabled = true
      saveBtn.textContent = 'Saving...'

      // Save to localStorage (persists across browser sessions)
      localStorage.setItem('openrouter-api-key', key)
      this.apiKey = key
      this.hideApiKeyModal()
      errorDiv.classList.remove('visible')
      console.log('[AI Chat] ✓ API key saved to localStorage')
    } catch (error) {
      console.error('[AI Chat] Error saving API key:', error)
      errorDiv.textContent = 'Failed to save API key. Please try again.'
      errorDiv.classList.add('visible')
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = 'Save API Key'
    }
  }

  loadFromLocalStorage() {
    try {
      // Use sessionStorage for messages (cleared on browser close)
      const savedMessages = sessionStorage.getItem('ai-chat-session')
      if (savedMessages) {
        this.messages = JSON.parse(savedMessages)
      }

      const savedFiles = sessionStorage.getItem('ai-chat-files')
      if (savedFiles) {
        this.attachedFiles = JSON.parse(savedFiles)
      }

      // Use localStorage for settings (persist forever)
      const savedModel = localStorage.getItem('openrouter-model')
      if (savedModel) {
        this.selectedModel = savedModel
        console.log('[AI Chat] Loaded model:', this.selectedModel)
      }
    } catch (error) {
      console.error('Error loading from storage:', error)
    }
  }

  saveToLocalStorage() {
    try {
      // Save messages to sessionStorage (cleared on browser close)
      sessionStorage.setItem('ai-chat-session', JSON.stringify(this.messages))
      sessionStorage.setItem('ai-chat-files', JSON.stringify(this.attachedFiles))
    } catch (error) {
      console.error('Error saving to storage:', error)
    }
  }

  newChat() {
    if (this.isGenerating) {
      return
    }

    if (this.messages.length > 0) {
      const confirmed = confirm('Start a new chat? Current conversation will be cleared.')
      if (!confirmed) return
    }

    this.messages = []
    this.attachedFiles = []
    sessionStorage.removeItem('ai-chat-session')
    sessionStorage.removeItem('ai-chat-files')
    this.renderMessages()

    const textarea = document.getElementById('ai-input-textarea')
    if (textarea) {
      textarea.value = ''
      textarea.style.height = 'auto'
    }
  }

  // Settings Modal Functions
  async openSettings() {
    const modal = document.getElementById('ai-settings-modal')
    if (modal) {
      modal.classList.remove('hidden')

      // Load current API key
      const keyInput = document.getElementById('ai-settings-api-key-input')
      if (keyInput) {
        keyInput.value = this.apiKey || ''
      }

      // Update current model display
      this.updateCurrentModelDisplay()

      // Fetch models if opening model tab or if not already loaded
      if (this.currentTab === 'model' || this.availableModels.length === 0) {
        await this.fetchModels()
      }
    }
  }

  closeSettings() {
    const modal = document.getElementById('ai-settings-modal')
    if (modal) {
      modal.classList.add('hidden')
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName

    // Update tab buttons
    document.querySelectorAll('.ai-settings-tab').forEach((tab) => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active')
      } else {
        tab.classList.remove('active')
      }
    })

    // Update sections
    document.querySelectorAll('.ai-settings-section').forEach((section) => {
      section.classList.remove('active')
    })

    const activeSection = document.getElementById(`settings-${tabName}`)
    if (activeSection) {
      activeSection.classList.add('active')
    }

    // Fetch models when switching to model tab
    if (tabName === 'model' && this.availableModels.length === 0) {
      this.fetchModels()
    }
  }

  async saveApiKeyFromSettings() {
    const input = document.getElementById('ai-settings-api-key-input')
    const saveBtn = document.getElementById('ai-settings-save-key')

    if (!input) return

    const key = input.value.trim()

    if (!key) {
      alert('Please enter an API key')
      return
    }

    if (!key.startsWith('sk-')) {
      alert('Invalid API key format. Key should start with "sk-"')
      return
    }

    try {
      saveBtn.disabled = true
      saveBtn.textContent = 'Saving...'

      localStorage.setItem('openrouter-api-key', key)
      this.apiKey = key

      alert('API key updated successfully!')
      console.log('[AI Chat] ✓ API key updated from settings')
    } catch (error) {
      console.error('[AI Chat] Error updating API key:', error)
      alert('Failed to update API key. Please try again.')
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = 'Update API Key'
    }
  }

  async fetchModels() {
    const modelList = document.getElementById('ai-model-list')
    if (!modelList) return

    modelList.innerHTML = '<div class="ai-model-loading">Loading models...</div>'

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models')

      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }

      const { data } = await response.json()

      this.availableModels = data.map((model) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length,
      }))

      console.log('[AI Chat] Loaded', this.availableModels.length, 'models')
      this.renderModels()
    } catch (error) {
      console.error('[AI Chat] Error fetching models:', error)
      modelList.innerHTML =
        '<div class="ai-model-loading">Failed to load models. Please try again.</div>'
    }
  }

  renderModels(filteredModels = null) {
    const modelList = document.getElementById('ai-model-list')
    if (!modelList) return

    const models = filteredModels || this.availableModels

    if (models.length === 0) {
      modelList.innerHTML = '<div class="ai-model-loading">No models found</div>'
      return
    }

    modelList.innerHTML = models
      .map(
        (model) => `
      <div class="ai-model-item ${model.id === this.selectedModel ? 'selected' : ''}" data-model-id="${this.escapeHtml(model.id)}">
        <div class="ai-model-info">
          <div class="ai-model-name">${this.escapeHtml(model.name)}</div>
          <div class="ai-model-id">${this.escapeHtml(model.id)}</div>
        </div>
        ${model.id === this.selectedModel ? '<span class="ai-model-check">✓</span>' : ''}
      </div>
    `,
      )
      .join('')

    // Add click listeners
    modelList.querySelectorAll('.ai-model-item').forEach((item) => {
      item.addEventListener('click', () => {
        const modelId = item.dataset.modelId
        this.selectModel(modelId)
      })
    })
  }

  filterModels(searchTerm) {
    if (!searchTerm) {
      this.renderModels()
      return
    }

    const term = searchTerm.toLowerCase()
    const filtered = this.availableModels.filter(
      (model) => model.id.toLowerCase().includes(term) || model.name.toLowerCase().includes(term),
    )

    this.renderModels(filtered)
  }

  selectModel(modelId) {
    console.log('[AI Chat] selectModel called with:', modelId)
    this.selectedModel = modelId
    localStorage.setItem('openrouter-model', modelId)

    console.log('[AI Chat] ✓ Model selected:', modelId)
    this.updateCurrentModelDisplay()
    this.renderModels()
  }

  updateCurrentModelDisplay() {
    const display = document.getElementById('ai-current-model-display')
    if (display) {
      const model = this.availableModels.find((m) => m.id === this.selectedModel)
      display.textContent = model ? model.name : this.selectedModel
    }
  }

  async handleFileUpload(event) {
    const files = event.target.files
    if (!files || files.length === 0) return

    for (const file of files) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`)
        continue
      }

      // Convert to base64
      const base64 = await this.fileToBase64(file)

      this.attachedFiles.push({
        id: Date.now() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      })
    }

    this.renderFileAttachments()
    this.saveToLocalStorage()

    // Clear input
    event.target.value = ''
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  removeFile(fileId) {
    this.attachedFiles = this.attachedFiles.filter((f) => f.id !== fileId)
    this.renderFileAttachments()
    this.saveToLocalStorage()
  }

  renderFileAttachments() {
    const container = document.getElementById('ai-file-attachments')
    if (!container) return

    if (this.attachedFiles.length === 0) {
      container.innerHTML = ''
      container.style.display = 'none'
      return
    }

    container.style.display = 'flex'
    container.innerHTML = this.attachedFiles
      .map(
        (file) => `
      <div class="ai-file-preview">
        ${
          file.type.startsWith('image/')
            ? `<img src="${file.data}" alt="${file.name}" />`
            : `<span>📄</span>`
        }
        <span class="ai-file-name">${this.escapeHtml(file.name)}</span>
        <button class="ai-file-remove" onclick="aiChat.removeFile(${file.id})">×</button>
      </div>
    `,
      )
      .join('')
  }

  async sendMessage() {
    const textarea = document.getElementById('ai-input-textarea')
    const userInput = textarea.value.trim()

    if (!userInput && this.attachedFiles.length === 0) return
    if (this.isGenerating) return
    if (!this.apiKey) {
      this.showApiKeyModal()
      return
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: userInput,
      files: [...this.attachedFiles],
      timestamp: Date.now(),
    }

    this.messages.push(userMessage)
    this.attachedFiles = []
    textarea.value = ''
    textarea.style.height = 'auto'

    this.renderMessages()
    this.renderFileAttachments()
    this.saveToLocalStorage()

    // Add placeholder for assistant response
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    }

    this.messages.push(assistantMessage)
    this.renderMessages()

    // Start streaming
    await this.streamResponse()
  }

  async streamResponse() {
    this.isGenerating = true
    this.currentStreamContent = ''
    this.updateInputState()

    try {
      // Prepare messages for API
      const apiMessages = [
        {
          role: 'system',
          content:
            'You are Vlinder AI, a helpful AI assistant. When asked about your name or identity, always respond that you are Vlinder AI. Do not disclose information about the underlying model, manufacturer, or technical details about how you work. Keep responses helpful, friendly, and focused on assisting the user.',
        },
        ...this.messages
          .filter((m) => !m.streaming)
          .map((m) => ({
            role: m.role,
            content: this.prepareMessageContent(m),
          })),
      ]

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://electron-browser-shell',
          'X-Title': 'Electron Browser AI Chat',
        },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((line) => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              break
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content

              if (content) {
                this.currentStreamContent += content
                this.updateStreamingMessage(this.currentStreamContent)
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      // Finalize message
      const lastMessage = this.messages[this.messages.length - 1]
      if (lastMessage && lastMessage.streaming) {
        lastMessage.content = this.currentStreamContent
        delete lastMessage.streaming
        this.saveToLocalStorage()
        this.renderMessages()
      }
    } catch (error) {
      console.error('Streaming error:', error)

      // Show error message
      const lastMessage = this.messages[this.messages.length - 1]
      if (lastMessage && lastMessage.streaming) {
        lastMessage.content = `❌ Error: ${error.message}\n\nPlease check your API key and try again.`
        delete lastMessage.streaming
        this.renderMessages()
      }
    } finally {
      this.isGenerating = false
      this.updateInputState()
    }
  }

  prepareMessageContent(message) {
    let content = message.content

    // Add file information if present
    if (message.files && message.files.length > 0) {
      const fileInfo = message.files
        .map((f) => {
          if (f.type.startsWith('image/')) {
            return {
              type: 'image_url',
              image_url: { url: f.data },
            }
          } else {
            return `[File: ${f.name}]`
          }
        })
        .join('\n')

      content = `${content}\n${fileInfo}`
    }

    return content
  }

  updateStreamingMessage(content) {
    const lastMessage = this.messages[this.messages.length - 1]
    if (lastMessage && lastMessage.streaming) {
      lastMessage.content = content
      this.renderMessages(true) // Skip scroll to avoid jumpiness
    }
  }

  updateInputState() {
    const textarea = document.getElementById('ai-input-textarea')
    const sendBtn = document.getElementById('ai-send-btn')
    const fileBtn = document.getElementById('ai-file-btn')

    if (textarea) textarea.disabled = this.isGenerating
    if (sendBtn) sendBtn.disabled = this.isGenerating
    if (fileBtn) fileBtn.disabled = this.isGenerating
  }

  renderMessages(skipScroll = false) {
    const container = document.getElementById('ai-messages-container')
    if (!container) return

    const emptyState = document.getElementById('ai-empty-state')

    if (this.messages.length === 0) {
      // Save empty state HTML
      const emptyStateHTML = emptyState
        ? emptyState.outerHTML
        : `
        <div id="ai-empty-state" class="ai-empty-state" style="display: flex;">
          <img src="./vlinder-ai.png" alt="Vlinder AI" class="ai-empty-state-logo" />
        </div>
      `

      // Clear container and restore empty state
      container.innerHTML = emptyStateHTML
      return
    }

    if (emptyState) emptyState.style.display = 'none'

    container.innerHTML = this.messages.map((msg, index) => this.renderMessage(msg, index)).join('')

    if (!skipScroll) {
      this.scrollToBottom()
    }
  }

  renderMessage(message, index) {
    const isLast = index === this.messages.length - 1
    const content = message.streaming
      ? message.content + '<span class="ai-typing-cursor">▍</span>'
      : this.renderMarkdown(message.content)

    const files =
      message.files && message.files.length > 0
        ? `
      <div class="ai-file-attachments">
        ${message.files
          .map(
            (f) => `
          <div class="ai-file-preview">
            ${
              f.type.startsWith('image/')
                ? `<img src="${f.data}" alt="${this.escapeHtml(f.name)}" />`
                : `<span>📄</span>`
            }
            <span class="ai-file-name">${this.escapeHtml(f.name)}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    `
        : ''

    const actions = !message.streaming
      ? `
      <div class="ai-message-actions">
        <button class="ai-message-action-btn" onclick="aiChat.copyMessage(${index})" id="copy-btn-${index}" title="Copy">
          <img src="./copy.png" alt="Copy" />
        </button>
        ${
          message.role === 'user'
            ? `
          <button class="ai-message-action-btn" onclick="aiChat.editMessage(${index})" title="Edit">
            <img src="./edit.png" alt="Edit" />
          </button>
        `
            : ''
        }
        ${
          isLast && message.role === 'assistant'
            ? `
          <button class="ai-message-action-btn" onclick="aiChat.regenerate()" title="Regenerate">
            <img src="./regenerate.png" alt="Regenerate" />
          </button>
        `
            : ''
        }
      </div>
    `
      : ''

    return `
      <div class="ai-message ${message.role}">
        <div class="ai-message-content">${content}</div>
        ${files}
        ${actions}
      </div>
    `
  }

  renderMarkdown(text) {
    if (!text) return ''

    let html = this.escapeHtml(text)

    // Code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return this.renderCodeBlock(code.trim(), lang || 'text')
    })

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')

    // Line breaks
    html = html.replace(/\n/g, '<br>')

    return html
  }

  renderCodeBlock(code, language) {
    const id = 'code-' + Math.random().toString(36).substr(2, 9)

    return `
      <div class="ai-code-block">
        <div class="ai-code-header">
          <span class="ai-code-language">${this.escapeHtml(language)}</span>
          <div class="ai-code-actions">
            <button class="ai-code-action-btn" onclick="aiChat.copyCode('${id}')" id="copy-code-${id}" title="Copy">
              <img src="./copy.png" alt="Copy" />
            </button>
            <button class="ai-code-action-btn" onclick="aiChat.downloadCode('${id}', '${this.escapeHtml(language)}')" title="Download">
              <img src="./download.png" alt="Download" />
            </button>
          </div>
        </div>
        <pre class="ai-code-content" id="${id}">${this.escapeHtml(code)}</pre>
      </div>
    `
  }

  copyMessage(index) {
    const message = this.messages[index]
    if (!message) return

    this.copyToClipboard(message.content, `copy-btn-${index}`)
  }

  copyCode(id) {
    const codeElement = document.getElementById(id)
    if (!codeElement) return

    this.copyToClipboard(codeElement.textContent, `copy-code-${id}`)
  }

  copyToClipboard(text, buttonId) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const btn = document.getElementById(buttonId)
        if (btn) {
          const originalText = btn.innerHTML
          btn.innerHTML = '✓ Copied'
          btn.classList.add('copied')

          setTimeout(() => {
            btn.innerHTML = originalText
            btn.classList.remove('copied')
          }, 2000)
        }
      })
      .catch((err) => {
        console.error('Failed to copy:', err)
      })
  }

  downloadCode(id, language) {
    const codeElement = document.getElementById(id)
    if (!codeElement) return

    const code = codeElement.textContent
    const ext = this.getFileExtension(language)
    const filename = prompt('Enter filename:', `code${ext}`)

    if (!filename) return

    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  getFileExtension(language) {
    const extensions = {
      javascript: '.js',
      typescript: '.ts',
      python: '.py',
      java: '.java',
      cpp: '.cpp',
      c: '.c',
      csharp: '.cs',
      ruby: '.rb',
      go: '.go',
      rust: '.rs',
      php: '.php',
      html: '.html',
      css: '.css',
      json: '.json',
      yaml: '.yaml',
      markdown: '.md',
      sql: '.sql',
      bash: '.sh',
      shell: '.sh',
    }

    return extensions[language.toLowerCase()] || '.txt'
  }

  editMessage(index) {
    const message = this.messages[index]
    if (!message || message.role !== 'user') return

    const newContent = prompt('Edit message:', message.content)
    if (newContent === null || newContent.trim() === '') return

    // Remove all messages after this one
    this.messages = this.messages.slice(0, index)

    // Add edited message
    this.messages.push({
      role: 'user',
      content: newContent.trim(),
      files: message.files || [],
      timestamp: Date.now(),
    })

    this.saveToLocalStorage()
    this.renderMessages()

    // Regenerate response
    this.regenerate()
  }

  async regenerate() {
    if (this.isGenerating) return

    // Remove last assistant message
    if (this.messages.length > 0 && this.messages[this.messages.length - 1].role === 'assistant') {
      this.messages.pop()
    }

    // Add new streaming message
    this.messages.push({
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    })

    this.renderMessages()
    await this.streamResponse()
  }

  scrollToBottom() {
    const container = document.getElementById('ai-messages-container')
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight
      }, 100)
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Initialize on load
let aiChat

// Wait for electronAPI to be available
function waitForElectronAPI() {
  return new Promise((resolve) => {
    if (window.electronAPI) {
      resolve()
      return
    }

    // Poll for electronAPI
    const checkInterval = setInterval(() => {
      if (window.electronAPI) {
        clearInterval(checkInterval)
        resolve()
      }
    }, 50)

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval)
      resolve()
    }, 5000)
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  // Only initialize if we're in the AI panel
  if (document.getElementById('ai-chat-container')) {
    console.log('[AI Chat] Waiting for electronAPI...')
    await waitForElectronAPI()

    if (window.electronAPI) {
      console.log('[AI Chat] ✓ electronAPI available, initializing chat...')
      aiChat = new AIChat()
    } else {
      console.error('[AI Chat] ✗ electronAPI not available after timeout')
      // Show error in UI
      const container = document.getElementById('ai-empty-state')
      if (container) {
        container.innerHTML = `
          <img src="./vlinder-ai.png" alt="Vlinder AI" class="ai-empty-state-logo" />
        `
      }
    }
  }
})

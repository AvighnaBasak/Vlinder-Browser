const webviews = require('webviews.js')
const settings = require('util/settings/settings.js')
const PasswordManagers = require('passwordManager/passwordManager.js')
const modalMode = require('modalMode.js')
const { ipcRenderer } = require('electron')
const papaparse = require('papaparse')

const passwordViewer = {
  container: document.getElementById('password-viewer'),
  listContainer: document.getElementById('password-viewer-list'),
  emptyHeading: document.getElementById('password-viewer-empty'),
  closeButton: document.querySelector('#password-viewer .modal-close-button'),
  exportButton: document.getElementById('password-viewer-export'),
  importButton: document.getElementById('password-viewer-import'),
  searchInput: null,
  credentialCount: null,
  allCredentials: [],

  createSearchBar: function () {
    if (passwordViewer.searchInput) return passwordViewer.searchInput.parentNode

    var searchContainer = document.createElement('div')
    searchContainer.className = 'password-viewer-search-container'

    var searchInput = document.createElement('input')
    searchInput.type = 'text'
    searchInput.className = 'password-viewer-search'
    searchInput.placeholder = l('passwordSearchPlaceholder')
    searchInput.addEventListener('input', function () {
      passwordViewer.filterCredentials(this.value)
    })

    passwordViewer.searchInput = searchInput
    searchContainer.appendChild(searchInput)

    var countEl = document.createElement('span')
    countEl.className = 'password-viewer-count'
    passwordViewer.credentialCount = countEl
    searchContainer.appendChild(countEl)

    return searchContainer
  },

  filterCredentials: function (query) {
    var items = passwordViewer.listContainer.querySelectorAll('.credential-item')
    var visibleCount = 0
    var lowerQuery = query.toLowerCase()

    items.forEach(function (item) {
      var domain = item.getAttribute('data-domain') || ''
      var username = item.getAttribute('data-username') || ''
      if (!query || domain.toLowerCase().includes(lowerQuery) || username.toLowerCase().includes(lowerQuery)) {
        item.hidden = false
        visibleCount++
      } else {
        item.hidden = true
      }
    })

    passwordViewer.emptyHeading.hidden = visibleCount > 0 || passwordViewer.allCredentials.length === 0
    if (passwordViewer.credentialCount) {
      passwordViewer.credentialCount.textContent = visibleCount + ' ' + (visibleCount === 1 ? l('passwordCountSingular') : l('passwordCountPlural'))
    }
  },

  createCredentialListElement: function (credential) {
    var container = document.createElement('div')
    container.className = 'credential-item'
    container.setAttribute('data-domain', credential.domain)
    container.setAttribute('data-username', credential.username)

    // Site icon + domain
    var siteInfo = document.createElement('div')
    siteInfo.className = 'credential-site-info'

    var favicon = document.createElement('img')
    favicon.className = 'credential-favicon'
    favicon.src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(credential.domain) + '&sz=32'
    favicon.width = 16
    favicon.height = 16
    favicon.onerror = function () { this.style.display = 'none' }
    siteInfo.appendChild(favicon)

    var domainEl = document.createElement('span')
    domainEl.className = 'credential-domain'
    domainEl.textContent = credential.domain
    siteInfo.appendChild(domainEl)

    container.appendChild(siteInfo)

    // Username row
    var usernameRow = document.createElement('div')
    usernameRow.className = 'credential-field-row'

    var usernameLabel = document.createElement('span')
    usernameLabel.className = 'credential-field-label'
    usernameLabel.textContent = l('username')
    usernameRow.appendChild(usernameLabel)

    var usernameEl = document.createElement('input')
    usernameEl.className = 'credential-field-value'
    usernameEl.value = credential.username
    usernameEl.disabled = true
    usernameRow.appendChild(usernameEl)

    var copyUsernameBtn = document.createElement('button')
    copyUsernameBtn.className = 'i carbon:copy credential-action-btn'
    copyUsernameBtn.title = l('clickToCopy')
    copyUsernameBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(credential.username)
      copyUsernameBtn.classList.remove('carbon:copy')
      copyUsernameBtn.classList.add('carbon:checkmark')
      setTimeout(function () {
        copyUsernameBtn.classList.remove('carbon:checkmark')
        copyUsernameBtn.classList.add('carbon:copy')
      }, 1500)
    })
    usernameRow.appendChild(copyUsernameBtn)

    container.appendChild(usernameRow)

    // Password row
    var passwordRow = document.createElement('div')
    passwordRow.className = 'credential-field-row'

    var passwordLabel = document.createElement('span')
    passwordLabel.className = 'credential-field-label'
    passwordLabel.textContent = l('password')
    passwordRow.appendChild(passwordLabel)

    var passwordEl = document.createElement('input')
    passwordEl.type = 'password'
    passwordEl.className = 'credential-field-value'
    passwordEl.value = credential.password
    passwordEl.disabled = true
    passwordRow.appendChild(passwordEl)

    var revealButton = document.createElement('button')
    revealButton.className = 'i carbon:view credential-action-btn'
    revealButton.title = l('passwordRevealTooltip')
    revealButton.addEventListener('click', function () {
      if (passwordEl.type === 'password') {
        PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
          if (manager && manager.revealPassword) {
            manager.revealPassword(credential.domain, credential.username).then(function (password) {
              if (password !== null) {
                passwordEl.value = password
                passwordEl.type = 'text'
                revealButton.classList.remove('carbon:view')
                revealButton.classList.add('carbon:view-off')
              }
            })
          } else {
            passwordEl.type = 'text'
            revealButton.classList.remove('carbon:view')
            revealButton.classList.add('carbon:view-off')
          }
        })
      } else {
        passwordEl.type = 'password'
        passwordEl.value = '••••••••'
        revealButton.classList.add('carbon:view')
        revealButton.classList.remove('carbon:view-off')
      }
    })
    passwordRow.appendChild(revealButton)

    var copyPasswordBtn = document.createElement('button')
    copyPasswordBtn.className = 'i carbon:copy credential-action-btn'
    copyPasswordBtn.title = l('clickToCopy')
    copyPasswordBtn.addEventListener('click', function () {
      PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
        if (manager && manager.revealPassword) {
          manager.revealPassword(credential.domain, credential.username).then(function (password) {
            if (password !== null) {
              navigator.clipboard.writeText(password)
              copyPasswordBtn.classList.remove('carbon:copy')
              copyPasswordBtn.classList.add('carbon:checkmark')
              setTimeout(function () {
                copyPasswordBtn.classList.remove('carbon:checkmark')
                copyPasswordBtn.classList.add('carbon:copy')
              }, 1500)
            }
          })
        }
      })
    })
    passwordRow.appendChild(copyPasswordBtn)

    container.appendChild(passwordRow)

    // Actions row
    var actionsRow = document.createElement('div')
    actionsRow.className = 'credential-actions-row'

    var editButton = document.createElement('button')
    editButton.className = 'credential-edit-btn'
    editButton.textContent = l('passwordEdit')
    editButton.addEventListener('click', function () {
      passwordViewer.showEditDialog(credential, container)
    })
    actionsRow.appendChild(editButton)

    var deleteButton = document.createElement('button')
    deleteButton.className = 'credential-delete-btn'
    deleteButton.textContent = l('passwordDelete')
    deleteButton.addEventListener('click', function () {
      if (confirm(l('deletePassword').replace('%s', credential.domain))) {
        PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
          manager.deleteCredential(credential.domain, credential.username)
          container.remove()
          passwordViewer._updatePasswordListFooter()
        })
      }
    })
    actionsRow.appendChild(deleteButton)

    container.appendChild(actionsRow)

    return container
  },

  showEditDialog: function (credential, containerEl) {
    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager || !manager.verifyAuth) {
        return
      }

      manager.verifyAuth().then(function (verified) {
        if (!verified) return

        manager.revealPassword(credential.domain, credential.username).then(function (realPassword) {
          if (realPassword === null) return

          var overlay = document.createElement('div')
          overlay.className = 'credential-edit-overlay'

          var dialog = document.createElement('div')
          dialog.className = 'credential-edit-dialog'

          var title = document.createElement('h4')
          title.textContent = l('passwordEditTitle').replace('%s', credential.domain)
          dialog.appendChild(title)

          var fields = [
            { label: l('username'), value: credential.username, key: 'username', type: 'text' },
            { label: l('password'), value: realPassword, key: 'password', type: 'text' }
          ]

          var inputs = {}
          fields.forEach(function (field) {
            var row = document.createElement('div')
            row.className = 'credential-edit-row'

            var lbl = document.createElement('label')
            lbl.textContent = field.label
            row.appendChild(lbl)

            var input = document.createElement('input')
            input.type = field.type
            input.value = field.value
            inputs[field.key] = input
            row.appendChild(input)

            dialog.appendChild(row)
          })

          var btnRow = document.createElement('div')
          btnRow.className = 'credential-edit-buttons'

          var cancelBtn = document.createElement('button')
          cancelBtn.textContent = l('dialogSkipButton')
          cancelBtn.addEventListener('click', function () {
            overlay.remove()
          })
          btnRow.appendChild(cancelBtn)

          var saveBtn = document.createElement('button')
          saveBtn.className = 'primary-btn'
          saveBtn.textContent = l('passwordCaptureSave')
          saveBtn.addEventListener('click', function () {
            var updated = {
              username: inputs.username.value,
              password: inputs.password.value
            }
            manager.updateCredential(
              { domain: credential.domain, username: credential.username },
              updated
            )

            // Update the displayed element
            var usernameInput = containerEl.querySelector('.credential-field-row:first-of-type .credential-field-value')
            if (usernameInput) usernameInput.value = updated.username
            containerEl.setAttribute('data-username', updated.username)

            credential.username = updated.username
            credential.password = updated.password

            overlay.remove()
          })
          btnRow.appendChild(saveBtn)

          dialog.appendChild(btnRow)
          overlay.appendChild(dialog)

          overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.remove()
          })

          document.body.appendChild(overlay)
        })
      })
    })
  },

  createNeverSaveDomainElement: function (domain) {
    var container = document.createElement('div')
    container.className = 'credential-item never-save-item'

    var siteInfo = document.createElement('div')
    siteInfo.className = 'credential-site-info'

    var domainEl = document.createElement('span')
    domainEl.className = 'credential-domain'
    domainEl.textContent = domain
    siteInfo.appendChild(domainEl)

    var descriptionEl = document.createElement('span')
    descriptionEl.className = 'credential-never-saved'
    descriptionEl.textContent = l('savedPasswordsNeverSavedLabel')
    siteInfo.appendChild(descriptionEl)

    container.appendChild(siteInfo)

    var deleteButton = document.createElement('button')
    deleteButton.className = 'credential-delete-btn'
    deleteButton.textContent = l('passwordRemoveException')
    deleteButton.addEventListener('click', function () {
      settings.set('passwordsNeverSaveDomains', settings.get('passwordsNeverSaveDomains').filter(d => d !== domain))
      container.remove()
      passwordViewer._updatePasswordListFooter()
    })
    container.appendChild(deleteButton)

    return container
  },

  _renderPasswordList: function (credentials) {
    empty(passwordViewer.listContainer)
    passwordViewer.allCredentials = credentials

    // Sort alphabetically by domain
    credentials.sort(function (a, b) {
      return a.domain.localeCompare(b.domain)
    })

    credentials.forEach(function (cred) {
      passwordViewer.listContainer.appendChild(passwordViewer.createCredentialListElement(cred))
    })

    const neverSaveDomains = settings.get('passwordsNeverSaveDomains') || []

    if (neverSaveDomains.length > 0) {
      var separator = document.createElement('div')
      separator.className = 'credential-section-header'
      separator.textContent = l('passwordNeverSavedSection')
      passwordViewer.listContainer.appendChild(separator)

      neverSaveDomains.forEach(function (domain) {
        passwordViewer.listContainer.appendChild(passwordViewer.createNeverSaveDomainElement(domain))
      })
    }

    passwordViewer._updatePasswordListFooter()
  },

  _updatePasswordListFooter: function () {
    var items = passwordViewer.listContainer.querySelectorAll('.credential-item:not(.never-save-item)')
    var hasCredentials = items.length > 0 || (settings.get('passwordsNeverSaveDomains') || []).length > 0
    passwordViewer.emptyHeading.hidden = hasCredentials
    passwordViewer.exportButton.hidden = (items.length === 0)

    if (passwordViewer.credentialCount) {
      passwordViewer.credentialCount.textContent = items.length + ' ' + (items.length === 1 ? l('passwordCountSingular') : l('passwordCountPlural'))
    }
  },

  show: function () {
    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager) {
        throw new Error('unsupported password manager')
      }

      var getMasked = manager.getAllCredentialsMasked || manager.getAllCredentials
      getMasked.call(manager).then(function (credentials) {
        webviews.requestPlaceholder('passwordViewer')
        modalMode.toggle(true, {
          onDismiss: passwordViewer.hide
        })
        passwordViewer.container.hidden = false

        // Insert search bar at top if not already there
        var existingSearch = passwordViewer.container.querySelector('.password-viewer-search-container')
        if (!existingSearch) {
          var searchBar = passwordViewer.createSearchBar()
          passwordViewer.container.insertBefore(searchBar, passwordViewer.listContainer)
        }

        if (passwordViewer.searchInput) {
          passwordViewer.searchInput.value = ''
        }

        passwordViewer._renderPasswordList(credentials)
      })
    })
  },

  importCredentials: async function () {
    PasswordManagers.getConfiguredPasswordManager().then(async function (manager) {
      if (!manager || !manager.importCredentials || !manager.getAllCredentials) {
        throw new Error('unsupported password manager')
      }

      const credentials = await manager.getAllCredentials()
      const shouldShowConsent = credentials.length > 0

      if (shouldShowConsent) {
        const securityConsent = ipcRenderer.sendSync('prompt', {
          text: l('importCredentialsConfirmation'),
          ok: l('dialogConfirmButton'),
          cancel: l('dialogCancelButton'),
          width: 400,
          height: 200
        })
        if (!securityConsent) return
      }

      const filePaths = await ipcRenderer.invoke('showOpenDialog', {
        filters: [
          { name: 'CSV', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!filePaths || !filePaths[0]) return

      const fileContents = fs.readFileSync(filePaths[0], 'utf8')

      manager.importCredentials(fileContents).then(function (credentials) {
        if (credentials.length === 0) return
        passwordViewer._renderPasswordList(credentials)
      })
    })
  },

  exportCredentials: function () {
    PasswordManagers.getConfiguredPasswordManager().then(function (manager) {
      if (!manager || !manager.getAllCredentials) {
        throw new Error('unsupported password manager')
      }

      // Require system auth before exporting
      var authPromise = manager.verifyAuth ? manager.verifyAuth() : Promise.resolve(true)

      authPromise.then(function (verified) {
        if (!verified) return

        const securityConsent = ipcRenderer.sendSync('prompt', {
          text: l('exportCredentialsConfirmation'),
          ok: l('dialogConfirmButton'),
          cancel: l('dialogCancelButton'),
          width: 400,
          height: 200
        })
        if (!securityConsent) return

        manager.getAllCredentials().then(function (credentials) {
          if (credentials.length === 0) return

          const csvData = papaparse.unparse({
            fields: ['url', 'username', 'password'],
            data: credentials.map(credential => [
              `https://${credential.domain}`,
              credential.username,
              credential.password
            ])
          })
          const blob = new Blob([csvData], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = 'credentials.csv'
          anchor.click()
          URL.revokeObjectURL(url)
        })
      })
    })
  },

  hide: function () {
    webviews.hidePlaceholder('passwordViewer')
    modalMode.toggle(false)
    passwordViewer.container.hidden = true
  },

  initialize: function () {
    passwordViewer.exportButton.addEventListener('click', passwordViewer.exportCredentials)
    passwordViewer.importButton.addEventListener('click', passwordViewer.importCredentials)
    passwordViewer.closeButton.addEventListener('click', passwordViewer.hide)
    webviews.bindIPC('showCredentialList', function () {
      passwordViewer.show()
    })
  }
}

module.exports = passwordViewer

# Vlinder Browser

A fully-featured, tabbed web browser built on Electron with comprehensive Chrome extension support, AI chat integration, and modern browser features.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Packages](#packages)
- [Configuration](#configuration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Development](#development)
- [Building](#building)
- [License](#license)
- [Contributing](#contributing)

## Overview

Vlinder Browser is a minimal yet powerful browser built on Electron that serves as a testbed for Chrome extension development while providing a fully functional browsing experience. It implements native Chrome extension APIs, supports Manifest V3, and includes modern features like AI chat, bookmarks, history management, themes, and more.

## Features

### Core Browser Features

**Tabbed Browsing**

- Full multi-tab support with tab management (create, close, switch)
- Tab navigation with keyboard shortcuts
- Tab switching with Ctrl+Tab, Ctrl+1-9
- Visual tab list with favicons and titles
- Tab state preservation

**Chrome Extension Support**

- Complete Chrome extension API implementation
- Install extensions directly from Chrome Web Store
- Support for unpacked local extensions
- Manifest V2 and V3 support
- Browser action popups
- Extension icons in toolbar
- Background scripts and service workers
- Content scripts injection
- Chrome API support including:
  - chrome.tabs
  - chrome.windows
  - chrome.browserAction
  - chrome.contextMenus
  - chrome.webNavigation
  - chrome.notifications
  - chrome.nativeMessaging
  - And many more

**Navigation**

- Address bar with smart URL detection
- Automatic protocol handling (http, https, file, chrome-extension)
- Google search integration for non-URL queries
- Back/Forward navigation
- Page reload
- Drag and drop file support
- DNS error pages
- No internet connection detection

### AI Chat Integration

**Vlinder AI Assistant**

- Integrated AI chat panel with OpenRouter API support
- Multiple AI model selection (GPT, Claude, and more)
- Real-time streaming responses
- Markdown rendering with code syntax highlighting
- File attachment support (images, documents up to 10MB)
- Message history persistence
- Copy, edit, and regenerate messages
- Code block download functionality
- Session management

### Bookmarks Management

- Bookmark current page with star button
- Visual bookmark indicator in address bar
- Full bookmarks page with search and filter
- Bookmark organization by date
- Quick access to bookmarked pages
- Import/Export capability
- Bulk delete operations

### History Tracking

- Automatic browsing history recording
- Full history page with search functionality
- Filter by time period (hour, day, week, all time)
- Bulk delete history entries
- Clear history by duration
- Visit timestamps
- Page titles and URLs

### Downloads Management

- Built-in download manager
- Download progress tracking
- Pause/Resume downloads
- Cancel downloads
- Download history
- File size and progress indicators
- Quick access to downloads folder
- Clear download history

### Customization

**Themes**

- Multiple built-in themes
- Dark and light theme support
- Custom theme creation
- Theme persistence across sessions
- Real-time theme switching

**Backgrounds**

- Animated background (Vanta.js particle effect)
- 25+ built-in still backgrounds
- Custom image upload
- Solid color backgrounds
- Background blur effects
- Background settings persistence

### Additional Features

**Password Management**

- Automatic password detection on form submission
- Secure password storage using keytar (OS credential manager)
- Auto-fill saved credentials
- Per-origin password storage

**Context Menus**

- Chrome-style right-click context menus
- Link actions (open in new tab/window, copy link)
- Image actions (save, copy, open in new tab)
- Text selection actions
- Inspect element

**Quick Links**

- Customizable quick links on new tab page
- Favicon display
- Add/Remove links easily
- Maximum 5 quick links

**Error Pages**

- Custom DNS error page
- No internet connection page
- Error detection and handling
- Retry functionality

**User Interface**

- Frameless window with custom title bar
- Window controls (minimize, maximize, close)
- Address bar with search functionality
- Extension action icons
- AI bot toggle button
- Bookmarks and downloads quick access
- Settings button

### Developer Features

- DevTools support (F12 or Ctrl+Shift+I)
- Service worker debugging
- Extension debugging
- Background page inspection
- Console logging
- Network inspection

## Architecture

### Technology Stack

- **Electron**: Cross-platform desktop application framework
- **Node.js**: Runtime environment (>= 16.0.0)
- **TypeScript**: Type-safe JavaScript development
- **Webpack**: Module bundler for build process
- **SQLite**: Local database for history storage
- **Keytar**: Secure credential storage

### Project Structure

The project uses a monorepo structure with Yarn workspaces:

```
electron-browser-shell/
├── packages/
│   ├── shell/                          # Main browser application
│   │   ├── browser/                    # Main process code
│   │   │   ├── main.js                # Application entry point
│   │   │   ├── tabs.js                # Tab management
│   │   │   ├── menu.js                # Application menu
│   │   │   ├── db.js                  # History database
│   │   │   └── ui/                    # Browser UI (extension)
│   │   │       ├── webui.html         # Main browser window
│   │   │       ├── webui.js           # Browser window logic
│   │   │       ├── new-tab.html       # New tab page
│   │   │       ├── new-tab.js         # New tab logic
│   │   │       ├── ai-chat.js         # AI chat implementation
│   │   │       ├── history.html       # History page
│   │   │       ├── bookmarks.html     # Bookmarks page
│   │   │       ├── downloads.html     # Downloads page
│   │   │       ├── theme-loader.js    # Theme system
│   │   │       ├── background.js      # Background extension script
│   │   │       └── backgrounds/       # Built-in background images
│   │   ├── preload.ts                 # Preload script
│   │   └── package.json
│   ├── electron-chrome-extensions/    # Chrome extension API implementation
│   │   ├── src/
│   │   │   ├── browser/               # Main process APIs
│   │   │   │   ├── api/               # Individual API implementations
│   │   │   │   ├── index.ts           # Main API router
│   │   │   │   └── store.ts           # Extension state management
│   │   │   └── renderer/              # Renderer process APIs
│   │   └── spec/                      # Test suite
│   ├── electron-chrome-web-store/     # Chrome Web Store integration
│   │   └── src/
│   │       └── browser/
│   │           ├── installer.ts       # Extension installer
│   │           ├── updater.ts         # Auto-update handler
│   │           └── crx3.ts            # CRX3 parser
│   └── electron-chrome-context-menu/  # Context menu implementation
└── extensions/                         # Local unpacked extensions
```

## Requirements

### System Requirements

- **Node.js**: >= 16.0.0
- **Yarn**: >= 1.10.0, < 2.0.0
- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 4GB RAM recommended
- **Disk Space**: At least 500MB for installation and cache

### Development Dependencies

- TypeScript 4.9+
- Electron 37.1.0+
- Webpack 5+
- ESBuild for fast compilation

## Installation

### Quick Start

1. Clone the repository:

```bash
git clone git@github.com:samuelmaddock/electron-browser-shell.git
cd electron-browser-shell
```

2. Install dependencies:

```bash
yarn
```

3. Launch the browser:

```bash
yarn start
```

### Detailed Installation Steps

#### For Development

```bash
# Install all workspace dependencies
yarn install

# Build all packages
yarn build

# Start the browser in development mode
yarn start

# Start with debug logging
yarn start:debug

# Start with Electron development build
yarn start:electron-dev

# Skip build step (faster restart during development)
yarn start:skip-build
```

#### For Production

```bash
# Build all packages for production
yarn build

# Package the application
cd packages/shell
yarn package

# Create distributable
yarn make
```

The packaged application will be available in `packages/shell/out/`.

## Usage

### Installing Extensions

**From Chrome Web Store:**

1. Navigate to [Chrome Web Store](https://chromewebstore.google.com/)
2. Find the extension you want to install
3. Click "Add to Chrome" or similar install button
4. Confirm installation in the dialog

**Unpacked Local Extensions:**

1. Place your unpacked extension folder in the `./extensions` directory
2. Restart the browser or reload extensions
3. The extension will be automatically loaded

### Using AI Chat

1. Click the AI robot icon in the top toolbar
2. On first use, enter your OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))
3. Select your preferred AI model from settings
4. Start chatting! The AI remembers context within the session

**AI Chat Features:**

- Attach files (images, documents) using the paperclip icon
- Copy messages or code blocks
- Edit and regenerate messages
- Download code blocks
- Switch between different AI models

### Managing Bookmarks

- **Add Bookmark**: Click the star icon in the address bar
- **View Bookmarks**: Click the bookmarks icon or press Ctrl+B
- **Delete Bookmarks**: Open bookmarks page and select items to delete
- **Search Bookmarks**: Use the search box on the bookmarks page

### Viewing History

- **Open History**: Click the settings icon or press Ctrl+H
- **Search History**: Use the search box on the history page
- **Clear History**: Select time range (hour, day, week, all)
- **Delete Entries**: Select specific entries to delete

### Managing Downloads

- **View Downloads**: Click the downloads icon or press Ctrl+D
- **Pause/Resume**: Click the pause/resume button on active downloads
- **Cancel**: Click the cancel button on active downloads
- **Clear List**: Remove completed downloads from the list

### Customizing Appearance

**Themes:**

1. Click settings icon
2. Navigate to themes section
3. Select from available themes or create custom
4. Theme is applied immediately and persists

**Backgrounds:**

1. Click settings icon
2. Navigate to backgrounds section
3. Choose from:
   - Animated (Vanta.js particles)
   - Built-in images
   - Upload custom image
   - Solid color

## Project Structure

### Core Packages

#### shell

The main browser application that ties everything together. Contains the Electron main process, renderer process, and browser UI.

**Key Files:**

- `browser/main.js`: Application entry point, window management
- `browser/tabs.js`: Tab lifecycle and layout management
- `browser/db.js`: SQLite database for history/bookmarks
- `browser/ui/`: Browser interface as a Chrome extension

#### electron-chrome-extensions

Implements Chrome extension APIs for Electron. This is the core package that enables extension support.

**Features:**

- Chrome API routing and implementation
- Extension lifecycle management
- Permission handling
- Background script support
- Content script injection
- Message passing between extension components

**Supported APIs:**

- chrome.tabs (tab management)
- chrome.windows (window management)
- chrome.browserAction (extension toolbar icons)
- chrome.contextMenus (right-click menus)
- chrome.webNavigation (navigation events)
- chrome.storage (extension storage)
- chrome.runtime (extension runtime)
- chrome.notifications (system notifications)
- And many more...

#### electron-chrome-web-store

Enables direct installation of extensions from the Chrome Web Store.

**Features:**

- CRX3 file parsing
- Extension installation from Web Store
- Automatic updates
- Extension verification
- Download and cache management

#### electron-chrome-context-menu

Provides Chrome-style context menus in Electron.

**Features:**

- Right-click context menus
- Link actions
- Image actions
- Text selection actions
- Custom menu items from extensions

## Packages

### Package Details

| Package                          | Version | Description                  | License                                 |
| -------------------------------- | ------- | ---------------------------- | --------------------------------------- |
| **Vlinder Browser (shell)**      | 2.2.0   | Main browser application     | MIT                                     |
| **electron-chrome-extensions**   | 4.9.0   | Chrome extension API support | GPL-3.0 (Proprietary license available) |
| **electron-chrome-web-store**    | 0.13.0  | Chrome Web Store integration | MIT                                     |
| **electron-chrome-context-menu** | 1.1.0   | Context menu implementation  | MIT                                     |

### Dependencies

**Main Dependencies:**

- `electron` (^37.1.0): Desktop application framework
- `animejs` (^4.1.4): Animation library
- `keytar` (^7.9.0): Native credential storage
- `sqlite3` (^5.1.7): Database engine
- `debug` (^4.3.1): Debug logging

**Development Dependencies:**

- `typescript` (^4.9.4): Type checking
- `esbuild` (^0.24.2): Fast JavaScript bundler
- `webpack` (^5.x): Module bundler
- `electron-forge` (^7.5.0): Build and packaging
- `prettier` (^3.4.1): Code formatting
- `husky` (^9.1.7): Git hooks
- `mocha` (^8.2.1): Testing framework

## Configuration

### Application Settings

Settings are stored in the user data directory:

- **Windows**: `%APPDATA%\Vlinder`
- **macOS**: `~/Library/Application Support/Vlinder`
- **Linux**: `~/.config/Vlinder`

### Configuration Files

**History Database:**

- Location: `<userData>/history.json`
- Format: JSON array of history entries
- Structure:
  ```json
  {
    "id": "unique-id",
    "url": "https://example.com",
    "title": "Page Title",
    "visited_at": "2025-10-22T12:00:00.000Z"
  }
  ```

**Bookmarks:**

- Location: `<userData>/bookmarks.json`
- Format: JSON array of bookmarks
- Structure:
  ```json
  {
    "id": "unique-id",
    "url": "https://example.com",
    "title": "Bookmark Title",
    "favicon": "data:image/png;base64,...",
    "added_at": "2025-10-22T12:00:00.000Z"
  }
  ```

**Themes:**

- Location: `packages/shell/browser/ui/current-theme.json`
- Format: JSON theme configuration
- Persists selected theme

**Backgrounds:**

- Location: `packages/shell/browser/ui/background-settings.json`
- Format: JSON background configuration
- Types: animated, still, custom, solid

**OpenRouter API Key:**

- Location: localStorage in browser context
- Key: `openrouter-api-key`
- Stored securely in browser storage

### Extension Configuration

Extensions are loaded from:

- Chrome Web Store installations: `<userData>/Extensions`
- Local unpacked extensions: `./extensions` directory

## Keyboard Shortcuts

### Tab Management

- `Ctrl+T`: New tab
- `Ctrl+W`: Close current tab (keeps window open)
- `Ctrl+Shift+W`: Close window
- `Ctrl+Tab` / `Ctrl+PageDown`: Next tab
- `Ctrl+Shift+Tab` / `Ctrl+PageUp`: Previous tab
- `Ctrl+1` to `Ctrl+8`: Switch to tab 1-8
- `Ctrl+9`: Switch to last tab

### Navigation

- `Ctrl+L`: Focus address bar
- `Ctrl+R`: Reload page
- `Alt+Left`: Go back
- `Alt+Right`: Go forward
- `Alt+Home`: Go to new tab page
- `F5`: Reload (blocked by default, use Ctrl+R)

### Browser Features

- `Ctrl+H`: Open history
- `Ctrl+B`: Open bookmarks
- `Ctrl+D`: Open downloads
- `F11`: Toggle fullscreen
- `F12` / `Ctrl+Shift+I`: Toggle DevTools

### Window Controls

- `Ctrl+N`: New window (planned)
- `Ctrl+Q`: Quit application (blocked)
- `Alt+F4`: Close window (blocked by default)

## Development

### Development Workflow

1. **Initial Setup:**

```bash
git clone git@github.com:samuelmaddock/electron-browser-shell.git
cd electron-browser-shell
yarn install
```

2. **Start Development Server:**

```bash
yarn start
```

3. **Make Changes:**

   - Edit files in `packages/*/src` or `packages/shell/browser`
   - Changes to TypeScript files require rebuild
   - Changes to UI files (HTML/JS/CSS) can be hot-reloaded with page refresh

4. **Testing:**

```bash
# Run extension API tests
yarn test

# Run specific test suite
cd packages/electron-chrome-extensions
yarn test
```

5. **Debugging:**

```bash
# Start with debug output
yarn start:debug

# Use Electron development build
yarn start:electron-dev

# Enable Chrome DevTools for main process
yarn start:electron-dev:debug
```

### Project Scripts

**Root Level:**

- `yarn build`: Build all packages
- `yarn start`: Build and start browser
- `yarn test`: Run all tests
- `yarn format`: Format code with Prettier

**Package Level:**

- `yarn build`: Build specific package
- `yarn clean`: Clean build artifacts
- `yarn test`: Run package tests

### Code Style

The project uses Prettier for code formatting:

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "semi": false,
  "endOfLine": "lf"
}
```

**Formatting:**

```bash
yarn format
```

**Pre-commit Hooks:**
Husky and lint-staged automatically format code before commits.

### Adding New Features

#### Adding a New Chrome API

1. Create API implementation in `packages/electron-chrome-extensions/src/browser/api/`
2. Export from `packages/electron-chrome-extensions/src/browser/api/index.ts`
3. Register in router at `packages/electron-chrome-extensions/src/browser/router.ts`
4. Add TypeScript types if needed
5. Write tests in `packages/electron-chrome-extensions/spec/`

#### Adding UI Features

1. Add HTML/CSS in `packages/shell/browser/ui/`
2. Add JavaScript logic
3. Update `manifest.json` if adding new pages
4. Update IPC handlers in `main.js` if needed
5. Test in development mode

### Extension Development

To develop and test Chrome extensions with this browser:

1. Create your extension in `./extensions/your-extension/`
2. Add `manifest.json` and required files
3. Start the browser with `yarn start`
4. Extensions from `./extensions` are automatically loaded
5. Use DevTools to debug your extension

## Building

### Development Build

```bash
yarn start
```

This runs the browser in development mode with hot reload.

### Production Build

```bash
# Build all packages
yarn build

# Package the application
cd packages/shell
yarn package
```

The packaged application will be in `packages/shell/out/Vlinder-<platform>-<arch>/`.

### Creating Distributables

```bash
cd packages/shell
yarn make
```

**Output Formats:**

- **Windows**: ZIP archive
- **macOS**: DMG installer
- **Linux**: ZIP archive (AppImage planned)

**Output Location:**
`packages/shell/out/make/`

### Build Configuration

Build configuration is defined in `packages/shell/forge.config.js`:

```javascript
{
  packagerConfig: {
    name: 'Vlinder',
    asar: true,
    extraResource: ['browser/ui']
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'win32'] },
    { name: '@electron-forge/maker-dmg', platforms: ['darwin'] }
  ]
}
```

### Platform-Specific Notes

**Windows:**

- Native modules (keytar, sqlite3) are automatically rebuilt
- Requires Windows 7 or later
- Creates portable ZIP archive

**macOS:**

- Code signing may be required for distribution
- Requires macOS 10.11 or later
- Creates DMG installer

**Linux:**

- Requires gtk3 and libnotify
- May need additional dependencies for keytar
- Creates ZIP archive

## License

### Project License

Most packages in this project use **MIT License**, with the exception of `electron-chrome-extensions`.

#### electron-chrome-extensions

This package uses **GPL-3.0** for open-source use.

**For proprietary/commercial use**, you must:

- Contact the author: [sam@samuelmaddock.com](mailto:sam@samuelmaddock.com?subject=electron-browser-shell%20license)
- Sponsor on GitHub: [github.com/sponsors/samuelmaddock](https://github.com/sponsors/samuelmaddock/)
- Acquire a proprietary-use license: [LICENSE-PATRON.md](./LICENSE-PATRON.md)

These contributions help make development and maintenance of this project more sustainable.

#### Other Packages

- **shell**: MIT
- **electron-chrome-web-store**: MIT
- **electron-chrome-context-menu**: MIT

### Contributor License Agreement

By sending a pull request, you hereby grant to owners and users of the electron-browser-shell project a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and distribute your contributions and such derivative works.

The owners of the electron-browser-shell project will also be granted the right to relicense the contributed source code and its derivative works.

## Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with:
   - Clear description of the bug
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots if applicable
   - System information (OS, Node version, Electron version)

### Requesting Features

1. Check if the feature has been requested
2. Create a new issue describing:
   - The feature you'd like to see
   - Why it would be useful
   - How it might work
   - Any examples from other browsers

### Contributing Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `yarn test`
5. Format code: `yarn format`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

**Code Review Process:**

- All PRs require review before merging
- Tests must pass
- Code must be formatted with Prettier
- Follow existing code style and patterns

### Development Guidelines

- Write tests for new features
- Update documentation for API changes
- Keep commits focused and atomic
- Write clear commit messages
- Add comments for complex logic
- Ensure backwards compatibility when possible

### Areas for Contribution

**High Priority:**

- Additional Chrome API implementations
- Extension management UI (enable/disable/uninstall)
- Improved popup support
- Extension permission system
- Performance optimizations

**Medium Priority:**

- Additional theme options
- Import/Export bookmarks
- Sync functionality
- Tab groups
- Session restore

**Low Priority:**

- Additional UI customization
- Plugin system
- More keyboard shortcuts
- Accessibility improvements

## Roadmap

### Current (Implemented)

- Browser tabs
- Chrome extension support (basic APIs)
- Extension popup support
- CRX extension loader
- Chrome Web Store installer
- Automatic extension updates
- Manifest V3 support (with Electron 44411+)
- AI chat integration
- Bookmarks management
- History tracking
- Downloads management
- Themes and backgrounds
- Password autofill
- Context menus

### In Progress

- More Chrome API implementations
- Robust extension popup support
- Extension permission system
- Extension management UI

### Planned (Eventually)

- Extension enable/disable/uninstall UI
- Installation prompt UX
- Microsoft Edge Add-ons support
- Full Chrome API coverage
- Tab groups
- Session management
- Sync functionality
- Import/Export bookmarks
- Browser profiles

### Under Consideration

- Custom webRequest blocking
- Tab discarding for memory management
- Developer tools enhancements
- Plugin API for external extensions

### Not Planned

- Chrome Platform App APIs (deprecated by Google)

## FAQ

**Q: Can I use this as my daily browser?**
A: Yes, but it's primarily a development testbed. Some features may be unstable.

**Q: Will all Chrome extensions work?**
A: Most extensions work, but some advanced APIs are not yet implemented.

**Q: How do I update extensions?**
A: Extensions from the Chrome Web Store auto-update. Local extensions must be manually updated.

**Q: Can I import my Chrome bookmarks?**
A: Not currently, but this feature is planned.

**Q: Is my data synced across devices?**
A: No, sync functionality is not yet implemented.

**Q: How do I report security issues?**
A: Email security issues to: [sam@samuelmaddock.com](mailto:sam@samuelmaddock.com?subject=Security%20Issue)

## Credits

**Created by:** Samuel Maddock ([sam@samuelmaddock.com](mailto:sam@samuelmaddock.com))

**Built with:**

- [Electron](https://www.electronjs.org/)
- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vanta.js](https://www.vantajs.com/) (background effects)
- [OpenRouter](https://openrouter.ai/) (AI integration)

**Special Thanks:**

- Chrome extension developers for testing and feedback
- Open source contributors
- GitHub sponsors

## Links

- **Repository:** https://github.com/samuelmaddock/electron-browser-shell
- **NPM - electron-chrome-extensions:** https://www.npmjs.com/package/electron-chrome-extensions
- **NPM - electron-chrome-web-store:** https://www.npmjs.com/package/electron-chrome-web-store
- **Chrome Extensions Documentation:** https://developer.chrome.com/docs/extensions/
- **Electron Documentation:** https://www.electronjs.org/docs

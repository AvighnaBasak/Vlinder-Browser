/**
 * Tests for StyleManager service
 */

import { styleManager } from '../StyleManager'

describe('StyleManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  test('should initialize with empty cache', () => {
    const state = styleManager.getState()
    expect(state.styleCache).toEqual({})
    expect(state.fallbackStyle).toBe('')
    expect(state.disabledWebsites.size).toBe(0)
  })

  test('should normalize host correctly', () => {
    // Test with www prefix
    const url1 = 'https://www.instagram.com/direct/inbox/'
    const url2 = 'https://instagram.com/direct/inbox/'

    // Both should be treated the same
    expect(styleManager.areStylesEnabled(url1)).toBe(true)
    expect(styleManager.areStylesEnabled(url2)).toBe(true)
  })

  test('should toggle styles for website', () => {
    const url = 'https://www.instagram.com/direct/inbox/'

    // Initially enabled
    expect(styleManager.areStylesEnabled(url)).toBe(true)

    // Toggle to disabled
    styleManager.toggleStyles(url)
    expect(styleManager.areStylesEnabled(url)).toBe(false)

    // Toggle back to enabled
    styleManager.toggleStyles(url)
    expect(styleManager.areStylesEnabled(url)).toBe(true)
  })

  test('should handle invalid URLs gracefully', () => {
    const invalidUrl = 'not-a-valid-url'
    expect(styleManager.getStyle(invalidUrl)).toBeNull()
    expect(styleManager.areStylesEnabled(invalidUrl)).toBe(false)
  })

  test('should fetch remote styles', async () => {
    // Mock fetch
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            website: {
              'instagram.com.css': {
                transparency: 'body { background: transparent !important; }',
              },
            },
          })
        ),
    })

    global.fetch = mockFetch

    await styleManager.fetchRemoteStyles()

    expect(mockFetch).toHaveBeenCalledWith('https://sameerasw.github.io/my-internet/styles.json')
  })
})

/**
 * Utility functions for handling favicons for temporary apps
 */

/**
 * Extracts the domain from a URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return ''
  }
}

/**
 * Gets the favicon URL for a given website URL
 * Uses Google's favicon service as a reliable fallback
 */
export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url)
  if (!domain) {
    // Return a fallback favicon URL instead of empty string
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=64'
  }

  // Use Google's favicon service for reliable favicon fetching
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

/**
 * Generates a unique ID for a temporary app based on URL
 */
export function generateTemporaryAppId(url: string): string {
  const domain = extractDomain(url)
  const timestamp = Date.now()
  return `temp_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`
}

/**
 * Extracts a readable name from a URL (domain name)
 */
export function getDomainName(url: string): string {
  const domain = extractDomain(url)
  if (!domain) return 'External Site'

  // Remove 'www.' prefix if present
  return domain.replace(/^www\./, '').split('.')[0] || domain
}

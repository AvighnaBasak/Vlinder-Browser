/**
 * Authentication Provider Configuration
 *
 * Defines which authentication provider each platform uses for shared session management.
 * Platforms using the same provider will share login sessions.
 */

export type AuthProvider = 'google' | 'microsoft' | 'meta' | 'apple' | 'amazon' | 'openai' | 'anthropic' | 'independent'

export interface AuthProviderConfig {
  id: AuthProvider
  name: string
  description: string
  platforms: string[]
}

/**
 * Authentication provider definitions
 */
export const AUTH_PROVIDERS: AuthProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    description: 'Google services and OAuth',
    platforms: ['youtube', 'googledrive', 'meet', 'gemini'],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    description: 'Microsoft services and Azure AD',
    platforms: ['teams', 'copilot', 'linkedin'],
  },
  {
    id: 'meta',
    name: 'Meta',
    description: 'Facebook, Instagram, and Meta services',
    platforms: ['facebook', 'instagram', 'messenger', 'threads', 'whatsapp'],
  },
  {
    id: 'apple',
    name: 'Apple',
    description: 'Apple services and iCloud',
    platforms: ['applemusic'],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    description: 'Amazon services and AWS',
    platforms: ['amazon', 'primevideo'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI services',
    platforms: ['chatgpt'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Anthropic AI services',
    platforms: ['claude'],
  },
  {
    id: 'independent',
    name: 'Independent',
    description: 'Platforms with their own authentication',
    platforms: [
      'twitter',
      'discord',
      'slack',
      'github',
      'gitlab',
      'notion',
      'spotify',
      'netflix',
      'zoom',
      'signal',
      'telegram',
      'tiktok',
      'reddit',
      'pinterest',
      'figma',
      'canva',
      'steam',
      'epicgames',
      'cashapp',
      'paypal',
      'ebay',
      'etsy',
      'shopify',
      'coursera',
      'udemy',
      'behance',
      'dribbble',
      'tumblr',
      'vimeo',
    ],
  },
]

/**
 * Platform to authentication provider mapping
 */
export const PLATFORM_AUTH_PROVIDERS: Record<string, AuthProvider> = {
  // Google services
  youtube: 'google',
  googledrive: 'google',
  meet: 'google',
  gemini: 'google',

  // Microsoft services
  teams: 'microsoft',
  copilot: 'microsoft',
  linkedin: 'microsoft',

  // Meta services
  facebook: 'meta',
  instagram: 'meta',
  messenger: 'meta',
  threads: 'meta',
  whatsapp: 'meta',

  // Apple services
  applemusic: 'apple',

  // Amazon services
  amazon: 'amazon',
  primevideo: 'amazon',

  // AI services
  chatgpt: 'openai',
  claude: 'anthropic',

  // Independent platforms
  twitter: 'independent',
  discord: 'independent',
  slack: 'independent',
  github: 'independent',
  gitlab: 'independent',
  notion: 'independent',
  spotify: 'independent',
  netflix: 'independent',
  zoom: 'independent',
  signal: 'independent',
  telegram: 'independent',
  tiktok: 'independent',
  reddit: 'independent',
  pinterest: 'independent',
  figma: 'independent',
  canva: 'independent',
  steam: 'independent',
  epicgames: 'independent',
  cashapp: 'independent',
  paypal: 'independent',
  ebay: 'independent',
  etsy: 'independent',
  shopify: 'independent',
  coursera: 'independent',
  udemy: 'independent',
  behance: 'independent',
  dribbble: 'independent',
  tumblr: 'independent',
  vimeo: 'independent',
  perplexity: 'independent',
}

/**
 * Get authentication provider for a platform
 */
export function getAuthProvider(platformId: string): AuthProvider {
  return PLATFORM_AUTH_PROVIDERS[platformId] || 'independent'
}

/**
 * Get all platforms for an authentication provider
 */
export function getPlatformsForProvider(provider: AuthProvider): string[] {
  const config = AUTH_PROVIDERS.find((p) => p.id === provider)
  return config?.platforms || []
}

/**
 * Get authentication provider configuration
 */
export function getAuthProviderConfig(provider: AuthProvider): AuthProviderConfig | undefined {
  return AUTH_PROVIDERS.find((p) => p.id === provider)
}

/**
 * Check if a platform uses shared authentication
 */
export function hasSharedAuth(platformId: string): boolean {
  const provider = getAuthProvider(platformId)
  return provider !== 'independent'
}

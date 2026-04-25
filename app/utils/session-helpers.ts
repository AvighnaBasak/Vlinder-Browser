/**
 * Session Management Utilities
 *
 * Provides utilities for managing webview session partitions.
 * All platforms now share a single session partition for unified authentication.
 */

import { Tab as Platform } from '@/app/types/tab'

let _incognitoPartition: string | null = null

export function setIncognitoPartition(partition: string | null) {
  _incognitoPartition = partition
}

export function getIncognitoPartition(): string | null {
  return _incognitoPartition
}

export function getSessionPartition(platform: Platform): string {
  if (_incognitoPartition) return _incognitoPartition
  return 'persist:unified-session'
}

/**
 * Get the session partition for a platform by ID
 * All platforms now share the same session partition
 *
 * @param platformId - The platform ID
 * @param platforms - Array of all platforms
 * @returns The session partition string
 */
export function getSessionPartitionById(platformId: string, platforms: Platform[]): string {
  // All platforms share the same session partition
  return 'persist:unified-session'
}

/**
 * Get all platforms that share the same session partition
 * Since all platforms now share the same session, this returns all platform IDs
 *
 * @param platformId - The platform ID to find shared platforms for
 * @param platforms - Array of all platforms
 * @returns Array of platform IDs that share the same session (all platforms)
 */
export function getSharedSessionPlatforms(platformId: string, platforms: Platform[]): string[] {
  // All platforms now share the same session partition
  return platforms.map((platform) => platform.id)
}

/**
 * Check if two platforms share the same session partition
 * Since all platforms now share the same session, this always returns true
 *
 * @param platformId1 - First platform ID
 * @param platformId2 - Second platform ID
 * @param platforms - Array of all platforms
 * @returns True if platforms share the same session (always true now)
 */
export function shareSession(platformId1: string, platformId2: string, platforms: Platform[]): boolean {
  // All platforms now share the same session partition
  return true
}

/**
 * Get session partition information for debugging
 *
 * @param platform - The platform configuration
 * @returns Object with partition details
 */
export function getSessionInfo(platform: Platform) {
  const partition = getSessionPartition(platform)

  return {
    platformId: platform.id,
    platformName: platform.name,
    authProvider: 'unified', // All platforms now use unified authentication
    partition,
    isShared: true, // All platforms now share the same session
    sessionType: 'unified', // All platforms use the unified session
  }
}

import { z } from 'zod'

export const configIpcSchema = {
  'config-get-last-app': {
    args: z.tuple([]),
    return: z.union([z.string(), z.null()]),
  },
  'config-set-last-app': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'config-is-enabled': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'config-set-enabled': {
    args: z.tuple([z.string(), z.boolean()]),
    return: z.void(),
  },
  'config-has-setup': {
    args: z.tuple([]),
    return: z.boolean(),
  },
  'config-complete-setup': {
    args: z.tuple([z.array(z.object({ name: z.string(), enabled: z.boolean() }))]),
    return: z.void(),
  },
  'config-clear-data': {
    args: z.tuple([]),
    return: z.void(),
  },
  'config-reset-app': {
    args: z.tuple([]),
    return: z.void(),
  },
  'config-get-all-enabled': {
    args: z.tuple([]),
    return: z.record(z.string(), z.boolean()),
  },
  'config-is-pinned': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'config-set-pinned': {
    args: z.tuple([z.string(), z.boolean()]),
    return: z.void(),
  },
  'config-is-muted': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'config-set-muted': {
    args: z.tuple([z.string(), z.boolean()]),
    return: z.void(),
  },
  'config-get-all-pinned': {
    args: z.tuple([]),
    return: z.record(z.string(), z.boolean()),
  },
  'config-get-all-muted': {
    args: z.tuple([]),
    return: z.record(z.string(), z.boolean()),
  },
  'config-is-notifications-enabled': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'config-set-notifications-enabled': {
    args: z.tuple([z.string(), z.boolean()]),
    return: z.void(),
  },
  'config-get-all-notifications-enabled': {
    args: z.tuple([]),
    return: z.record(z.string(), z.boolean()),
  },
  'config-get-notification-count': {
    args: z.tuple([z.string()]),
    return: z.number(),
  },
  'config-set-notification-count': {
    args: z.tuple([z.string(), z.number()]),
    return: z.void(),
  },
  'config-get-all-notification-counts': {
    args: z.tuple([]),
    return: z.record(z.string(), z.number()),
  },
  'config-increment-notification-count': {
    args: z.tuple([z.string()]),
    return: z.number(),
  },
  'config-clear-notification-count': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'config-get-global-notifications-enabled': {
    args: z.tuple([]),
    return: z.boolean(),
  },
  'config-set-global-notifications-enabled': {
    args: z.tuple([z.boolean()]),
    return: z.void(),
  },
  'config-get-custom-platforms': {
    args: z.tuple([]),
    return: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        logoUrl: z.string(),
        faviconUrl: z.string().optional(),
        category: z.string(),
        description: z.string(),
        rating: z.number(),
        downloads: z.string(),
        gradient: z.string(),
        features: z.array(z.string()),
      })
    ),
  },
  'config-set-custom-platforms': {
    args: z.tuple([
      z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          url: z.string(),
          logoUrl: z.string(),
          faviconUrl: z.string().optional(),
          category: z.string(),
          description: z.string(),
          rating: z.number(),
          downloads: z.string(),
          gradient: z.string(),
          features: z.array(z.string()),
        })
      ),
    ]),
    return: z.void(),
  },
  'config-add-custom-platform': {
    args: z.tuple([
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        logoUrl: z.string(),
        faviconUrl: z.string().optional(),
        category: z.string(),
        description: z.string(),
        rating: z.number(),
        downloads: z.string(),
        gradient: z.string(),
        features: z.array(z.string()),
      }),
    ]),
    return: z.void(),
  },
  'config-remove-custom-platform': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'config-get-adblocker': {
    args: z.tuple([]),
    return: z.string(),
  },
  'config-set-adblocker': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'config-get-platform-order': {
    args: z.tuple([]),
    return: z.array(z.string()),
  },
  'config-set-platform-order': {
    args: z.tuple([z.array(z.string())]),
    return: z.void(),
  },
  // Download handlers
  'download-get-all': {
    args: z.tuple([]),
    return: z.array(
      z.object({
        id: z.string(),
        url: z.string(),
        filename: z.string(),
        path: z.string(),
        totalBytes: z.number(),
        receivedBytes: z.number(),
        state: z.enum(['progressing', 'completed', 'cancelled', 'interrupted', 'paused']),
        startTime: z.number(),
        endTime: z.number().optional(),
        mimeType: z.string().optional(),
        error: z.string().optional(),
        downloadRateBytesPerSecond: z.number().optional(),
        estimatedTimeRemainingSeconds: z.number().optional(),
        percentCompleted: z.number().optional(),
      })
    ),
  },
  'download-get': {
    args: z.tuple([z.string()]),
    return: z
      .object({
        id: z.string(),
        url: z.string(),
        filename: z.string(),
        path: z.string(),
        totalBytes: z.number(),
        receivedBytes: z.number(),
        state: z.enum(['progressing', 'completed', 'cancelled', 'interrupted', 'paused']),
        startTime: z.number(),
        endTime: z.number().optional(),
        mimeType: z.string().optional(),
        error: z.string().optional(),
        downloadRateBytesPerSecond: z.number().optional(),
        estimatedTimeRemainingSeconds: z.number().optional(),
        percentCompleted: z.number().optional(),
      })
      .optional(),
  },
  'download-pause': {
    args: z.tuple([z.string()]),
    return: z.any().optional(),
  },
  'download-resume': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-cancel': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-remove': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-open': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-show-in-folder': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-clear-completed': {
    args: z.tuple([]),
    return: z.number(),
  },
  'download-get-path': {
    args: z.tuple([]),
    return: z.string(),
  },
  'download-set-path': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-select-path': {
    args: z.tuple([]),
    return: z.union([z.string(), z.null()]),
  },
  'download-init-path': {
    args: z.tuple([]),
    return: z.string(),
  },
  'download-get-state': {
    args: z.tuple([]),
    return: z.object({
      activeCount: z.number(),
      totalProgress: z.number(),
      hasCompleted: z.boolean(),
      hasNewCompleted: z.boolean(),
    }),
  },
  'download-get-active-count': {
    args: z.tuple([]),
    return: z.number(),
  },
  'download-is-in-progress': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-is-paused': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-is-resumable': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-is-cancelled': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-is-interrupted': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
  'download-is-completed': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
} as const

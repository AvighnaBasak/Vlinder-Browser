import { z } from 'zod'

export const appIpcSchema = {
  version: {
    args: z.tuple([]),
    return: z.string(),
  },
  'webview-title-updated': {
    args: z.tuple([z.string(), z.string()]), // platformId, title
    return: z.void(),
  },
  'is-default-browser': {
    args: z.tuple([]),
    return: z.boolean(),
  },
  'set-default-browser': {
    args: z.tuple([]),
    return: z.object({
      success: z.boolean(),
      error: z.string().nullable(),
    }),
  },
  'mark-background-url': {
    args: z.tuple([z.string()]), // url
    return: z.void(),
  },
}

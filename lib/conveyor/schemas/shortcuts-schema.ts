import { z } from 'zod'

// Shortcut action schema
const ShortcutActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortcut: z.string(),
  category: z.string(),
  originalShortcut: z.string().optional(),
})

// Shortcuts IPC schema
export const shortcutsIpcSchema = {
  'shortcuts:get-all': {
    args: z.tuple([]),
    return: z.array(ShortcutActionSchema),
  },
  'shortcuts:set': {
    args: z.tuple([z.string(), z.string()]), // actionId, shortcut
    return: z.boolean(),
  },
  'shortcuts:reset': {
    args: z.tuple([z.string()]), // actionId
    return: z.boolean(),
  },
} as const

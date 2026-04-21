import { z } from 'zod'

const CredentialId = z.string()

export const CredentialSummarySchema = z.object({
  id: CredentialId,
  origin: z.string(),
  username: z.string(),
  createdAt: z.string(),
})

export const CredentialSchema = CredentialSummarySchema.extend({
  password: z.string(),
})

export const CsvRowSchema = z.object({
  name: z.string().optional(),
  url: z.string(),
  username: z.string(),
  password: z.string(),
  note: z.string().optional(),
})

export const passwordsIpcSchema = {
  'passwords:list': {
    args: z.tuple([z.string().optional()]),
    return: z.array(CredentialSummarySchema),
  },
  'passwords:get': {
    args: z.tuple([z.string()]),
    return: CredentialSchema,
  },
  'passwords:save': {
    args: z.tuple([z.object({ origin: z.string(), username: z.string(), password: z.string() })]),
    return: z.void(),
  },
  'passwords:update': {
    args: z.tuple([
      z.string(),
      z.object({ username: z.string().optional(), password: z.string().optional() }),
    ]),
    return: z.void(),
  },
  'passwords:remove': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'passwords:importCsv': {
    args: z.tuple([z.array(CsvRowSchema)]),
    return: z.object({ imported: z.number(), skipped: z.number() }),
  },
  'passwords:findForUrl': {
    args: z.tuple([z.string()]),
    return: z.array(CredentialSummarySchema),
  },
  'passwords:verifyAuth': {
    args: z.tuple([]),
    return: z.boolean(),
  },
  'passwords:revealPassword': {
    args: z.tuple([z.string()]),
    return: z.union([z.string(), z.null()]),
  },
  'passwords:dismissSavePrompt': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'passwords:neverSaveForOrigin': {
    args: z.tuple([z.string()]),
    return: z.void(),
  },
  'passwords:isNeverSaveOrigin': {
    args: z.tuple([z.string()]),
    return: z.boolean(),
  },
} as const

export type PasswordsChannels = typeof passwordsIpcSchema

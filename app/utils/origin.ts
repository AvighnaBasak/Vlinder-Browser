export function normalizeOrigin(input: string): string {
  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./, '')
    const parts = host.split('.')
    const eTLDPlus1 = parts.length >= 2 ? parts.slice(-2).join('.') : host
    return `${u.protocol}//${eTLDPlus1}`
  } catch {
    return input
  }
}

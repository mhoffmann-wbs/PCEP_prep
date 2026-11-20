// Playground permalinks keep the code in the URL hash (#code=<base64url>), so a
// link carries the program without a server.
const PREFIX = '#code='

export function encodeCode(code: string): string {
  const bytes = new TextEncoder().encode(code)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The code in a permalink hash, or null if the hash isn't one (or is damaged). */
export function decodeCode(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const binary = atob(hash.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/'))
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
  } catch {
    return null
  }
}

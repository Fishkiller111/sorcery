/** In-memory session reveal for R-rated media / agents / worlds (cleared on app reload). */

const revealedKeys = new Set<string>()

export function mediaRevealKey(kind: 'media' | 'post' | 'role' | 'world' | 'simulator', id: string): string {
  return `${kind}:${id}`
}

export function isSessionRevealed(key: string): boolean {
  return revealedKeys.has(key)
}

export function markSessionRevealed(key: string): void {
  if (key) revealedKeys.add(key)
}

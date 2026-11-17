import { withSystem } from '../db-core'
import { keyedHash } from '../crypto'

/** Vaste-vensterlimiet in de database. Werkt ook over meerdere serverinstanties. */
export async function hitRateLimit(scope: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const bucket = `${scope}:${keyedHash(key)}`
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000)
  const [row] = await withSystem((tx) => tx<{ hits: number }[]>`
    insert into rate_limits (bucket, window_start, hits) values (${bucket}, ${windowStart}, 1)
    on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
    returning hits`)
  return (row?.hits ?? 0) <= limit
}

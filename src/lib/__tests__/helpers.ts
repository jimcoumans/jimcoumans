import assert from 'node:assert/strict'
import { isConstraintViolation, describeLedgerDbError } from '../db-errors'

/**
 * Drizzle wrapt driver-fouten, waardoor de constraint-naam niet in
 * error.message staat. assert.rejects met een regex werkt daarom niet;
 * deze helper kijkt op de juiste plek in de cause-keten.
 */
export async function assertViolatesConstraint(
  fn: () => Promise<unknown>,
  constraint: string,
): Promise<void> {
  try {
    await fn()
  } catch (error) {
    assert.ok(
      isConstraintViolation(error, constraint),
      `verwachtte schending van ${constraint}, kreeg: ${String(error)}`,
    )
    assert.ok(
      describeLedgerDbError(error),
      `${constraint} hoort een leesbare foutmelding te hebben`,
    )
    return
  }
  assert.fail(`verwachtte een schending van ${constraint}, maar de query slaagde`)
}

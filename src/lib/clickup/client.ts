/**
 * Minimale ClickUp-client. Alleen de aanroepen die de wallet nodig heeft.
 *
 * Bewust geen sdk: de ClickUp-API is een paar GET-verzoeken, en een sdk
 * erbij betekent weer een afhankelijkheid die kan breken bij een update.
 */

const BASE = 'https://api.clickup.com/api/v2'

export type ClickUpCustomField = {
  id: string
  name: string
  type: string
  value?: unknown
  type_config?: { options?: { id: string; name: string }[] }
}

export type ClickUpTask = {
  id: string
  name: string
  status?: { status: string; type: string }
  date_created?: string
  date_closed?: string | null
  date_done?: string | null
  due_date?: string | null
  time_estimate?: number | null
  custom_fields?: ClickUpCustomField[]
  url?: string
}

export class ClickUpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export class ClickUpClient {
  constructor(private readonly token: string) {
    if (!token) throw new ClickUpError('CLICKUP_API_TOKEN ontbreekt.')
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
      headers: { Authorization: this.token, 'Content-Type': 'application/json' },
      // Nooit uit de cache: dit zijn financiele brongegevens.
      cache: 'no-store',
    })

    if (response.status === 429) {
      throw new ClickUpError('ClickUp rate limit geraakt. Probeer het later opnieuw.', 429)
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new ClickUpError(
        `ClickUp gaf ${response.status} op ${path}: ${body.slice(0, 200)}`,
        response.status,
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Alle taken uit een lijst, inclusief afgeronde. ClickUp levert honderd
   * taken per pagina, dus we lopen door tot de laatste pagina.
   */
  async listTasks(listId: string): Promise<ClickUpTask[]> {
    const alle: ClickUpTask[] = []

    for (let page = 0; page < 100; page++) {
      const data = await this.get<{ tasks: ClickUpTask[]; last_page?: boolean }>(
        `/list/${listId}/task?page=${page}&include_closed=true&subtasks=true`,
      )

      alle.push(...data.tasks)

      if (data.last_page || data.tasks.length === 0) break
    }

    return alle
  }
}

/* --------------------------- Veldwaarden lezen --------------------------- */

/** Zoekt een custom field op naam. ClickUp-veldnamen zijn niet uniek per type. */
export function findField(
  task: ClickUpTask,
  naam: string,
): ClickUpCustomField | undefined {
  return task.custom_fields?.find((f) => f.name.toLowerCase() === naam.toLowerCase())
}

/**
 * Leest een currency- of number-veld als getal.
 * ClickUp levert deze soms als string, soms als number.
 */
export function readNumber(task: ClickUpTask, naam: string): number | null {
  const value = findField(task, naam)?.value
  if (value === null || value === undefined || value === '') return null

  const getal = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(getal) ? getal : null
}

/** Leest de gekozen optie van een dropdown als tekst. */
export function readDropdown(task: ClickUpTask, naam: string): string | null {
  const field = findField(task, naam)
  if (!field || field.value === null || field.value === undefined) return null

  const opties = field.type_config?.options ?? []

  // ClickUp geeft bij een dropdown soms het optie-id, soms de index.
  if (typeof field.value === 'string') {
    const opOhId = opties.find((o) => o.id === field.value)
    if (opOhId) return opOhId.name
    return field.value
  }
  if (typeof field.value === 'number') {
    return opties[field.value]?.name ?? null
  }

  return null
}

/** Leest een relatie-veld als lijst van gekoppelde task-ids. */
export function readRelationIds(task: ClickUpTask, naam: string): string[] {
  const value = findField(task, naam)?.value
  if (!Array.isArray(value)) return []

  return value
    .map((item) =>
      typeof item === 'string'
        ? item
        : typeof item === 'object' && item !== null && 'id' in item
          ? String((item as { id: unknown }).id)
          : null,
    )
    .filter((id): id is string => id !== null)
}

/** Zet een ClickUp-tijdstempel (milliseconden als string) om naar een Date. */
export function readTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null
  const ms = Number(value)
  if (!Number.isFinite(ms)) return null
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? null : date
}

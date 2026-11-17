import { Badge } from './ui'
import { STATUS_LABEL } from '@/lib/labels'

const TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'danger' | 'forest'> = {
  new: 'neutral', needs_info: 'warn', researching: 'forest', awaiting_approval: 'warn', arranging: 'forest',
  confirmed: 'ok', completed: 'ok', closed: 'neutral', rejected: 'danger', cancelled: 'neutral',
}

export function RequestStatus({ status }: { status: string }) {
  return <Badge tone={TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Badge>
}

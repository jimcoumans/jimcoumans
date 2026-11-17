import Link from 'next/link'

export function Field({ label, name, hint, children, required }: { label: string; name: string; hint?: string; children?: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="label">{label}{required && <span aria-hidden className="text-muted"> *</span>}</label>
      {children}
      {hint && <p id={`${name}-hint`} className="hint">{hint}</p>}
    </div>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return <input id={props.id ?? props.name} className="field" {...props} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  return <textarea id={props.id ?? props.name} className="field min-h-[120px] leading-relaxed" {...props} />
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string; options: [string, string][] }) {
  return (
    <select id={props.id ?? props.name} className="field" {...props}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

export function Checkbox({ name, label, defaultChecked, required, value = 'on' }: { name: string; label: React.ReactNode; defaultChecked?: boolean; required?: boolean; value?: string }) {
  return (
    <label className="mb-3 flex cursor-pointer items-start gap-3 text-[15px] leading-snug">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} required={required} className="mt-0.5 h-5 w-5 shrink-0 accent-forest" />
      <span>{label}</span>
    </label>
  )
}

const TONES = {
  neutral: 'bg-canvas text-ink border-line',
  ok: 'bg-ok-soft text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  forest: 'bg-forest-soft text-forest border-forest/20',
} as const

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${TONES[tone]}`}>{children}</span>
}

export function Notice({ children, tone = 'neutral', title }: { children: React.ReactNode; tone?: keyof typeof TONES; title?: string }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${TONES[tone]}`}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      {children}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      <p className="font-serif text-2xl">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageTitle({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[34px] leading-tight sm:text-[40px]">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-[15px] text-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="card mb-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[24px] leading-tight">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function DL({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="mb-1 sm:mb-0">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="font-medium text-forest underline decoration-forest/30 hover:decoration-forest">{children}</Link>
}

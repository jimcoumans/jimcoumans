import next from 'eslint-config-next'

const config = [
  ...next,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
]

export default config

import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {ESLint} from 'eslint'

// Compare with the reviewed main snapshot, without suppressing its existing rules.
const base = '96958dc2540afb6d17e3a0028ce091d2d514e96e'
const eslint = new ESLint()
const current = await eslint.lintFiles(['.'])
const diagnostics = result => result.messages.map(message => ({
  file: path.relative(process.cwd(), result.filePath).split(path.sep).join('/'),
  ...message,
}))
const baseline = []
for (const result of current.filter(result => result.messages.length)) {
  const file = path.relative(process.cwd(), result.filePath).split(path.sep).join('/')
  // New files have no baseline; all of their diagnostics remain failures.
  const exists = execFileSync('git', ['ls-tree', '--name-only', base, '--', file], {encoding: 'utf8'}).trim()
  if (!exists) continue
  const source = execFileSync('git', ['show', `${base}:${file}`], {encoding: 'utf8'})
  baseline.push(...(await eslint.lintText(source, {filePath: result.filePath})).flatMap(diagnostics))
}
const previous = new Set(baseline.map(message => JSON.stringify(message)))
const messages = current.flatMap(diagnostics)
const added = messages.filter(message => !previous.has(JSON.stringify(message)))
console.log(JSON.stringify({
  base,
  errors: messages.filter(message => message.severity === 2).length,
  warnings: messages.filter(message => message.severity === 1).length,
  newDiagnostics: added,
}, null, 2))
if (added.length) process.exitCode = 1

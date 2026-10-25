import {registerHooks, createRequire} from 'node:module'
import {readFileSync, existsSync, statSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)

// Test-only loader: execute actual TSX pages with a read-only in-memory Sanity client.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/sanity/lib/operator-client' || specifier === './operator-client') return {url: 'fixture:operator-client', shortCircuit: true}
    if (specifier === '@/sanity/lib/stripe') return {url: 'fixture:stripe', shortCircuit: true}
    if (specifier === '@/sanity/lib/client') return {url: 'fixture:sanity-client', shortCircuit: true}
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const target = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL))
      for (const candidate of [target, target + '.ts', target + '.tsx']) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          if (candidate === path.join(root, 'sanity', 'lib', 'client.ts')) return {url: 'fixture:sanity-client', shortCircuit: true}
          return {url: pathToFileURL(candidate).href, shortCircuit: true}
        }
      }
    }
    if (specifier.startsWith('next/')) return {url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true}
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'fixture:operator-client') return {format: 'module', source: 'export const getOperatorClient = () => globalThis.fixtureOperatorClient', shortCircuit: true}
    if (url === 'fixture:stripe') return {format: 'module', source: 'export const getStripe = () => globalThis.fixtureStripe', shortCircuit: true}
    if (url === 'fixture:sanity-client') return {format: 'module', source: 'export const client = {fetch: (...args) => globalThis.fixtureSanityFetch(...args)}', shortCircuit: true}
    if (url.endsWith('.css')) return {format: 'module', source: '', shortCircuit: true}
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && fileURLToPath(url).startsWith(root)) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX},
      }).outputText
      return {format: 'module', source, shortCircuit: true}
    }
    return nextLoad(url, context)
  },
})

import {registerHooks, createRequire} from 'node:module'
import {readFileSync, existsSync, statSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
// Resolve before installing hooks: newer Node releases hook require.resolve too.
const nextModules = new Map(['next/link', 'next/navigation', 'next/server', 'next/image'].map(specifier =>
  [specifier, pathToFileURL(require.resolve(specifier)).href]
))

// Test-only loader: execute actual TSX pages with a read-only in-memory Sanity client.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return {url: 'fixture:empty', shortCircuit: true}
    if (specifier === '@sanity/client') return {url: 'fixture:sanity-sdk', shortCircuit: true}
    if (specifier === '@/sanity/lib/operator-client' || specifier === './operator-client') return {url: 'fixture:operator-client', shortCircuit: true}
    if ((specifier === '@/sanity/lib/stripe' || specifier === './stripe')) return {url: 'fixture:stripe', shortCircuit: true}
    if (specifier === '@/sanity/lib/twilio' || specifier === './twilio') return {url: 'fixture:twilio', shortCircuit: true}
    if (specifier === '@/sanity/lib/client') return {url: 'fixture:sanity-client', shortCircuit: true}
    if (specifier === './mail-provider' || specifier === '@/sanity/lib/mail-provider') return {url:'fixture:mail-provider',shortCircuit:true}
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const target = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL))
      for (const candidate of [target, target + '.ts', target + '.tsx']) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          if (candidate === path.join(root, 'sanity', 'lib', 'client.ts')) return {url: 'fixture:sanity-client', shortCircuit: true}
          return {url: pathToFileURL(candidate).href, shortCircuit: true}
        }
      }
    }
    if (nextModules.has(specifier)) return {url: nextModules.get(specifier), shortCircuit: true}
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === 'fixture:empty') return {format: 'module', source: '', shortCircuit: true}
    if (url === 'fixture:sanity-sdk') return {format: 'module', source: 'export const createClient = config => {globalThis.fixtureWriterConfigs?.push(config); return globalThis.fixtureOperatorClient}', shortCircuit: true}
    if (url === 'fixture:operator-client') return {format: 'module', source: 'export const getOperatorClient = () => globalThis.fixtureOperatorClient', shortCircuit: true}
    if (url === 'fixture:stripe') return {format: 'module', source: 'export const getStripe = () => globalThis.fixtureStripe', shortCircuit: true}
    if (url === 'fixture:twilio') return {format: 'module', source: 'export const getTwilio = () => globalThis.fixtureTwilio', shortCircuit: true}
    if (url === 'fixture:sanity-client') return {format: 'module', source: 'export const client = {fetch: (...args) => globalThis.fixtureSanityFetch(...args)}', shortCircuit: true}
    if (url === 'fixture:mail-provider') return {format:'module',source:`export * from ${JSON.stringify(pathToFileURL(path.join(root,'sanity/lib/mail-provider.ts')).href)}; import {getMailProvider as realProvider,getMailCapabilities as realCapabilities} from ${JSON.stringify(pathToFileURL(path.join(root,'sanity/lib/mail-provider.ts')).href)}; export const getMailProvider=()=>globalThis.fixtureMailProvider||realProvider(); export const getMailCapabilities=()=>globalThis.fixtureMailProvider?.capabilities||realCapabilities();`,shortCircuit:true}
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

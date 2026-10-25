import {registerHooks, createRequire} from 'node:module'
import {readFileSync, existsSync, statSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const nextModules = new Map(['next/link', 'next/navigation', 'next/server'].map(name => [name, pathToFileURL(require.resolve(name)).href]))

registerHooks({
  resolve(specifier, context, nextResolve) {
    const fixtures = {'server-only': 'empty', '@sanity/client': 'sanity-sdk', twilio: 'twilio', '@/sanity/lib/stripe': 'stripe',
      '@/sanity/lib/client': 'public-client', '@/sanity/lib/operational-client': 'operational-client'}
    if (fixtures[specifier]) return {url: 'fixture:' + fixtures[specifier], shortCircuit: true}
    if (specifier.startsWith('@/') || specifier.startsWith('.')) {
      const target = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : fileURLToPath(new URL(specifier, context.parentURL))
      for (const candidate of [target, target + '.ts', target + '.tsx']) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return {url: pathToFileURL(candidate).href, shortCircuit: true}
      }
    }
    if (nextModules.has(specifier)) return {url: nextModules.get(specifier), shortCircuit: true}
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    const fixtures = {
      'fixture:empty': '',
      'fixture:sanity-sdk': 'export const createClient = config => {globalThis.fixtureWriterConfigs?.push(config); return new Proxy({}, {get: (_t,key) => globalThis.fixtureOperationalClient[key]})}',
      'fixture:operational-client': 'export const getOperationalClient = () => globalThis.fixtureOperationalClient',
      'fixture:public-client': 'export const client = {fetch: (...args) => globalThis.fixtureSanityFetch(...args)}',
      'fixture:stripe': 'export const stripe = new Proxy({}, {get: (_t,key) => globalThis.fixtureStripe[key]})',
      'fixture:twilio': 'export default () => new Proxy({}, {get: (_t,key) => globalThis.fixtureTwilio[key]})',
    }
    if (Object.hasOwn(fixtures, url)) return {format: 'module', source: fixtures[url], shortCircuit: true}
    if (url.endsWith('.css')) return {format: 'module', source: '', shortCircuit: true}
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && fileURLToPath(url).startsWith(root)) {
      return {format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX},
      }).outputText, shortCircuit: true}
    }
    return nextLoad(url, context)
  },
})

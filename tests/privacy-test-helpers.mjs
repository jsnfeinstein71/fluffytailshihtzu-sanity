import {readFileSync} from 'node:fs'
import ts from 'typescript'

// Read the real main-branch GROQ literals without copying Phase 1's inventory implementation.
export function sourceQueries(file) {
  const source = ts.createSourceFile(file, readFileSync(new URL('../' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const result = {}
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text.endsWith('Query') && node.initializer &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) result[node.name.text] = node.initializer.text
    ts.forEachChild(node, visit)
  }
  visit(source)
  return result
}

import { TextDocument } from 'vscode-languageserver-textdocument'
import { SymbolInformation, SymbolKind } from 'vscode-languageserver/node'
import { Tree } from 'web-tree-sitter'
import { Context } from './context'
import { readDocumentFromUrl } from './io'
import {
  findParent,
  getDependencyUrl,
  getRange,
  isDefinition,
  isInclude,
  nodesGen,
} from './utils'

export type Symbols = { [name: string]: SymbolInformation[] }

const kinds: { [tree_sitter_type: string]: SymbolKind } = {
  func_def: SymbolKind.Function,
  assignment_exp: SymbolKind.Variable,
}

export function analyze(
  context: Context,
  document: TextDocument,
  deep: boolean,
): Array<{
  tree: Tree
  symbols: Symbols
  document: TextDocument
  dependencyUris: string[]
}> {
  const tree = context.parser.parse(document.getText())
  const symbols: { [name: string]: SymbolInformation[] } = {}
  const dependencies: TextDocument[] = []
  const dependencyUris: string[] = []

  for (const node of nodesGen(tree.rootNode)) {
    if (isInclude(node) && node.childCount === 2) {
      const url = getDependencyUrl(node, document.uri)

      dependencyUris.push(url.href)

      if (deep) {
        const text = readDocumentFromUrl(context, url)
        if (text) dependencies.push(text)
      }
    }

    if (!isDefinition(node)) continue

    if (node.firstNamedChild === null) break

    const name = node.firstNamedChild.text

    if (!symbols[name]) symbols[name] = []

    const parentFunc = findParent(node, (p) => p.type === 'func_def')

    symbols[name].push(
      SymbolInformation.create(
        name,
        kinds[node.type],
        getRange(node),
        document.uri,
        parentFunc?.firstNamedChild?.text || '',
      ),
    )
  }

  return [
    {
      tree,
      symbols,
      document,
      dependencyUris,
    },
  ].concat(dependencies.flatMap((d) => analyze(context, d, deep)))
}

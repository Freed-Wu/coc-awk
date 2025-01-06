import * as path from 'path'
//# #if HAVE_VSCODE
import { ExtensionContext, languages, SemanticTokensLegend } from 'vscode'
//# #elif HAVE_COC_NVIM
//# import { ExtensionContext, languages, SemanticTokensLegend } from 'coc.nvim'
//# #define Thenable Promise
//# #endif

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
//# #if HAVE_VSCODE
} from 'vscode-languageclient/node'
//# #elif HAVE_COC_NVIM
//# } from 'coc.nvim'
//# #endif
import { SemanticTokensProvider, tokenTypesLegend } from './semanticTokens'

let client: LanguageClient

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    process.env['AWK_SERVER_PATH'] ||
      path.join('node_modules', 'awk-language-server', 'out', 'server.js'),
  )

  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  // Add --prof for needs of profiling server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] }

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  }

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'awk' }],
    progressOnInitialization: true,
  }

  client = new LanguageClient('awk-ide-vscode', 'AWK IDE', serverOptions, clientOptions)

  client.onReady().then(() => {
    context.subscriptions.push(
      languages.registerDocumentSemanticTokensProvider(
        [{ language: 'awk' }],
        new SemanticTokensProvider(client),
        //# #if HAVE_VSCODE
        new SemanticTokensLegend(tokenTypesLegend, []),
        //# #elif HAVE_COC_NVIM
        //# {tokenTypes: tokenTypesLegend, tokenModifiers: []},
        //# #endif
      ),
    )
  })

  client.start()
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined
  }
  return client.stop()
}

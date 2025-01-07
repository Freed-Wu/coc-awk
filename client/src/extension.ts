import * as path from 'path'
import type { ExtensionContext as ExtensionContext_vscode } from 'vscode';
import type {
    LanguageClient as LanguageClient_vscode,
    LanguageClientOptions as LanguageClientOptions_vscode,
    ServerOptions as ServerOptions_vscode,
} from 'vscode-languageclient/node';
import type {
    ExtensionContext as ExtensionContext_coc,
    LanguageClient as LanguageClient_coc,
    LanguageClientOptions as LanguageClientOptions_coc,
    ServerOptions as ServerOptions_coc,
} from 'coc.nvim';
type LanguageClient = LanguageClient_vscode | LanguageClient_coc;
type LanguageClientOptions = LanguageClientOptions_vscode | LanguageClientOptions_coc;
type ServerOptions = ServerOptions_vscode | ServerOptions_coc;
type ExtensionContext = ExtensionContext_vscode | ExtensionContext_coc;
let vscode, vlc;
try {
    vscode = require('vscode');
    vlc = require('vscode-languageclient/node');
} catch (error) {
    vscode = require('coc.nvim');
    vlc = vscode;
}
const languages = vscode.languages;
const SemanticTokensLegend = vscode.SemanticTokensLegend;
const TransportKind = vlc.TransportKind;
const LanguageClient = vlc.LanguageClient;

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
    let legend;
    try {
      legend = new SemanticTokensLegend(tokenTypesLegend, []);
    } catch (error) {
      legend = {tokenTypes: tokenTypesLegend, tokenModifiers: []};
    }
    context.subscriptions.push(
      languages.registerDocumentSemanticTokensProvider(
        [{ language: 'awk' }],
        // @ts-expect-error
        new SemanticTokensProvider(client),
        legend,
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

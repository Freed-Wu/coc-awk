import type {
  CancellationToken as CancellationToken_vscode,
  DocumentSemanticTokensProvider as DocumentSemanticTokensProvider_vscode,
  TextDocument as TextDocument_vscode,
} from 'vscode';
import type {
  LanguageClient as LanguageClient_vscode
} from 'vscode-languageclient/node'
import type {
  CancellationToken as CancellationToken_coc,
  DocumentSemanticTokensProvider as DocumentSemanticTokensProvider_coc,
  TextDocument as TextDocument_coc,
  LanguageClient as LanguageClient_coc
} from 'coc.nvim'
type CancellationToken = CancellationToken_vscode | CancellationToken_coc;
type DocumentSemanticTokensProvider = DocumentSemanticTokensProvider_vscode | DocumentSemanticTokensProvider_coc;
type TextDocument = TextDocument_vscode | TextDocument_coc;
type LanguageClient = LanguageClient_vscode | LanguageClient_coc;
import {
  SemanticTokens,
  SemanticTokensBuilder,
} from 'vscode'
let vscode;
try {
    vscode = require('vscode');
} catch (error) {
    vscode = require('coc.nvim');
}


const tokenTypes = new Map<string, number>()

export const tokenTypesLegend = [
  'comment',
  'function',
  'keyword',
  'number',
  'operator',
  'regexp',
  'string',
  'variable',
  'namespace',
]

tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index))

interface UnencodedSemanticToken {
  line: number
  startChar: number
  length: number
  tokenType: string
  tokenModifiers: string[]
}

export class SemanticTokensProvider implements DocumentSemanticTokensProvider {
  private client: LanguageClient

  public constructor(client: LanguageClient) {
    this.client = client
  }

  async provideDocumentSemanticTokens(
    textDocument: TextDocument,
    token: CancellationToken,
  ): Promise<SemanticTokens> {
    const parsedTokens: UnencodedSemanticToken[] = await this.client.sendRequest(
      'getSemanticTokens',
      {
        // uri is of different type for TextDocument in vscode and on server
        textDocument: { ...textDocument, uri: textDocument.uri.toString() },
      },
    )

    const builder = new SemanticTokensBuilder()

    for (const token of parsedTokens) {
      builder.push(
        token.line,
        token.startChar,
        token.length,
        tokenTypes.get(token.tokenType) || 0,
        0,
      )
    }

    return builder.build()
  }
}

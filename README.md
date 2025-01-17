# Textwell MCP Server

TextwellとMCP（Model Context Protocol）を統合するためのサーバー実装です。

## 必要条件

- [Volta](https://volta.sh) - Node.jsバージョンマネージャー
- [GitHub Pages](https://pages.github.com/) - テキスト転送用のブリッジページをホスト

## セットアップ

1. Voltaをインストール（まだの場合）:
```bash
curl https://get.volta.sh | bash
```

2. プロジェクトをクローン:
```bash
git clone <repository-url>
cd textwell-mcp
```

Voltaが自動的に正しいバージョンのNode.jsとnpmをインストールします。

3. 依存関係のインストール:
```bash
npm install
```

4. ビルド:
```bash
npm run build
```

## 開発

開発サーバーの起動:
```bash
npm run dev
```

## 本番環境

本番環境での実行:
```bash
npm start
```

## GitHub Pagesのセットアップ

1. リポジトリの設定でGitHub Pagesを有効化
2. `docs/index.html`をブリッジページとして公開
3. 公開されたURLを使用してTextwell Actionを設定

## MCPツール

### setup-textwell

Textwellにアクションを追加します。

```typescript
{
  name: 'setup-textwell',
  description: 'Set up Textwell with required actions',
  inputSchema: {
    type: 'object',
    properties: {
      bridgeUrl: {
        type: 'string',
        description: 'URL of the GitHub Pages bridge'
      }
    },
    required: ['bridgeUrl']
  }
}
```

### write-text

Textwellにテキストを書き込みます。

```typescript
{
  name: 'write-text',
  description: 'Write text to Textwell',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to write'
      },
      mode: {
        type: 'string',
        enum: ['replace', 'insert', 'add'],
        description: 'How to write - replace all, insert at cursor, or append to end'
      }
    },
    required: ['text']
  }
}

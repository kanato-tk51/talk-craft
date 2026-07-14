# Talk Craft

外部の対話AIを使った英会話学習の「予習・実践・復習」をつなぐ、プロバイダー非依存の学習管理Webアプリです。

## 現在の実装範囲

最初の縦切りとして、次を実装しています。

- 英会話セッションの作成と一覧・詳細表示
- セッションで使いたい表現の登録
- 汎用の会話開始／振り返り出力プロンプトの生成とスナップショット保存
- 外部AIサービスへ持ち出すプロンプトのコピー

JSONインポート、復習編集、認証は設計済みで、後続マイルストーンで実装します。

## ドキュメント

- [プロダクト・技術設計](docs/product-design.md)
- [外部AI出力 JSON Schema v1](docs/schemas/session-review.v1.schema.json)
- [API設計](docs/api/openapi.yaml)

## ローカル起動

```bash
cp .env.example .env
npm install
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

`http://localhost:3000` を開いてください。詳しい前提とトラブルシュートは[ローカル開発環境](docs/product-design.md#21-ローカル開発環境の構築手順)を参照してください。

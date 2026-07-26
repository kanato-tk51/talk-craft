# Cloudflareへの本番デプロイ

Talk CraftはCloudflare Workers上で動かし、Cloudflare Accessで指定した1つのメールアドレスだけを許可します。`main`へのpushはCloudflare Workers Buildsが検知し、自動的に本番へ反映します。

## 構成

```text
GitHub main
  └─ Cloudflare Workers Builds
       └─ Talk Craft Worker
            ├─ Cloudflare Access（メール完全一致）
            ├─ Access JWTのアプリ内再検証
            └─ PostgreSQL
```

アプリはCloudflareが追加する`Cf-Access-Jwt-Assertion`を検証します。署名だけでなく、Access teamのissuer、Application Audience、許可メールアドレスも確認します。開発環境だけは従来どおり`DEV_USER_ID`を使用します。

## 1. 本番PostgreSQLを準備する

Cloudflare WorkersはPostgreSQL自体を提供しないため、外部のPostgreSQLが必要です。無料枠のあるサービスを使用できます。接続URLはインターネットから到達可能で、TLSを有効にしてください。

本番ユーザー用の固定UUIDを一度だけ生成します。

```bash
node -e 'console.log(crypto.randomUUID())'
```

`.env.production.example`を`.env.production.local`へコピーし、次を設定します。

- `DATABASE_URL`: 本番PostgreSQLの接続URL
- `APP_USER_ID`: 生成したUUID
- `AUTHORIZED_EMAIL`: Cloudflare Accessで許可する本人のメール
- `APP_USER_NAME`: 表示用の名前

`.env.production.local`はGit管理対象外です。設定後、migrationと本人ユーザーの登録を実行します。

```bash
DOTENV_CONFIG_PATH=.env.production.local npm run db:migrate
DOTENV_CONFIG_PATH=.env.production.local npm run db:seed
```

`APP_USER_ID`と`AUTHORIZED_EMAIL`は、後でCloudflareへ登録する値と必ず一致させます。

## 2. Cloudflare Accessを準備する

1. Cloudflare DashboardでZero Trustを開き、team nameを作成します。
2. `Zero Trust > Integrations > Identity providers`で`One-time PIN`を追加します。
3. `Workers & Pages`でWorkerを作成し、名前を`talk-craft`にします。リポジトリ内の`wrangler.jsonc`と同じ名前が必要です。
4. Workerの`Settings > Domains & Routes`で`workers.dev`のCloudflare Accessを有効にします。
5. Access policyを次のように設定します。
   - Action: `Allow`
   - Include selector: `Emails`
   - Value: 本人のメールアドレス1件
6. `Emails ending in`や`Everyone`は使用しません。
7. Access Applicationの画面で次の値を確認します。
   - Team domain: `https://<team-name>.cloudflareaccess.com`
   - Application Audience（AUD）

最初のWorker作成直後は仮の内容ですが、Accessを有効にしてからGitHubを接続します。

## 3. Workerの実行時変数を設定する

Workerの`Settings > Variables and Secrets`に以下を追加します。

| 名前 | 種別 | 値 |
| --- | --- | --- |
| `DATABASE_URL` | Secret | 本番PostgreSQL接続URL |
| `APP_ENV` | Text | `production` |
| `APP_USER_ID` | Text | seedで使った固定UUID |
| `AUTHORIZED_EMAIL` | Text | Accessで許可したメール |
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | Text | Accessのteam domain |
| `CLOUDFLARE_ACCESS_AUD` | Text | Access ApplicationのAUD |

`DATABASE_URL`は必ずSecretとして登録します。`wrangler.jsonc`の`keep_vars`により、Git連携から再デプロイしてもDashboardで管理する値は維持されます。

## 4. GitHubとWorkers Buildsを接続する

Workerの`Settings > Build`からGitリポジトリを接続します。

1. Git providerにGitHubを選択します。
2. Cloudflare GitHub Appに`kanato-tk51/talk-craft`へのアクセスを許可します。
3. Repositoryに`kanato-tk51/talk-craft`を選択します。
4. Production branchを`main`にします。
5. Build settingsを次の値にします。

| 項目 | 値 |
| --- | --- |
| Root directory | `/` |
| Build command | `npm run build:worker` |
| Deploy command | `npm run deploy:worker` |
| Node.js | `.node-version`により22 |

6. `Builds for non-production branches`は最初は無効にします。Preview URLを使う場合は、そのURLにもAccessを有効にしてから利用します。
7. API tokenはWorkers Buildsが自動生成する設定で構いません。

接続後に最初のbuildを実行します。以後は`main`へのpush、またはPRの`main`へのマージごとに、build成功後のWorkerが本番へ自動反映されます。

## 5. 動作確認

次をすべて確認します。

1. 本人のメールでOTPを受け取り、アプリを操作できる。
2. シークレットウィンドウでは、アプリより先にAccessのログイン画面が表示される。
3. 別のメールアドレスにはOTPが届かず、アクセスできない。
4. ログイン後に`/api/health`が`{"status":"ok"}`を返す。
5. `main`へ小さな変更をマージするとWorkers Buildsが起動し、成功後に本番へ反映される。

## ローカル確認

通常の開発は従来どおりです。

```bash
npm run dev
```

Cloudflare Workersと同じ`workerd`環境で確認する場合は、`.dev.vars.example`を`.dev.vars`へコピーしてから実行します。

```bash
npm run preview
```

## 将来の改善

利用量やDB接続数が増えた場合は、Cloudflare Hyperdriveを追加します。HyperdriveはWorkers Freeでも1日10万クエリまで利用でき、PostgreSQL接続をCloudflare側でプールできます。一人利用の初回デプロイでは、まず直接接続で動作を確認してから追加します。

## 公式資料

- [Cloudflare WorkersのNext.js対応](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Workers BuildsのGitHub連携](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Workers Buildsの設定](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [workers.devをCloudflare Accessで保護する](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare Access JWTを検証する](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

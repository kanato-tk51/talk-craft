# Cloudflareへの本番デプロイ

Talk CraftはCloudflare WorkersとCloudflare D1上で動かし、Cloudflare Accessで指定した1つのメールアドレスだけを許可します。`main`へのpushはCloudflare Workers Buildsが検知し、D1 migrationを適用してから本番Workerを更新します。

## 構成

```text
GitHub main
  └─ Cloudflare Workers Builds
       ├─ D1 migration
       └─ Talk Craft Worker
            ├─ Cloudflare Access（メール完全一致）
            ├─ Access JWTのアプリ内再検証
            └─ Cloudflare D1
```

アプリはCloudflareが追加する`Cf-Access-Jwt-Assertion`を検証します。署名だけでなく、Access teamのissuer、Application Audience、許可メールアドレスも確認します。認証済みユーザーは初回アクセス時にD1へ自動登録されるため、本番用のユーザーIDやseed処理は不要です。

## 1. D1データベースを作成する

ローカルでWranglerへログインし、D1を作成します。この操作に本番DBのパスワードや接続URLは必要ありません。

```bash
npx wrangler login
npx wrangler d1 create talk-craft-db --location apac
```

コマンド結果に表示された`database_id`を、`wrangler.jsonc`の`REPLACE_WITH_D1_DATABASE_ID`と置き換えてcommitします。D1のdatabase IDはbinding先を識別する値であり、認証情報ではありません。

`npm run db:migrate:remote`でも本番migrationを適用できますが、通常は後述のWorkers Buildsが自動実行します。DBスキーマを変更するときは、次の手順でSQLite migrationを生成してSQLをレビューします。

```bash
npm run db:generate
npm run db:migrate
```

## 2. WorkerとGitHubを接続する

1. Cloudflare Dashboardの`Workers & Pages`でWorkerを作成し、名前を`talk-craft`にします。
2. Workerの`Settings > Build`からGitHubを接続します。
3. Cloudflare GitHub Appに`kanato-tk51/talk-craft`へのアクセスを許可します。
4. Repositoryに`kanato-tk51/talk-craft`を選択します。
5. Production branchを`main`にします。
6. Build settingsを次の値にします。

| 項目 | 値 |
| --- | --- |
| Root directory | `/` |
| Build command | `npm run build:worker` |
| Deploy command | `npm run deploy:worker` |
| Node.js | `.node-version`により22 |

`npm run deploy:worker`は`npm run db:migrate:remote`を先に実行してからWorkerをデプロイします。これにより、`main`へmergeされたmigrationとアプリが同じdeploymentで反映されます。

最初は`Builds for non-production branches`を無効にします。Preview URLを利用する場合は、preview用D1とAccessの保護を別途設定してください。

## 3. Cloudflare Accessを準備する

1. Cloudflare DashboardでZero Trustを開き、team nameを作成します。
2. `Zero Trust > Integrations > Identity providers`で`One-time PIN`を追加します。
3. Workerの`Settings > Domains & Routes`で`workers.dev`のCloudflare Accessを有効にします。
4. Access policyを次のように設定します。
   - Action: `Allow`
   - Include selector: `Emails`
   - Value: 本人のメールアドレス1件
5. `Emails ending in`や`Everyone`は使用しません。
6. Access Applicationの画面で次の値を確認します。
   - Team domain: `https://<team-name>.cloudflareaccess.com`
   - Application Audience（AUD）

## 4. Workerの実行時変数を設定する

Workerの`Settings > Variables and Secrets`に以下をTextとして追加します。

| 名前 | 値 |
| --- | --- |
| `APP_ENV` | `production` |
| `AUTHORIZED_EMAIL` | Accessで許可した本人のメール |
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | Accessのteam domain |
| `CLOUDFLARE_ACCESS_AUD` | Access ApplicationのAUD |

DB接続URL、DBパスワード、`APP_USER_ID`、`APP_USER_NAME`は不要です。D1は`wrangler.jsonc`の`DB` bindingから利用し、本人ユーザーは検証済みAccess JWTのメールアドレスから自動作成します。`keep_vars`により、Dashboardで管理する変数はGit連携から再デプロイしても維持されます。

セッション作成時に一度に関連付けられる表現は20件です。これは[Workers Freeの1回の呼び出しあたりD1クエリ上限](https://developers.cloudflare.com/d1/platform/limits/)を超えないための制限です。

## 5. 最初のdeploymentと動作確認

`wrangler.jsonc`へ実際のD1 database IDをcommitして`main`へmergeすると、Workers Buildsがbuild、migration、deployを順に実行します。完了後に次を確認します。

1. 本人のメールでOTPを受け取り、アプリを操作できる。
2. 初回ログイン後、D1の`users`に本人ユーザーが自動作成される。
3. シークレットウィンドウでは、アプリより先にAccessのログイン画面が表示される。
4. 別のメールアドレスにはOTPが届かず、アクセスできない。
5. ログイン後に`/api/health`が`{"status":"ok"}`を返す。
6. `main`へ小さな変更をmergeするとWorkers Buildsが起動し、成功後に本番へ反映される。

## ローカル確認

通常の開発では、ローカルD1へmigrationを適用してからNext.jsを起動します。

```bash
npm run db:migrate
npm run dev
```

ローカルデータは`.wrangler/state`に保存されます。本番D1の情報やデータをローカルへコピーする必要はありません。Cloudflare Workersと同じ`workerd`環境で確認する場合は、`.dev.vars.example`を`.dev.vars`へコピーして次を実行します。

```bash
npm run preview
```

## 公式資料

- [Cloudflare D1を作成する](https://developers.cloudflare.com/d1/get-started/)
- [D1 migration](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 binding](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare WorkersのNext.js対応](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Workers BuildsのGitHub連携](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)
- [Workers Buildsの設定](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [workers.devをCloudflare Accessで保護する](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare Access JWTを検証する](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)

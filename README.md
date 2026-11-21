# 白井ソラのAIニュース リンク集

YouTube チャンネル「白井ソラのAIニュース」のプロフィールリンクです。スマホで開くことを前提にした静的ページで、広告タグもアクセス解析も入っていません。

## リンクを編集する

編集するのは `links.json` だけです。ページを再ビルドする必要はありません。保存して公開し直せば、並びと文言がそのまま反映されます。

各リンクは次の形です。

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `title` | はい | ボタンの見出し |
| `note` | はい | 短い説明（特典内容） |
| `url` | はい | 遷移先。空文字 `""` にすると「準備中」になり、押せません |
| `badge` | いいえ | 例: `招待特典` / `PR` / `動画で紹介` |
| `image` | いいえ | 左に出す画像。`assets/example.webp` のようなパス |

招待リンクを足す例:

```json
{
  "title": "サンプルツール",
  "note": "新規登録でクレジット付与",
  "url": "https://example.com/invite",
  "badge": "招待特典",
  "image": "assets/example.webp"
}
```

配列の順が表示順です。入れ替えたいときは、オブジェクトの順番を動かします。`url` が空、または `http` / `https` / `mailto` 以外のときは、壊れたリンクにはせず「準備中」と表示します。

チャンネル名、紹介文、セクション名、上部の PR 表示（`disclosure`）も同じファイルです。PR 表示はステルスマーケティング規制のための一文なので、消さずに残してください。

```text
※本ページにはアフィリエイトリンク・招待コードを含みます（PR）
```

SNS のクローラは JavaScript を実行しないため、ページタイトルと説明文は `index.html` の `<title>` と `meta` にも同じ文を書いてあります。タイトルや説明を変えるときだけ、`links.json` の `meta` と `index.html` の meta を揃えてください。リンクの追加・差し替えは `links.json` だけで足ります。

## キャラクター画像

- `assets/icon.png` … 丸いプロフィールアイコン。ファビコンにも使います。公式アイコンに差し替えるときは、このパスへ上書きします。
- `assets/icon.webp` … ページ内で読む軽いアイコンです。
- `assets/ogp.png` … 1200×630 の共有用画像（OGP）です。
- `assets/portrait.webp` … ヘッダーの立ち絵です。
- `assets/chibi-*.webp` … 手を振る、PR 表示を指す、考える、歩く、などのちびキャラです。

公式 PNG を更新するときは、次のどちらかに置いてからスクリプトを実行します。

```bash
python3 scripts/build_assets.py
python3 scripts/build_assets.py /path/to/hub_assets.zip
```

置き場所:

- `source/icon.png`
- `source/portrait/sora_full.png`
- `source/chibi/chibi_wave.png` のように、zip と同じファイル名

スクリプトは余白を切り、表示サイズまで縮小して WebP にします。歩くアニメは 4 フレームを 1 枚のスプライトにまとめています。端末の「視差効果を減らす」設定がオンのときは、歩きは止まって静止画になります。

## 手元で確認する

```bash
python3 -m http.server 43123
```

ブラウザで <http://127.0.0.1:43123> を開きます。`file://` で開くと `links.json` を読めないので、必ずローカルサーバー経由にしてください。

右上ではなく、バナー左上のボタンでライト / ダークを切り替えられます。最初の表示は端末の設定に従います。

## 無料で公開する

ビルドコマンドは不要です。リポジトリのルートが、そのまま公開フォルダです。

### GitHub Pages

必要なもの:

- GitHub アカウント
- このリポジトリを GitHub に push する
- リポジトリの Settings → Pages → Build and deployment を「Deploy from a branch」にし、Branch を `main`、フォルダを `/ (root)` にする

`.nojekyll` を入れてあるので、Jekyll の変換は走りません。独自ドメインは任意です。

### Cloudflare Pages

必要なもの:

- Cloudflare アカウント
- Git リポジトリの接続

設定:

- フレームワークプリセット: None
- ビルドコマンド: 空のまま
- ビルド出力ディレクトリ: `/`（環境によって `.`）

`_headers` で、共有キャッシュと基本的なセキュリティヘッダを付けています。

### Vercel

必要なもの:

- Vercel アカウント
- Git リポジトリの Import

設定:

- Framework Preset: Other
- Build Command: 空のまま
- Output Directory: デフォルト（リポジトリ直下）

`vercel.json` で同じヘッダを付けています。

### 公開後にひとつだけ

URL が決まったら、`index.html` の `og:image` と `twitter:image` を次のような絶対 URL にします。

```html
<meta property="og:image" content="https://あなたのドメイン/assets/ogp.png">
<meta property="og:url" content="https://あなたのドメイン/">
```

`links.json` の `meta.siteUrl` にも、同じオリジン（末尾スラッシュなし）を書いておくと、ページを開いたブラウザ側のメタ情報も絶対 URL になります。

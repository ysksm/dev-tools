# TeamCity Build Collector

TeamCityのビルドデータを収集・分析し、運用改善に役立つレポートを生成するツールです。

## 機能

- **ビルドデータ収集**: TeamCity REST APIを使用してビルド結果を収集
- **失敗分析**: ビルド失敗の原因とパターンを分析
- **フレイキーテスト検出**: 不安定なテストを自動検出
- **改善提案**: 運用改善のための推奨事項を自動生成
- **レポート出力**: JSON、CSV、Markdown、HTML形式でエクスポート

## インストール

```bash
npm install
npm run build
```

## 設定

### 環境変数

`.env.example`をコピーして`.env`を作成し、設定を行います：

```bash
cp .env.example .env
```

主な環境変数：

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `TEAMCITY_URL` | TeamCityサーバーURL | ✓ |
| `TEAMCITY_TOKEN` | 認証トークン | ※1 |
| `TEAMCITY_USERNAME` | ユーザー名 | ※1 |
| `TEAMCITY_PASSWORD` | パスワード | ※1 |
| `TEAMCITY_PROJECT_ID` | プロジェクトID | |
| `TEAMCITY_DAYS_BACK` | 収集期間（日数） | |
| `TEAMCITY_MAX_BUILDS` | 最大ビルド数 | |

※1: トークンまたはユーザー名/パスワードのいずれかが必要

### 設定ファイル

```bash
# 設定ファイルを初期化
npm start -- init

# または
npx tc-collect init
```

生成された`tc-collect.config.json`を編集して設定を行います。

## 使い方

### ビルドデータの収集と分析

```bash
# 基本的な使い方（環境変数から設定を読み込み）
npm start -- collect

# オプションを指定
npm start -- collect --url https://teamcity.example.com --token YOUR_TOKEN --days 14

# 特定のプロジェクトのみ
npm start -- collect --project MyProject

# 特定のビルドタイプのみ
npm start -- collect --build-type BuildType1 BuildType2

# HTML形式でレポート出力
npm start -- collect --format html --output ./reports
```

### ビルドタイプ一覧の表示

```bash
npm start -- list

# JSON形式で出力
npm start -- list --json

# 特定のプロジェクトのみ
npm start -- list --project MyProject
```

### 既存データの再分析

```bash
# 以前収集したJSONファイルを分析
npm start -- analyze ./reports/builds-2024-01-15.json

# 閾値をカスタマイズ
npm start -- analyze ./builds.json --flaky-threshold 15 --failure-threshold 25
```

## コマンドリファレンス

### `collect` - ビルドデータ収集

```
tc-collect collect [options]

オプション:
  -c, --config <path>       設定ファイルパス
  -u, --url <url>           TeamCityサーバーURL
  -t, --token <token>       認証トークン
  --username <username>     ユーザー名
  --password <password>     パスワード
  -p, --project <id>        プロジェクトIDでフィルタ
  -b, --build-type <ids...> ビルドタイプIDでフィルタ
  -d, --days <number>       収集期間（日数）[デフォルト: 7]
  -n, --count <number>      最大ビルド数 [デフォルト: 500]
  --branch <name>           ブランチでフィルタ
  -f, --format <format>     出力形式 (json|csv|markdown|html) [デフォルト: markdown]
  -o, --output <path>       出力ディレクトリ [デフォルト: ./reports]
  --include-running         実行中のビルドを含める
  --raw                     分析なしの生データをエクスポート
```

### `list` - ビルドタイプ一覧

```
tc-collect list [options]

オプション:
  -c, --config <path>       設定ファイルパス
  -u, --url <url>           TeamCityサーバーURL
  -t, --token <token>       認証トークン
  --username <username>     ユーザー名
  --password <password>     パスワード
  -p, --project <id>        プロジェクトIDでフィルタ
  --json                    JSON形式で出力
```

### `analyze` - 既存データの分析

```
tc-collect analyze <file> [options]

引数:
  file                      ビルドデータJSONファイル

オプション:
  -f, --format <format>     出力形式 [デフォルト: markdown]
  -o, --output <path>       出力ディレクトリ [デフォルト: ./reports]
  --flaky-threshold <n>     フレイキーテスト閾値（%）[デフォルト: 20]
  --failure-threshold <n>   高失敗率閾値（%）[デフォルト: 30]
```

### `init` - 設定ファイル初期化

```
tc-collect init [path] [options]

引数:
  path                      設定ファイルパス [デフォルト: ./tc-collect.config.json]

オプション:
  -f, --force               既存ファイルを上書き
```

## レポート内容

生成されるレポートには以下の情報が含まれます：

### サマリー
- 総ビルド数
- 成功率
- 平均ビルド時間
- 期間

### 改善提案（Recommendations）
- 高い失敗率のビルドタイプ
- フレイキーテスト
- よくある問題パターン
- インフラの問題
- 遅いビルド

### 詳細分析
- ビルドタイプ別統計
- よくある問題の一覧
- フレイキーテスト一覧
- 最近の失敗リスト

## プログラマティック利用

ライブラリとしても使用できます：

```typescript
import {
  TeamCityClient,
  BuildCollector,
  BuildAnalyzer,
  ReportGenerator,
} from 'teamcity-build-collector';

// クライアント作成
const client = new TeamCityClient({
  serverUrl: 'https://teamcity.example.com',
  authToken: 'your-token',
});

// ビルド収集
const collector = new BuildCollector(client);
const builds = await collector.collect({
  serverUrl: 'https://teamcity.example.com',
  projectId: 'MyProject',
  fromDate: new Date('2024-01-01'),
  toDate: new Date(),
});

// 分析
const analyzer = new BuildAnalyzer();
const stats = analyzer.analyze(builds);
const recommendations = analyzer.generateRecommendations(stats);

// レポート生成
const generator = new ReportGenerator();
const report = await generator.generateReport(stats, recommendations);
await generator.export(report, {
  format: 'html',
  outputPath: './report.html',
});
```

## ライセンス

MIT

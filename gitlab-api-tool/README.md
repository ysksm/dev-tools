# GitLab API Tool

GitLab Web APIを使用してプロジェクト一覧やマージリクエスト一覧を取得するCLIツールです。

## インストール

```bash
npm install
npm run build
```

## 環境変数の設定

以下の環境変数を設定してください：

```bash
export GITLAB_URL="https://gitlab.com"  # GitLabインスタンスのURL
export GITLAB_TOKEN="your-personal-access-token"  # GitLab Personal Access Token
```

Personal Access Tokenの取得方法：
1. GitLabの Settings > Access Tokens にアクセス
2. 新しいトークンを作成（スコープ: `read_api` が必要）

## 使用方法

### プロジェクト一覧の取得

```bash
# 基本的な使い方
npm run dev -- projects

# 自分が所有するプロジェクトのみ
npm run dev -- projects --owned

# メンバーとして参加しているプロジェクト
npm run dev -- projects --membership

# プロジェクト名で検索
npm run dev -- projects --search "my-project"

# 可視性でフィルタ
npm run dev -- projects --visibility private

# JSON形式で出力
npm run dev -- projects --json

# ページネーション
npm run dev -- projects --per-page 50 --page 2
```

### マージリクエスト一覧の取得

```bash
# 基本的な使い方（オープン状態のMRを取得）
npm run dev -- merge-requests
# または短縮形
npm run dev -- mrs

# 特定のプロジェクトのMR
npm run dev -- mrs -p my-group/my-project

# 状態でフィルタ（opened, closed, merged, locked, all）
npm run dev -- mrs --state all
npm run dev -- mrs --state merged

# 自分に割り当てられたMR
npm run dev -- mrs --scope assigned_to_me

# 自分が作成したMR
npm run dev -- mrs --scope created_by_me

# タイトル・説明で検索
npm run dev -- mrs --search "feature"

# ラベルでフィルタ
npm run dev -- mrs --labels "bug,urgent"

# 日付でフィルタ
npm run dev -- mrs --created-after "2024-01-01"
npm run dev -- mrs --updated-after "2024-06-01"

# JSON形式で出力
npm run dev -- mrs --json
```

## CLIオプション

### projects コマンド

| オプション | 説明 |
|------------|------|
| `--owned` | 自分が所有するプロジェクトのみ |
| `--membership` | メンバーとして参加しているプロジェクト |
| `--starred` | スター付きプロジェクト |
| `-s, --search <query>` | 名前で検索 |
| `-v, --visibility <type>` | 可視性フィルタ (private/internal/public) |
| `--archived` | アーカイブされたプロジェクトを含む |
| `--order-by <field>` | ソートフィールド |
| `--sort <direction>` | ソート順 (asc/desc) |
| `--per-page <count>` | 1ページあたりの件数 (デフォルト: 20) |
| `--page <number>` | ページ番号 (デフォルト: 1) |
| `--json` | JSON形式で出力 |

### merge-requests (mrs) コマンド

| オプション | 説明 |
|------------|------|
| `-p, --project <id>` | プロジェクトID またはパス |
| `--state <state>` | 状態フィルタ (opened/closed/merged/locked/all) |
| `--scope <scope>` | スコープ (created_by_me/assigned_to_me/all) |
| `--author-id <id>` | 作成者IDでフィルタ |
| `--assignee-id <id>` | 担当者IDでフィルタ |
| `--reviewer-id <id>` | レビュアーIDでフィルタ |
| `-s, --search <query>` | タイトル・説明で検索 |
| `-l, --labels <labels>` | ラベルでフィルタ (カンマ区切り) |
| `--created-after <date>` | 作成日でフィルタ (ISO 8601形式) |
| `--created-before <date>` | 作成日でフィルタ (ISO 8601形式) |
| `--updated-after <date>` | 更新日でフィルタ (ISO 8601形式) |
| `--updated-before <date>` | 更新日でフィルタ (ISO 8601形式) |
| `--order-by <field>` | ソートフィールド (created_at/updated_at) |
| `--sort <direction>` | ソート順 (asc/desc) |
| `--per-page <count>` | 1ページあたりの件数 (デフォルト: 20) |
| `--page <number>` | ページ番号 (デフォルト: 1) |
| `--json` | JSON形式で出力 |

## ライブラリとしての使用

このツールはライブラリとしても使用できます：

```typescript
import { GitLabClient } from 'gitlab-api-tool';

const client = new GitLabClient({
  baseUrl: 'https://gitlab.com',
  privateToken: 'your-token',
});

// プロジェクト一覧を取得
const projects = await client.listProjects({
  owned: true,
  perPage: 50,
});

// マージリクエスト一覧を取得
const mergeRequests = await client.listMergeRequests({
  projectId: 'my-group/my-project',
  state: 'opened',
});

// 特定のプロジェクトを取得
const project = await client.getProject('my-group/my-project');

// 特定のマージリクエストを取得
const mr = await client.getMergeRequest('my-group/my-project', 123);
```

## ライセンス

MIT

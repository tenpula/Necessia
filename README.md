# Research Gap Visualizer - CS Edition

情報工学（Computer Science）分野の研究者向け、論文間の引用関係を可視化するWebサービスです。

## 🚀 現在のフェーズ

**Phase 1: MVP（検索・表示のみ）** ✅

- arXiv URL、DOI、論文タイトルでの検索
- OpenAlex APIから引用リスト取得
- インタラクティブなグラフ可視化

## 🛠 技術スタック

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Graph Visualization:** React Flow (@xyflow/react)
- **Data Source:** OpenAlex API
- **Rate Limiting:** 自動レート制限管理（1秒あたり10リクエスト、1日10万リクエスト）

## 📦 セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定（オプション）
# プロジェクトルートに .env.local ファイルを作成し、以下を設定：
# OPENALEX_EMAIL=your-email@example.com
# メールアドレスを設定すると、OpenAlexの「polite pool」に参加でき、より安定したレスポンスが得られます

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

### 環境変数

`.env.local`ファイルを作成して、以下の環境変数を設定できます：

- `OPENALEX_EMAIL`: OpenAlex APIのメールアドレス（推奨）
  - 設定すると「polite pool」に参加し、より安定したレスポンスが得られます
  - 未設定の場合はデフォルト値が使用されます

## 🔍 使い方

1. 検索フォームにarXiv URL、DOI、または論文タイトルを入力
2. 「Visualize」ボタンをクリック
3. 引用ネットワークがグラフで表示される

### 対応入力形式

- **arXiv URL:** `https://arxiv.org/abs/1706.03762`
- **arXiv ID:** `1706.03762` または `arXiv:1706.03762`
- **DOI:** `10.48550/arXiv.1706.03762` または `https://doi.org/10.48550/arXiv.1706.03762`
- **タイトル:** `Attention Is All You Need`

## 🗺 ロードマップ

### Phase 2: Context & Caching（意味付け）
- [ ] LLM導入（引用文脈の分類：支持/批判/比較/背景）
- [ ] Firestoreへのキャッシュ機構

### Phase 3: Gap Finding & Upload（提案機能）
- [ ] PDFアップロード機能
- [ ] ベクトル検索による「Gap」提案機能

## 📄 ライセンス

MIT License

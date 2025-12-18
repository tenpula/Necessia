# Research Gap Visualizer - CS Edition

情報工学（Computer Science）分野の研究者向け、論文間の引用関係を可視化するWebサービスです。

## 🚀 現在のフェーズ

**Phase 2: Context & Caching（意味付け）** ✅

- ✅ arXiv URL、DOI、論文タイトルでの検索
- ✅ OpenAlex APIから引用リスト取得
- ✅ インタラクティブなグラフ可視化
- ✅ LLM導入（引用文脈の分類：支持/批判/比較/背景）
- ✅ Firestoreへのキャッシュ機構

## 🛠 技術スタック

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Graph Visualization:** React Flow (@xyflow/react)
- **Data Source:** OpenAlex API
- **LLM:** Gemini 1.5 Flash / GPT-4o-mini
- **Cache:** Firebase Firestore
- **Rate Limiting:** 自動レート制限管理（1秒あたり10リクエスト、1日10万リクエスト）

## 📦 セットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
# プロジェクトルートに .env.local ファイルを作成（下記参照）

# 開発サーバーの起動
npm run dev

# ビルド
npm run build
```

## ⚙️ 環境変数

`.env.local`ファイルを作成して、以下の環境変数を設定してください：

### 基本設定（推奨）

```env
# OpenAlex APIのメールアドレス
# 設定すると「polite pool」に参加し、より安定したレスポンスが得られます
OPENALEX_EMAIL=your-email@example.com
```

### Phase 2: LLM設定（いずれか1つ）

```env
# Gemini API（推奨: 無料枠あり、コスト効率良好）
# https://makersuite.google.com/app/apikey で取得
GEMINI_API_KEY=your-gemini-api-key

# または OpenAI API
# https://platform.openai.com/api-keys で取得
OPENAI_API_KEY=your-openai-api-key
```

### Phase 2: Firebase/Firestore設定（キャッシュ用）

```env
# Firebaseコンソールでプロジェクト作成後、
# プロジェクト設定 > 全般 > マイアプリ > SDKの構成 から取得
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

> **注意:**
> - LLM APIキーが設定されていない場合、Phase 1モードで動作します
> - Firebaseが設定されていない場合、キャッシュは無効になります

## 🔍 使い方

1. 検索フォームにarXiv URL、DOI、または論文タイトルを入力
2. 「Visualize」ボタンをクリック
3. 引用ネットワークがグラフで表示される
4. **Phase 2:** エッジをクリックすると引用文脈の詳細が表示される

### 対応入力形式

- **arXiv URL:** `https://arxiv.org/abs/1706.03762`
- **arXiv ID:** `1706.03762` または `arXiv:1706.03762`
- **DOI:** `10.48550/arXiv.1706.03762` または `https://doi.org/10.48550/arXiv.1706.03762`
- **タイトル:** `Attention Is All You Need`

## 🎨 引用文脈の種類（Phase 2）

| 種類 | 色 | 説明 |
|------|-----|------|
| 🟢 Methodology | 緑 | 手法を利用している |
| 🔴 Critique | 赤 | 批判・制限を指摘 |
| 🟣 Comparison | 紫 | 比較実験の対象 |
| ⚪ Background | グレー | 一般的な関連研究 |

## 🗺 ロードマップ

### Phase 1: MVP ✅
- [x] arXiv URL/DOI/タイトル検索
- [x] OpenAlex API連携
- [x] グラフ可視化

### Phase 2: Context & Caching ✅
- [x] LLM導入（引用文脈の分類）
- [x] Firestoreへのキャッシュ機構
- [x] 文脈タイプ別のエッジ色分け
- [x] エッジクリックで詳細表示

### Phase 3: Gap Finding & Upload（次期開発）
- [ ] PDFアップロード機能
- [ ] ベクトル検索による「Gap」提案機能

## 📄 ライセンス

MIT License

# Necessia

情報工学（Computer Science）分野の研究者向け、論文間の引用関係を可視化し、研究の空白（Gap）を発見するWebサービスです。

##  現在のフェーズ

**Phase 3: Gap Finding & Analysis（研究空白の発見）** ✅

-  arXiv URL、DOI、論文タイトルでの検索
-  OpenAlex APIから引用リスト取得
-  インタラクティブなグラフ可視化
-  LLM導入（引用文脈の分類：支持/批判/比較/背景）
-  ベクトル検索による「Gap」提案機能（Co-citation + 類似度分析）
-  日本語対応（UIおよびAI分析結果）

##  技術スタック

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Graph Visualization:** React Flow (@xyflow/react)
- **Data Source:** OpenAlex API
- **LLM:** Gemini 2.5 Flash-Lite（引用文脈の分類）
- **Embeddings:** Google Generative AI Embeddings API（Gap検出用）
- **Rate Limiting:** 自動レート制限管理（1秒あたり10リクエスト、1日10万リクエスト）

##  セットアップ

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

##  環境変数

`.env.local`ファイルを作成して、以下の環境変数を設定してください：

### 基本設定（推奨）

```env
# OpenAlex APIのメールアドレス
# 設定すると「polite pool」に参加し、より安定したレスポンスが得られます
OPENALEX_EMAIL=your-email@example.com
```

### Phase 2/3: LLM設定（必須）

```env
# Gemini API（推奨: 無料枠あり、コスト効率良好）
# https://makersuite.google.com/app/apikey で取得
# Phase 2（引用文脈分類）とPhase 3（Gap検出）の両方で使用
GEMINI_API_KEY=your-gemini-api-key

# または OpenAI API
# https://platform.openai.com/api-keys で取得
OPENAI_API_KEY=your-openai-api-key
```

> **注意:**
> - LLM APIキーが設定されていない場合、Phase 1モードで動作します（引用文脈分類とGap検出は無効）
> - Phase 3のGap検出機能には、LLM APIキー（Gemini推奨）が必要です
> - ユーザーは各自のAPIキーを設定して使用します

##  使い方

1. 検索フォームにarXiv URL、DOI、または論文タイトルを入力
2. 「可視化」ボタンをクリック
3. 引用ネットワークがグラフで表示される
4. **Phase 2:** エッジをクリックすると引用文脈の詳細が表示される
5. **Phase 3:** Gap提案パネルを開いて、見落とされている可能性のある論文ペアを確認

### 対応入力形式

- **arXiv URL:** `https://arxiv.org/abs/1706.03762`
- **arXiv ID:** `1706.03762` または `arXiv:1706.03762`
- **DOI:** `10.48550/arXiv.1706.03762` または `https://doi.org/10.48550/arXiv.1706.03762`
- **タイトル:** `Attention Is All You Need`

##  引用文脈の種類（Phase 2）

| 種類 | 色 | 説明 |
|------|-----|------|
| 🟢 Methodology | 緑 | 手法を利用している |
| 🔴 Critique | 赤 | 批判・制限を指摘 |
| 🟣 Comparison | 紫 | 比較実験の対象 |
| ⚪ Background | グレー | 一般的な関連研究 |

##  Gap検出機能（Phase 3）

Necessiaは、以下のロジックに基づいて研究の空白（Gap）を自動検出します：

- **Co-citation分析:** 共通の引用元を持つ論文ペアを特定
- **ベクトル類似度:** 論文の内容が類似しているにもかかわらず、相互引用がないペアを検出
- **論理的な必然性:** 同じトピックを扱い、同じ先行研究を引用しているが、比較されていない論文を提案

Gap提案は、グラフビュー内のパネルから確認できます。

##  ライセンス

Apache License 2.0

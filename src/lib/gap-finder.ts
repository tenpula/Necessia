/*
 * 【ファイル概要】
 * ギャップ探索ロジック
 * 論文同士の関係性から、「まだ研究されていない課題」を見つけ出す裏側の計算処理です。
 */

/**
 * 研究ギャップ（Research Gap）検出ロジック
 * 
 * 論文間の関係性を分析し、未探索の研究領域や比較検討の価値がある組み合わせを提案します。
 * Co-citation（共通引用）分析とベクトル類似度（Semantic Similarity）を組み合わせて判断します。
 */
import { Paper, CitationNetwork, GapProposal } from '@/types/paper';
import { getPaperEmbeddings, cosineSimilarity } from './embeddings';
import { getLLMModelName } from './llm';

/**
 * インデックス化されたネットワーク構造
 * 検索効率向上のためのデータ構造です。
 */
interface IndexedNetwork {
  // 論文ID → その論文が引用している論文IDのセット
  citationsBySource: Map<string, Set<string>>;
  // 論文ID → その論文を引用している論文IDのセット
  citationsByTarget: Map<string, Set<string>>;
  // 論文IDペア → 直接引用関係があるか
  directConnections: Set<string>;
  // 論文ID → Paperオブジェクト
  papersById: Map<string, Paper>;
}

// ネットワークをインデックス化（一度だけ実行）
function buildIndexedNetwork(network: CitationNetwork): IndexedNetwork {
  const citationsBySource = new Map<string, Set<string>>();
  const citationsByTarget = new Map<string, Set<string>>();
  const directConnections = new Set<string>();
  const papersById = new Map<string, Paper>();

  // 論文マップを作成
  for (const paper of network.papers) {
    papersById.set(paper.id, paper);
  }

  // 引用関係をインデックス化
  for (const citation of network.citations) {
    // 引用元 → 引用先
    if (!citationsBySource.has(citation.sourceId)) {
      citationsBySource.set(citation.sourceId, new Set());
    }
    citationsBySource.get(citation.sourceId)!.add(citation.targetId);

    // 引用先 → 引用元
    if (!citationsByTarget.has(citation.targetId)) {
      citationsByTarget.set(citation.targetId, new Set());
    }
    citationsByTarget.get(citation.targetId)!.add(citation.sourceId);

    // 直接接続の記録（双方向）
    directConnections.add(`${citation.sourceId}|${citation.targetId}`);
    directConnections.add(`${citation.targetId}|${citation.sourceId}`);
  }

  return {
    citationsBySource,
    citationsByTarget,
    directConnections,
    papersById,
  };
}

/**
 * 2つの論文間のCo-citation（共通引用）関係を分析します。
 * 
 * - 共通して引用している論文の特定
 * - Jaccard係数による集合の類似度計算
 * - 引用重複率の計算
 * を行います。
 * 
 * @param paperA 論文A
 * @param paperB 論文B
 * @param indexed インデックス化されたネットワーク
 * @returns Co-citation分析結果
 */
function findCoCitations(
  paperA: Paper,
  paperB: Paper,
  indexed: IndexedNetwork
): { 
  commonCitations: Paper[]; 
  coCitationCount: number;
  jaccardCoefficient: number; // 正規化された類似度
  citationOverlapRatio: number; // 引用の重複率
} {
  const citationsA = indexed.citationsBySource.get(paperA.id) || new Set();
  const citationsB = indexed.citationsBySource.get(paperB.id) || new Set();

  // 共通引用元を検出
  const commonCitationIds = Array.from(citationsA).filter((id) =>
    citationsB.has(id)
  );

  const commonCitations = commonCitationIds
    .map((id) => indexed.papersById.get(id))
    .filter((p): p is Paper => p !== undefined);

  // Jaccard係数: |A ∩ B| / |A ∪ B|
  const unionSize = new Set([...citationsA, ...citationsB]).size;
  const jaccardCoefficient = unionSize > 0 ? commonCitationIds.length / unionSize : 0;

  // 引用の重複率: 共通引用数 / 平均引用数
  const avgCitationCount = (citationsA.size + citationsB.size) / 2;
  const citationOverlapRatio = avgCitationCount > 0 
    ? commonCitationIds.length / avgCitationCount 
    : 0;

  return {
    commonCitations,
    coCitationCount: commonCitations.length,
    jaccardCoefficient,
    citationOverlapRatio,
  };
}

// 2つの論文が直接引用関係にあるかチェック（最適化版）
function areDirectlyConnected(
  paperA: Paper,
  paperB: Paper,
  indexed: IndexedNetwork
): boolean {
  return indexed.directConnections.has(`${paperA.id}|${paperB.id}`);
}

// 論文の重要度スコアを計算（引用数ベース）
function calculatePaperImportance(paper: Paper): number {
  // 引用数を正規化（0-1の範囲に）
  // 一般的な論文の引用数範囲を考慮: 0-1000+ → 0-1
  // 対数スケールを使用して、極端に多い引用数の影響を緩和
  const normalized = Math.min(Math.log10(paper.citationCount + 1) / 4, 1);
  return normalized;
}

// ネットワークの統計を計算
function calculateNetworkStats(
  papers: Paper[],
  indexed: IndexedNetwork
): {
  avgCitationCount: number;
  networkDensity: number;
  avgCoCitations: number;
} {
  const citationCounts = papers.map(p => 
    indexed.citationsBySource.get(p.id)?.size || 0
  );
  const avgCitationCount = citationCounts.reduce((a, b) => a + b, 0) / papers.length || 1;

  // ネットワーク密度: 実際のエッジ数 / 可能な最大エッジ数
  const possibleEdges = papers.length * (papers.length - 1) / 2;
  const actualEdges = indexed.directConnections.size / 2; // 双方向なので2で割る
  const networkDensity = possibleEdges > 0 ? actualEdges / possibleEdges : 0;

  // 平均Co-citation数（簡易版）
  let totalCoCitations = 0;
  let pairCount = 0;
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const citationsA = indexed.citationsBySource.get(papers[i].id) || new Set();
      const citationsB = indexed.citationsBySource.get(papers[j].id) || new Set();
      const common = Array.from(citationsA).filter(id => citationsB.has(id)).length;
      totalCoCitations += common;
      pairCount++;
    }
  }
  const avgCoCitations = pairCount > 0 ? totalCoCitations / pairCount : 0;

  return {
    avgCitationCount,
    networkDensity,
    avgCoCitations,
  };
}

// 適応的閾値を計算
function calculateAdaptiveThresholds(
  networkStats: ReturnType<typeof calculateNetworkStats>,
  paperCount: number
): {
  minSimilarity: number;
  minCoCitations: number;
  minJaccard: number;
} {
  // ネットワークサイズに応じて閾値を調整
  // 小さいネットワーク（<10論文）: より緩い閾値
  // 大きいネットワーク（>30論文）: より厳しい閾値
  
  let baseSimilarity = 0.45;
  let baseCoCitations = 1;
  let baseJaccard = 0.1;

  if (paperCount < 10) {
    // 小規模ネットワーク: 緩い閾値
    baseSimilarity = 0.40;
    baseCoCitations = 1;
    baseJaccard = 0.05;
  } else if (paperCount > 30) {
    // 大規模ネットワーク: 厳しい閾値
    baseSimilarity = 0.50;
    baseCoCitations = 2;
    baseJaccard = 0.15;
  }

  // ネットワーク密度に応じて調整
  // 密度が高い（よく接続されている）→ より厳しい閾値
  if (networkStats.networkDensity > 0.3) {
    baseSimilarity += 0.05;
    baseCoCitations += 1;
  } else if (networkStats.networkDensity < 0.1) {
    // 密度が低い → より緩い閾値
    baseSimilarity -= 0.05;
  }

  // 平均Co-citation数に応じて調整
  if (networkStats.avgCoCitations > 3) {
    baseCoCitations = Math.max(baseCoCitations, Math.ceil(networkStats.avgCoCitations * 0.5));
  }

  return {
    minSimilarity: Math.max(0.35, Math.min(0.60, baseSimilarity)),
    minCoCitations: Math.max(1, Math.min(5, baseCoCitations)),
    minJaccard: Math.max(0.05, Math.min(0.30, baseJaccard)),
  };
}

/**
 * ギャップ提案の信頼度スコアを計算します。
 * 
 * 複数の要因を重み付けして統合スコアを算出します：
 * 1. Semantic Similarity (40%): 内容的な類似性
 * 2. Co-citation Score (30%): 引用関係の類似性（Jaccard係数など）
 * 3. Overlap Ratio (15%): 引用の重複度
 * 4. Paper Importance (15%): 論文自体の重要度（引用数ベース）
 * 
 * また、特定の条件下でのボーナス/ペナルティも適用します。
 */
function calculateConfidenceScore(
  similarityScore: number,
  coCitationData: ReturnType<typeof findCoCitations>,
  paperA: Paper,
  paperB: Paper
): number {
  const { coCitationCount, jaccardCoefficient, citationOverlapRatio } = coCitationData;
  
  // 論文の重要度を考慮
  const importanceA = calculatePaperImportance(paperA);
  const importanceB = calculatePaperImportance(paperB);
  const avgImportance = (importanceA + importanceB) / 2;

  // 複合スコアの計算（非線形）
  // 1. 類似度スコア（重み: 40%）
  const similarityComponent = Math.pow(similarityScore, 1.2) * 0.4; // 非線形変換で高類似度を強調

  // 2. Co-citationスコア（重み: 30%）
  // Jaccard係数と絶対数の両方を考慮
  const jaccardComponent = Math.pow(jaccardCoefficient, 0.8) * 0.2;
  const coCitationComponent = Math.min(coCitationCount / 10, 1) * 0.1;
  const coCitationScore = jaccardComponent + coCitationComponent;

  // 3. 引用重複率スコア（重み: 15%）
  const overlapComponent = Math.min(citationOverlapRatio, 1) * 0.15;

  // 4. 論文重要度スコア（重み: 15%）
  const importanceComponent = avgImportance * 0.15;

  // 合計スコア
  let confidence = similarityComponent + coCitationScore + overlapComponent + importanceComponent;

  // ボーナス: 高類似度 + 高Co-citationの組み合わせ
  if (similarityScore >= 0.7 && coCitationCount >= 3) {
    confidence += 0.1;
  }

  // ペナルティ: 類似度が低い場合
  if (similarityScore < 0.4) {
    confidence *= 0.8;
  }

  return Math.min(1.0, Math.max(0.0, confidence));
}

// Gap提案の説明文を生成（LLM使用）- 簡易版も追加
async function generateGapReasoning(
  paperA: Paper,
  paperB: Paper,
  commonCitations: Paper[],
  similarityScore: number,
  coCitationCount: number,
  useLLM: boolean = true
): Promise<string> {
  // 簡易版の説明文（LLMを使わない）
  const simpleReasoning = `両方の論文は高い意味的類似度（${(similarityScore * 100).toFixed(1)}%）を持っており${coCitationCount > 0 ? `、${coCitationCount}本の共通文献を引用しています` : 'ます'}。比較分析を行う価値があるでしょう。`;

  if (!useLLM) {
    return simpleReasoning;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return simpleReasoning;
  }

  const prompt = `You are analyzing a research gap in computer science papers.

Paper A: ${paperA.title}
${paperA.abstract ? `Abstract: ${paperA.abstract.substring(0, 500)}` : 'No abstract available'}

Paper B: ${paperB.title}
${paperB.abstract ? `Abstract: ${paperB.abstract.substring(0, 500)}` : 'No abstract available'}

These papers:
- Have a semantic similarity score of ${(similarityScore * 100).toFixed(1)}%
- Both cite ${coCitationCount} common paper(s): ${commonCitations.slice(0, 3).map(p => p.title).join(', ')}
- Do NOT directly cite each other

Generate a brief, professional explanation (2-3 sentences) in Japanese explaining why these papers should be compared or why there might be a research gap. Focus on logical reasoning based on their shared citations and similarity.

Respond with ONLY the explanation text, no JSON or markdown formatting.`;

  try {
    const modelName = getLLMModelName();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      simpleReasoning;

    return text.trim();
  } catch (error) {
    console.error('[Gap Finder] Failed to generate reasoning:', error);
    return simpleReasoning;
  }
}

/**
 * 研究ギャップの提案候補を検出します。
 * 
 * ネットワーク内のすべての論文ペアに対して分析を行い、
 * - 直接的な引用関係がない
 * - 内容的に類似している（Semantic Similarityが高い）
 * - 共通の引用がある（Co-citationがある）
 * 
 * 論文ペアを特定し、それらが「なぜ比較すべきか」の理由とともに提案します。
 * 必要に応じてLLMを使用して自然言語での理由付けを生成します。
 */
export async function findGapProposals(
  network: CitationNetwork,
  options: {
    minSimilarity?: number;
    minCoCitations?: number;
    maxProposals?: number;
    onProgress?: (completed: number, total: number) => void;
    skipReasoning?: boolean;
    useAdaptiveThresholds?: boolean; // 適応的閾値を使用するか
  } = {}
): Promise<GapProposal[]> {
  const {
    minSimilarity: userMinSimilarity,
    minCoCitations: userMinCoCitations,
    maxProposals = 15,
    onProgress,
    skipReasoning = false,
    useAdaptiveThresholds = true, // デフォルトで有効
  } = options;

  const proposals: GapProposal[] = [];
  const papers = network.papers.filter((p) => p.id !== network.seedPaper.id);

  if (papers.length < 2) {
    console.log('[Gap Finder] Not enough papers to find gaps');
    return [];
  }

  console.log(`[Gap Finder] Analyzing ${papers.length} papers for gaps...`);
  
  const startTime = Date.now();

  // ネットワークをインデックス化
  const indexed = buildIndexedNetwork(network);

  // ネットワーク統計を計算
  const networkStats = calculateNetworkStats(papers, indexed);
  console.log(`[Gap Finder] Network stats:`, {
    avgCitationCount: networkStats.avgCitationCount.toFixed(2),
    networkDensity: networkStats.networkDensity.toFixed(3),
    avgCoCitations: networkStats.avgCoCitations.toFixed(2),
  });

  // 適応的閾値を計算
  const adaptiveThresholds = useAdaptiveThresholds
    ? calculateAdaptiveThresholds(networkStats, papers.length)
    : { minSimilarity: 0.43, minCoCitations: 1, minJaccard: 0.1 };

  // ユーザー指定の閾値があれば優先
  const minSimilarity = userMinSimilarity ?? adaptiveThresholds.minSimilarity;
  const minCoCitations = userMinCoCitations ?? adaptiveThresholds.minCoCitations;
  const minJaccard = adaptiveThresholds.minJaccard;

  console.log(`[Gap Finder] Thresholds:`, {
    minSimilarity: minSimilarity.toFixed(2),
    minCoCitations,
    minJaccard: minJaccard.toFixed(2),
    adaptive: useAdaptiveThresholds,
  });

  // 全ての論文のembeddingを取得
  const embeddings = await getPaperEmbeddings(papers, onProgress);

  // 統計情報
  let directlyConnectedCount = 0;
  let lowSimilarityCount = 0;
  let lowCoCitationCount = 0;
  let lowJaccardCount = 0;
  let candidateCount = 0;

  const candidateProposals: Array<{
    paperA: Paper;
    paperB: Paper;
    similarityScore: number;
    coCitationData: ReturnType<typeof findCoCitations>;
    confidence: number;
  }> = [];

  // ペアをチェック
  for (let i = 0; i < papers.length; i++) {
    for (let j = i + 1; j < papers.length; j++) {
      const paperA = papers[i];
      const paperB = papers[j];

      // 直接引用関係がある場合はスキップ
      if (areDirectlyConnected(paperA, paperB, indexed)) {
        directlyConnectedCount++;
        continue;
      }

      // Embeddingを取得
      const embeddingA = embeddings.get(paperA.id);
      const embeddingB = embeddings.get(paperB.id);

      if (!embeddingA || !embeddingB) {
        continue;
      }

      // 類似度を計算
      const similarityScore = cosineSimilarity(embeddingA, embeddingB);

      // Co-citationをチェック（改善版）
      const coCitationData = findCoCitations(paperA, paperB, indexed);

      // 改善された検出ロジック
      const isHighSimilarity = similarityScore >= 0.7;
      const isMediumSimilarity = similarityScore >= 0.5;
      const hasMinSimilarity = similarityScore >= minSimilarity;
      const hasMinCoCitations = coCitationData.coCitationCount >= minCoCitations;
      const hasMinJaccard = coCitationData.jaccardCoefficient >= minJaccard;

      let shouldPropose = false;

      // 高類似度の場合は、Co-citationが少なくても提案
      if (isHighSimilarity) {
        shouldPropose = true;
      } 
      // 中程度の類似度 + 十分なCo-citation
      else if (isMediumSimilarity && hasMinCoCitations && hasMinJaccard) {
        shouldPropose = true;
      }
      // 通常の条件: 類似度 + Co-citation + Jaccard
      else if (hasMinSimilarity && hasMinCoCitations && hasMinJaccard) {
        shouldPropose = true;
      }

      if (!shouldPropose) {
        if (similarityScore < minSimilarity) lowSimilarityCount++;
        if (coCitationData.coCitationCount < minCoCitations && !isHighSimilarity) {
          lowCoCitationCount++;
        }
        if (coCitationData.jaccardCoefficient < minJaccard && !isHighSimilarity) {
          lowJaccardCount++;
        }
        continue;
      }

      candidateCount++;

      // 改善された信頼度スコアを計算
      const confidence = calculateConfidenceScore(
        similarityScore,
        coCitationData,
        paperA,
        paperB
      );

      candidateProposals.push({
        paperA,
        paperB,
        similarityScore,
        coCitationData,
        confidence,
      });
    }
  }

  console.log(`[Gap Finder] Found ${candidateProposals.length} candidate pairs`);

  // 信頼度でソートして上位を取得
  candidateProposals.sort((a, b) => b.confidence - a.confidence);
  const topCandidates = candidateProposals.slice(0, maxProposals);

  // 上位候補のみ説明文を生成
  if (!skipReasoning && topCandidates.length > 0) {
    const batchSize = 5;
    for (let i = 0; i < topCandidates.length; i += batchSize) {
      const batch = topCandidates.slice(i, i + batchSize);
      const reasoningPromises = batch.map((candidate) =>
        generateGapReasoning(
          candidate.paperA,
          candidate.paperB,
          candidate.coCitationData.commonCitations,
          candidate.similarityScore,
          candidate.coCitationData.coCitationCount,
          true
        ).then((reasoning) => ({
          paperA: candidate.paperA,
          paperB: candidate.paperB,
          similarityScore: candidate.similarityScore,
          coCitationCount: candidate.coCitationData.coCitationCount,
          commonCitations: candidate.coCitationData.commonCitations,
          reasoning,
          confidence: candidate.confidence,
        }))
      );

      const batchResults = await Promise.all(reasoningPromises);
      proposals.push(...batchResults);

      if (onProgress) {
        onProgress(proposals.length, topCandidates.length);
      }
    }
  } else {
    // 説明文をスキップする場合、簡易版を同期的に生成
    for (const candidate of topCandidates) {
      const simpleReasoning = `Both papers have high semantic similarity (${(candidate.similarityScore * 100).toFixed(1)}%)${candidate.coCitationData.coCitationCount > 0 ? ` and cite ${candidate.coCitationData.coCitationCount} common paper(s)` : ''}. They may benefit from comparative analysis.`;
      
      proposals.push({
        paperA: candidate.paperA,
        paperB: candidate.paperB,
        similarityScore: candidate.similarityScore,
        coCitationCount: candidate.coCitationData.coCitationCount,
        commonCitations: candidate.coCitationData.commonCitations,
        reasoning: simpleReasoning,
        confidence: candidate.confidence,
      });
    }
  }

  // デバッグ情報
  const totalTime = Date.now() - startTime;
  console.log(`[Gap Finder] Statistics:`);
  console.log(`  - Total time: ${totalTime}ms`);
  console.log(`  - Directly connected: ${directlyConnectedCount}`);
  console.log(`  - Low similarity: ${lowSimilarityCount}`);
  console.log(`  - Low co-citation: ${lowCoCitationCount}`);
  console.log(`  - Low Jaccard: ${lowJaccardCount}`);
  console.log(`  - Candidates: ${candidateCount}`);
  console.log(`  - Final proposals: ${proposals.length}`);

  return proposals;
}

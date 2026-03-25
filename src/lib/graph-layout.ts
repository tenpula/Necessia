/*
 * 【ファイル概要】
 * グラフ配置ロジック
 * たくさんある論文の丸（ノード）を、画面上で綺麗にバランスよく配置するための計算です。
 */

/**
 * 引用グラフのレイアウト計算ユーティリティ
 * 
 * ノード（論文）の配置座標とエッジ（引用関係）のスタイルを計算します。
 * React Flowなどのグラフライブラリで使用される形式（Node, Edge）を出力します。
 */

import { Node, Edge, MarkerType } from '@xyflow/react';
import { CitationNetwork, Paper, Citation, CONTEXT_TYPE_INFO } from '@/types/paper';

/**
 * 引用文脈に基づいてエッジの色を決定します。
 * - background: 一般的な関連研究
 * - methodology: 手法の利用
 * - comparison: 比較対象
 * - critique: 批判的検討
 */
export function getEdgeColor(citation: Citation): string {
  if (citation.contextType) {
    return CONTEXT_TYPE_INFO[citation.contextType].color;
  }
  // アナライズ前はグレイの単色
  return '#64748b'; // slate-500
}

/**
 * 文字列シードに基づくシンプルな擬似乱数生成器
 * @param seed 一意の文字列（ノードIDなど）
 * @returns 0〜1の乱数
 */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  let t = h += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

/**
 * ネットワークからノードとエッジを計算し、レイアウトを決定します。
 * 
 * 配置ロジック:
 * - Seed論文（中心となる論文）を原点 (0, 0) に配置します。
 * - 分類済み論文：カテゴリ別に領域を分割し、円形に配置（重ならないよう半径に揺らぎを持たせる）
 * - 未分類論文：中心の分類済み論文のリングに重ならない外側に、ランダムに散らばるように配置します。
 * 
 * @param network 引用ネットワークデータ
 * @returns ノードとエッジの配列
 */
export function calculateLayout(network: CitationNetwork): { nodes: Node[]; edges: Edge[] } {
  const { seedPaper, papers, citations } = network;

  const otherPapers = Array.from(
    new Map(
      papers.filter((p) => p.id !== seedPaper.id).map((p) => [p.id, p])
    ).values()
  );

  const nodes: Node[] = [];

  // 出版年の最小・最大を計算（相対的な色割り当て用）
  let minYear = seedPaper.publicationYear;
  let maxYear = seedPaper.publicationYear;
  otherPapers.forEach(p => {
    if (p.publicationYear < minYear) minYear = p.publicationYear;
    if (p.publicationYear > maxYear) maxYear = p.publicationYear;
  });
  const yearRange = Math.max(1, maxYear - minYear);
  const getYearRatio = (year: number) => Math.max(0, Math.min(1, (year - minYear) / yearRange));

  // Seed論文を中心に配置
  nodes.push({
    id: seedPaper.id,
    type: 'paper',
    position: { x: 0, y: 0 },
    data: { paper: seedPaper, isSeed: true, yearRatio: getYearRatio(seedPaper.publicationYear) },
    draggable: false, // シード論文は動かないように固定
  });

  // 1: 手法, 2: 比較, 3: 関連(背景), 4: 批判 の順序
  const orderedContextTypes = ['methodology', 'comparison', 'background', 'critique'];
  const classifiedGroups = new Map<string, Paper[]>();
  orderedContextTypes.forEach(t => classifiedGroups.set(t, []));
  const unclassifiedPapers: Paper[] = [];

  // 論文ごとの代表Citationを決める。
  // まず seed 論文と直接つながる Citation を優先し、なければ任意の関連 Citation を採用する。
  const citationByPaperId = new Map<string, Citation>();

  citations.forEach((citation) => {
    if (citation.sourceId === seedPaper.id && citation.targetId !== seedPaper.id) {
      citationByPaperId.set(citation.targetId, citation);
    } else if (citation.targetId === seedPaper.id && citation.sourceId !== seedPaper.id) {
      citationByPaperId.set(citation.sourceId, citation);
    }
  });

  otherPapers.forEach(paper => {
    const cit = citationByPaperId.get(paper.id)
      ?? citations.find(c => c.sourceId === paper.id || c.targetId === paper.id);

    if (cit && cit.contextType && orderedContextTypes.includes(cit.contextType)) {
      classifiedGroups.get(cit.contextType)!.push(paper);
    } else {
      unclassifiedPapers.push(paper);
    }
  });

  let currentRadius = 300; // 最初の軌道の半径
  const radiusIncrementBase = 150;
  let maxOrbitRadius = 0;

  // 1. 軌道と分類済み論文の配置
  orderedContextTypes.forEach((ctg) => {
    const papersInCtg = classifiedGroups.get(ctg)!;
    if (papersInCtg.length === 0) return; // 論文がないカテゴリは軌道を描かない

    // ノード数が多い場合は軌道を広げる (最密充填を考慮)
    const requiredCircumference = papersInCtg.length * 150; 
    const minRequiredRadius = requiredCircumference / (2 * Math.PI);
    
    // 現在の軌道半径を決定
    const r = Math.max(currentRadius, minRequiredRadius);
    maxOrbitRadius = Math.max(maxOrbitRadius, r);

    // 軌道ノードを追加
    nodes.push({
      id: `orbit-${ctg}`,
      type: 'orbit',
      position: { x: 0, y: 0 }, // nodeOriginを中心に合わせるため原点配置
      data: { radius: r, category: ctg },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
      style: {
        pointerEvents: 'none',
        background: 'transparent',
        border: 'none',
      },
    });

    // 論文を軌道上に均等配置
    const count = papersInCtg.length;
    papersInCtg.forEach((paper, i) => {
      // 0度(右)から開始ではなく、見栄えを考慮し -90度(上)から開始
      const theta = -Math.PI / 2 + (i / count) * 2 * Math.PI;
      
      nodes.push({
        id: paper.id,
        type: 'paper',
        position: {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r
        },
        data: { 
          paper, 
          isSeed: false, 
          orbitRadius: r,
          category: ctg,
          yearRatio: getYearRatio(paper.publicationYear)
        }, // 軌道半径、カテゴリ、年代割合を記録
        zIndex: 5,
      });
    });

    // 次の軌道のベース半径を設定
    currentRadius = r + radiusIncrementBase;
  });

  // 2. 未分類論文の配置（外側に散らばらせる）
  if (unclassifiedPapers.length > 0) {
    unclassifiedPapers.sort((a, b) => a.id.localeCompare(b.id));

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    // 存在する最大の軌道よりも外側から開始する
    const unclassifiedStartRadius = maxOrbitRadius > 0 ? maxOrbitRadius + 200 : 300;

    unclassifiedPapers.forEach((paper, i) => {
      const rand1 = seededRandom(paper.id + '_r');
      const rand2 = seededRandom(paper.id + '_t');
      
      const theta = i * goldenAngle + (rand2 * 0.5 - 0.25);
      const r = unclassifiedStartRadius + Math.sqrt(i) * 60 + (rand1 * 40 - 20);

      nodes.push({
        id: paper.id,
        type: 'paper',
        position: {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r
        },
        data: { paper, isSeed: false, yearRatio: getYearRatio(paper.publicationYear) }, // 未分類は軌道に乗らない
        zIndex: 5,
      });
    });
  }

  // 3. エッジを作成（分類済み・未分類の両方を描画）
  // 分類済みの引用は色分けして表示し、未分類は薄く表示
  const edges: Edge[] = [];
  
  citations.forEach((citation) => {
    // シード論文から各ノードへ直接つながるエッジは表示しない
    if (citation.sourceId === seedPaper.id || citation.targetId === seedPaper.id) {
      return;
    }

    const color = getEdgeColor(citation);
    const isClassified = citation.contextType && orderedContextTypes.includes(citation.contextType);
    
    edges.push({
      id: citation.id,
      source: citation.sourceId,
      target: citation.targetId,
      sourceHandle: 'center-source',
      targetHandle: 'center-target',
      type: 'straight',
      animated: false,
      selectable: false,
      style: {
        stroke: color,
        strokeWidth: isClassified ? 6 : 2,
        opacity: isClassified ? 0.6 : 0.15, // 分類済みは目立つように、未分類はうっすら
        cursor: 'default',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: color,
      },
      data: { citation },
    });
  });

  return { nodes, edges };
}

/**
 * 文脈タイプ別の統計を計算
 */
export function calculateContextStats(citations: Citation[]): Record<string, number> {
  const stats: Record<string, number> = {
    methodology: 0,
    critique: 0,
    comparison: 0,
    background: 0,
  };

  citations.forEach((c) => {
    const type = c.contextType || 'background';
    stats[type]++;
  });

  return stats;
}

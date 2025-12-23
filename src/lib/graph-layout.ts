// 引用グラフのレイアウト計算ユーティリティ

import { Node, Edge, MarkerType } from '@xyflow/react';
import { CitationNetwork, Paper, Citation, CONTEXT_TYPE_INFO } from '@/types/paper';

/**
 * 引用文脈に基づいてエッジの色を決定
 */
export function getEdgeColor(citation: Citation): string {
  if (citation.contextType && citation.contextType !== 'background') {
    return CONTEXT_TYPE_INFO[citation.contextType].color;
  }
  // アナライズ前はグレイの単色
  return '#64748b'; // slate-500
}

/**
 * ネットワークからノードとエッジを計算（seedPaperを中心に円形配置）
 */
export function calculateLayout(network: CitationNetwork): { nodes: Node[]; edges: Edge[] } {
  const { seedPaper, papers, citations } = network;

  // seedPaper以外のすべての論文を取得（重複を除去）
  const otherPapers = Array.from(
    new Map(
      papers.filter((p) => p.id !== seedPaper.id).map((p) => [p.id, p])
    ).values()
  );

  const nodes: Node[] = [];

  // seedPaperを中心に配置
  nodes.push({
    id: seedPaper.id,
    type: 'paper',
    position: { x: 0, y: 0 },
    data: { paper: seedPaper, isSeed: true },
  });

  // 他の論文を円形に配置
  const paperCount = otherPapers.length;
  if (paperCount > 0) {
    // 半径をノード数に応じて調整（最小300px、ノード数が多い場合は拡大）
    const radius = Math.max(300, Math.min(500, paperCount * 30));

    otherPapers.forEach((paper, index) => {
      // 円周上に均等に配置（0度から開始）
      const angle = ((2 * Math.PI) / paperCount) * index - Math.PI / 2; // -90度から開始（上から時計回り）
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      nodes.push({
        id: paper.id,
        type: 'paper',
        position: { x, y },
        data: { paper, isSeed: false },
      });
    });
  }

  // エッジを作成（直線、ノードの中心から中心へ接続）
  const edges: Edge[] = citations.map((citation) => {
    const color = getEdgeColor(citation);
    const hasContext = citation.contextType && citation.contextType !== 'background';

    return {
      id: citation.id,
      source: citation.sourceId,
      target: citation.targetId,
      sourceHandle: 'center-source', // ノードの中心のハンドルを使用
      targetHandle: 'center-target', // ノードの中心のハンドルを使用
      type: 'straight', // 直線エッジ
      animated: hasContext,
      selectable: false, // エッジを選択不可に
      style: {
        stroke: color,
        strokeWidth: hasContext ? 3 : 2,
        opacity: hasContext ? 0.8 : 0.5,
        cursor: 'default', // カーソルをデフォルトに
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: color,
      },
      data: { citation },
    };
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


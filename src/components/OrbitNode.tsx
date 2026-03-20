/*
 * 【ファイル概要】
 * 軌跡ノード（太陽系レイアウト）
 * 引用カテゴリーごとの軌跡を描画用ノードです。
 */

'use client';

import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { CONTEXT_TYPE_INFO, CitationContextType } from '@/types/paper';

interface OrbitNodeData extends Record<string, unknown> {
  radius: number;
  category: string; // The specific citation context type
}

function OrbitNode({ data }: NodeProps) {
  const nodeData = data as OrbitNodeData;
  const { radius, category } = nodeData;

  // Type safe retrieval of context info
  const contextType = category as CitationContextType;
  const contextInfo = CONTEXT_TYPE_INFO[contextType];

  const color = contextInfo?.color || '#94a3b8'; // default to slate

  return (
    <div
      className="rounded-full border-[1.5px] border-dashed pointer-events-none absolute"
      style={{
        width: radius * 2,
        height: radius * 2,
        borderColor: color,
        opacity: 0.3, // Faint orbital ring
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}

export default memo(OrbitNode);

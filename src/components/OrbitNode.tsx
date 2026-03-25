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
  const diameter = radius * 2;

  return (
    <div
      className="relative pointer-events-none"
      style={{
        width: diameter,
        height: diameter,
      }}
    >
      {/* メインの軌道リング（実線の太線） */}
      <div
        className="absolute inset-0 rounded-full border-[3px]"
        style={{
          borderColor: color,
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* ラベル表示 */}
      <div
        className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap"
        style={{
          color,
          opacity: 0.85,
          textShadow: '0 0 10px rgba(0,0,0,0.45)',
        }}
      >
        {contextInfo?.label}
      </div>
    </div>
  );
}

export default memo(OrbitNode);

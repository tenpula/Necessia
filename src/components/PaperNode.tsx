/*
 * 【ファイル概要】
 * グラフ上の論文ノード
 * ネットワーク図の中に配置される、1つ1つの「論文」の丸いアイコンやテキストです。
 */

'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper, CONTEXT_TYPE_INFO } from '@/types/paper';
import { formatAuthorsShort, formatNumber } from '@/lib/format';

interface PaperNodeData extends Record<string, unknown> {
  paper: Paper;
  isSeed: boolean;
  gapRole?: 'paperA' | 'paperB' | null;
  yearRatio?: number; // 最小0〜最大1の年代割合
  category?: string; // カテゴリ情報
}

function PaperNode({ data }: NodeProps) {
  const nodeData = data as PaperNodeData;
  const { paper, isSeed, gapRole, yearRatio = 0 } = nodeData;

  // サイズ計算
  // シード論文は、年代ベースの最大サイズ(120)より一回り大きい140に固定
  const baseSize = 60;
  const maxSize = 120;
  const nodeSize = isSeed 
    ? 280 
    : baseSize + (maxSize - baseSize) * yearRatio;

  // Venue Typeに基づく形状のクラス
  const shapeClass = paper.venueType === 'conference' ? 'rounded-lg' : 'rounded-full';

  // スタイル計算
  const { backgroundColor, borderStyle, boxShadow, textColor, subTextColor } = getNodeStyles(gapRole, isSeed, nodeData.category);

  return (
    <>
      <NodeHandles />
      <div
        className={`relative flex flex-col items-center justify-center p-3 
                   cursor-pointer transition-all duration-200
                   hover:scale-105 hover:z-10 group
                   ${shapeClass}
                   ${isSeed ? 'ring-2 ring-offset-2 ring-[#ea553a] ring-offset-[#000000]' : ''}
                   ${gapRole === 'paperA' ? 'ring-2 ring-offset-2 ring-purple-600 ring-offset-[#000000]' : ''}
                   ${gapRole === 'paperB' ? 'ring-2 ring-offset-2 ring-pink-600 ring-offset-[#000000]' : ''}`}
        style={{
          width: nodeSize,
          height: nodeSize,
          backgroundColor,
          border: borderStyle,
          boxShadow,
        }}
      >
        {/* Gap Role ラベル */}
        {gapRole && <GapRoleLabel role={gapRole} />}

        <span className="text-[10px] font-bold text-center line-clamp-2 leading-tight px-1" style={{ color: textColor }}>
          {paper.title.length > 50 ? paper.title.substring(0, 50) + '...' : paper.title}
        </span>

        <span className="text-[8px] mt-1" style={{ color: subTextColor }}>{paper.publicationYear}</span>

        {/* ホバー時のツールチップ */}
        <NodeTooltip paper={paper} />
      </div>
    </>
  );
}

// スタイル計算関数
function getNodeStyles(
  gapRole: 'paperA' | 'paperB' | null | undefined,
  isSeed: boolean,
  category?: string
) {
  // シード論文（使用ノード）の固定色
  if (isSeed) {
    return {
      backgroundColor: '#ea553a',
      borderStyle: '2px solid rgba(0, 0, 0, 0.2)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.4)',
      textColor: 'rgba(255, 255, 255, 0.95)',
      subTextColor: 'rgba(255, 255, 255, 0.7)',
    };
  }

  if (gapRole === 'paperA') {
    return {
      backgroundColor: 'hsl(270, 20%, 40%)', // マットな紫
      borderStyle: '2px solid hsl(270, 30%, 30%)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      textColor: 'rgba(255, 255, 255, 0.9)',
      subTextColor: 'rgba(255, 255, 255, 0.6)',
    };
  }
  if (gapRole === 'paperB') {
    return {
      backgroundColor: 'hsl(330, 20%, 40%)', // マットなピンク
      borderStyle: '2px solid hsl(330, 30%, 30%)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      textColor: 'rgba(255, 255, 255, 0.9)',
      subTextColor: 'rgba(255, 255, 255, 0.6)',
    };
  }

  // 基本色: 分類前は既定の青系、分類後はカテゴリ色
  let baseColor = '#4753a2';
  if (category && (category === 'methodology' || category === 'critique' || category === 'comparison' || category === 'background')) {
    const categoryInfo = CONTEXT_TYPE_INFO[category as keyof typeof CONTEXT_TYPE_INFO];
    if (categoryInfo) {
      baseColor = categoryInfo.color;
    }
  }

  // テキスト色の決定（簡易的な輝度判定）
  const isDark = (color: string) => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return (r * 0.299 + g * 0.587 + b * 0.114) < 160;
    }
    return true;
  };

  const dark = isDark(baseColor);
  const textColor = dark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)';
  const subTextColor = dark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)';

  return {
    backgroundColor: baseColor,
    borderStyle: `2px solid rgba(0, 0, 0, 0.1)`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)', // マットな影
    textColor,
    subTextColor,
  };
}

// ノードハンドル
function NodeHandles() {
  // すべてのノードの中心にハンドルを配置（エッジがノードの中心を指すように）
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="center-target"
        className="!bg-slate-400"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="center-source"
        className="!bg-slate-400"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      />
    </>
  );
}

// Gap Roleラベル
interface GapRoleLabelProps {
  role: 'paperA' | 'paperB';
}

function GapRoleLabel({ role }: GapRoleLabelProps) {
  const colorClass =
    role === 'paperA'
      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
      : 'bg-pink-500 text-white shadow-lg shadow-pink-500/50';

  return (
    <div
      className={`absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold z-10 whitespace-nowrap ${colorClass}`}
    >
      {role === 'paperA' ? 'Paper A' : 'Paper B'}
    </div>
  );
}

// ツールチップ
interface NodeTooltipProps {
  paper: Paper;
}

function NodeTooltip({ paper }: NodeTooltipProps) {
  const displayAuthors = formatAuthorsShort(paper);

  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                pointer-events-none z-50"
    >
      <div
        className="bg-slate-900/95 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl
                  border border-slate-700/50 w-80 max-w-sm"
      >
        <h4 className="font-semibold text-neutral-300 text-sm leading-snug mb-2">{paper.title}</h4>
        <p className="text-xs text-slate-300 mb-1">{displayAuthors}</p>
        {paper.venue && <p className="text-xs text-slate-400 mb-1 italic">{paper.venue}</p>}
        <div className="flex gap-3 mt-2 text-xs">
          <span className="text-slate-400">
            Year: <span className="text-white">{paper.publicationYear}</span>
          </span>
          <span className="text-slate-400">
            Citations: <span className="text-white">{formatNumber(paper.citationCount)}</span>
          </span>
        </div>
        <div className="flex gap-2 mt-2">
          {paper.venueType !== 'unknown' && (
            <VenueTypeBadge venueType={paper.venueType} />
          )}
          {paper.arxivId && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300">
              arXiv
            </span>
          )}
        </div>
      </div>
      <div
        className="w-3 h-3 bg-slate-900/95 border-b border-r border-slate-700/50
                  rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"
      />
    </div>
  );
}

// VenueTypeBadge
interface VenueTypeBadgeProps {
  venueType: Paper['venueType'];
}

function VenueTypeBadge({ venueType }: VenueTypeBadgeProps) {
  const colorMap: Record<string, string> = {
    conference: 'bg-purple-500/30 text-purple-300',
    journal: 'bg-blue-500/30 text-blue-300',
    preprint: 'bg-slate-500/30 text-slate-300',
    unknown: 'bg-slate-500/30 text-slate-300',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${colorMap[venueType]}`}>
      {venueType}
    </span>
  );
}

export default memo(PaperNode);

/*
 * 【ファイル概要】
 * グラフ上の論文ノード
 * ネットワーク図の中に配置される、1つ1つの「論文」の丸いアイコンやテキストです。
 */

'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper } from '@/types/paper';
import { formatAuthorsShort, formatNumber } from '@/lib/format';

interface PaperNodeData extends Record<string, unknown> {
  paper: Paper;
  isSeed: boolean;
  gapRole?: 'paperA' | 'paperB' | null;
}

function PaperNode({ data }: NodeProps) {
  const nodeData = data as PaperNodeData;
  const { paper, isSeed, gapRole } = nodeData;

  // 出版年に基づく色を計算
  const currentYear = new Date().getFullYear();
  const age = currentYear - paper.publicationYear;
  const hue = Math.max(180 - age * 15, 60);

  // 被引用数に基づくサイズ
  const baseSize = 60;
  const maxSize = 140;
  const sizeMultiplier = Math.min(Math.log10(paper.citationCount + 1) / 4, 1);
  const nodeSize = baseSize + (maxSize - baseSize) * sizeMultiplier;

  // Venue Typeに基づく形状のクラス
  const shapeClass = paper.venueType === 'conference' ? 'rounded-lg' : 'rounded-full';

  // スタイル計算
  const { backgroundColor, borderStyle, boxShadow } = getNodeStyles(gapRole, hue, isSeed);

  return (
    <>
      <NodeHandles isSeed={isSeed} />
      <div
        className={`relative flex flex-col items-center justify-center p-3 
                   cursor-pointer transition-all duration-200
                   hover:scale-110 hover:z-10 group
                   ${shapeClass}
                   ${isSeed ? 'ring-4 ring-neutral-500 ring-opacity-60' : ''}
                   ${gapRole === 'paperA' ? 'ring-4 ring-purple-500 ring-opacity-80 animate-pulse' : ''}
                   ${gapRole === 'paperB' ? 'ring-4 ring-pink-500 ring-opacity-80 animate-pulse' : ''}`}
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

        <span className="text-[10px] font-bold text-white/90 text-center line-clamp-2 leading-tight px-1">
          {paper.title.length > 50 ? paper.title.substring(0, 50) + '...' : paper.title}
        </span>

        <span className="text-[8px] text-white/60 mt-1">{paper.publicationYear}</span>

        {/* ホバー時のツールチップ */}
        <NodeTooltip paper={paper} />
      </div>
    </>
  );
}

// スタイル計算関数
function getNodeStyles(
  gapRole: 'paperA' | 'paperB' | null | undefined,
  hue: number,
  isSeed: boolean
) {
  if (gapRole === 'paperA') {
    return {
      backgroundColor: 'hsla(270, 70%, 30%, 0.95)',
      borderStyle: '3px solid hsl(270, 80%, 60%)',
      boxShadow: '0 0 40px rgba(168, 85, 247, 0.6), 0 0 20px rgba(168, 85, 247, 0.4)',
    };
  }
  if (gapRole === 'paperB') {
    return {
      backgroundColor: 'hsla(330, 70%, 30%, 0.95)',
      borderStyle: '3px solid hsl(330, 80%, 60%)',
      boxShadow: '0 0 40px rgba(236, 72, 153, 0.6), 0 0 20px rgba(236, 72, 153, 0.4)',
    };
  }
  return {
    backgroundColor: `hsla(${hue}, 70%, 25%, 0.9)`,
    borderStyle: `2px solid hsla(${hue}, 80%, 50%, 0.8)`,
    boxShadow: isSeed
      ? '0 0 30px rgba(34, 211, 238, 0.4)'
      : `0 4px 20px hsla(${hue}, 70%, 20%, 0.5)`,
  };
}

// ノードハンドル
interface NodeHandlesProps {
  isSeed: boolean;
}

function NodeHandles({ isSeed }: NodeHandlesProps) {
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

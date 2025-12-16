'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Paper } from '@/types/paper';

interface PaperNodeData extends Record<string, unknown> {
  paper: Paper;
  isSeed: boolean;
}

function PaperNode({ data }: NodeProps) {
  const nodeData = data as PaperNodeData;
  const { paper, isSeed } = nodeData;
  
  // 出版年に基づく色を計算（古い→新しい: 青→シアン→緑→黄）
  const currentYear = new Date().getFullYear();
  const age = currentYear - paper.publicationYear;
  const hue = Math.max(180 - age * 15, 60); // 180(シアン)から始まり、古くなるほど60(黄緑)へ
  
  // 被引用数に基づくサイズ
  const baseSize = 60;
  const maxSize = 140;
  const sizeMultiplier = Math.min(Math.log10(paper.citationCount + 1) / 4, 1);
  const nodeSize = baseSize + (maxSize - baseSize) * sizeMultiplier;
  
  // Venue Typeに基づく形状のクラス
  const shapeClass = paper.venueType === 'conference' ? 'rounded-lg' : 'rounded-full';
  
  // 著者を省略表示
  const displayAuthors = paper.authors.slice(0, 2).map(a => a.name.split(' ').pop()).join(', ');
  const hasMoreAuthors = paper.authors.length > 2;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div
        className={`relative flex flex-col items-center justify-center p-3 
                   cursor-pointer transition-all duration-200
                   hover:scale-110 hover:z-10 group
                   ${shapeClass}
                   ${isSeed ? 'ring-4 ring-cyan-400 ring-opacity-60' : ''}`}
        style={{
          width: nodeSize,
          height: nodeSize,
          backgroundColor: `hsla(${hue}, 70%, 25%, 0.9)`,
          border: `2px solid hsla(${hue}, 80%, 50%, 0.8)`,
          boxShadow: isSeed ? '0 0 30px rgba(34, 211, 238, 0.4)' : `0 4px 20px hsla(${hue}, 70%, 20%, 0.5)`,
        }}
      >
        <span className="text-[10px] font-bold text-white/90 text-center line-clamp-2 leading-tight px-1">
          {paper.title.length > 50 ? paper.title.substring(0, 50) + '...' : paper.title}
        </span>
        
        <span className="text-[8px] text-white/60 mt-1">
          {paper.publicationYear}
        </span>
        
        {/* ホバー時のツールチップ */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      pointer-events-none z-50">
          <div className="bg-slate-900/95 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl
                        border border-slate-700/50 w-80 max-w-sm">
            <h4 className="font-semibold text-cyan-300 text-sm leading-snug mb-2">
              {paper.title}
            </h4>
            <p className="text-xs text-slate-300 mb-1">
              {displayAuthors}{hasMoreAuthors ? ' et al.' : ''}
            </p>
            {paper.venue && (
              <p className="text-xs text-slate-400 mb-1 italic">
                {paper.venue}
              </p>
            )}
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-slate-400">
                Year: <span className="text-white">{paper.publicationYear}</span>
              </span>
              <span className="text-slate-400">
                Citations: <span className="text-white">{paper.citationCount.toLocaleString()}</span>
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {paper.venueType !== 'unknown' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full 
                              ${paper.venueType === 'conference' ? 'bg-purple-500/30 text-purple-300' : 
                                paper.venueType === 'journal' ? 'bg-blue-500/30 text-blue-300' : 
                                'bg-slate-500/30 text-slate-300'}`}>
                  {paper.venueType}
                </span>
              )}
              {paper.arxivId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300">
                  arXiv
                </span>
              )}
            </div>
          </div>
          <div className="w-3 h-3 bg-slate-900/95 border-b border-r border-slate-700/50
                        rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5" />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </>
  );
}

export default memo(PaperNode);


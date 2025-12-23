'use client';

import { Citation, Paper, CONTEXT_TYPE_INFO, CitationContextType } from '@/types/paper';
import { DetailPanel } from './ui';
import { formatDate } from '@/lib/format';

interface EdgeDetailPanelProps {
  citation: Citation;
  sourcePaper: Paper;
  targetPaper: Paper;
  onClose: () => void;
}

export default function EdgeDetailPanel({
  citation,
  sourcePaper,
  targetPaper,
  onClose,
}: EdgeDetailPanelProps) {
  const contextType = citation.contextType || 'background';
  const contextInfo = CONTEXT_TYPE_INFO[contextType];

  const header = (
    <h3 className="text-lg font-semibold text-white">Citation Context</h3>
  );

  return (
    <DetailPanel onClose={onClose} header={header}>
      {/* 文脈タイプ */}
      <ContextTypeCard
        contextInfo={contextInfo}
        confidence={citation.confidence}
      />

      {/* 引用方向 */}
      <CitationDirectionCard sourcePaper={sourcePaper} targetPaper={targetPaper} />

      {/* Context Snippet */}
      {citation.contextSnippet && (
        <ContextSnippetCard snippet={citation.contextSnippet} />
      )}

      {/* 文脈タイプの説明 */}
      <ContextTypesLegend currentType={contextType} />

      {/* 解析情報 */}
      {citation.analyzedAt && (
        <div className="pt-2 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">
            Analyzed: {formatDate(citation.analyzedAt)}
          </span>
        </div>
      )}
    </DetailPanel>
  );
}

// 文脈タイプカード
interface ContextTypeCardProps {
  contextInfo: (typeof CONTEXT_TYPE_INFO)[CitationContextType];
  confidence?: number;
}

function ContextTypeCard({ contextInfo, confidence }: ContextTypeCardProps) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        backgroundColor: contextInfo.bgColor,
        border: `1px solid ${contextInfo.borderColor}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{contextInfo.emoji}</span>
        <span className="text-lg font-semibold" style={{ color: contextInfo.color }}>
          {contextInfo.label}
        </span>
      </div>
      <p className="text-sm text-slate-300">{contextInfo.description}</p>
      {confidence !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">Confidence:</span>
          <div className="flex-1 bg-slate-700/50 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${confidence * 100}%`,
                backgroundColor: contextInfo.color,
              }}
            />
          </div>
          <span className="text-xs text-slate-300">{Math.round(confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}

// 引用方向カード
interface CitationDirectionCardProps {
  sourcePaper: Paper;
  targetPaper: Paper;
}

function CitationDirectionCard({ sourcePaper, targetPaper }: CitationDirectionCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Citation Direction
      </h4>

      {/* 引用元 */}
      <PaperInfo paper={sourcePaper} label="Citing Paper (Source)" />

      {/* 矢印 */}
      <div className="flex justify-center py-2">
        <svg
          className="w-6 h-6 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>

      {/* 引用先 */}
      <PaperInfo paper={targetPaper} label="Cited Paper (Target)" />
    </div>
  );
}

// 論文情報
interface PaperInfoProps {
  paper: Paper;
  label: string;
}

function PaperInfo({ paper, label }: PaperInfoProps) {
  return (
    <div>
      <span className="text-xs text-slate-500 uppercase">{label}</span>
      <p className="text-sm text-white font-medium mt-1 line-clamp-2">{paper.title}</p>
      <p className="text-xs text-slate-400 mt-1">
        {paper.publicationYear} · {paper.citationCount} citations
      </p>
    </div>
  );
}

// Context Snippetカード
interface ContextSnippetCardProps {
  snippet: string;
}

function ContextSnippetCard({ snippet }: ContextSnippetCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Context Snippet
      </h4>
      <blockquote className="text-sm text-slate-300 italic border-l-2 border-slate-600 pl-3">
        &quot;{snippet}&quot;
      </blockquote>
    </div>
  );
}

// 文脈タイプ凡例
interface ContextTypesLegendProps {
  currentType: CitationContextType;
}

function ContextTypesLegend({ currentType }: ContextTypesLegendProps) {
  return (
    <div className="bg-slate-800/30 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Context Types
      </h4>
      <div className="space-y-2">
        {(
          Object.entries(CONTEXT_TYPE_INFO) as [
            CitationContextType,
            (typeof CONTEXT_TYPE_INFO)[CitationContextType]
          ][]
        ).map(([type, info]) => (
          <div
            key={type}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              type === currentType ? 'bg-slate-700/50' : ''
            }`}
          >
            <span>{info.emoji}</span>
            <span className="text-xs" style={{ color: info.color }}>
              {info.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

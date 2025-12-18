'use client';

import { Citation, Paper, CONTEXT_TYPE_INFO, CitationContextType } from '@/types/paper';

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

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-md
                  border-l border-slate-700/50 shadow-2xl overflow-y-auto z-50">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-white">Citation Context</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 文脈タイプ */}
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: contextInfo.bgColor,
            border: `1px solid ${contextInfo.borderColor}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{contextInfo.emoji}</span>
            <span
              className="text-lg font-semibold"
              style={{ color: contextInfo.color }}
            >
              {contextInfo.label}
            </span>
          </div>
          <p className="text-sm text-slate-300">{contextInfo.description}</p>
          {citation.confidence !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">Confidence:</span>
              <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${citation.confidence * 100}%`,
                    backgroundColor: contextInfo.color,
                  }}
                />
              </div>
              <span className="text-xs text-slate-300">
                {Math.round(citation.confidence * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 引用方向 */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Citation Direction
          </h4>
          
          {/* 引用元 */}
          <div className="mb-3">
            <span className="text-xs text-slate-500 uppercase">Citing Paper (Source)</span>
            <p className="text-sm text-white font-medium mt-1 line-clamp-2">
              {sourcePaper.title}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {sourcePaper.publicationYear} · {sourcePaper.citationCount} citations
            </p>
          </div>

          {/* 矢印 */}
          <div className="flex justify-center py-2">
            <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>

          {/* 引用先 */}
          <div>
            <span className="text-xs text-slate-500 uppercase">Cited Paper (Target)</span>
            <p className="text-sm text-white font-medium mt-1 line-clamp-2">
              {targetPaper.title}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {targetPaper.publicationYear} · {targetPaper.citationCount} citations
            </p>
          </div>
        </div>

        {/* Context Snippet（Phase 2で表示） */}
        {citation.contextSnippet && (
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Context Snippet
            </h4>
            <blockquote className="text-sm text-slate-300 italic border-l-2 border-slate-600 pl-3">
              "{citation.contextSnippet}"
            </blockquote>
          </div>
        )}

        {/* 文脈タイプの説明 */}
        <div className="bg-slate-800/30 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Context Types
          </h4>
          <div className="space-y-2">
            {(Object.entries(CONTEXT_TYPE_INFO) as [CitationContextType, typeof CONTEXT_TYPE_INFO[CitationContextType]][]).map(
              ([type, info]) => (
                <div
                  key={type}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    type === contextType ? 'bg-slate-700/50' : ''
                  }`}
                >
                  <span>{info.emoji}</span>
                  <span className="text-xs" style={{ color: info.color }}>
                    {info.label}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* 解析情報 */}
        {citation.analyzedAt && (
          <div className="pt-2 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">
              Analyzed: {new Date(citation.analyzedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


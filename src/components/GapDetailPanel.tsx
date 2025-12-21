'use client';

import { GapProposal, Paper } from '@/types/paper';

interface GapDetailPanelProps {
  proposal: GapProposal;
  onClose: () => void;
  onPaperClick?: (paper: Paper) => void;
}

export default function GapDetailPanel({
  proposal,
  onClose,
  onPaperClick,
}: GapDetailPanelProps) {
  const formatAuthors = (paper: Paper) => {
    if (paper.authors.length === 0) return 'Unknown authors';
    if (paper.authors.length <= 3) {
      return paper.authors.map((a) => a.name).join(', ');
    }
    return `${paper.authors.slice(0, 3).map((a) => a.name).join(', ')} et al.`;
  };

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-md
                  border-l border-slate-700/50 shadow-2xl overflow-y-auto z-50">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
            <h3 className="text-lg font-semibold text-white">Research Gap</h3>
          </div>
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
        {/* 信頼度スコア */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-300">Confidence Score</span>
            <span className="text-lg font-bold text-white">
              {Math.round(proposal.confidence * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${proposal.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* メトリクス */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              Similarity
            </div>
            <div className="text-2xl font-bold text-cyan-400">
              {(proposal.similarityScore * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              Co-citations
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {proposal.coCitationCount}
            </div>
          </div>
        </div>

        {/* 説明文 */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Analysis
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {proposal.reasoning}
          </p>
        </div>

        {/* 論文A */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-3">
            Paper A
          </h4>
          <button
            onClick={() => onPaperClick?.(proposal.paperA)}
            className="text-left w-full hover:opacity-80 transition-opacity"
          >
            <h5 className="text-base font-semibold text-white mb-2 line-clamp-3">
              {proposal.paperA.title}
            </h5>
            <div className="space-y-1 text-xs text-slate-400">
              <p>{formatAuthors(proposal.paperA)}</p>
              <div className="flex items-center gap-3">
                <span>{proposal.paperA.publicationYear}</span>
                {proposal.paperA.venueType !== 'unknown' && (
                  <span className="px-2 py-0.5 bg-slate-700/50 rounded">
                    {proposal.paperA.venueType}
                  </span>
                )}
                <span>{proposal.paperA.citationCount} citations</span>
              </div>
              {proposal.paperA.abstract && (
                <p className="text-slate-500 mt-2 line-clamp-3">
                  {proposal.paperA.abstract}
                </p>
              )}
            </div>
          </button>
        </div>

        {/* 論文B */}
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-3">
            Paper B
          </h4>
          <button
            onClick={() => onPaperClick?.(proposal.paperB)}
            className="text-left w-full hover:opacity-80 transition-opacity"
          >
            <h5 className="text-base font-semibold text-white mb-2 line-clamp-3">
              {proposal.paperB.title}
            </h5>
            <div className="space-y-1 text-xs text-slate-400">
              <p>{formatAuthors(proposal.paperB)}</p>
              <div className="flex items-center gap-3">
                <span>{proposal.paperB.publicationYear}</span>
                {proposal.paperB.venueType !== 'unknown' && (
                  <span className="px-2 py-0.5 bg-slate-700/50 rounded">
                    {proposal.paperB.venueType}
                  </span>
                )}
                <span>{proposal.paperB.citationCount} citations</span>
              </div>
              {proposal.paperB.abstract && (
                <p className="text-slate-500 mt-2 line-clamp-3">
                  {proposal.paperB.abstract}
                </p>
              )}
            </div>
          </button>
        </div>

        {/* 共通引用 */}
        {proposal.commonCitations.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Common Citations ({proposal.commonCitations.length})
            </h4>
            <div className="space-y-2">
              {proposal.commonCitations.map((paper) => (
                <div
                  key={paper.id}
                  className="bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors"
                >
                  <button
                    onClick={() => onPaperClick?.(paper)}
                    className="text-left w-full"
                  >
                    <p className="text-sm text-white font-medium line-clamp-2 mb-1">
                      {paper.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {paper.publicationYear} · {paper.citationCount} citations
                    </p>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* なぜこれがGapなのか */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-purple-500/20">
          <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">
            Why This Is A Gap
          </h4>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li>
              These papers have <strong className="text-cyan-400">
                {(proposal.similarityScore * 100).toFixed(0)}% semantic similarity
              </strong>, indicating they address related topics.
            </li>
            {proposal.coCitationCount > 0 && (
              <li>
                They share <strong className="text-purple-400">
                  {proposal.coCitationCount} common citation{proposal.coCitationCount > 1 ? 's' : ''}
                </strong>, suggesting similar research foundations.
              </li>
            )}
            <li>
              Despite these connections, they <strong className="text-red-400">
                do not directly cite each other
              </strong>, indicating a potential research gap.
            </li>
            <li>
              A comparative analysis or direct comparison could provide valuable insights.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

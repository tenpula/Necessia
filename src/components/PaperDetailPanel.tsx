'use client';

import { Paper } from '@/types/paper';

interface PaperDetailPanelProps {
  paper: Paper;
  onClose: () => void;
  isSeed: boolean;
}

export default function PaperDetailPanel({ paper, onClose, isSeed }: PaperDetailPanelProps) {
  // 著者名のフォーマット
  const formatAuthors = () => {
    if (paper.authors.length === 0) return 'Unknown authors';
    if (paper.authors.length <= 3) {
      return paper.authors.map((a) => a.name).join(', ');
    }
    return `${paper.authors.slice(0, 3).map((a) => a.name).join(', ')} et al.`;
  };

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-md
                  border-l border-slate-700/50 shadow-2xl overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {isSeed && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 rounded-full">
                Seed Paper
              </span>
            )}
            {paper.venueType !== 'unknown' && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full
                            ${paper.venueType === 'conference' ? 'bg-purple-500/20 text-purple-300' :
                              paper.venueType === 'journal' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-orange-500/20 text-orange-300'}`}>
                {paper.venueType}
              </span>
            )}
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
        {/* タイトル */}
        <h2 className="text-lg font-semibold text-white leading-snug">
          {paper.title}
        </h2>

        {/* 著者 */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Authors
          </h3>
          <p className="text-sm text-slate-300">{formatAuthors()}</p>
        </div>

        {/* Venue */}
        {paper.venue && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Venue
            </h3>
            <p className="text-sm text-slate-300 italic">{paper.venue}</p>
          </div>
        )}

        {/* メトリクス */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1">Year</span>
            <span className="text-xl font-bold text-white">{paper.publicationYear}</span>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <span className="text-xs text-slate-400 block mb-1">Citations</span>
            <span className="text-xl font-bold text-cyan-400">
              {paper.citationCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Abstract
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-[10]">
              {paper.abstract}
            </p>
          </div>
        )}

        {/* リンク */}
        <div className="pt-2 space-y-2">
          {paper.arxivId && (
            <a
              href={`https://arxiv.org/abs/${paper.arxivId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20
                       text-orange-300 rounded-xl transition-colors w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L1 6v12l11 6 11-6V6L12 0zm0 2.31l8.27 4.52L12 11.35 3.73 6.83 12 2.31zM3 8.53l8 4.37v8.78l-8-4.37V8.53zm10 13.15v-8.78l8-4.37v8.78l-8 4.37z"/>
              </svg>
              View on arXiv
            </a>
          )}
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20
                       text-blue-300 rounded-xl transition-colors w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              View DOI
            </a>
          )}
          {paper.openAccessUrl && (
            <a
              href={paper.openAccessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20
                       text-green-300 rounded-xl transition-colors w-full"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
              Open Access PDF
            </a>
          )}
        </div>

        {/* OpenAlex ID */}
        <div className="pt-4 border-t border-slate-700/50">
          <span className="text-xs text-slate-500">
            OpenAlex ID: {paper.openAlexId.replace('https://openalex.org/', '')}
          </span>
        </div>
      </div>
    </div>
  );
}


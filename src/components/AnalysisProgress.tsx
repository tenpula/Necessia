'use client';

import { AnalysisProgress as AnalysisProgressType } from '@/types/paper';

interface AnalysisProgressProps {
  progress: AnalysisProgressType;
}

export default function AnalysisProgress({ progress }: AnalysisProgressProps) {
  const percentage = progress.total > 0 
    ? Math.round((progress.analyzed / progress.total) * 100) 
    : 0;

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-cyan-400 font-semibold text-sm">Analyzing Citation Contexts</h3>
        <span className="text-xs text-slate-400">
          {progress.analyzed}/{progress.total}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full bg-slate-700/50 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* ステータス */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {progress.status === 'analyzing' && (
            <>
              <svg className="animate-spin h-3 w-3 text-cyan-400" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-slate-400">
                {progress.currentPaper 
                  ? `Analyzing: ${progress.currentPaper.substring(0, 30)}...`
                  : 'Processing...'}
              </span>
            </>
          )}
          {progress.status === 'completed' && (
            <>
              <svg className="w-3 h-3 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              <span className="text-green-400">Analysis complete</span>
            </>
          )}
          {progress.status === 'error' && (
            <>
              <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span className="text-red-400">Analysis error</span>
            </>
          )}
        </div>
        {progress.cached > 0 && (
          <span className="text-slate-500">
            {progress.cached} from cache
          </span>
        )}
      </div>
    </div>
  );
}


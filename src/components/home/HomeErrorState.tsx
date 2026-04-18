'use client';

interface HomeErrorStateProps {
  error: string;
  onReset: () => void;
}

const SUPPORTED_INPUTS = [
  'arXiv URL (例: https://arxiv.org/abs/1706.03762)',
  'arXiv ID (例: 2010.11929)',
  'DOI (例: 10.48550/arXiv.1706.03762)',
  '論文タイトル',
] as const;

export function HomeErrorState({ error, onReset }: HomeErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
      <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-red-500/30 rounded-3xl p-12 shadow-2xl shadow-red-900/20 ring-1 ring-red-500/10">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/30">
              <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">エラーが発生しました</h2>

          <div className="mb-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-300 font-medium text-lg leading-relaxed">{error}</p>
          </div>

          <div className="mb-8 px-6 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-left">
            <p className="text-slate-400 text-sm mb-3 font-semibold">対応している形式:</p>
            <ul className="space-y-2 text-slate-300 text-sm">
              {SUPPORTED_INPUTS.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={onReset}
            className="group inline-flex items-center gap-3 px-8 py-4 bg-slate-800
                       hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white font-medium rounded-xl
                       transition-all duration-200 shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-black/50
                       transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>最初の画面に戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
}

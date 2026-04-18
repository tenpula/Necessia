'use client';

import FeaturesView from '@/components/FeaturesView';
import SearchForm from '@/components/SearchForm';

interface HomeEmptyStateProps {
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  isLoading: boolean;
  isTransitioning: boolean;
  progress?: string;
  onSearch: (query: string) => Promise<void>;
  onLogin: () => void;
}

function LoginPrompt({ isTransitioning, onLogin }: Pick<HomeEmptyStateProps, 'isTransitioning' | 'onLogin'>) {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-full px-6 py-12 relative z-10 transition-all duration-700 ease-in-out ${
        isTransitioning ? 'opacity-0 scale-95 blur-[2px]' : 'opacity-100 scale-100 blur-none'
      }`}
    >
      <h1 className="averia-gruesa-libre-regular text-6xl md:text-7xl tracking-wide text-white mb-10">
        Necessia
      </h1>
      <button
        onClick={onLogin}
        className="group flex items-center gap-4 px-10 py-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 font-medium rounded-full transition-all duration-300 shadow-lg shadow-black/50 transform hover:-translate-y-0.5"
      >
        <svg className="w-6 h-6 text-neutral-400 group-hover:text-neutral-200 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        <span className="text-xl tracking-wider">Log in</span>
      </button>
    </div>
  );
}

function SearchHero({ isLoading, progress, onSearch }: Pick<HomeEmptyStateProps, 'isLoading' | 'progress' | 'onSearch'>) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 py-12 relative animate-in fade-in zoom-in-95 duration-1000">
      <div className="relative z-10 w-full max-w-4xl mx-auto text-center mt-6">
        <h1 className="averia-gruesa-libre-regular text-6xl md:text-7xl tracking-wide text-white mb-10">
          Necessia
        </h1>
        <SearchForm onSearch={onSearch} isLoading={isLoading} />
        {isLoading && progress ? (
          <p className="mt-6 text-sm tracking-wide text-neutral-400">{progress}</p>
        ) : (
          <p className="mt-6 text-sm tracking-wide text-neutral-500">
            入力した論文を起点に、引用ネットワークと研究ギャップ候補を可視化します。
          </p>
        )}
      </div>
    </div>
  );
}

export function HomeEmptyState({
  authStatus,
  isLoading,
  isTransitioning,
  progress,
  onSearch,
  onLogin,
}: HomeEmptyStateProps) {
  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-pulse w-8 h-8 rounded-full bg-neutral-600"></div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <LoginPrompt isTransitioning={isTransitioning} onLogin={onLogin} />;
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
      <SearchHero isLoading={isLoading} progress={progress} onSearch={onSearch} />
      <div className="pt-24 md:pt-32">
        <FeaturesView />
      </div>
    </div>
  );
}

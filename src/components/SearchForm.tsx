'use client';

import { useState, useCallback } from 'react';

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const exampleQueries = [
    { label: 'arXiv URL', value: 'https://arxiv.org/abs/1706.03762' },
    { label: 'arXiv ID', value: '2010.11929' },
    { label: 'DOI', value: '10.48550/arXiv.1706.03762' },
  ];

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleExampleClick = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter arXiv URL, DOI, or paper title..."
            className="w-full px-6 py-4 text-lg bg-slate-800/50 border border-slate-600/50 rounded-2xl
                     text-slate-100 placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
                     transition-all duration-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5
                     bg-gradient-to-r from-cyan-500 to-blue-500 
                     hover:from-cyan-400 hover:to-blue-400
                     disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed
                     text-white font-semibold rounded-xl
                     transition-all duration-200 shadow-lg shadow-cyan-500/20"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                Analyzing...
              </span>
            ) : (
              'Visualize'
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2">
        <span className="text-slate-400 text-sm mb-0">Try</span>
        <div className="flex flex-wrap gap-2 justify-center">
          {exampleQueries.map((example) => (
          <button
            key={example.value}
            onClick={() => handleExampleClick(example.value)}
            className="text-sm px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 
                     text-slate-300 rounded-lg transition-colors duration-150"
            disabled={isLoading}
          >
            {example.label}
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}


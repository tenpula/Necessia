/*
 * 【ファイル概要】
 * 検索フォーム
 * ユーザーがキーワードを入力して論文を探すための入力欄とボタンです。
 */

'use client';

import { useState, useCallback } from 'react';
import { LoadingSpinner } from './ui';

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

// サンプルクエリの定義
// ユーザーが試しやすいように、代表的な入力形式の例を提供します
const EXAMPLE_QUERIES = [
  { label: 'arXiv URL', value: 'https://arxiv.org/abs/1706.03762' },
  { label: 'arXiv ID', value: '2010.11929' },
  { label: 'DOI', value: '10.48550/arXiv.1706.03762' },
] as const;

/**
 * 検索フォームコンポーネント
 * 
 * ユーザーが論文を検索するための入力フォームを提供します。
 * arXiv ID, DOI, タイトルなどの入力を受け付け、検索を実行します。
 * また、サンプルクエリの提示も行います。
 */
export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');

  /**
   * フォーム送信時のハンドラ
   * 入力が空でない場合のみ検索を実行します。
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  /**
   * 入力変更時のハンドラ
   */
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  /**
   * サンプルクエリクリック時のハンドラ
   * クリックされた値を入力フォームにセットします。
   */
  const handleExampleClick = useCallback((value: string) => {
    setQuery(value);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="arXivのURL、DOI、または論文タイトルを入力..."
            className="w-full pl-6 pr-24 py-3 text-sm bg-neutral-900 border border-neutral-700 rounded-full
                     text-neutral-200 placeholder-neutral-500
                     focus:outline-none focus:border-neutral-500 focus:bg-neutral-800
                     transition-all duration-200 shadow-inner shadow-black/50"
            disabled={isLoading}
          />
          <SubmitButton isLoading={isLoading} isDisabled={!query.trim()} />
        </div>
      </form>

      <ExampleQueries
        examples={EXAMPLE_QUERIES}
        onExampleClick={handleExampleClick}
        isLoading={isLoading}
      />
    </div>
  );
}

// 送信ボタン
interface SubmitButtonProps {
  isLoading: boolean;
  isDisabled: boolean;
}

function SubmitButton({ isLoading, isDisabled }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading || isDisabled}
      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5
               bg-neutral-800 hover:bg-neutral-700 border border-neutral-600
               disabled:bg-neutral-800 disabled:border-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed
               text-neutral-200 text-sm font-medium rounded-full
               transition-all duration-200 shadow-md shadow-black/40"
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <LoadingSpinner size="md" />
          解析中...
        </span>
      ) : (
        '可視化'
      )}
    </button>
  );
}

// サンプルクエリ
interface ExampleQueriesProps {
  examples: readonly { label: string; value: string }[];
  onExampleClick: (value: string) => void;
  isLoading: boolean;
}

function ExampleQueries({ examples, onExampleClick, isLoading }: ExampleQueriesProps) {
  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      <span className="text-neutral-500 text-sm mb-0">試してみる</span>
      <div className="flex flex-wrap gap-2 justify-center">
        {examples.map((example) => (
          <button
            key={example.value}
            onClick={() => onExampleClick(example.value)}
            className="text-xs px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700
                     text-neutral-400 hover:text-neutral-200 rounded-full transition-colors duration-150 border border-neutral-700"
            disabled={isLoading}
          >
            {example.label}
          </button>
        ))}
      </div>
    </div>
  );
}

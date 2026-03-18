/*
 * 【ファイル概要】
 * トップバー
 * 画面の一番上にある、ロゴ、検索バー、ログインボタンが並んでいるナビゲーションです。
 */

// =============================================================================
// TopBar コンポーネント（認証ボタン統合版）
// =============================================================================

'use client';

import React from 'react';
import AuthButton from '@/components/AuthButton';

interface TopBarProps {
    onBack: () => void;
    remainingUsage?: number;
    usageLimit?: number;
}

export const TopBar: React.FC<TopBarProps> = ({ onBack, remainingUsage, usageLimit }) => {
  return (
    <header className="flex flex-none items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-[#282839] bg-white dark:bg-[#111118] px-6 py-3 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white cursor-pointer" onClick={onBack}>
          <div className="text-primary">
            <span className="material-symbols-outlined text-[32px]">hub</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Necessia</h2>
        </div>
        <div className="hidden lg:flex items-center gap-9">
          <a className="text-slate-600 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Explore</a>
          <a className="text-slate-600 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">My Library</a>
          <a className="text-slate-600 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Saved Graphs</a>
          <a className="text-slate-600 dark:text-white text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">Settings</a>
        </div>
      </div>
      <div className="flex flex-1 justify-end gap-6 items-center">
        <label className="hidden md:flex flex-col min-w-40 !h-10 max-w-64">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-none">
            <div className="text-slate-400 dark:text-[#9d9db9] flex border-none bg-slate-50 dark:bg-[#282839] items-center justify-center pl-4 rounded-l-lg border-r-0">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </div>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-0 border-none bg-slate-50 dark:bg-[#282839] focus:border-none h-full placeholder:text-slate-400 dark:placeholder:text-[#9d9db9] px-4 rounded-l-none border-l-0 pl-2 text-sm font-normal leading-normal"
              placeholder="Search papers..."
              defaultValue=""
            />
          </div>
        </label>
        {/* 認証ボタン（ログイン/ユーザーメニュー） */}
        <AuthButton remainingUsage={remainingUsage} usageLimit={usageLimit} />
      </div>
    </header>
  );
};

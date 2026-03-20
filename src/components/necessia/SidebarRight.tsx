/*
 * 【ファイル概要】
 * 右サイドバー
 * 論文をクリックした時に右側からスライドして現れる、詳細情報エリアです。
 */

import React from 'react';
import { Paper } from '../../types/necessia';

interface SidebarRightProps {
  paper: Paper;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({ paper }) => {
  return (
    <aside className="w-96 flex-none bg-white dark:bg-neutral-900/95 backdrop-blur-xl border-l border-neutral-200 dark:border-neutral-800 z-30 flex flex-col h-full overflow-y-auto transform transition-transform duration-300 absolute right-0 top-0 bottom-0 shadow-2xl">
      <div 
        className="h-40 w-full bg-cover bg-center relative" 
        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAi6i6BiBo69HN4tm4uapHmYIKmVRC8aDz0J9vlAHT3Zm9A26gSdUl-HApj6QipVeBtIl6K1Rut3Y9-KP1aByzrtKi55R6vUNXoGin33vZCodJ9OEdOadGnL-X-d5jyn7bI9dj9F3oc28Mkhew7EZbYknuL-VuFBhvdh29rDiNzuyqELNOQ8q13NF4NiRahOAkNvhmByc1zoHGTaW0vIggBE5PYqjaJzdJ3tgO0EL4ccb63DgmtwaiWJkPcwYJmqUkq9YCVTRaAOag7")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] to-transparent"></div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="size-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
          <button className="size-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">bookmark_border</span>
          </button>
        </div>
      </div>
      
      <div className="flex flex-col p-6 gap-6 -mt-12 relative">
        <div className="flex flex-col gap-3">
          <div className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full w-fit text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            {paper.category} / {paper.subCategory}
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white leading-tight font-display">
            {paper.title}
          </h2>
          <div className="flex items-center gap-2 text-neutral-500 dark:text-[#9d9db9] text-sm">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            <span>出版: {paper.month} {paper.year}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-neutral-400 dark:text-[#6b6b80] uppercase tracking-wider">著者</h3>
          <div className="flex flex-wrap gap-2">
            {paper.authors.map((author, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-neutral-100 dark:bg-[#282839] rounded-full pr-3 pl-1 py-1">
                <div className="size-6 rounded-full bg-neutral-300 dark:bg-[#3b3b54] flex items-center justify-center text-[10px] font-bold text-white">{author.initials}</div>
                <span className="text-xs font-medium text-neutral-700 dark:text-white">{author.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 dark:bg-[#1c1c27] p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-[#9d9db9] mb-1">引用数</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">{paper.citations.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-50 dark:bg-[#1c1c27] p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-500 dark:text-[#9d9db9] mb-1">インパクトファクター</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">{paper.impactFactor}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-neutral-400 dark:text-[#6b6b80] uppercase tracking-wider">概要</h3>
          <p className="text-neutral-600 dark:text-[#d0d0e0] text-sm leading-relaxed font-body">
            {paper.abstract}
            <a href="#" className="text-primary hover:text-blue-400 ml-1">続きを読む</a>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-neutral-400 dark:text-[#6b6b80] uppercase tracking-wider">関連ノード ({paper.connectedNodes.length})</h3>
          </div>
          <div className="flex flex-col gap-2">
            {paper.connectedNodes.map((node) => (
              <a key={node.id} href="#" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-[#282839] transition-colors">
                <div className="size-8 rounded bg-primary/20 text-primary flex items-center justify-center flex-none">
                  <span className="material-symbols-outlined text-[18px]">article</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate group-hover:text-primary transition-colors">{node.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-[#9d9db9]">{node.year} • {node.authors}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-primary/25">
            <span className="material-symbols-outlined">open_in_new</span>
            フルペーパーにアクセス
          </button>
        </div>
      </div>
    </aside>
  );
};

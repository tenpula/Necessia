// フォーマット関連のユーティリティ関数

import { Paper } from '@/types/paper';

/**
 * 著者名をフォーマットする
 * 3人以下の場合はすべて表示、4人以上は最初の3人 + "et al."
 */
export function formatAuthors(paper: Paper, maxAuthors: number = 3): string {
  if (paper.authors.length === 0) return 'Unknown authors';
  if (paper.authors.length <= maxAuthors) {
    return paper.authors.map((a) => a.name).join(', ');
  }
  return `${paper.authors.slice(0, maxAuthors).map((a) => a.name).join(', ')} et al.`;
}

/**
 * 著者名を省略表示する（姓のみ）
 */
export function formatAuthorsShort(paper: Paper, maxAuthors: number = 2): string {
  if (paper.authors.length === 0) return 'Unknown';
  
  const displayAuthors = paper.authors
    .slice(0, maxAuthors)
    .map((a) => a.name.split(' ').pop())
    .join(', ');
  
  const hasMoreAuthors = paper.authors.length > maxAuthors;
  return hasMoreAuthors ? `${displayAuthors} et al.` : displayAuthors;
}

/**
 * 論文タイトルを指定文字数で切り詰める
 */
export function formatPaperTitle(title: string, maxLength: number = 80): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}

/**
 * 数値をカンマ区切りでフォーマット
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 日付をフォーマット
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}


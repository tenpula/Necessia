/*
 * 【ファイル概要】
 * 論文データの型定義
 * 論文のタイトル、著者、引用リストなどが「どんなデータであるべきか」の規約です。
 */

// 論文データの型定義

export interface Paper {
  id: string;
  openAlexId: string;
  title: string;
  authors: Author[];
  publicationYear: number;
  publicationDate?: string;
  venue?: string;
  venueType: 'journal' | 'conference' | 'preprint' | 'unknown';
  citationCount: number;
  arxivId?: string;
  doi?: string;
  abstract?: string;
  openAccessUrl?: string;
}

export interface Author {
  name: string;
  orcid?: string;
}

// 引用文脈の種類
export type CitationContextType = 'methodology' | 'critique' | 'comparison' | 'background';

export interface Citation {
  id: string;
  sourceId: string; // 引用元論文
  targetId: string; // 引用先論文
  contextType?: CitationContextType; // Phase 2で使用
  contextSnippet?: string; // Phase 2で使用
  confidence?: number; // LLMの確信度 (0-1)
  analyzedAt?: string; // 解析日時
}

export interface CitationNetwork {
  seedPaper: Paper;
  papers: Paper[];
  citations: Citation[];
  analysisProgress?: AnalysisProgress; // Phase 2で使用
}

// 解析進捗状況
export interface AnalysisProgress {
  total: number;
  analyzed: number;
  status: 'idle' | 'analyzing' | 'completed' | 'error';
  currentPaper?: string;
  errorMessage?: string;
}

// OpenAlex APIレスポンスの型
export interface OpenAlexWork {
  id: string;
  doi?: string;
  title: string;
  display_name: string;
  publication_year: number;
  publication_date?: string;
  cited_by_count: number;
  authorships: {
    author: {
      id: string;
      display_name: string;
      orcid?: string;
    };
    institutions: {
      id: string;
      display_name: string;
    }[];
  }[];
  primary_location?: {
    source?: {
      id: string;
      display_name: string;
      type: string;
    };
  };
  host_venue?: {
    display_name?: string;
    type?: string;
  };
  type: string;
  ids: {
    openalex: string;
    doi?: string;
    pmid?: string;
    arxiv?: string;
  };
  abstract_inverted_index?: Record<string, number[]>;
  open_access?: {
    is_oa: boolean;
    oa_url?: string;
  };
  referenced_works: string[];
  cited_by_api_url?: string;
}

export interface OpenAlexSearchResponse {
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
  };
  results: OpenAlexWork[];
}

// Gap提案（Phase 3）
export interface GapProposal {
  paperA: Paper;
  paperB: Paper;
  similarityScore: number; // ベクトル類似度 (0-1)
  coCitationCount: number; // 共通引用元の数
  commonCitations: Paper[]; // 共通引用元の論文リスト
  reasoning: string; // LLMが生成した説明文
  confidence: number; // 提案の信頼度 (0-1)
}

// 引用文脈の表示用情報
export const CONTEXT_TYPE_INFO: Record<CitationContextType, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  description: string;
}> = {
  methodology: {
    label: '手法',
    color: '#387d39',
    bgColor: 'rgba(56, 125, 57, 0.1)',
    borderColor: 'rgba(56, 125, 57, 0.5)',
    emoji: '🟢',
    description: 'この論文で提案された手法を利用している',
  },
  critique: {
    label: '批判',
    color: '#bc611e',
    bgColor: 'rgba(188, 97, 30, 0.1)',
    borderColor: 'rgba(188, 97, 30, 0.5)',
    emoji: '🟠',
    description: '限界や問題点を指摘している',
  },
  comparison: {
    label: '比較',
    color: '#fac559',
    bgColor: 'rgba(250, 197, 89, 0.1)',
    borderColor: 'rgba(250, 197, 89, 0.5)',
    emoji: '🟡',
    description: '結果やアプローチを比較している',
  },
  background: {
    label: '背景',
    color: '#e6eae6',
    bgColor: 'rgba(230, 234, 230, 0.1)',
    borderColor: 'rgba(230, 234, 230, 0.5)',
    emoji: '⚪',
    description: '一般的な関連研究としての参照',
  },
};

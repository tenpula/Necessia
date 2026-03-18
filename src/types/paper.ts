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
    label: 'Methodology',
    color: '#22c55e', // green
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    emoji: '🟢',
    description: 'Uses the method proposed by this paper',
  },
  critique: {
    label: 'Critique',
    color: '#ef4444', // red
    bgColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    emoji: '🔴',
    description: 'Points out limitations or criticisms',
  },
  comparison: {
    label: 'Comparison',
    color: '#a855f7', // purple
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
    emoji: '🟣',
    description: 'Compares results or approaches',
  },
  background: {
    label: 'Background',
    color: '#94a3b8', // slate
    bgColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.5)',
    emoji: '⚪',
    description: 'General related work reference',
  },
};

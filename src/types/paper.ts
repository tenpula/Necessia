/*
 * 【ファイル概要】
 * 論文データの型定義
 * 論文のタイトル、著者、引用リストなどが「どんなデータであるべきか」の規約です。
 */

export type VenueType = 'journal' | 'conference' | 'preprint' | 'unknown';
export type CitationContextType = 'methodology' | 'critique' | 'comparison' | 'background';
export type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'error';

export interface Paper {
  id: string;
  openAlexId: string;
  title: string;
  authors: Author[];
  publicationYear: number;
  publicationDate?: string;
  venue?: string;
  venueType: VenueType;
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

export interface Citation {
  id: string;
  sourceId: string;
  targetId: string;
  contextType?: CitationContextType;
  contextSnippet?: string;
  confidence?: number;
  analyzedAt?: string;
}

export interface CitationNetwork {
  seedPaper: Paper;
  papers: Paper[];
  citations: Citation[];
  analysisProgress?: AnalysisProgress;
}

export interface AnalysisProgress {
  total: number;
  analyzed: number;
  status: AnalysisStatus;
  currentPaper?: string;
  errorMessage?: string;
}

export interface CitationAnalysisResult {
  sourceId: string;
  targetId: string;
  contextType: CitationContextType;
  confidence: number;
  cached: boolean;
}

export interface CitationAnalysisStats {
  total: number;
  analyzed: number;
  cached: number;
  llmModel: string | null;
}

export interface CitationAnalysisProgressEvent {
  type: 'progress';
  analyzed: number;
  total: number;
  currentPaper: string;
  percentage: number;
}

export interface CitationAnalysisCompleteEvent {
  type: 'complete';
  results: CitationAnalysisResult[];
  stats: CitationAnalysisStats;
}

export interface CitationAnalysisErrorEvent {
  type: 'error';
  error: string;
  message: string;
}

export type CitationAnalysisStreamEvent =
  | CitationAnalysisProgressEvent
  | CitationAnalysisCompleteEvent
  | CitationAnalysisErrorEvent;

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

export interface GapProposal {
  paperA: Paper;
  paperB: Paper;
  similarityScore: number;
  coCitationCount: number;
  commonCitations: Paper[];
  reasoning: string;
  confidence: number;
}

export interface CitationContextInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  description: string;
}

export const CONTEXT_TYPE_INFO: Record<CitationContextType, CitationContextInfo> = {
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

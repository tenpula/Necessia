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

export interface Citation {
  id: string;
  sourceId: string; // 引用元論文
  targetId: string; // 引用先論文
  contextType?: 'methodology' | 'critique' | 'comparison' | 'background'; // Phase 2で使用
  contextSnippet?: string; // Phase 2で使用
}

export interface CitationNetwork {
  seedPaper: Paper;
  papers: Paper[];
  citations: Citation[];
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


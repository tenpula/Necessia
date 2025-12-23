export interface Paper {
  id: string;
  title: string;
  authors: Author[];
  year: number;
  month: string;
  citations: number;
  impactFactor: number;
  abstract: string;
  category: string;
  subCategory: string;
  connectedNodes: ConnectedNode[];
}

export interface Author {
  initials: string;
  name: string;
}

export interface ConnectedNode {
  id: string;
  title: string;
  year: number;
  authors: string;
}

export type ViewState = 'landing' | 'visualization';

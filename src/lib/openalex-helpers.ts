import { OpenAlexWork, Paper } from '@/types/paper';

export const OPENALEX_BASE_URL = 'https://api.openalex.org';

export function getMailtoParam(): string {
  const email = process.env.OPENALEX_EMAIL || 'your-email@example.com';
  return `mailto=${encodeURIComponent(email)}`;
}

export function normalizeOpenAlexId(openAlexId: string): string {
  return openAlexId.replace('https://openalex.org/', '');
}

export function buildOpenAlexUrl(path: string, params: string[] = []): string {
  const query = [getMailtoParam(), ...params].filter(Boolean).join('&');
  return `${OPENALEX_BASE_URL}${path}${query ? `?${query}` : ''}`;
}

export function buildOpenAlexWorkLookupUrl(identifier: string): string {
  return buildOpenAlexUrl(`/works/${encodeURIComponent(identifier)}`);
}

export function extractArxivId(input: string): string | null {
  const patterns = [
    /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /arxiv\.org\/pdf\/(\d{4}\.\d{4,5}(?:v\d+)?)\.pdf/i,
    /arXiv:(\d{4}\.\d{4,5}(?:v\d+)?)/i,
    /^(\d{4}\.\d{4,5}(?:v\d+)?)$/,
    /arxiv\.org\/abs\/([a-z-]+\/\d{7})/i,
    /arXiv:([a-z-]+\/\d{7})/i,
    /^([a-z-]+\/\d{7})$/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (!match) {
      continue;
    }

    let arxivId = match[1];
    if (arxivId.match(/^\d{4}\./)) {
      arxivId = arxivId.replace(/v\d+$/, '');
    }

    return arxivId;
  }

  return null;
}

export function extractDoi(input: string): string | null {
  const patterns = [
    /doi\.org\/(10\.\d{4,}\/[^\s]+)/i,
    /doi:(10\.\d{4,}\/[^\s]+)/i,
    /^(10\.\d{4,}\/[^\s]+)$/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function convertToPaper(work: OpenAlexWork): Paper {
  return {
    id: work.id,
    openAlexId: work.ids.openalex || work.id,
    title: work.display_name || work.title,
    authors: work.authorships.map((authorship) => ({
      name: authorship.author.display_name,
      orcid: authorship.author.orcid,
    })),
    publicationYear: work.publication_year,
    publicationDate: work.publication_date,
    venue: work.primary_location?.source?.display_name || work.host_venue?.display_name,
    venueType: determineVenueType(work),
    citationCount: work.cited_by_count,
    arxivId: work.ids.arxiv?.replace('https://arxiv.org/abs/', ''),
    doi: work.ids.doi?.replace('https://doi.org/', ''),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    openAccessUrl: work.open_access?.oa_url,
  };
}

function determineVenueType(work: OpenAlexWork): Paper['venueType'] {
  const sourceType = work.primary_location?.source?.type || work.host_venue?.type || work.type;

  if (!sourceType) {
    return 'unknown';
  }

  const normalizedType = sourceType.toLowerCase();

  if (normalizedType.includes('journal') || normalizedType === 'article') {
    return 'journal';
  }
  if (normalizedType.includes('conference') || normalizedType.includes('proceedings')) {
    return 'conference';
  }
  if (normalizedType.includes('preprint') || normalizedType.includes('repository')) {
    return 'preprint';
  }

  return 'unknown';
}

function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | undefined {
  if (!invertedIndex) {
    return undefined;
  }

  const words: [string, number][] = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      words.push([word, position]);
    }
  }

  words.sort((left, right) => left[1] - right[1]);
  return words.map(([word]) => word).join(' ');
}

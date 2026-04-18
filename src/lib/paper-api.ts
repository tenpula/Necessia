import { CitationNetwork } from '@/types/paper';

export interface GapRequestOptions {
  minSimilarity?: number;
  minCoCitations?: number;
  maxProposals?: number;
}

export interface GapRequestPayload {
  network: CitationNetwork;
  options: Required<GapRequestOptions>;
}

const DEFAULT_GAP_OPTIONS: Required<GapRequestOptions> = {
  minSimilarity: 0.5,
  minCoCitations: 2,
  maxProposals: 10,
};

export function requireTrimmedQuery(rawQuery: string | null): string {
  const query = rawQuery?.trim();

  if (!query) {
    throw new Error('Query parameter "q" is required');
  }

  return query;
}

export function parseCitationLimit(rawLimit: string | null, defaultLimit: number = 30): number {
  const parsed = Number.parseInt(rawLimit ?? `${defaultLimit}`, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(parsed, 100);
}

export async function parseGapRequestPayload(request: Request): Promise<GapRequestPayload> {
  const body = (await request.json()) as {
    network?: CitationNetwork;
    options?: GapRequestOptions;
  };

  if (!body.network || !Array.isArray(body.network.papers) || !Array.isArray(body.network.citations)) {
    throw new Error('Invalid network data');
  }

  if (body.network.papers.length < 3) {
    throw new Error('Network must contain at least 3 papers to find gaps');
  }

  return {
    network: body.network,
    options: {
      minSimilarity: body.options?.minSimilarity ?? DEFAULT_GAP_OPTIONS.minSimilarity,
      minCoCitations: body.options?.minCoCitations ?? DEFAULT_GAP_OPTIONS.minCoCitations,
      maxProposals: body.options?.maxProposals ?? DEFAULT_GAP_OPTIONS.maxProposals,
    },
  };
}

export function toPaperRouteErrorResponse(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;

  if (message === 'Query parameter "q" is required' || message === 'Invalid network data') {
    return { status: 400, message };
  }

  if (message === 'Network must contain at least 3 papers to find gaps') {
    return { status: 400, message };
  }

  if (message === 'Paper not found') {
    return { status: 404, message: 'Paper not found. Please check your input and try again.' };
  }

  if (message.includes('OpenAlex API error')) {
    return { status: 500, message: `OpenAlex API error: ${message}` };
  }

  return { status: 500, message };
}


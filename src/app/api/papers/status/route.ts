import { NextResponse } from 'next/server';
import { isLLMConfigured, getLLMModelName } from '@/lib/llm';

export async function GET() {
  const llmConfigured = isLLMConfigured();
  const environmentCheck = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
    llmConfigured,
  };

  console.log('Environment check:', environmentCheck);

  return NextResponse.json({
    features: {
      llmAnalysis: llmConfigured,
      gapFinding: llmConfigured,
    },
    config: {
      llmModel: llmConfigured ? getLLMModelName() : null,
      embeddingModel: llmConfigured ? 'text-embedding-004' : null,
    },
    phase: llmConfigured ? 3 : 1,
  });
}

// システムステータス API Route
import { NextResponse } from 'next/server';
import { isLLMConfigured, getLLMModelName } from '@/lib/llm';

export async function GET() {
  const llmConfigured = isLLMConfigured();
  
  // デバッグログ
  console.log('Environment check:', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
    llmConfigured,
  });
  
  // Phase判定: LLMが設定されていればPhase 2以上、Embedding APIも使えるのでPhase 3
  const phase = llmConfigured ? 3 : 1;
  
  return NextResponse.json({
    features: {
      llmAnalysis: llmConfigured,
      gapFinding: llmConfigured, // Phase 3: Gap検出機能
    },
    config: {
      llmModel: llmConfigured ? getLLMModelName() : null,
      embeddingModel: llmConfigured ? 'text-embedding-004' : null,
    },
    phase,
  });
}


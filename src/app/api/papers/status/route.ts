// システムステータス API Route
import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase';
import { isLLMConfigured, getLLMModelName } from '@/lib/llm';

export async function GET() {
  const firebaseConfigured = isFirebaseConfigured();
  const llmConfigured = isLLMConfigured();
  
  // デバッグログ
  console.log('Environment check:', {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
    FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET',
    FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
    FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET',
    llmConfigured,
    firebaseConfigured,
  });
  
  // Phase判定: LLMが設定されていればPhase 2以上、Embedding APIも使えるのでPhase 3
  const phase = llmConfigured ? 3 : 1;
  
  return NextResponse.json({
    features: {
      cache: firebaseConfigured,
      llmAnalysis: llmConfigured,
      gapFinding: llmConfigured, // Phase 3: Gap検出機能
    },
    config: {
      llmModel: llmConfigured ? getLLMModelName() : null,
      cacheProvider: firebaseConfigured ? 'firestore' : null,
      embeddingModel: llmConfigured ? 'text-embedding-004' : null,
    },
    phase,
  });
}


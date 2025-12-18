'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  Panel,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CitationNetwork, Paper, Citation, CONTEXT_TYPE_INFO, AnalysisProgress as AnalysisProgressType } from '@/types/paper';
import PaperNode from './PaperNode';
import PaperDetailPanel from './PaperDetailPanel';
import EdgeDetailPanel from './EdgeDetailPanel';
import AnalysisProgress from './AnalysisProgress';

interface CitationGraphProps {
  network: CitationNetwork;
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
}

const nodeTypes = {
  paper: PaperNode,
};

// 引用文脈に基づいてエッジの色を決定
function getEdgeColor(citation: Citation, seedPaperId: string): string {
  if (citation.contextType && citation.contextType !== 'background') {
    return CONTEXT_TYPE_INFO[citation.contextType].color;
  }
  // Phase 1互換: 文脈タイプがない場合は方向で色分け
  return citation.sourceId === seedPaperId ? '#06b6d4' : '#8b5cf6';
}

// レイアウト計算関数
function calculateLayout(network: CitationNetwork): { nodes: Node[]; edges: Edge[] } {
  const { seedPaper, papers, citations } = network;
  
  // ノードをカテゴリ分け
  const referencedPapers: Paper[] = [];
  const citingPapers: Paper[] = [];
  
  citations.forEach((citation) => {
    if (citation.sourceId === seedPaper.id) {
      const targetPaper = papers.find((p) => p.id === citation.targetId);
      if (targetPaper && targetPaper.id !== seedPaper.id) {
        referencedPapers.push(targetPaper);
      }
    } else if (citation.targetId === seedPaper.id) {
      const sourcePaper = papers.find((p) => p.id === citation.sourceId);
      if (sourcePaper && sourcePaper.id !== seedPaper.id) {
        citingPapers.push(sourcePaper);
      }
    }
  });
  
  const uniqueReferenced = Array.from(new Map(referencedPapers.map(p => [p.id, p])).values());
  const uniqueCiting = Array.from(new Map(citingPapers.map(p => [p.id, p])).values());
  
  const nodes: Node[] = [];
  const verticalGap = 300;
  
  nodes.push({
    id: seedPaper.id,
    type: 'paper',
    position: { x: 0, y: 0 },
    data: { paper: seedPaper, isSeed: true },
  });
  
  const refCount = uniqueReferenced.length;
  if (refCount > 0) {
    uniqueReferenced.forEach((paper, index) => {
      const angle = (Math.PI / (refCount + 1)) * (index + 1);
      const radius = Math.max(300, refCount * 40);
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = verticalGap + Math.sin(angle - Math.PI / 2) * radius * 0.3;
      
      nodes.push({
        id: paper.id,
        type: 'paper',
        position: { x, y },
        data: { paper, isSeed: false },
      });
    });
  }
  
  const citeCount = uniqueCiting.length;
  if (citeCount > 0) {
    uniqueCiting.forEach((paper, index) => {
      const angle = (Math.PI / (citeCount + 1)) * (index + 1);
      const radius = Math.max(300, citeCount * 40);
      const x = Math.cos(angle - Math.PI / 2) * radius;
      const y = -verticalGap - Math.sin(angle - Math.PI / 2) * radius * 0.3;
      
      nodes.push({
        id: paper.id,
        type: 'paper',
        position: { x, y },
        data: { paper, isSeed: false },
      });
    });
  }
  
  // エッジを作成（文脈タイプに基づく色分け）
  const edges: Edge[] = citations.map((citation) => {
    const color = getEdgeColor(citation, seedPaper.id);
    const hasContext = citation.contextType && citation.contextType !== 'background';
    
    return {
      id: citation.id,
      source: citation.sourceId,
      target: citation.targetId,
      type: 'smoothstep',
      animated: hasContext,
      style: { 
        stroke: color,
        strokeWidth: hasContext ? 3 : 2,
        opacity: hasContext ? 0.8 : 0.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: color,
      },
      data: { citation },
    };
  });
  
  return { nodes, edges };
}

export default function CitationGraph({ network, onAnalysisComplete }: CitationGraphProps) {
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressType>({
    total: 0,
    analyzed: 0,
    cached: 0,
    status: 'idle',
  });
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calculateLayout(currentNetwork),
    [currentNetwork]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{
    citation: Citation;
    sourcePaper: Paper;
    targetPaper: Paper;
  } | null>(null);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const analysisStarted = useRef<string | null>(null); // ネットワークIDを保存
  const analysisTimer = useRef<NodeJS.Timeout | null>(null); // タイマーを保存
  const onAnalysisCompleteRef = useRef(onAnalysisComplete);

  // networkプロップが変更されたときにcurrentNetworkを更新し、解析フラグをリセット
  useEffect(() => {
    const networkId = network.seedPaper.id;
    if (networkId !== currentNetwork.seedPaper.id) {
      console.log('Network prop changed, resetting analysis state');
      // 既存のタイマーをクリーンアップ
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
      setCurrentNetwork(network);
      analysisStarted.current = null; // リセット
      setAnalysisProgress({
        total: 0,
        analyzed: 0,
        cached: 0,
        status: 'idle',
      });
    }
  }, [network.seedPaper.id, currentNetwork.seedPaper.id]);

  // ネットワーク変更時にノードとエッジを更新
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = calculateLayout(currentNetwork);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [currentNetwork, setNodes, setEdges]);

  // 引用文脈の解析を実行（networkプロップが変更されたとき）
  useEffect(() => {
    const networkId = network.seedPaper.id;
    const citationsCount = network.citations.length;
    
    // 引用がない場合はスキップ
    if (citationsCount === 0) {
      console.log('No citations to analyze, skipping');
      return;
    }

    console.log('useEffect triggered for network:', networkId, 'with', citationsCount, 'citations');

    const analyzeContexts = async () => {
      // 既に解析済みのネットワークの場合はスキップ（タイマー発火時にチェック）
      if (analysisStarted.current === networkId) {
        console.log('Analysis already completed for this network:', networkId);
        return;
      }
      
      // 解析開始フラグを設定（タイマー発火時に設定）
      analysisStarted.current = networkId;
      console.log('analyzeContexts function called for network:', networkId);
      
      // APIステータスを確認
      try {
        const statusResponse = await fetch('/api/papers/status');
        const status = await statusResponse.json();
        
        console.log('API status check:', status);
        
        if (!status.features.llmAnalysis) {
          console.log('LLM analysis not configured, skipping context analysis');
          analysisStarted.current = null; // リセット
          return;
        }
      } catch (error) {
        console.warn('Could not check API status:', error);
        analysisStarted.current = null; // リセット
        return;
      }

      // networkプロップから直接取得（currentNetworkではなく）
      const { citations, papers, seedPaper } = network;
      
      if (citations.length === 0) {
        console.log('No citations to analyze');
        analysisStarted.current = null; // リセット
        return;
      }
      
      console.log('Starting analysis for', citations.length, 'citations');

      setAnalysisProgress({
        total: citations.length,
        analyzed: 0,
        cached: 0,
        status: 'analyzing',
      });

      // バッチで解析リクエストを送信
      const citationsToAnalyze = citations.map((citation) => {
        const sourcePaper = papers.find((p) => p.id === citation.sourceId);
        const targetPaper = papers.find((p) => p.id === citation.targetId);
        return {
          sourceId: citation.sourceId,
          targetId: citation.targetId,
          sourcePaper: sourcePaper || seedPaper,
          targetPaper: targetPaper || seedPaper,
        };
      });

      try {
        console.log('Sending analyze request to API...');
        
        // タイムアウト設定（2分）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('Request timeout - aborting');
          controller.abort();
        }, 120000);
        
        const response = await fetch('/api/papers/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ citations: citationsToAnalyze }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('Response received, status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`Analysis request failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('Analysis result:', result.stats);
        
        // 結果を反映
        const updatedCitations = citations.map((citation) => {
          const analysisResult = result.results.find(
            (r: { sourceId: string; targetId: string }) =>
              r.sourceId === citation.sourceId && r.targetId === citation.targetId
          );
          
          if (analysisResult) {
            return {
              ...citation,
              contextType: analysisResult.contextType,
              confidence: analysisResult.confidence,
              analyzedAt: new Date().toISOString(),
            };
          }
          return citation;
        });

        const updatedNetwork = {
          ...currentNetwork,
          citations: updatedCitations,
        };

        setCurrentNetwork(updatedNetwork);
        setAnalysisProgress({
          total: result.stats.total,
          analyzed: result.stats.analyzed,
          cached: result.stats.cached,
          status: 'completed',
        });

        if (onAnalysisCompleteRef.current) {
          onAnalysisCompleteRef.current(updatedNetwork);
        }
      } catch (error) {
        console.error('Context analysis error:', error);
        setAnalysisProgress((prev) => ({
          ...prev,
          status: 'error',
        }));
        analysisStarted.current = null; // エラー時はリセットして再試行可能にする
      }
    };

    // 少し遅延させてから解析開始（Reactのレンダリングサイクルを待つ）
    console.log('Setting up analysis timer for network:', networkId, '(current analysisStarted:', analysisStarted.current, ')');
    
    // 既存のタイマーがあればクリーンアップ
    if (analysisTimer.current) {
      console.log('Clearing existing timer before setting new one');
      clearTimeout(analysisTimer.current);
    }
    
    analysisTimer.current = setTimeout(() => {
      console.log('Analysis timer fired for network:', networkId);
      analyzeContexts();
      analysisTimer.current = null; // 実行後はクリア
    }, 500); // React Strict Modeのクリーンアップを待つため少し長めに
    
    return () => {
      // React Strict Modeではクリーンアップ後に再実行されるため、
      // タイマーのクリーンアップのみ行い、フラグはリセットしない
      console.log('useEffect cleanup for network:', networkId, '(timer exists:', !!analysisTimer.current, ')');
      if (analysisTimer.current) {
        clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
      }
    };
  }, [network.seedPaper.id]); // network.seedPaper.idのみを監視（citations.lengthは含めない）

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    setTimeout(() => {
      instance.fitView({ padding: 0.2, duration: 400 });
    }, 100);
  }, []);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as { paper: Paper; isSeed: boolean };
    setSelectedPaper(nodeData.paper);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const citation = (edge.data as { citation: Citation })?.citation;
    if (!citation) return;

    const sourcePaper = currentNetwork.papers.find((p) => p.id === citation.sourceId);
    const targetPaper = currentNetwork.papers.find((p) => p.id === citation.targetId);

    if (sourcePaper && targetPaper) {
      setSelectedEdge({ citation, sourcePaper, targetPaper });
      setSelectedPaper(null);
    }
  }, [currentNetwork.papers]);
  
  const onPaneClick = useCallback(() => {
    setSelectedPaper(null);
    setSelectedEdge(null);
  }, []);

  // 文脈タイプ別の統計を計算
  const contextStats = useMemo(() => {
    const stats = {
      methodology: 0,
      critique: 0,
      comparison: 0,
      background: 0,
    };
    currentNetwork.citations.forEach((c) => {
      const type = c.contextType || 'background';
      stats[type]++;
    });
    return stats;
  }, [currentNetwork.citations]);

  return (
    <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={2}
        className="bg-slate-950"
        style={{ width: '100%', height: '100%' }}
        edgesFocusable={true}
      >
        <Background color="#334155" gap={30} size={1} />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl overflow-hidden [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700" />
        <MiniMap
          nodeColor={(node) => {
            const nodeData = node.data as { paper: Paper; isSeed: boolean };
            return nodeData.isSeed ? '#22d3ee' : '#64748b';
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-slate-900 !border-slate-700 !rounded-xl"
        />
        
        {/* 統計パネル */}
        <Panel position="top-left" className="!m-4">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-cyan-400 font-semibold mb-2">Network Statistics</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-400">Papers:</span>
              <span className="text-white font-medium">{currentNetwork.papers.length}</span>
              <span className="text-slate-400">Citations:</span>
              <span className="text-white font-medium">{currentNetwork.citations.length}</span>
            </div>
            
            {/* 文脈タイプ統計 */}
            {analysisProgress.status === 'completed' && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Context Types</h4>
                <div className="space-y-1">
                  {Object.entries(contextStats).map(([type, count]) => {
                    const info = CONTEXT_TYPE_INFO[type as keyof typeof CONTEXT_TYPE_INFO];
                    return (
                      <div key={type} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <span>{info.emoji}</span>
                          <span style={{ color: info.color }}>{info.label}</span>
                        </div>
                        <span className="text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 解析進捗 */}
          {analysisProgress.status !== 'idle' && analysisProgress.status !== 'completed' && (
            <div className="mt-2">
              <AnalysisProgress progress={analysisProgress} />
            </div>
          )}
        </Panel>
        
        {/* 凡例 */}
        <Panel position="top-right" className="!m-4">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-cyan-400 font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              {/* ノードタイプ */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-500/50 border-2 border-cyan-400" />
                <span className="text-slate-300">Seed Paper</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-600 border-2 border-slate-500" />
                <span className="text-slate-300">Journal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-md bg-slate-600 border-2 border-slate-500" />
                <span className="text-slate-300">Conference</span>
              </div>
              
              {/* エッジタイプ（Phase 2） */}
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Citation Context</h4>
                {Object.entries(CONTEXT_TYPE_INFO).map(([type, info]) => (
                  <div key={type} className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-6 h-0.5" 
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="text-xs" style={{ color: info.color }}>
                      {info.emoji} {info.label}
                    </span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-slate-500 mt-2">
                Click edges for details
              </p>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* 詳細パネル */}
      {selectedPaper && (
        <PaperDetailPanel
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          isSeed={selectedPaper.id === currentNetwork.seedPaper.id}
        />
      )}

      {selectedEdge && (
        <EdgeDetailPanel
          citation={selectedEdge.citation}
          sourcePaper={selectedEdge.sourcePaper}
          targetPaper={selectedEdge.targetPaper}
          onClose={() => setSelectedEdge(null)}
        />
      )}
    </div>
  );
}

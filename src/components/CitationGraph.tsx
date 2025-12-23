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

import { CitationNetwork, Paper, Citation, CONTEXT_TYPE_INFO, AnalysisProgress as AnalysisProgressType, GapProposal } from '@/types/paper';
import PaperNode from './PaperNode';
import PaperDetailPanel from './PaperDetailPanel';
import EdgeDetailPanel from './EdgeDetailPanel';
import AnalysisProgress from './AnalysisProgress';
import GapProposals from './GapProposals';
import GapDetailPanel from './GapDetailPanel';

interface CitationGraphProps {
  network: CitationNetwork;
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
}

const nodeTypes = {
  paper: PaperNode,
};

// 引用文脈に基づいてエッジの色を決定
function getEdgeColor(citation: Citation): string {
  if (citation.contextType && citation.contextType !== 'background') {
    return CONTEXT_TYPE_INFO[citation.contextType].color;
  }
  // アナライズ前はグレイの単色
  return '#64748b'; // slate-500
}

// レイアウト計算関数（seedPaperを中心に円形配置）
function calculateLayout(network: CitationNetwork): { nodes: Node[]; edges: Edge[] } {
  const { seedPaper, papers, citations } = network;
  
  // seedPaper以外のすべての論文を取得（重複を除去）
  const otherPapers = Array.from(
    new Map(
      papers
        .filter((p) => p.id !== seedPaper.id)
        .map((p) => [p.id, p])
    ).values()
  );
  
  const nodes: Node[] = [];
  
  // seedPaperを中心に配置
  nodes.push({
    id: seedPaper.id,
    type: 'paper',
    position: { x: 0, y: 0 },
    data: { paper: seedPaper, isSeed: true },
  });
  
  // 他の論文を円形に配置
  const paperCount = otherPapers.length;
  if (paperCount > 0) {
    // 半径をノード数に応じて調整（最小300px、ノード数が多い場合は拡大）
    const radius = Math.max(300, Math.min(500, paperCount * 30));
    
    otherPapers.forEach((paper, index) => {
      // 円周上に均等に配置（0度から開始）
      const angle = (2 * Math.PI / paperCount) * index - Math.PI / 2; // -90度から開始（上から時計回り）
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      nodes.push({
        id: paper.id,
        type: 'paper',
        position: { x, y },
        data: { paper, isSeed: false },
      });
    });
  }
  
  // エッジを作成（直線、文脈タイプに基づく色分け）
  // seedPaperから他のノードへの接続ポイントを計算
  const edges: Edge[] = citations.map((citation) => {
    const color = getEdgeColor(citation);
    const hasContext = citation.contextType && citation.contextType !== 'background';
    
    // seedPaperがsourceまたはtargetの場合、接続ポイントを計算
    let sourceHandle: string | undefined;
    let targetHandle: string | undefined;
    
    if (citation.sourceId === seedPaper.id) {
      // seedPaperから他のノードへの方向を計算
      const targetNode = nodes.find(n => n.id === citation.targetId);
      if (targetNode) {
        const dx = targetNode.position.x - 0; // seedPaperは(0, 0)
        const dy = targetNode.position.y - 0;
        const angle = Math.atan2(dy, dx);
        
        // 角度に基づいてHandleの位置を決定（時計回り）
        // -45度から45度: 右
        // 45度から135度: 下
        // 135度から-135度: 左
        // -135度から-45度: 上
        if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
          sourceHandle = 'right';
        } else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
          sourceHandle = 'bottom';
        } else if (angle >= 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) {
          sourceHandle = 'left';
        } else {
          sourceHandle = 'top';
        }
      }
    }
    
    if (citation.targetId === seedPaper.id) {
      // 他のノードからseedPaperへの方向を計算
      const sourceNode = nodes.find(n => n.id === citation.sourceId);
      if (sourceNode) {
        const dx = 0 - sourceNode.position.x; // seedPaperは(0, 0)
        const dy = 0 - sourceNode.position.y;
        const angle = Math.atan2(dy, dx);
        
        // 角度に基づいてHandleの位置を決定
        if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
          targetHandle = 'right';
        } else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
          targetHandle = 'bottom';
        } else if (angle >= 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) {
          targetHandle = 'left';
        } else {
          targetHandle = 'top';
        }
      }
    }
    
    return {
      id: citation.id,
      source: citation.sourceId,
      target: citation.targetId,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      type: 'default', // 直線エッジ
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
  const [selectedGapProposal, setSelectedGapProposal] = useState<GapProposal | null>(null);
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

  // GapProposalが選択されたときに、該当するノードをハイライト
  useEffect(() => {
    if (selectedGapProposal) {
      setNodes((nds) =>
        nds.map((node) => {
          const nodeData = node.data as { paper: Paper; isSeed: boolean; gapRole?: 'paperA' | 'paperB' | null };
          if (node.id === selectedGapProposal.paperA.id) {
            return {
              ...node,
              data: {
                ...nodeData,
                gapRole: 'paperA' as const,
              },
            };
          } else if (node.id === selectedGapProposal.paperB.id) {
            return {
              ...node,
              data: {
                ...nodeData,
                gapRole: 'paperB' as const,
              },
            };
          } else {
            return {
              ...node,
              data: {
                ...nodeData,
                gapRole: null,
              },
            };
          }
        })
      );
    } else {
      // GapProposalが選択解除されたとき、すべてのノードからgapRoleを削除
      setNodes((nds) =>
        nds.map((node) => {
          const nodeData = node.data as { paper: Paper; isSeed: boolean; gapRole?: 'paperA' | 'paperB' | null };
          return {
            ...node,
            data: {
              ...nodeData,
              gapRole: null,
            },
          };
        })
      );
    }
  }, [selectedGapProposal, setNodes]);

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
    setSelectedGapProposal(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const citation = (edge.data as { citation: Citation })?.citation;
    if (!citation) return;

    const sourcePaper = currentNetwork.papers.find((p) => p.id === citation.sourceId);
    const targetPaper = currentNetwork.papers.find((p) => p.id === citation.targetId);

    if (sourcePaper && targetPaper) {
      setSelectedEdge({ citation, sourcePaper, targetPaper });
      setSelectedPaper(null);
      setSelectedGapProposal(null);
    }
  }, [currentNetwork.papers]);
  
  const onPaneClick = useCallback(() => {
    setSelectedPaper(null);
    setSelectedEdge(null);
    setSelectedGapProposal(null);
  }, []);

  const handlePaperClose = useCallback(() => {
    setSelectedPaper(null);
  }, []);

  const handleEdgeClose = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  const handleGapProposalClick = useCallback((proposal: GapProposal) => {
    // Gap提案がクリックされたとき、詳細パネルを表示
    setSelectedGapProposal(proposal);
    setSelectedPaper(null);
    setSelectedEdge(null);
    
    // ビューを調整（オプション）
    if (reactFlowInstance.current) {
      const nodeA = nodes.find(n => n.id === proposal.paperA.id);
      if (nodeA) {
        reactFlowInstance.current.setCenter(nodeA.position.x, nodeA.position.y, { zoom: 1.2, duration: 500 });
      }
    }
  }, [nodes]);

  const handleGapDetailClose = useCallback(() => {
    setSelectedGapProposal(null);
  }, []);

  const handleGapDetailPaperClick = useCallback((paper: Paper) => {
    setSelectedPaper(paper);
    setSelectedGapProposal(null);
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
        <Panel position="top-left" className="!m-4 !mt-20">
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
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-0.5" 
                            style={{ backgroundColor: info.color }}
                          />
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
        <Panel position="top-left" className="!m-4 !mt-[428px]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
              
              {/* ノードの色（年代） */}
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Node Color (Year)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(180, 70%, 25%)', border: '2px solid hsl(180, 80%, 50%)' }} />
                    <span className="text-slate-300">Recent (Newer)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(120, 70%, 25%)', border: '2px solid hsl(120, 80%, 50%)' }} />
                    <span className="text-slate-300">Older</span>
                  </div>
                </div>
              </div>
              
              {/* Gap Proposal ハイライト */}
              {selectedGapProposal && (
                <>
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Research Gap</h4>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-500/50 border-2 border-purple-400 animate-pulse" />
                      <span className="text-slate-300">Paper A</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-4 rounded-full bg-pink-500/50 border-2 border-pink-400 animate-pulse" />
                      <span className="text-slate-300">Paper B</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* 詳細パネル */}
      {selectedPaper && (
        <PaperDetailPanel
          paper={selectedPaper}
          onClose={handlePaperClose}
          isSeed={selectedPaper.id === currentNetwork.seedPaper.id}
        />
      )}

      {selectedEdge && (
        <EdgeDetailPanel
          citation={selectedEdge.citation}
          sourcePaper={selectedEdge.sourcePaper}
          targetPaper={selectedEdge.targetPaper}
          onClose={handleEdgeClose}
        />
      )}

      {/* Gap提案パネル */}
      <GapProposals
        network={currentNetwork}
        onProposalClick={handleGapProposalClick}
      />

      {/* Gap詳細パネル */}
      {selectedGapProposal && (
        <GapDetailPanel
          proposal={selectedGapProposal}
          onClose={handleGapDetailClose}
          onPaperClick={handleGapDetailPaperClick}
        />
      )}
    </div>
  );
}

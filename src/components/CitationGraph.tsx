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
  Panel,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CitationNetwork, Paper, Citation, CONTEXT_TYPE_INFO, GapProposal } from '@/types/paper';
import { calculateLayout, calculateContextStats } from '@/lib/graph-layout';
import { useCitationAnalysis } from '@/hooks/useCitationAnalysis';
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

export default function CitationGraph({ network, onAnalysisComplete }: CitationGraphProps) {
  // カスタムフックで解析ロジックを管理
  const { currentNetwork, analysisProgress } = useCitationAnalysis(network, {
    onAnalysisComplete,
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
              data: { ...nodeData, gapRole: 'paperA' as const },
            };
          } else if (node.id === selectedGapProposal.paperB.id) {
            return {
              ...node,
              data: { ...nodeData, gapRole: 'paperB' as const },
            };
          } else {
            return {
              ...node,
              data: { ...nodeData, gapRole: null },
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
            data: { ...nodeData, gapRole: null },
          };
        })
      );
    }
  }, [selectedGapProposal, setNodes]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    setTimeout(() => {
      instance.fitView({ padding: 0.2, duration: 400 });
    }, 100);
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as { paper: Paper; isSeed: boolean };
    setSelectedPaper(nodeData.paper);
    setSelectedEdge(null);
    setSelectedGapProposal(null);
  }, []);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const citation = (edge.data as { citation: Citation })?.citation;
      if (!citation) return;

      const sourcePaper = currentNetwork.papers.find((p) => p.id === citation.sourceId);
      const targetPaper = currentNetwork.papers.find((p) => p.id === citation.targetId);

      if (sourcePaper && targetPaper) {
        setSelectedEdge({ citation, sourcePaper, targetPaper });
        setSelectedPaper(null);
        setSelectedGapProposal(null);
      }
    },
    [currentNetwork.papers]
  );

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

  const handleGapProposalClick = useCallback(
    (proposal: GapProposal) => {
      setSelectedGapProposal(proposal);
      setSelectedPaper(null);
      setSelectedEdge(null);

      // ビューを調整
      if (reactFlowInstance.current) {
        const nodeA = nodes.find((n) => n.id === proposal.paperA.id);
        if (nodeA) {
          reactFlowInstance.current.setCenter(nodeA.position.x, nodeA.position.y, {
            zoom: 1.2,
            duration: 500,
          });
        }
      }
    },
    [nodes]
  );

  const handleGapDetailClose = useCallback(() => {
    setSelectedGapProposal(null);
  }, []);

  const handleGapDetailPaperClick = useCallback((paper: Paper) => {
    setSelectedPaper(paper);
    setSelectedGapProposal(null);
    setSelectedEdge(null);
  }, []);

  // 文脈タイプ別の統計を計算
  const contextStats = useMemo(
    () => calculateContextStats(currentNetwork.citations),
    [currentNetwork.citations]
  );

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
          <NetworkStatsPanel
            network={currentNetwork}
            contextStats={contextStats}
            analysisProgress={analysisProgress}
          />
        </Panel>

        {/* 凡例 */}
        <Panel position="top-left" className="!m-4 !mt-[428px]">
          <LegendPanel selectedGapProposal={selectedGapProposal} />
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
      <GapProposals network={currentNetwork} onProposalClick={handleGapProposalClick} />

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

// 統計パネルコンポーネント
interface NetworkStatsPanelProps {
  network: CitationNetwork;
  contextStats: Record<string, number>;
  analysisProgress: { status: string; total: number; analyzed: number };
}

function NetworkStatsPanel({ network, contextStats, analysisProgress }: NetworkStatsPanelProps) {
  return (
    <>
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-cyan-400 font-semibold mb-2">Network Statistics</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <span className="text-slate-400">Papers:</span>
          <span className="text-white font-medium">{network.papers.length}</span>
          <span className="text-slate-400">Citations:</span>
          <span className="text-white font-medium">{network.citations.length}</span>
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
                      <div className="w-4 h-0.5" style={{ backgroundColor: info.color }} />
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
          <AnalysisProgress progress={analysisProgress as Parameters<typeof AnalysisProgress>[0]['progress']} />
        </div>
      )}
    </>
  );
}

// 凡例パネルコンポーネント
interface LegendPanelProps {
  selectedGapProposal: GapProposal | null;
}

function LegendPanel({ selectedGapProposal }: LegendPanelProps) {
  return (
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
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: 'hsl(180, 70%, 25%)', border: '2px solid hsl(180, 80%, 50%)' }}
              />
              <span className="text-slate-300">Recent (Newer)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: 'hsl(120, 70%, 25%)', border: '2px solid hsl(120, 80%, 50%)' }}
              />
              <span className="text-slate-300">Older</span>
            </div>
          </div>
        </div>

        {/* Gap Proposal ハイライト */}
        {selectedGapProposal && (
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
        )}
      </div>
    </div>
  );
}

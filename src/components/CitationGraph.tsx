/*
 * 【ファイル概要】
 * ネットワーク図の描画
 * 論文同士のつながりを、React Flowを使って視覚的なグラフとして画面に描画する部品です。
 */

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
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CitationNetwork, Paper, GapProposal, AnalysisProgress } from '@/types/paper';
import { calculateLayout } from '@/lib/graph-layout';
import { useCitationAnalysis } from '@/hooks/useCitationAnalysis';
import PaperNode from './PaperNode';
import PaperDetailPanel from './PaperDetailPanel';
import GapProposals from './GapProposals';
import GapDetailPanel from './GapDetailPanel';

interface CitationGraphProps {
  network: CitationNetwork;
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
  onGapProposalChange?: (proposal: GapProposal | null) => void;
  onAnalysisProgressChange?: (progress: AnalysisProgress) => void;
  onStartAnalysisReady?: (startAnalysis: (requestDelay: number) => Promise<void>) => void;
  onCancelAnalysisReady?: (cancelAnalysis: () => void) => void;
}

const nodeTypes = {
  paper: PaperNode,
};

export default function CitationGraph({ network, onAnalysisComplete, onGapProposalChange, onAnalysisProgressChange, onStartAnalysisReady, onCancelAnalysisReady }: CitationGraphProps) {
  // カスタムフックで解析ロジックを管理（自動開始は無効化）
  // networkがnullの場合はダミーネットワークを渡す（フックのエラーを防ぐため）
  const dummyNetwork: CitationNetwork = {
    seedPaper: { id: '', openAlexId: '', title: '', authors: [], publicationYear: 2024, venueType: 'unknown', citationCount: 0 },
    papers: [],
    citations: [],
  };
  
  // ネットワークがnullの場合、一意のIDを持つダミーネットワークを使用して変更を検出可能にする
  const networkToUse = network || {
    ...dummyNetwork,
    seedPaper: { ...dummyNetwork.seedPaper, id: `__cancelled_${Date.now()}` },
  };
  
  const { currentNetwork, analysisProgress, startAnalysis, cancelAnalysis } = useCitationAnalysis(networkToUse, {
    onAnalysisComplete,
    autoStart: false, // 自動開始を無効化
  });

  // 解析進捗の変更を親に通知
  useEffect(() => {
    onAnalysisProgressChange?.(analysisProgress);
  }, [analysisProgress, onAnalysisProgressChange]);

  // startAnalysis関数を親に通知
  useEffect(() => {
    onStartAnalysisReady?.(startAnalysis);
  }, [startAnalysis, onStartAnalysisReady]);
  
  // cancelAnalysis関数を親に通知
  useEffect(() => {
    onCancelAnalysisReady?.(cancelAnalysis);
  }, [cancelAnalysis, onCancelAnalysisReady]);
  
  // ネットワークがnullになったときに解析を停止
  useEffect(() => {
    if (!network) {
      // ネットワークがnullになった場合、解析進捗をidleにリセット
      onAnalysisProgressChange?.({
        total: 0,
        analyzed: 0,
        status: 'idle',
      });
    }
  }, [network, onAnalysisProgressChange]);
  
  // コンポーネントがアンマウントされる前に解析をキャンセル
  useEffect(() => {
    return () => {
      // クリーンアップ時に解析進捗をリセット
      onAnalysisProgressChange?.({
        total: 0,
        analyzed: 0,
        status: 'idle',
      });
    };
  }, [onAnalysisProgressChange]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calculateLayout(currentNetwork),
    [currentNetwork]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
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
    setSelectedGapProposal(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedPaper(null);
    setSelectedGapProposal(null);
  }, []);

  const handlePaperClose = useCallback(() => {
    setSelectedPaper(null);
  }, []);

  const handleGapProposalClick = useCallback(
    (proposal: GapProposal) => {
      setSelectedGapProposal(proposal);
      setSelectedPaper(null);
      onGapProposalChange?.(proposal);

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
    [nodes, onGapProposalChange]
  );

  const handleGapDetailClose = useCallback(() => {
    setSelectedGapProposal(null);
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  const handleGapDetailPaperClick = useCallback((paper: Paper) => {
    setSelectedPaper(paper);
    setSelectedGapProposal(null);
  }, []);

  return (
    <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={2}
        className="bg-slate-950"
        style={{ width: '100%', height: '100%' }}
        edgesFocusable={false}
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
      </ReactFlow>

      {/* 詳細パネル */}
      {selectedPaper && (
        <PaperDetailPanel
          paper={selectedPaper}
          onClose={handlePaperClose}
          isSeed={selectedPaper.id === currentNetwork.seedPaper.id}
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

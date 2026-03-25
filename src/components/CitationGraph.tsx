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
  useNodesState,
  useEdgesState,
  Node,
  ReactFlowInstance,
  NodeChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CitationNetwork, Paper, GapProposal, AnalysisProgress } from '@/types/paper';
import { calculateLayout } from '@/lib/graph-layout';
import { useCitationAnalysis } from '@/hooks/useCitationAnalysis';
import PaperNode from './PaperNode';
import OrbitNode from './OrbitNode';
import PaperDetailPanel from './PaperDetailPanel';
import GapDetailPanel from './GapDetailPanel';

interface CitationGraphProps {
  network: CitationNetwork;
  selectedGapProposal?: GapProposal | null;
  onAnalysisComplete?: (updatedNetwork: CitationNetwork) => void;
  onGapProposalChange?: (proposal: GapProposal | null) => void;
  onAnalysisProgressChange?: (progress: AnalysisProgress) => void;
  onStartAnalysisReady?: (startAnalysis: (requestDelay: number) => Promise<void>) => void;
  onCancelAnalysisReady?: (cancelAnalysis: () => void) => void;
}

const nodeTypes = {
  paper: PaperNode,
  orbit: OrbitNode,
};

export default function CitationGraph({ network, selectedGapProposal, onAnalysisComplete, onGapProposalChange, onAnalysisProgressChange, onStartAnalysisReady, onCancelAnalysisReady }: CitationGraphProps) {
  // カスタムフックで解析ロジックを管理（自動開始は無効化）
  // networkがnullの場合はダミーネットワークを渡す（フックのエラーを防ぐため）
  const dummyNetwork: CitationNetwork = {
    seedPaper: { id: '', openAlexId: '', title: '', authors: [], publicationYear: 2024, venueType: 'unknown', citationCount: 0 },
    papers: [],
    citations: [],
  };
  const cancelledNetwork: CitationNetwork = {
    ...dummyNetwork,
    seedPaper: { ...dummyNetwork.seedPaper, id: '__cancelled__' },
  };
  
  // ネットワークがnullの場合、一意のIDを持つダミーネットワークを使用して変更を検出可能にする
  const networkToUse = network || cancelledNetwork;
  
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

  const [nodes, setNodes] = useNodesState(initialNodes);

  // ドラッグ中のノードIDを追跡
  const draggingNodeId = useRef<string | null>(null);
  // スナップ距離の閾値（px）
  const SNAP_THRESHOLD = 80;

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const nextNodes = applyNodeChanges(changes, nds);
        
        // 軌道のドラッグによるリサイズ処理
        const orbitChanges = changes.filter(c => c.type === 'position' && c.id.startsWith('orbit-')) as { id: string; position: {x: number, y: number} }[];
        
        let processedNodes = nextNodes;

        if (orbitChanges.length > 0) {
          orbitChanges.forEach(change => {
            const newPos = change.position;
            const newRadius = Math.sqrt(newPos.x * newPos.x + newPos.y * newPos.y);
            const orbitId = change.id;
            const category = orbitId.replace('orbit-', '');

            processedNodes = processedNodes.map(node => {
              if (node.id === orbitId) {
                return {
                  ...node,
                  position: { x: 0, y: 0 },
                  data: { ...node.data, radius: newRadius }
                };
              }
              // 軌道リサイズ時、ドラッグ中でないノードのみ追従
              if (node.type === 'paper' && node.data?.category === category && node.id !== draggingNodeId.current) {
                const currentX = node.position.x;
                const currentY = node.position.y;
                const currentR = Math.sqrt(currentX * currentX + currentY * currentY);
                
                if (currentR > 0.0001) {
                  return {
                    ...node,
                    position: { 
                      x: (currentX / currentR) * newRadius, 
                      y: (currentY / currentR) * newRadius 
                    },
                    data: { ...node.data, orbitRadius: newRadius }
                  };
                }
              }
              return node;
            });
          });
        }

        return processedNodes.map((node) => {
          // シード論文は中心固定
          if (node.data?.isSeed) {
            return { ...node, position: { x: 0, y: 0 } };
          }
          // ドラッグ中のノードは自由移動を許可（軌道拘束しない）
          if (draggingNodeId.current === node.id) {
            return node;
          }
          return node;
        });
      });
    },
    [setNodes]
  );

  // ドラッグ開始: ノードIDを記録
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'paper' && !node.data?.isSeed) {
      draggingNodeId.current = node.id;
    }
  }, []);

  // ドラッグ終了: 磁石スナップ判定
  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    draggingNodeId.current = null;

    if (node.type !== 'paper' || node.data?.isSeed) return;

    const nodeCategory = node.data?.category as string | undefined;
    const dx = node.position.x;
    const dy = node.position.y;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    // すべての軌道との距離を計算し、最も近い軌道を見つける
    setNodes((nds) => {
      const orbitNodes = nds.filter(n => n.type === 'orbit');
      let bestOrbit: { category: string; radius: number; distance: number } | null = null;

      orbitNodes.forEach(orbitNode => {
        const orbitRadius = orbitNode.data?.radius as number;
        const orbitCategory = orbitNode.data?.category as string;
        const distance = Math.abs(distFromCenter - orbitRadius);

        // このカテゴリの軌道のみスナップ対象（分類済みの場合）
        // 未分類ノードはどの軌道にもスナップしない
        if (nodeCategory && orbitCategory === nodeCategory && distance < SNAP_THRESHOLD) {
          if (!bestOrbit || distance < bestOrbit.distance) {
            bestOrbit = { category: orbitCategory, radius: orbitRadius, distance };
          }
        }
      });

      if (bestOrbit && distFromCenter > 0.0001) {
        const snapRadius = (bestOrbit as { category: string; radius: number; distance: number }).radius;
        // 現在の角度を保持したまま、軌道の円周上にスナップ
        return nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              position: {
                x: (dx / distFromCenter) * snapRadius,
                y: (dy / distFromCenter) * snapRadius,
              },
              data: { ...n.data, orbitRadius: snapRadius },
            };
          }
          return n;
        });
      }

      return nds;
    });
  }, [setNodes, SNAP_THRESHOLD]);

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
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
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  const onPaneClick = useCallback(() => {
    setSelectedPaper(null);
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  const handlePaperClose = useCallback(() => {
    setSelectedPaper(null);
  }, []);

  const handleGapDetailClose = useCallback(() => {
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  const handleGapDetailPaperClick = useCallback((paper: Paper) => {
    setSelectedPaper(paper);
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  return (
    <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        minZoom={0.1}
        maxZoom={2}
        className="bg-transparent"
        style={{ width: '100%', height: '100%' }}
        edgesFocusable={false}
      >
        <Background color="transparent" />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl overflow-hidden [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!fill-slate-300 [&>button:hover]:!bg-slate-700" />
      </ReactFlow>

      {/* 詳細パネル */}
      {selectedPaper && (
        <PaperDetailPanel
          paper={selectedPaper}
          onClose={handlePaperClose}
          isSeed={selectedPaper.id === currentNetwork.seedPaper.id}
        />
      )}

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

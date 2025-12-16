'use client';

import { useCallback, useMemo, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CitationNetwork, Paper } from '@/types/paper';
import PaperNode from './PaperNode';
import PaperDetailPanel from './PaperDetailPanel';

interface CitationGraphProps {
  network: CitationNetwork;
}

const nodeTypes = {
  paper: PaperNode,
};

// レイアウト計算関数
function calculateLayout(network: CitationNetwork): { nodes: Node[]; edges: Edge[] } {
  const { seedPaper, papers, citations } = network;
  
  // ノードをカテゴリ分け
  const referencedPapers: Paper[] = [];
  const citingPapers: Paper[] = [];
  
  citations.forEach((citation) => {
    if (citation.sourceId === seedPaper.id) {
      // Seed論文が引用している論文
      const targetPaper = papers.find((p) => p.id === citation.targetId);
      if (targetPaper && targetPaper.id !== seedPaper.id) {
        referencedPapers.push(targetPaper);
      }
    } else if (citation.targetId === seedPaper.id) {
      // Seed論文を引用している論文
      const sourcePaper = papers.find((p) => p.id === citation.sourceId);
      if (sourcePaper && sourcePaper.id !== seedPaper.id) {
        citingPapers.push(sourcePaper);
      }
    }
  });
  
  // 重複を除去
  const uniqueReferenced = Array.from(new Map(referencedPapers.map(p => [p.id, p])).values());
  const uniqueCiting = Array.from(new Map(citingPapers.map(p => [p.id, p])).values());
  
  const nodes: Node[] = [];
  const horizontalGap = 200;
  const verticalGap = 300;
  
  // Seed論文を中央に配置
  nodes.push({
    id: seedPaper.id,
    type: 'paper',
    position: { x: 0, y: 0 },
    data: { paper: seedPaper, isSeed: true },
  });
  
  // 引用している論文を下に配置（円弧状）
  const refCount = uniqueReferenced.length;
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
  
  // 被引用論文を上に配置（円弧状）
  const citeCount = uniqueCiting.length;
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
  
  // エッジを作成
  const edges: Edge[] = citations.map((citation) => ({
    id: citation.id,
    source: citation.sourceId,
    target: citation.targetId,
    type: 'smoothstep',
    animated: citation.sourceId === seedPaper.id || citation.targetId === seedPaper.id,
    style: { 
      stroke: citation.sourceId === seedPaper.id ? '#06b6d4' : '#8b5cf6',
      strokeWidth: 2,
      opacity: 0.6,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: citation.sourceId === seedPaper.id ? '#06b6d4' : '#8b5cf6',
    },
  }));
  
  return { nodes, edges };
}

export default function CitationGraph({ network }: CitationGraphProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => calculateLayout(network),
    [network]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as { paper: Paper; isSeed: boolean };
    setSelectedPaper(nodeData.paper);
  }, []);
  
  const onPaneClick = useCallback(() => {
    setSelectedPaper(null);
  }, []);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-slate-950"
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
              <span className="text-white font-medium">{network.papers.length}</span>
              <span className="text-slate-400">Citations:</span>
              <span className="text-white font-medium">{network.citations.length}</span>
            </div>
          </div>
        </Panel>
        
        {/* 凡例 */}
        <Panel position="top-right" className="!m-4">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-cyan-400 font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
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
              <div className="flex items-center gap-2 mt-3">
                <div className="w-6 h-0.5 bg-cyan-500" />
                <span className="text-slate-300">References</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-purple-500" />
                <span className="text-slate-300">Cited by</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {/* 詳細パネル */}
      {selectedPaper && (
        <PaperDetailPanel
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          isSeed={selectedPaper.id === network.seedPaper.id}
        />
      )}
    </div>
  );
}


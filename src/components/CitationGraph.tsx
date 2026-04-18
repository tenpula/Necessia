/*
 * 【ファイル概要】
 * ネットワーク図の描画
 * d3-force ベースで論文ノードの配置とドラッグ挙動を管理し、SVG で描画します。
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { useCitationAnalysis } from '@/hooks/useCitationAnalysis';
import { applyForceLayoutToNodes, calculateLayout, stepForceLayoutToNodes } from '@/lib/graph-layout';
import { formatAuthorsShort, formatNumber } from '@/lib/format';
import {
  AnalysisProgress,
  CitationContextType,
  CitationNetwork,
  CONTEXT_TYPE_INFO,
  GapProposal,
  Paper,
} from '@/types/paper';
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

type Bounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type DragState = {
  nodeId: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

const DEFAULT_REPULSION_CONTROL = 52;
const VIEWBOX_PADDING = 420;

function toEffectiveRepulsionStrength(controlValue: number): number {
  const normalized = Math.max(0, Math.min(1, controlValue / 100));
  return 0.5 + normalized * normalized * normalized * 11.5;
}

function getNodeSize(node: Node): number {
  if (node.type !== 'paper' || !node.data?.paper) {
    return 0;
  }

  const isSeed = Boolean(node.data.isSeed);
  const yearRatio = typeof node.data.yearRatio === 'number' ? (node.data.yearRatio as number) : 0;
  const baseSize = 60;
  const maxSize = 120;
  return (isSeed ? 280 : baseSize + (maxSize - baseSize) * yearRatio) * 0.6;
}

function getBounds(nodes: Node[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    if (node.type === 'orbit') {
      const radius = typeof node.data?.radius === 'number' ? (node.data.radius as number) : 0;
      minX = Math.min(minX, -radius);
      minY = Math.min(minY, -radius);
      maxX = Math.max(maxX, radius);
      maxY = Math.max(maxY, radius);
      return;
    }

    const size = getNodeSize(node);
    const half = size / 2;
    minX = Math.min(minX, node.position.x - half);
    minY = Math.min(minY, node.position.y - half);
    maxX = Math.max(maxX, node.position.x + half);
    maxY = Math.max(maxY, node.position.y + half);
  });

  if (!Number.isFinite(minX)) {
    return { minX: -500, minY: -500, width: 1000, height: 1000 };
  }

  return {
    minX: minX - VIEWBOX_PADDING,
    minY: minY - VIEWBOX_PADDING,
    width: maxX - minX + VIEWBOX_PADDING * 2,
    height: maxY - minY + VIEWBOX_PADDING * 2,
  };
}

function getNodeStyle(paper: Paper, isSeed: boolean, gapRole?: 'paperA' | 'paperB' | null) {
  const baseColor = '#4D4634';
  const borderColor = 'rgba(34, 29, 18, 0.35)';
  const shape = paper.venueType === 'conference' ? 'rect' : 'circle';

  let stroke = borderColor;
  let strokeWidth = 2;

  if (isSeed) {
    stroke = '#8B7355';
    strokeWidth = 4;
  } else if (gapRole === 'paperA') {
    stroke = '#9333ea';
    strokeWidth = 4;
  } else if (gapRole === 'paperB') {
    stroke = '#db2777';
    strokeWidth = 4;
  }

  return {
    fill: baseColor,
    stroke,
    strokeWidth,
    shape,
  };
}

function OrbitRing({ node }: { node: Node }) {
  const radius = typeof node.data?.radius === 'number' ? (node.data.radius as number) : 0;
  const category = node.data?.category as CitationContextType | undefined;
  const contextInfo = category ? CONTEXT_TYPE_INFO[category] : undefined;
  const color = contextInfo?.color ?? '#94a3b8';

  return (
    <g pointerEvents="none">
      <circle cx={0} cy={0} r={radius} fill="none" stroke={color} strokeWidth={3} opacity={0.6} />
      {contextInfo && (
        <text
          x={0}
          y={-radius - 18}
          fill={color}
          fontSize={12}
          fontWeight={600}
          textAnchor="middle"
          style={{ textShadow: '0 0 10px rgba(0,0,0,0.45)' }}
        >
          {contextInfo.label}
        </text>
      )}
    </g>
  );
}

export default function CitationGraph({
  network,
  selectedGapProposal,
  onAnalysisComplete,
  onGapProposalChange,
  onAnalysisProgressChange,
  onStartAnalysisReady,
  onCancelAnalysisReady,
}: CitationGraphProps) {
  const { currentNetwork, analysisProgress, startAnalysis, cancelAnalysis } = useCitationAnalysis(network, {
    onAnalysisComplete,
    autoStart: false,
  });

  useEffect(() => {
    onAnalysisProgressChange?.(analysisProgress);
  }, [analysisProgress, onAnalysisProgressChange]);

  useEffect(() => {
    onStartAnalysisReady?.(startAnalysis);
  }, [startAnalysis, onStartAnalysisReady]);

  useEffect(() => {
    onCancelAnalysisReady?.(cancelAnalysis);
  }, [cancelAnalysis, onCancelAnalysisReady]);

  useEffect(() => {
    return () => {
      onAnalysisProgressChange?.({
        total: 0,
        analyzed: 0,
        status: 'idle',
      });
    };
  }, [onAnalysisProgressChange]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => calculateLayout(currentNetwork), [currentNetwork]);
  const [repulsionControl, setRepulsionControl] = useState(DEFAULT_REPULSION_CONTROL);
  const repulsionStrength = useMemo(
    () => toEffectiveRepulsionStrength(repulsionControl),
    [repulsionControl]
  );
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [hoveredPaper, setHoveredPaper] = useState<Paper | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [frozenBounds, setFrozenBounds] = useState<Bounds | null>(null);

  const nodesRef = useRef(nodes);
  const animationFrameRef = useRef<number | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const dynamicBounds = useMemo(() => getBounds(nodes), [nodes]);

  const stopSimulation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const runSimulationStepRef = useRef<(() => void) | null>(null);

  const runSimulationStep = useCallback(() => {
    if (dragStateRef.current) {
      animationFrameRef.current = null;
      return;
    }

    const { nodes: nextNodes, hasMeaningfulMovement } = stepForceLayoutToNodes(nodesRef.current, {
      iterations: 1,
      repulsionStrength,
    });

    nodesRef.current = nextNodes;
    setNodes(nextNodes);

    if (hasMeaningfulMovement) {
      animationFrameRef.current = requestAnimationFrame(() => runSimulationStepRef.current?.());
      return;
    }

    animationFrameRef.current = null;
  }, [repulsionStrength]);

  useEffect(() => {
    runSimulationStepRef.current = runSimulationStep;
  }, [runSimulationStep]);

  const startSimulation = useCallback(() => {
    if (animationFrameRef.current !== null || dragStateRef.current) {
      return;
    }

    animationFrameRef.current = requestAnimationFrame(() => runSimulationStepRef.current?.());
  }, []);

  useEffect(() => () => stopSimulation(), [stopSimulation]);

  useEffect(() => {
    const settledNodes = applyForceLayoutToNodes(initialNodes, {
      repulsionStrength,
    });
    const frameId = requestAnimationFrame(() => {
      nodesRef.current = settledNodes;
      setNodes(settledNodes);
      setEdges(initialEdges);
      startSimulation();
    });

    return () => cancelAnimationFrame(frameId);
  }, [initialEdges, initialNodes, repulsionStrength, startSimulation]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          if (node.type !== 'paper') {
            return node;
          }

          const nextGapRole =
            selectedGapProposal?.paperA.id === node.id
              ? 'paperA'
              : selectedGapProposal?.paperB.id === node.id
                ? 'paperB'
                : null;

          if (node.data?.gapRole === nextGapRole) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              gapRole: nextGapRole,
            },
          };
        })
      );
    });

    return () => cancelAnimationFrame(frameId);
  }, [selectedGapProposal]);

  const paperNodes = useMemo(() => nodes.filter((node) => node.type === 'paper'), [nodes]);
  const orbitNodes = useMemo(() => nodes.filter((node) => node.type === 'orbit'), [nodes]);
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const activeBounds = frozenBounds ?? dynamicBounds;
  const viewBox = `${activeBounds.minX} ${activeBounds.minY} ${activeBounds.width} ${activeBounds.height}`;

  const getWorldPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) {
      return { x: 0, y: 0 };
    }

    const transformed = point.matrixTransform(screenCTM.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const handleNodePointerMove = useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const nextPosition = getWorldPoint(event.clientX, event.clientY);
      const draggedPosition = {
        x: nextPosition.x - dragState.offsetX,
        y: nextPosition.y - dragState.offsetY,
      };

      setNodes((currentNodes) => {
        const draggedNode = currentNodes.find((node) => node.id === dragState.nodeId);
        if (!draggedNode) {
          return currentNodes;
        }

        const positionedNodes = currentNodes.map((node) => {
          if (node.id !== dragState.nodeId) {
            return node;
          }

          return {
            ...node,
            position: draggedPosition,
            data: {
              ...node.data,
              velocityX: 0,
              velocityY: 0,
            },
          };
        });

        const { nodes: simulatedNodes } = stepForceLayoutToNodes(positionedNodes, {
          pinnedNodeId: dragState.nodeId,
          iterations: 1,
          repulsionStrength,
        });

        const stabilizedNodes = simulatedNodes.map((node) => {
          if (node.id !== dragState.nodeId) {
            return node;
          }

          return {
            ...node,
            position: draggedPosition,
          };
        });

        nodesRef.current = stabilizedNodes;
        return stabilizedNodes;
      });
    },
    [getWorldPoint, repulsionStrength]
  );

  const handleGlobalPointerUp = useCallback(() => {
    if (!dragStateRef.current) {
      return;
    }

    dragStateRef.current = null;
    setDraggingNodeId(null);
    setFrozenBounds(null);
    startSimulation();
  }, [startSimulation]);

  useEffect(() => {
    window.addEventListener('pointermove', handleNodePointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleNodePointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [handleGlobalPointerUp, handleNodePointerMove]);

  const handleNodePointerDown = useCallback(
    (event: React.PointerEvent<SVGGElement>, node: Node) => {
      if (node.type !== 'paper' || node.data?.isSeed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const worldPoint = getWorldPoint(event.clientX, event.clientY);
      stopSimulation();
      dragStateRef.current = {
        nodeId: node.id,
        pointerId: event.pointerId,
        offsetX: worldPoint.x - node.position.x,
        offsetY: worldPoint.y - node.position.y,
      };
      setDraggingNodeId(node.id);
      setFrozenBounds(getBounds(nodesRef.current));
    },
    [getWorldPoint, stopSimulation]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent<SVGGElement>, node: Node) => {
      event.stopPropagation();
      if (node.type !== 'paper') {
        return;
      }

      setSelectedPaper(node.data.paper as Paper);
      onGapProposalChange?.(null);
    },
    [onGapProposalChange]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedPaper(null);
    setHoveredPaper(null);
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  const handlePaperClose = useCallback(() => {
    setSelectedPaper(null);
  }, []);

  const handleGapDetailClose = useCallback(() => {
    onGapProposalChange?.(null);
  }, [onGapProposalChange]);

  const handleGapDetailPaperClick = useCallback(
    (paper: Paper) => {
      setSelectedPaper(paper);
      onGapProposalChange?.(null);
    },
    [onGapProposalChange]
  );

  return (
    <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
      <div className="absolute top-4 right-4 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-neutral-700 bg-neutral-950/88 p-4 text-neutral-100 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">反発の強さ</p>
            <p className="text-xs text-neutral-400">上げるほどドラッグ時の押し返しを強めます</p>
          </div>
          <span className="min-w-11 text-right text-sm font-medium text-amber-300">{repulsionControl}</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={repulsionControl}
          onChange={(event) => setRepulsionControl(Number(event.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 accent-amber-400"
          aria-label="反発の強さ"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
          <span>弱い</span>
          <span>実効値 {repulsionStrength.toFixed(1)}</span>
          <span>強い</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-full w-full select-none"
        onClick={handlePaneClick}
      >
        <defs>
          <marker id="citation-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>

        {orbitNodes.map((node) => (
          <OrbitRing key={node.id} node={node} />
        ))}

        {edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (!source || !target) {
            return null;
          }

          const stroke = typeof edge.style?.stroke === 'string' ? edge.style.stroke : '#64748b';
          const strokeWidth = typeof edge.style?.strokeWidth === 'number' ? edge.style.strokeWidth : 2;
          const opacity = typeof edge.style?.opacity === 'number' ? edge.style.opacity : 0.2;

          return (
            <line
              key={edge.id}
              x1={source.position.x}
              y1={source.position.y}
              x2={target.position.x}
              y2={target.position.y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              markerEnd="url(#citation-arrow)"
            />
          );
        })}

        {paperNodes.map((node) => {
          const paper = node.data.paper as Paper;
          const isSeed = Boolean(node.data.isSeed);
          const gapRole = (node.data.gapRole as 'paperA' | 'paperB' | null | undefined) ?? null;
          const isDragging = draggingNodeId === node.id;
          const size = getNodeSize(node);
          const { fill, stroke, strokeWidth, shape } = getNodeStyle(paper, isSeed, gapRole);

          return (
            <g
              key={node.id}
              transform={`translate(${node.position.x} ${node.position.y})`}
              onPointerDown={(event) => handleNodePointerDown(event, node)}
              onMouseEnter={() => setHoveredPaper(paper)}
              onMouseLeave={() => setHoveredPaper((current) => (current?.id === paper.id ? null : current))}
              onClick={(event) => handleNodeClick(event, node)}
              className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            >
              {shape === 'rect' ? (
                <rect
                  x={-size / 2}
                  y={-size / 2}
                  width={size}
                  height={size}
                  rx={18}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={0.98}
                />
              ) : (
                <circle r={size / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={0.98} />
              )}
              {isDragging && (
                <circle
                  r={size / 2 + 10}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={8}
                />
              )}
            </g>
          );
        })}
      </svg>

      {hoveredPaper && <HoverPaperSummary paper={hoveredPaper} />}

      {selectedPaper && (
        <PaperDetailPanel
          paper={selectedPaper}
          onClose={handlePaperClose}
          isSeed={selectedPaper.id === currentNetwork.seedPaper.id}
        />
      )}

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

interface HoverPaperSummaryProps {
  paper: Paper;
}

function HoverPaperSummary({ paper }: HoverPaperSummaryProps) {
  const displayAuthors = formatAuthorsShort(paper);

  return (
    <div className="absolute left-4 bottom-4 z-30 pointer-events-none">
      <div className="bg-slate-900/92 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 w-80 max-w-[calc(100vw-2rem)]">
        <h4 className="font-semibold text-neutral-200 text-sm leading-snug mb-2">{paper.title}</h4>
        <p className="text-xs text-slate-300 mb-1">{displayAuthors}</p>
        {paper.venue && <p className="text-xs text-slate-400 mb-1 italic">{paper.venue}</p>}
        <div className="flex gap-3 mt-2 text-xs">
          <span className="text-slate-400">
            Year: <span className="text-white">{paper.publicationYear}</span>
          </span>
          <span className="text-slate-400">
            Citations: <span className="text-white">{formatNumber(paper.citationCount)}</span>
          </span>
        </div>
        <div className="flex gap-2 mt-2">
          {paper.venueType !== 'unknown' && <VenueTypeBadge venueType={paper.venueType} />}
          {paper.arxivId && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/30 text-orange-300">
              arXiv
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface VenueTypeBadgeProps {
  venueType: Paper['venueType'];
}

function VenueTypeBadge({ venueType }: VenueTypeBadgeProps) {
  const colorMap: Record<string, string> = {
    conference: 'bg-purple-500/30 text-purple-300',
    journal: 'bg-blue-500/30 text-blue-300',
    preprint: 'bg-slate-500/30 text-slate-300',
    unknown: 'bg-slate-500/30 text-slate-300',
  };

  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${colorMap[venueType]}`}>{venueType}</span>;
}

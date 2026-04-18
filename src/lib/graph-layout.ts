/*
 * 【ファイル概要】
 * グラフ配置ロジック
 * たくさんある論文の丸（ノード）を、画面上で綺麗にバランスよく配置するための計算です。
 */

/**
 * 引用グラフのレイアウト計算ユーティリティ
 * 
 * ノード（論文）の配置座標とエッジ（引用関係）のスタイルを計算します。
 * React Flowなどのグラフライブラリで使用される形式（Node, Edge）を出力します。
 */

import { Node, Edge, MarkerType } from '@xyflow/react';
import {
  forceCollide,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  SimulationNodeDatum,
} from 'd3-force';
import { CitationNetwork, Paper, Citation, CONTEXT_TYPE_INFO } from '@/types/paper';

type PaperLayoutNode = {
  id: string;
  paper: Paper;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  isSeed: boolean;
  category?: string;
  orbitRadius?: number;
  targetRadius: number;
  yearRatio: number;
};

type DragSimulationNode = SimulationNodeDatum & {
  id: string;
  isSeed: boolean;
  radius: number;
  targetRadius: number;
};

export type ForceLayoutOptions = {
  pinnedNodeId?: string | null;
  iterations?: number;
  repulsionStrength?: number;
};

const NODE_PADDING = 26;
const INITIAL_LAYOUT_ITERATIONS = 160;
const REPULSION_STRENGTH = 0.9;
const PINNED_COLLISION_MULTIPLIER = 2.4;
const NON_PINNED_COLLISION_MULTIPLIER = 0.2;
const SOFT_REPULSION_STRENGTH = 0.02;
const PINNED_SOFT_REPULSION_MULTIPLIER = 2.4;
const BASE_SOFT_REPULSION_DISTANCE = 56;
const PINNED_SOFT_REPULSION_DISTANCE = 220;
const RADIAL_SPRING_STRENGTH = 0.18;
const PINNED_RADIAL_SPRING_STRENGTH = 0.1;
const ANGULAR_DAMPING = 0.96;
const VELOCITY_DAMPING = 0.72;
const DELTA_TO_VELOCITY = 0.9;
const MAX_STEP_PER_ITERATION = 56;
const MAX_STEP_PER_ITERATION_WHILE_DRAGGING = 110;
const SEED_CLEARANCE = 220;
const SETTLE_EPSILON = 0.35;
const D3_DRAG_TICKS = 14;
const D3_POSITION_DEADZONE = 1.4;
const D3_VELOCITY_DEADZONE = 1.1;

/**
 * 引用文脈に基づいてエッジの色を決定します。
 * - background: 一般的な関連研究
 * - methodology: 手法の利用
 * - comparison: 比較対象
 * - critique: 批判的検討
 */
export function getEdgeColor(citation: Citation): string {
  if (citation.contextType) {
    return CONTEXT_TYPE_INFO[citation.contextType].color;
  }
  // アナライズ前はグレイの単色
  return '#64748b'; // slate-500
}

/**
 * 文字列シードに基づくシンプルな擬似乱数生成器
 * @param seed 一意の文字列（ノードIDなど）
 * @returns 0〜1の乱数
 */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  let t = h += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function getPaperNodeDiameter(paper: Paper, isSeed: boolean, yearRatio: number): number {
  const baseSize = 60;
  const maxSize = 120;
  return (isSeed ? 280 : baseSize + (maxSize - baseSize) * yearRatio) * 0.6;
}

function normalizeVector(x: number, y: number): { x: number; y: number; length: number } {
  const length = Math.hypot(x, y);
  if (length < 0.0001) {
    return { x: 1, y: 0, length: 0 };
  }

  return { x: x / length, y: y / length, length };
}

function runForceLayoutIterations(
  layoutNodes: PaperLayoutNode[],
  iterationCount: number,
  options?: ForceLayoutOptions
): boolean {
  const pinnedNodeId = options?.pinnedNodeId ?? null;
  const repulsionStrength = options?.repulsionStrength ?? 1;
  const interactionNodes = layoutNodes;
  const movableNodes = layoutNodes.filter((node) => !node.isSeed && node.id !== pinnedNodeId);
  const nodeDiameters = new Map(
    layoutNodes.map((node) => [node.id, getPaperNodeDiameter(node.paper, node.isSeed, node.yearRatio)])
  );
  let hasMeaningfulMovement = false;

  for (let iteration = 0; iteration < iterationCount; iteration++) {
    const deltas = new Map<string, { x: number; y: number }>();

    movableNodes.forEach((node) => {
      deltas.set(node.id, { x: 0, y: 0 });
    });

    for (let i = 0; i < interactionNodes.length; i++) {
      for (let j = i + 1; j < interactionNodes.length; j++) {
        const left = interactionNodes[i];
        const right = interactionNodes[j];
        const dx = right.position.x - left.position.x;
        const dy = right.position.y - left.position.y;
        const direction = normalizeVector(dx, dy);
        const minDistance =
          ((nodeDiameters.get(left.id) ?? 0) + (nodeDiameters.get(right.id) ?? 0)) / 2 + NODE_PADDING;
        const isPinnedInteraction = left.id === pinnedNodeId || right.id === pinnedNodeId;
        const softRepulsionDistance = isPinnedInteraction
          ? PINNED_SOFT_REPULSION_DISTANCE + repulsionStrength * 10
          : BASE_SOFT_REPULSION_DISTANCE;
        const influenceDistance = minDistance + softRepulsionDistance;
        const leftIsMovable = !left.isSeed && left.id !== pinnedNodeId;
        const rightIsMovable = !right.isSeed && right.id !== pinnedNodeId;

        if (isPinnedInteraction && direction.length < influenceDistance) {
          const proximity = (influenceDistance - direction.length) / Math.max(influenceDistance, 1);
          const easedProximity = proximity * proximity * (3 - 2 * proximity);
          const softForce =
            (0.12 + easedProximity) * easedProximity * SOFT_REPULSION_STRENGTH *
            PINNED_SOFT_REPULSION_MULTIPLIER *
            repulsionStrength;

          if (leftIsMovable) {
            const leftDelta = deltas.get(left.id)!;
            leftDelta.x -= direction.x * softForce;
            leftDelta.y -= direction.y * softForce;
          }

          if (rightIsMovable) {
            const rightDelta = deltas.get(right.id)!;
            rightDelta.x += direction.x * softForce;
            rightDelta.y += direction.y * softForce;
          }
        }

        if (direction.length >= minDistance) {
          continue;
        }

        const overlap = minDistance - direction.length;
        const force =
          overlap *
          REPULSION_STRENGTH *
          (isPinnedInteraction ? PINNED_COLLISION_MULTIPLIER : NON_PINNED_COLLISION_MULTIPLIER) *
          repulsionStrength;

        if (leftIsMovable) {
          const leftDelta = deltas.get(left.id)!;
          const leftWeight = rightIsMovable ? 0.5 : 1;
          leftDelta.x -= direction.x * force * leftWeight;
          leftDelta.y -= direction.y * force * leftWeight;
        }

        if (rightIsMovable) {
          const rightDelta = deltas.get(right.id)!;
          const rightWeight = leftIsMovable ? 0.5 : 1;
          rightDelta.x += direction.x * force * rightWeight;
          rightDelta.y += direction.y * force * rightWeight;
        }
      }
    }

    movableNodes.forEach((node) => {
      const delta = deltas.get(node.id)!;
      const radial = normalizeVector(node.position.x, node.position.y);
      const targetRadius = Math.max(node.targetRadius, SEED_CLEARANCE);
      const radialOffset = targetRadius - radial.length;
      const radialSpringStrength =
        node.id === pinnedNodeId ? PINNED_RADIAL_SPRING_STRENGTH : RADIAL_SPRING_STRENGTH;

      delta.x += radial.x * radialOffset * radialSpringStrength;
      delta.y += radial.y * radialOffset * radialSpringStrength;

      const radialProjection = delta.x * radial.x + delta.y * radial.y;
      const tangentialX = delta.x - radial.x * radialProjection;
      const tangentialY = delta.y - radial.y * radialProjection;

      delta.x = radial.x * radialProjection + tangentialX * ANGULAR_DAMPING;
      delta.y = radial.y * radialProjection + tangentialY * ANGULAR_DAMPING;

      node.velocity.x = node.velocity.x * VELOCITY_DAMPING + delta.x * DELTA_TO_VELOCITY;
      node.velocity.y = node.velocity.y * VELOCITY_DAMPING + delta.y * DELTA_TO_VELOCITY;

      if (!pinnedNodeId) {
        node.velocity.x *= 0.7;
        node.velocity.y *= 0.7;
      }

      const maxStepPerIteration = pinnedNodeId
        ? MAX_STEP_PER_ITERATION_WHILE_DRAGGING
        : MAX_STEP_PER_ITERATION;
      const stepLength = Math.hypot(node.velocity.x, node.velocity.y);
      if (stepLength > maxStepPerIteration) {
        const scale = maxStepPerIteration / stepLength;
        node.velocity.x *= scale;
        node.velocity.y *= scale;
      }
      if (stepLength > SETTLE_EPSILON) {
        hasMeaningfulMovement = true;
      }

      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;

      const nextRadial = normalizeVector(node.position.x, node.position.y);
      if (nextRadial.length < SEED_CLEARANCE) {
        node.position.x = nextRadial.x * SEED_CLEARANCE;
        node.position.y = nextRadial.y * SEED_CLEARANCE;
        node.velocity.x *= 0.4;
        node.velocity.y *= 0.4;
      }
    });
  }

  return hasMeaningfulMovement;
}

function toPaperLayoutNode(node: Node): PaperLayoutNode | null {
  if (node.type !== 'paper' || !node.data?.paper) {
    return null;
  }

  const paper = node.data.paper as Paper;
  const isSeed = Boolean(node.data.isSeed);
  const orbitRadius =
    typeof node.data.orbitRadius === 'number' ? (node.data.orbitRadius as number) : undefined;
  const currentRadius = Math.hypot(node.position.x, node.position.y);
  const velocity = {
    x: typeof node.data.velocityX === 'number' ? (node.data.velocityX as number) : 0,
    y: typeof node.data.velocityY === 'number' ? (node.data.velocityY as number) : 0,
  };

  return {
    id: node.id,
    paper,
    position: { ...node.position },
    velocity,
    isSeed,
    category: typeof node.data.category === 'string' ? (node.data.category as string) : undefined,
    orbitRadius,
    targetRadius: orbitRadius ?? currentRadius,
    yearRatio: typeof node.data.yearRatio === 'number' ? (node.data.yearRatio as number) : 0,
  };
}

function runD3DragSimulation(
  layoutNodes: PaperLayoutNode[],
  options?: ForceLayoutOptions
): { layoutNodes: PaperLayoutNode[]; hasMeaningfulMovement: boolean } {
  const pinnedNodeId = options?.pinnedNodeId ?? null;
  const repulsionStrength = options?.repulsionStrength ?? 1;

  if (!pinnedNodeId) {
    return { layoutNodes, hasMeaningfulMovement: false };
  }

  const simulationNodes: DragSimulationNode[] = layoutNodes.map((node) => {
    const radius = getPaperNodeDiameter(node.paper, node.isSeed, node.yearRatio) / 2 + NODE_PADDING / 2;
    const shouldFixPosition = node.isSeed || node.id === pinnedNodeId;
    return {
      id: node.id,
      isSeed: node.isSeed,
      radius,
      targetRadius: Math.max(node.targetRadius, SEED_CLEARANCE),
      x: node.position.x,
      y: node.position.y,
      vx: node.velocity.x,
      vy: node.velocity.y,
      fx: shouldFixPosition ? node.position.x : undefined,
      fy: shouldFixPosition ? node.position.y : undefined,
    };
  });

  const radialForce = forceRadial<DragSimulationNode>(
    (node) => node.targetRadius,
    0,
    0
  ).strength((node) => (node.id === pinnedNodeId ? 0 : 0.035));

  const simulation = forceSimulation(simulationNodes)
    .alpha(0.68 + Math.min(0.18, repulsionStrength * 0.02))
    .alphaDecay(0.018)
    .velocityDecay(0.12)
    .force(
      'charge',
      forceManyBody<DragSimulationNode>()
        .strength((node) => (node.id === pinnedNodeId ? -640 * repulsionStrength : -220 * repulsionStrength))
        .distanceMin(24)
        .distanceMax(320 + repulsionStrength * 26)
    )
    .force(
      'collide',
      forceCollide<DragSimulationNode>()
        .radius((node) => node.radius)
        .strength(1)
        .iterations(4)
    )
    .force('x', forceX<DragSimulationNode>(0).strength((node) => (node.id === pinnedNodeId ? 0 : 0.02)))
    .force('y', forceY<DragSimulationNode>(0).strength((node) => (node.id === pinnedNodeId ? 0 : 0.02)))
    .force('radial', radialForce)
    .stop();

  for (let i = 0; i < D3_DRAG_TICKS; i++) {
    simulation.tick();
  }

  let hasMeaningfulMovement = false;
  const simulationById = new Map(simulationNodes.map((node) => [node.id, node]));
  const nextLayoutNodes = layoutNodes.map((node) => {
    const simulated = simulationById.get(node.id);
    if (!simulated) {
      return node;
    }

    const nextPosition =
      node.isSeed || node.id === pinnedNodeId
        ? node.position
        : {
            x: simulated.x ?? node.position.x,
            y: simulated.y ?? node.position.y,
          };
    const nextVelocity =
      node.isSeed || node.id === pinnedNodeId
        ? { x: 0, y: 0 }
        : {
            x: simulated.vx ?? 0,
            y: simulated.vy ?? 0,
          };
    const positionDelta = Math.hypot(nextPosition.x - node.position.x, nextPosition.y - node.position.y);
    const velocityDelta = Math.hypot(nextVelocity.x, nextVelocity.y);
    const shouldFreezeNode =
      !node.isSeed &&
      node.id !== pinnedNodeId &&
      positionDelta < D3_POSITION_DEADZONE &&
      velocityDelta < D3_VELOCITY_DEADZONE;

    const stabilizedPosition = shouldFreezeNode ? node.position : nextPosition;
    const stabilizedVelocity = shouldFreezeNode ? { x: 0, y: 0 } : nextVelocity;

    if (
      Math.hypot(stabilizedPosition.x - node.position.x, stabilizedPosition.y - node.position.y) > SETTLE_EPSILON ||
      Math.hypot(stabilizedVelocity.x, stabilizedVelocity.y) > SETTLE_EPSILON
    ) {
      hasMeaningfulMovement = true;
    }

    return {
      ...node,
      position: stabilizedPosition,
      velocity: stabilizedVelocity,
    };
  });

  return { layoutNodes: nextLayoutNodes, hasMeaningfulMovement };
}

export function applyForceLayoutToNodes(nodes: Node[], options?: ForceLayoutOptions): Node[] {
  return stepForceLayoutToNodes(nodes, {
    pinnedNodeId: options?.pinnedNodeId,
    iterations: INITIAL_LAYOUT_ITERATIONS,
    repulsionStrength: options?.repulsionStrength,
  }).nodes;
}

export function stepForceLayoutToNodes(
  nodes: Node[],
  options?: ForceLayoutOptions
): { nodes: Node[]; hasMeaningfulMovement: boolean } {
  const pinnedNodeId = options?.pinnedNodeId ?? null;
  const iterations = options?.iterations ?? 1;
  const layoutNodes = nodes
    .map(toPaperLayoutNode)
    .filter((node): node is PaperLayoutNode => node !== null);

  if (layoutNodes.length === 0) {
    return { nodes, hasMeaningfulMovement: false };
  }

  let nextLayoutNodes = layoutNodes;
  let hasMeaningfulMovement = false;

  if (pinnedNodeId) {
    const dragSimulationResult = runD3DragSimulation(nextLayoutNodes, options);
    nextLayoutNodes = dragSimulationResult.layoutNodes;
    hasMeaningfulMovement = dragSimulationResult.hasMeaningfulMovement;
  }

  const iterativeMovement = runForceLayoutIterations(nextLayoutNodes, pinnedNodeId ? 1 : iterations, {
    pinnedNodeId,
    repulsionStrength: options?.repulsionStrength,
  });
  hasMeaningfulMovement = hasMeaningfulMovement || iterativeMovement;

  const layoutById = new Map(nextLayoutNodes.map((node) => [node.id, node]));

  return {
    nodes: nodes.map((node) => {
      const nextLayoutNode = layoutById.get(node.id);
      if (!nextLayoutNode) {
        return node;
      }

      return {
        ...node,
        position: nextLayoutNode.position,
        data: {
          ...node.data,
          velocityX: nextLayoutNode.velocity.x,
          velocityY: nextLayoutNode.velocity.y,
        },
      };
    }),
    hasMeaningfulMovement,
  };
}

/**
 * ネットワークからノードとエッジを計算し、レイアウトを決定します。
 * 
 * 配置ロジック:
 * - Seed論文（中心となる論文）を原点 (0, 0) に配置します。
 * - 分類済み論文：カテゴリ別に領域を分割し、円形に配置（重ならないよう半径に揺らぎを持たせる）
 * - 未分類論文：中心の分類済み論文のリングに重ならない外側に、ランダムに散らばるように配置します。
 * 
 * @param network 引用ネットワークデータ
 * @returns ノードとエッジの配列
 */
export function calculateLayout(network: CitationNetwork): { nodes: Node[]; edges: Edge[] } {
  const { seedPaper, papers, citations } = network;

  const otherPapers = Array.from(
    new Map(
      papers.filter((p) => p.id !== seedPaper.id).map((p) => [p.id, p])
    ).values()
  );

  const nodes: Node[] = [];
  const paperLayoutNodes: PaperLayoutNode[] = [];

  // 出版年の最小・最大を計算（相対的な色割り当て用）
  let minYear = seedPaper.publicationYear;
  let maxYear = seedPaper.publicationYear;
  otherPapers.forEach(p => {
    if (p.publicationYear < minYear) minYear = p.publicationYear;
    if (p.publicationYear > maxYear) maxYear = p.publicationYear;
  });
  const yearRange = Math.max(1, maxYear - minYear);
  const getYearRatio = (year: number) => Math.max(0, Math.min(1, (year - minYear) / yearRange));

  // Seed論文を中心に配置
  paperLayoutNodes.push({
    id: seedPaper.id,
    paper: seedPaper,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    isSeed: true,
    targetRadius: 0,
    yearRatio: getYearRatio(seedPaper.publicationYear),
  });

  // 1: 手法, 2: 比較, 3: 関連(背景), 4: 批判 の順序
  const orderedContextTypes = ['methodology', 'comparison', 'background', 'critique'];
  const classifiedGroups = new Map<string, Paper[]>();
  orderedContextTypes.forEach(t => classifiedGroups.set(t, []));
  const unclassifiedPapers: Paper[] = [];

  // 論文ごとの代表Citationを決める。
  // まず seed 論文と直接つながる Citation を優先し、なければ任意の関連 Citation を採用する。
  const citationByPaperId = new Map<string, Citation>();

  citations.forEach((citation) => {
    if (citation.sourceId === seedPaper.id && citation.targetId !== seedPaper.id) {
      citationByPaperId.set(citation.targetId, citation);
    } else if (citation.targetId === seedPaper.id && citation.sourceId !== seedPaper.id) {
      citationByPaperId.set(citation.sourceId, citation);
    }
  });

  otherPapers.forEach(paper => {
    const cit = citationByPaperId.get(paper.id)
      ?? citations.find(c => c.sourceId === paper.id || c.targetId === paper.id);

    if (cit && cit.contextType && orderedContextTypes.includes(cit.contextType)) {
      classifiedGroups.get(cit.contextType)!.push(paper);
    } else {
      unclassifiedPapers.push(paper);
    }
  });

  let currentRadius = 300; // 最初の軌道の半径
  const radiusIncrementBase = 150;
  let maxOrbitRadius = 0;

  // 1. 軌道と分類済み論文の配置
  orderedContextTypes.forEach((ctg) => {
    const papersInCtg = classifiedGroups.get(ctg)!;
    if (papersInCtg.length === 0) return; // 論文がないカテゴリは軌道を描かない

    // ノード数が多い場合は軌道を広げる (最密充填を考慮)
    const requiredCircumference = papersInCtg.length * 150; 
    const minRequiredRadius = requiredCircumference / (2 * Math.PI);
    
    // 現在の軌道半径を決定
    const r = Math.max(currentRadius, minRequiredRadius);
    maxOrbitRadius = Math.max(maxOrbitRadius, r);

    // 軌道ノードを追加
    nodes.push({
      id: `orbit-${ctg}`,
      type: 'orbit',
      position: { x: 0, y: 0 }, // nodeOriginを中心に合わせるため原点配置
      data: { radius: r, category: ctg },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
      style: {
        pointerEvents: 'none',
        background: 'transparent',
        border: 'none',
      },
    });

    // 論文を軌道上に均等配置
    const count = papersInCtg.length;
    papersInCtg.forEach((paper, i) => {
      // 0度(右)から開始ではなく、見栄えを考慮し -90度(上)から開始
      const theta = -Math.PI / 2 + (i / count) * 2 * Math.PI;
      
      paperLayoutNodes.push({
        id: paper.id,
        paper,
        position: {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r,
        },
        velocity: { x: 0, y: 0 },
        isSeed: false,
        orbitRadius: r,
        category: ctg,
        targetRadius: r,
        yearRatio: getYearRatio(paper.publicationYear),
      });
    });

    // 次の軌道のベース半径を設定
    currentRadius = r + radiusIncrementBase;
  });

  // 2. 未分類論文の配置（外側に散らばらせる）
  if (unclassifiedPapers.length > 0) {
    unclassifiedPapers.sort((a, b) => a.id.localeCompare(b.id));

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    // 存在する最大の軌道よりも外側から開始する
    const unclassifiedStartRadius = maxOrbitRadius > 0 ? maxOrbitRadius + 200 : 300;

    unclassifiedPapers.forEach((paper, i) => {
      const rand1 = seededRandom(paper.id + '_r');
      const rand2 = seededRandom(paper.id + '_t');
      
      const theta = i * goldenAngle + (rand2 * 0.5 - 0.25);
      const r = unclassifiedStartRadius + Math.sqrt(i) * 60 + (rand1 * 40 - 20);

      paperLayoutNodes.push({
        id: paper.id,
        paper,
        position: {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r,
        },
        velocity: { x: 0, y: 0 },
        isSeed: false,
        targetRadius: r,
        yearRatio: getYearRatio(paper.publicationYear),
      });
    });
  }

  runForceLayoutIterations(paperLayoutNodes, INITIAL_LAYOUT_ITERATIONS);

  paperLayoutNodes.forEach((node) => {
    nodes.push({
      id: node.id,
      type: 'paper',
      position: node.position,
      data: {
        paper: node.paper,
        isSeed: node.isSeed,
        orbitRadius: node.orbitRadius,
        category: node.category,
        yearRatio: node.yearRatio,
      },
      draggable: node.isSeed ? false : undefined,
      zIndex: node.isSeed ? undefined : 5,
    });
  });

  // 3. エッジを作成（分類済み・未分類の両方を描画）
  // 分類済みの引用は色分けして表示し、未分類は薄く表示
  const edges: Edge[] = [];
  
  citations.forEach((citation) => {
    // シード論文から各ノードへ直接つながるエッジは表示しない
    if (citation.sourceId === seedPaper.id || citation.targetId === seedPaper.id) {
      return;
    }

    const color = getEdgeColor(citation);
    const isClassified = citation.contextType && orderedContextTypes.includes(citation.contextType);
    
    edges.push({
      id: citation.id,
      source: citation.sourceId,
      target: citation.targetId,
      sourceHandle: 'center-source',
      targetHandle: 'center-target',
      type: 'straight',
      animated: false,
      selectable: false,
      style: {
        stroke: color,
        strokeWidth: isClassified ? 6 : 2,
        opacity: isClassified ? 0.6 : 0.15, // 分類済みは目立つように、未分類はうっすら
        cursor: 'default',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: color,
      },
      data: { citation },
    });
  });

  return { nodes, edges };
}

/**
 * 文脈タイプ別の統計を計算
 */
export function calculateContextStats(citations: Citation[]): Record<string, number> {
  const stats: Record<string, number> = {
    methodology: 0,
    critique: 0,
    comparison: 0,
    background: 0,
  };

  citations.forEach((c) => {
    const type = c.contextType || 'background';
    stats[type]++;
  });

  return stats;
}

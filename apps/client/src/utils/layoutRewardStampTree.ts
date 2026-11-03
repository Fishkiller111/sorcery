/**
 * 奖励图章树 · dagre 布局引擎
 *
 * 纯计算，不渲染 UI。将 GalleryBranchView[] 转为有向图，
 * 调用 dagre.layout 输出节点左上角坐标与连线折线点。
 *
 * 建图规则（rankdir: LR）：
 *   root → cell… → final
 *   多条 branch 从同一 root 分叉
 */
import dagre from 'dagre';
import type { GalleryBranchView } from './storyGallery';

/** 节点角色：主线起点 / 分支中间阶段 / 最终奖励 / 未解锁占位 */
export type RewardStampNodeKind = 'root' | 'cell' | 'final' | 'locked-cell' | 'locked-final';

/** 隐藏分支占位 id，参与 dagre 布局 */
export const HIDDEN_BRANCH_ID = '__hidden__';

/** layout 输出节点；x/y 为 RN absolute 左上角 */
export interface RewardStampLayoutNode {
  id: string;
  kind: RewardStampNodeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 关联 branches[].id，root 节点无此字段 */
  branchId?: string;
  /** 关联 branch.cells[cellIndex]，用于 Map 查业务数据 */
  cellIndex?: number;
  branchType?: GalleryBranchView['type'];
}

export interface RewardStampLayoutEdge {
  id: string;
  /** dagre 算出的折线顶点，供 SVG Polyline 使用 */
  points: Array<{ x: number; y: number }>;
  branchType?: GalleryBranchView['type'] | 'locked';
}

export interface RewardStampLayout {
  nodes: RewardStampLayoutNode[];
  edges: RewardStampLayoutEdge[];
  /** 整张图画布尺寸，供 ScrollView 内容区使用 */
  width: number;
  height: number;
}

/** 与 UI 组件尺寸一致，dagre 靠此计算间距 */
export const REWARD_STAMP_ROOT = { width: 120, height: 180 };
export const REWARD_STAMP_CELL = { width: 76, height: 96 };
export const REWARD_STAMP_FINAL = { width: 92, height: 112 };

type DagreNodeAttrs = {
  width: number;
  height: number;
  kind: RewardStampNodeKind;
  branchId?: string;
  cellIndex?: number;
  branchType?: GalleryBranchView['type'];
};

type DagreEdgeAttrs = {
  branchType?: GalleryBranchView['type'] | 'locked';
};

/**
 * 从分支视图拆出「中间阶段」与「最终 cell」。
 * 逻辑与旧 GallerySceneBranchMap.BranchTrack 保持一致。
 */
function getBranchChain(branch: GalleryBranchView) {
  const cells = branch.cells;
  const imageCells = cells.filter((c) => c.hasImage);
  const midCells =
    imageCells.length > 1 ? imageCells.slice(0, -1) : cells.length > 1 ? cells.slice(0, -1) : [];
  const finalCell =
    imageCells.length > 0 ? imageCells[imageCells.length - 1] : cells[cells.length - 1] ?? null;
  return { midCells, finalCell };
}

function cellIndexInBranch(branch: GalleryBranchView, cellId: string): number {
  const idx = branch.cells.findIndex((c) => c.id === cellId);
  return idx >= 0 ? idx : 0;
}

export function layoutRewardStampTree(input: {
  sceneCode: string;
  branches: GalleryBranchView[];
}): RewardStampLayout {
  const { sceneCode, branches } = input;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR', // 左→右，配合图鉴横向滚动
    nodesep: 28, // 同列节点垂直间距
    ranksep: 68, // 列与列水平间距
    marginx: 16,
    marginy: 16,
  });

  const rootId = `root:${sceneCode}`;
  g.setNode(rootId, {
    width: REWARD_STAMP_ROOT.width,
    height: REWARD_STAMP_ROOT.height,
    kind: 'root',
  });

  for (const branch of branches) {
    const { midCells, finalCell } = getBranchChain(branch);
    if (!finalCell) continue;

    let prev = rootId;

    for (const cell of midCells) {
      const nodeId = `${branch.id}:${cell.id}`;
      g.setNode(nodeId, {
        width: REWARD_STAMP_CELL.width,
        height: REWARD_STAMP_CELL.height,
        kind: 'cell',
        branchId: branch.id,
        cellIndex: cellIndexInBranch(branch, cell.id),
        branchType: branch.type,
      });
      g.setEdge(prev, nodeId, { branchType: branch.type });
      prev = nodeId;
    }

    const finalId = `${branch.id}:final`;
    g.setNode(finalId, {
      width: REWARD_STAMP_FINAL.width,
      height: REWARD_STAMP_FINAL.height,
      kind: 'final',
      branchId: branch.id,
      cellIndex: cellIndexInBranch(branch, finalCell.id),
      branchType: branch.type,
    });
    g.setEdge(prev, finalId, { branchType: branch.type });
  }

  // 隐藏分支「?」：链长对齐最长已解锁分支，并入 dagre 同一棵树
  if (branches.length > 0) {
    let maxMid = 0;
    for (const branch of branches) {
      maxMid = Math.max(maxMid, getBranchChain(branch).midCells.length);
    }

    let prev = rootId;
    for (let i = 0; i < maxMid; i++) {
      const nodeId = `${HIDDEN_BRANCH_ID}:cell:${i}`;
      g.setNode(nodeId, {
        width: REWARD_STAMP_CELL.width,
        height: REWARD_STAMP_CELL.height,
        kind: 'locked-cell',
        branchId: HIDDEN_BRANCH_ID,
        cellIndex: i,
      });
      g.setEdge(prev, nodeId, { branchType: 'locked' });
      prev = nodeId;
    }

    const hiddenFinalId = `${HIDDEN_BRANCH_ID}:final`;
    g.setNode(hiddenFinalId, {
      width: REWARD_STAMP_FINAL.width,
      height: REWARD_STAMP_FINAL.height,
      kind: 'locked-final',
      branchId: HIDDEN_BRANCH_ID,
    });
    g.setEdge(prev, hiddenFinalId, { branchType: 'locked' });
  }

  // 无分支时只返回 root，避免 dagre 对空图 layout
  if (branches.length === 0) {
    return {
      nodes: [
        {
          id: rootId,
          kind: 'root',
          x: 16,
          y: 16,
          width: REWARD_STAMP_ROOT.width,
          height: REWARD_STAMP_ROOT.height,
        },
      ],
      edges: [],
      width: REWARD_STAMP_ROOT.width + 32,
      height: REWARD_STAMP_ROOT.height + 32,
    };
  }

  dagre.layout(g);

  const nodes: RewardStampLayoutNode[] = g.nodes().map((id) => {
    const n = g.node(id) as DagreNodeAttrs & { x: number; y: number };
    return {
      id,
      kind: n.kind,
      branchId: n.branchId,
      cellIndex: n.cellIndex,
      branchType: n.branchType,
      // dagre 返回中心点，转为 RN absolute 左上角
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
    };
  });

  const edges: RewardStampLayoutEdge[] = g.edges().map((e) => {
    const edge = g.edge(e) as DagreEdgeAttrs & { points?: Array<{ x: number; y: number }> };
    return {
      id: `${e.v}->${e.w}`,
      points: edge.points ?? [],
      branchType: edge.branchType,
    };
  });

  const graphMeta = g.graph();
  return {
    nodes,
    edges,
    width: graphMeta.width ?? REWARD_STAMP_ROOT.width + 32,
    height: graphMeta.height ?? REWARD_STAMP_ROOT.height + 32,
  };
}

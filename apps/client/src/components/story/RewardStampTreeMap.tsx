/**
 * 奖励图章树 · 总指挥（替换 GallerySceneBranchMap）
 *
 * 职责：
 * 1. useMemo 调用 layoutRewardStampTree 算坐标
 * 2. 底层 RewardStampEdge 画线，上层按 kind 绝对定位节点
 * 3. 管理 GalleryCellViewer 弹窗状态
 *
 * 分支 A/B/? 标签锚定在 root→首节点连线的中点
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { GalleryBranchView } from '../../utils/storyGallery';
import { HIDDEN_BRANCH_ID, layoutRewardStampTree } from '../../utils/layoutRewardStampTree';
import type { RewardStampLayoutNode } from '../../utils/layoutRewardStampTree';
import { useI18n } from '../../i18n/I18nContext';
import { branchAccent, branchTypeLabel } from './rewardStampTheme';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { RewardStampRootNode } from './RewardStampRootNode';
import { RewardStampBranchNode } from './RewardStampBranchNode';
import { RewardStampLeafNode } from './RewardStampLeafNode';
import { RewardStampLockedNode } from './RewardStampLockedNode';
import { RewardStampEdge } from './RewardStampEdge';
import { GalleryCellViewer } from './GalleryCellViewer';

type Props = {
  sceneCode: string;
  sceneTitle: string;
  sceneFlavor?: string;
  branches: GalleryBranchView[];
};

const LABEL_W = 52;
const LABEL_H = 36;

function edgeMidpoint(points: Array<{ x: number; y: number }>): { x: number; y: number } | null {
  if (points.length < 2) return null;
  const a = points[0];
  const b = points[points.length - 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 分支标签，锚定在 root→首节点连线中点 */
function BranchLabelOverlay({
  letter,
  branch,
  locked,
  left,
  top,
}: {
  letter: string;
  branch?: GalleryBranchView;
  locked?: boolean;
  left: number;
  top: number;
}) {

  const { t, lang } = useI18n();
  const accent = locked ? COLORS.agents.paleGoldMuted : branchAccent(branch!.type);

  return (
    <View
      style={[
        styles.branchLabel,
        {
          left,
          top,
          borderColor: accent,
          backgroundColor: locked ? 'rgba(0,0,0,0.55)' : 'rgba(10, 11, 15, 0.92)',
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[Typo(styles.branchLabelLetter, 'mono', lang), { color: accent }]}>
        {t('gallery.branchTrack').replace('{letter}', letter)}
      </Text>
      {!locked && branch ? (
        <Text style={[Typo(styles.branchLabelType, 'sans', lang), { color: accent }]}>{branchTypeLabel(branch.type, t)}</Text>
      ) : null}
    </View>
  );
}

export function RewardStampTreeMap({
  sceneCode,
  sceneTitle,
  sceneFlavor,
  branches,
}: Props) {
  const { t, lang } = useI18n();
  const [viewer, setViewer] = useState<{ branch: GalleryBranchView; index: number } | null>(null);

  const layout = useMemo(
    () => layoutRewardStampTree({ sceneCode, branches }),
    [sceneCode, branches],
  );

  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);
  const scrollWebStyle = scrollWebProps.style as object | undefined;

  const branchById = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b])),
    [branches],
  );

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const canvasHeight = layout.height + 24;

  const rootId = `root:${sceneCode}`;

  /** 每条 branch 第一个可见节点，用于查找 root→首节点连线 */
  const firstNodeByBranch = useMemo(() => {
    const map: Record<string, RewardStampLayoutNode> = {};
    for (const branch of branches) {
      const node = layout.nodes.find(
        (n) => n.branchId === branch.id && (n.kind === 'cell' || n.kind === 'final'),
      );
      if (node) map[branch.id] = node;
    }
    const hiddenNode = layout.nodes.find(
      (n) => n.branchId === HIDDEN_BRANCH_ID && (n.kind === 'locked-cell' || n.kind === 'locked-final'),
    );
    if (hiddenNode) map[HIDDEN_BRANCH_ID] = hiddenNode;
    return map;
  }, [branches, layout.nodes]);

  /** root→首节点连线中点，供分支标签定位 */
  const labelMidByBranch = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const [branchId, node] of Object.entries(firstNodeByBranch)) {
      const edge = layout.edges.find((e) => e.id === `${rootId}->${node.id}`);
      const mid = edge ? edgeMidpoint(edge.points) : null;
      if (mid) map[branchId] = mid;
    }
    return map;
  }, [firstNodeByBranch, layout.edges, rootId]);

  if (branches.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={Typo(styles.empty, 'sans', lang)}>{t('gallery.noBranches')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        horizontal
        {...scrollWebProps}
        style={scrollWebStyle}
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.mapScroll}
      >
        <View style={{ width: layout.width + 32, height: canvasHeight, position: 'relative' }}>
          <RewardStampEdge width={layout.width + 32} height={canvasHeight} edges={layout.edges} />

          {layout.nodes.map((node) => {
            const box = {
              position: 'absolute' as const,
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
            };

            if (node.kind === 'root') {
              return (
                <RewardStampRootNode
                  key={node.id}
                  style={box}
                  sceneCode={sceneCode}
                  sceneTitle={sceneTitle}
                  sceneFlavor={sceneFlavor}
                />
              );
            }

            if (node.kind === 'locked-cell') {
              return <RewardStampLockedNode key={node.id} style={box} variant="cell" />;
            }

            if (node.kind === 'locked-final') {
              return <RewardStampLockedNode key={node.id} style={box} variant="final" />;
            }

            const branch = node.branchId ? branchById[node.branchId] : undefined;
            if (!branch || node.cellIndex === undefined) return null;
            const cell = branch.cells[node.cellIndex] ?? null;

            if (node.kind === 'cell' && cell) {
              return (
                <RewardStampBranchNode
                  key={node.id}
                  style={box}
                  cell={cell}
                  branchUnlocked={branch.unlocked}
                  branchType={branch.type}
                  onPress={() => setViewer({ branch, index: node.cellIndex! })}
                />
              );
            }

            if (node.kind === 'final') {
              return (
                <RewardStampLeafNode
                  key={node.id}
                  style={box}
                  cell={cell}
                  branchTitle={branch.title}
                  branchUnlocked={branch.unlocked}
                  branchType={branch.type}
                  onPress={() => setViewer({ branch, index: node.cellIndex! })}
                />
              );
            }

            return null;
          })}

          {branches.map((branch, i) => {
            const mid = labelMidByBranch[branch.id];
            if (!mid) return null;
            return (
              <BranchLabelOverlay
                key={`label-${branch.id}`}
                letter={letters[i] ?? String(i + 1)}
                branch={branch}
                left={mid.x - LABEL_W / 2}
                top={mid.y - LABEL_H / 2}
              />
            );
          })}

          {labelMidByBranch[HIDDEN_BRANCH_ID] ? (
            <BranchLabelOverlay
              key="label-hidden"
              letter="?"
              locked
              left={labelMidByBranch[HIDDEN_BRANCH_ID].x - LABEL_W / 2}
              top={labelMidByBranch[HIDDEN_BRANCH_ID].y - LABEL_H / 2}
            />
          ) : null}
        </View>
      </ScrollView>

      <GalleryCellViewer
        visible={!!viewer}
        branch={viewer?.branch ?? null}
        initialIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { padding: 32, alignItems: 'center' },
  empty: { color: COLORS.text.muted, textAlign: 'center' },
  mapScroll: {
    paddingVertical: 16,
    paddingRight: 24,
    paddingLeft: 16,
  },
  branchLabel: {
    position: 'absolute',
    width: LABEL_W,
    height: LABEL_H,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    zIndex: 20,
  },
  branchLabelLetter: { fontSize: 9, fontWeight: '700' },
  branchLabelType: { fontSize: 7, marginTop: 2, opacity: 0.85 },
});

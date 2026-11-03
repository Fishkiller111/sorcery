/**
 * 奖励图章树 · 共享主题
 * 分支 accent 色、类型文案、解锁/锁定图章 PNG
 */
import { COLORS } from '../../theme/colors';
import type { GalleryBranchView } from '../../utils/storyGallery';

export type RewardStampEdgeType = GalleryBranchView['type'] | 'locked';

/** 分支类型对应连线/边框色：奖励金 / 坏结局红 / 平行蓝灰 / 未解锁灰 */
export function branchAccent(type: RewardStampEdgeType): string {
  if (type === 'locked') return COLORS.agents.paleGoldMuted;
  if (type === 'reward') return COLORS.accent.gold;
  if (type === 'bad_end') return COLORS.accent.red;
  return '#7a9ec2';
}

export function branchTypeLabel(type: GalleryBranchView['type'], t: (k: string) => string): string {
  if (type === 'reward') return t('gallery.branchReward');
  if (type === 'bad_end') return t('gallery.branchBadEnd');
  return t('gallery.branchParallel');
}

const SEAL_ACTIVE = require('../../../assets/images/ui/mode-select/seal_confirmed_large.png');
const SEAL_IDLE = require('../../../assets/images/ui/mode-select/seal_standby_large.png');

/** 最终奖励节点用：解锁 confirmed / 锁定 standby */
export function sealSource(unlocked: boolean) {
  return unlocked ? SEAL_ACTIVE : SEAL_IDLE;
}

import { Platform, type ViewStyle } from 'react-native';
import type { RoleGridCardData } from '../components/agent/RoleGridCard';
import type { ExploreRoleCategory, RoleItem } from '../types/api';
import { resolveRoleCategoryName, ROLE_CATEGORY_HISTORY_ID, sortRoleCategories } from './roleCategory';

/** Minimum card width before reducing column count */
export const ROLE_GRID_GAP = 12;
export const ROLE_GRID_MIN_CARD_WIDTH = 230;
export const ROLE_GRID_MAX_COLUMNS = 5;

/** Column count from available content width (not full window width). */
export function gridColumnCount(
  availableWidth: number,
  gap = ROLE_GRID_GAP,
  minCardWidth = ROLE_GRID_MIN_CARD_WIDTH,
  maxColumns = ROLE_GRID_MAX_COLUMNS,
): number {
  if (availableWidth <= 0) return 1;
  const cols = Math.floor(
    (availableWidth + gap) / (minCardWidth + gap),
  );
  return Math.max(1, Math.min(maxColumns, cols));
}

export function computeCardWidth(
  availableWidth: number,
  numColumns: number,
  gap = ROLE_GRID_GAP,
): number {
  if (numColumns <= 0) return availableWidth;
  return Math.floor((availableWidth - gap * (numColumns - 1)) / numColumns);
}

/** CSS Grid container — equal columns, no orphan stretch, no horizontal overflow. */
export function getRoleGridContainerStyle(
  numColumns: number,
  gap: number,
  availableWidth?: number,
): ViewStyle {
  const base: ViewStyle = {
    width: '100%',
    maxWidth: availableWidth,
  };

  if (numColumns <= 1) {
    return {
      ...base,
      flexGrow: 0,
    };
  }

  if (Platform.OS !== 'web') {
    return {
      ...base,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap,
    };
  }

  return {
    ...base,
    display: 'grid',
    gap,
    gridTemplateColumns: `repeat(${numColumns}, minmax(0, 1fr))`,
  } as unknown as ViewStyle;
}

export function roleItemToGridCard(role: RoleItem): RoleGridCardData {
  return {
    id: role.id,
    name: role.name,
    avatar_url: role.avatar_url,
    figure_url: role.figure_url,
    introduction: role.introduction || role.scene_name,
    supported_langs: role.supported_langs,
    categories: role.categories,
    publish_status: role.publish_status,
    is_owner: role.is_owner,
    worldview_name: role.worldview_name,
    has_chat_history: role.has_chat_history,
  };
}

export function collectRoleCategories(
  roles: RoleItem[],
  t?: (key: string) => string,
): ExploreRoleCategory[] {
  const map = new Map<string, string>();
  for (const role of roles) {
    for (const cat of role.categories ?? []) {
      const name = t ? resolveRoleCategoryName(cat.category_id, cat.name, t) : cat.name;
      map.set(cat.category_id, name);
    }
  }
  const categories = sortRoleCategories(
    Array.from(map.entries()).map(([category_id, name]) => ({ category_id, name })),
  );
  if (roles.some((role) => role.has_chat_history)) {
    const historyName = t ? t('freeChat.categoryHistory') : 'History';
    categories.unshift({ category_id: ROLE_CATEGORY_HISTORY_ID, name: historyName });
  }
  return categories;
}

export function filterRoles(
  roles: RoleItem[],
  query: string,
  categoryId: string,
): RoleItem[] {
  let list = roles;
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((role) => {
      const haystack = [
        role.name,
        role.scene_name,
        role.introduction,
        role.worldview_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }
  if (categoryId === ROLE_CATEGORY_HISTORY_ID) {
    list = list.filter((role) => role.has_chat_history);
  } else if (categoryId) {
    list = list.filter((role) =>
      role.categories?.some((cat) => cat.category_id === categoryId),
    );
  }
  return list;
}

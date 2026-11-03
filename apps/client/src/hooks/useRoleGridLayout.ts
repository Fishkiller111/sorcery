import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { SIDEBAR_WIDTH } from '../constants/layout';
import { useIsDesktop } from './useIsDesktop';
import {
  ROLE_GRID_GAP,
  ROLE_GRID_MAX_COLUMNS,
  ROLE_GRID_MIN_CARD_WIDTH,
  computeCardWidth,
  gridColumnCount,
} from '../utils/roleGrid';

/** Grid metrics for role cards inside FreeChatShell (accounts for sidebar + padding). */
export function useRoleGridLayout(
  horizontalPadding = 0,
  options?: { minCardWidth?: number; maxColumns?: number; gap?: number },
) {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = useIsDesktop();
  const minCardWidth = options?.minCardWidth ?? ROLE_GRID_MIN_CARD_WIDTH;
  const maxColumns = options?.maxColumns ?? ROLE_GRID_MAX_COLUMNS;
  const gap = options?.gap ?? ROLE_GRID_GAP;

  const availableWidth = useMemo(() => {
    const sidebar = isDesktop ? SIDEBAR_WIDTH : 0;
    return Math.max(0, windowWidth - sidebar - horizontalPadding * 2);
  }, [windowWidth, isDesktop, horizontalPadding]);

  const numColumns = useMemo(
    () => gridColumnCount(availableWidth, gap, minCardWidth, maxColumns),
    [availableWidth, gap, minCardWidth, maxColumns],
  );

  const cardWidth = useMemo(
    () => computeCardWidth(availableWidth, numColumns, gap),
    [availableWidth, numColumns, gap],
  );

  return {
    numColumns,
    cardWidth,
    availableWidth,
    gap,
  };
}

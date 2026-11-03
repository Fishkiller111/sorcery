import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import type { FlatList } from 'react-native';

const PULL_THRESHOLD = 56;
const MAX_PULL = 88;
const DEFAULT_LOAD_MORE_DISTANCE = 480;

type Options = {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  /** Called when scroll approaches the bottom (web). */
  onNearBottom?: () => void;
  loadMoreDistance?: number;
};

type ScrollableList = FlatList<unknown> & {
  getScrollableNode?: () => HTMLElement | null;
  getNativeScrollRef?: () => { current?: HTMLElement | null } | HTMLElement | null;
};

function asElement(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null;
  if (node instanceof HTMLElement) return node;
  const maybe = node as { current?: unknown };
  if (maybe.current instanceof HTMLElement) return maybe.current;
  return null;
}

/** Resolve the real overflow scroll element for RN Web FlatList / VirtualizedList. */
export function resolveWebScrollElement(list: ScrollableList | null): HTMLElement | null {
  if (Platform.OS !== 'web' || !list) return null;

  if (typeof list.getScrollableNode === 'function') {
    const n = asElement(list.getScrollableNode());
    if (n) return n;
  }

  if (typeof list.getNativeScrollRef === 'function') {
    const n = asElement(list.getNativeScrollRef());
    if (n) return n;
  }

  const anyList = list as unknown as {
    _listRef?: ScrollableList;
    _scrollRef?: ScrollableList;
    getScrollResponder?: () => ScrollableList | null;
  };

  const nested =
    anyList._scrollRef ||
    anyList._listRef ||
    (typeof anyList.getScrollResponder === 'function' ? anyList.getScrollResponder() : null);
  if (nested && nested !== list) {
    const n = resolveWebScrollElement(nested);
    if (n) return n;
  }

  // Last resort: walk from host node for an overflow scroll container.
  const host = asElement((list as unknown as { _nativeNode?: unknown })._nativeNode);
  if (host) {
    if (host.scrollHeight > host.clientHeight + 2) return host;
    const child = host.querySelector<HTMLElement>(
      '[data-testid="scroll-view-container"], div[style*="overflow"]',
    );
    if (child) return child;
  }
  return null;
}

/**
 * react-native-web does not implement RefreshControl.
 * Attaches pointer listeners for pull-to-refresh and a scroll listener for infinite load.
 */
export function useWebPullToRefresh(options: Options) {
  const {
    refreshing,
    onRefresh,
    enabled = true,
    onNearBottom,
    loadMoreDistance = DEFAULT_LOAD_MORE_DISTANCE,
  } = options;
  const listRef = useRef<ScrollableList | null>(null);
  const pullAnim = useRef(new Animated.Value(0)).current;
  const [pulling, setPulling] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  const onNearBottomRef = useRef(onNearBottom);
  const enabledRef = useRef(enabled);
  const refreshingRef = useRef(refreshing);
  const loadMoreDistanceRef = useRef(loadMoreDistance);
  const startY = useRef(0);
  const armed = useRef(false);
  const activePull = useRef(false);
  const pullDistance = useRef(0);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    onNearBottomRef.current = onNearBottom;
  }, [onNearBottom]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    loadMoreDistanceRef.current = loadMoreDistance;
  }, [loadMoreDistance]);
  useEffect(() => {
    refreshingRef.current = refreshing;
    if (refreshing) {
      Animated.timing(pullAnim, {
        toValue: PULL_THRESHOLD,
        duration: 180,
        useNativeDriver: false,
      }).start();
      setPulling(true);
    } else {
      Animated.timing(pullAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setPulling(false));
    }
  }, [pullAnim, refreshing]);

  const getScrollEl = useCallback((): HTMLElement | null => {
    return resolveWebScrollElement(listRef.current);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    let attached: HTMLElement | null = null;

    const atTop = () => {
      const el = getScrollEl();
      // Important: if scroll node missing, do NOT treat as top (would steal gestures).
      if (!el) return false;
      return el.scrollTop <= 1;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!enabledRef.current || refreshingRef.current) return;
      if (!atTop()) return;
      startY.current = e.clientY;
      armed.current = true;
      activePull.current = false;
      pullDistance.current = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!armed.current || !enabledRef.current || refreshingRef.current) return;
      const dy = e.clientY - startY.current;
      if (dy <= 0 || !atTop()) {
        if (activePull.current) {
          activePull.current = false;
          pullDistance.current = 0;
          pullAnim.setValue(0);
          setPulling(false);
        }
        return;
      }
      const adjusted = Math.min(MAX_PULL, (dy * 150) / (dy + 120));
      pullDistance.current = adjusted;
      if (!activePull.current && adjusted > 8) {
        activePull.current = true;
        setPulling(true);
      }
      if (activePull.current) {
        pullAnim.setValue(adjusted);
        if (e.cancelable) e.preventDefault();
      }
    };

    const onPointerEnd = () => {
      if (!armed.current) return;
      armed.current = false;
      const dist = pullDistance.current;
      activePull.current = false;
      pullDistance.current = 0;
      if (dist >= PULL_THRESHOLD && !refreshingRef.current) {
        void onRefreshRef.current();
        return;
      }
      Animated.timing(pullAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setPulling(false));
    };

    const onScroll = () => {
      if (!enabledRef.current) return;
      const el = attached ?? getScrollEl();
      if (!el) return;
      const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
      if (distance <= loadMoreDistanceRef.current) {
        onNearBottomRef.current?.();
      }
    };

    const detach = () => {
      if (!attached) return;
      attached.removeEventListener('pointerdown', onPointerDown);
      attached.removeEventListener('pointermove', onPointerMove);
      attached.removeEventListener('pointerup', onPointerEnd);
      attached.removeEventListener('pointercancel', onPointerEnd);
      attached.removeEventListener('scroll', onScroll);
      attached = null;
    };

    const attach = (node: HTMLElement) => {
      if (attached === node) return;
      detach();
      attached = node;
      node.addEventListener('pointerdown', onPointerDown, { passive: true });
      node.addEventListener('pointermove', onPointerMove, { passive: false });
      node.addEventListener('pointerup', onPointerEnd, { passive: true });
      node.addEventListener('pointercancel', onPointerEnd, { passive: true });
      node.addEventListener('scroll', onScroll, { passive: true });
      // Check once in case already near bottom after attach.
      onScroll();
    };

    const tryAttach = () => {
      const el = getScrollEl();
      if (el) attach(el);
    };
    tryAttach();
    const retry = window.setInterval(tryAttach, 300);

    return () => {
      window.clearInterval(retry);
      detach();
    };
  }, [enabled, getScrollEl, pullAnim]);

  return {
    listRef,
    showIndicator: Platform.OS === 'web' && (pulling || refreshing),
    indicatorHeight: pullAnim,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import type { FlatList } from 'react-native';

const PULL_THRESHOLD = 56;
const MAX_PULL = 88;

type Options = {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  onNearBottom: () => void;
  enabled?: boolean;
};

type ScrollableList = FlatList<unknown> & {
  getScrollableNode?: () => HTMLElement | null;
};

function asElement(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return node;
  const maybe = node as { current?: unknown };
  if (typeof HTMLElement !== 'undefined' && maybe.current instanceof HTMLElement) {
    return maybe.current;
  }
  return null;
}

function resolveScrollElement(list: ScrollableList | null): HTMLElement | null {
  if (Platform.OS !== 'web' || !list) return null;
  if (typeof list.getScrollableNode === 'function') {
    const n = asElement(list.getScrollableNode());
    if (n) return n;
  }
  const anyList = list as unknown as {
    _scrollRef?: ScrollableList;
    getScrollResponder?: () => ScrollableList | null;
  };
  const nested =
    anyList._scrollRef ||
    (typeof anyList.getScrollResponder === 'function' ? anyList.getScrollResponder() : null);
  if (nested && nested !== list) return resolveScrollElement(nested);
  return null;
}

/**
 * Web feed scroll helpers:
 * - Pull-to-refresh via overlay (does NOT resize list header — avoids interrupt jumps)
 * - Infinite load via IntersectionObserver on a footer sentinel
 */
export function useWebFeedScroll(options: Options) {
  const { refreshing, onRefresh, onNearBottom, enabled = true } = options;
  const listRef = useRef<ScrollableList | null>(null);
  const pullAnim = useRef(new Animated.Value(0)).current;
  const [pulling, setPulling] = useState(false);

  const onRefreshRef = useRef(onRefresh);
  const onNearBottomRef = useRef(onNearBottom);
  const enabledRef = useRef(enabled);
  const refreshingRef = useRef(refreshing);
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
    refreshingRef.current = refreshing;
    if (refreshing) {
      Animated.timing(pullAnim, {
        toValue: PULL_THRESHOLD,
        duration: 160,
        useNativeDriver: false,
      }).start();
      setPulling(true);
    } else if (!activePull.current) {
      Animated.timing(pullAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => setPulling(false));
    }
  }, [pullAnim, refreshing]);

  const getScrollEl = useCallback(() => resolveScrollElement(listRef.current), []);

  // Pull-to-refresh: overlay gesture on the scroll node (no content height mutation).
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    let attached: HTMLElement | null = null;

    const atTop = () => {
      const el = getScrollEl();
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
          if (!refreshingRef.current) {
            pullAnim.setValue(0);
            setPulling(false);
          }
        }
        armed.current = dy > 0 && atTop();
        return;
      }
      const adjusted = Math.min(MAX_PULL, (dy * 150) / (dy + 120));
      pullDistance.current = adjusted;
      if (!activePull.current && adjusted > 10) {
        activePull.current = true;
        setPulling(true);
      }
      if (activePull.current) {
        pullAnim.setValue(adjusted);
        // Only prevent default once pull is active — avoids killing normal scroll.
        if (e.cancelable) e.preventDefault();
      }
    };

    const finishPull = () => {
      if (!armed.current && !activePull.current) return;
      armed.current = false;
      const dist = pullDistance.current;
      const wasActive = activePull.current;
      activePull.current = false;
      pullDistance.current = 0;
      if (wasActive && dist >= PULL_THRESHOLD && !refreshingRef.current) {
        void onRefreshRef.current();
        return;
      }
      if (!refreshingRef.current) {
        Animated.timing(pullAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start(() => setPulling(false));
      }
    };

    const detach = () => {
      if (!attached) return;
      attached.removeEventListener('pointerdown', onPointerDown);
      attached.removeEventListener('pointermove', onPointerMove);
      attached.removeEventListener('pointerup', finishPull);
      attached.removeEventListener('pointercancel', finishPull);
      attached = null;
    };

    const attach = (node: HTMLElement) => {
      if (attached === node) return;
      detach();
      attached = node;
      node.addEventListener('pointerdown', onPointerDown, { passive: true });
      node.addEventListener('pointermove', onPointerMove, { passive: false });
      node.addEventListener('pointerup', finishPull, { passive: true });
      node.addEventListener('pointercancel', finishPull, { passive: true });
    };

    const tryAttach = () => {
      const el = getScrollEl();
      if (el) attach(el);
    };
    tryAttach();
    const retry = window.setInterval(tryAttach, 400);
    return () => {
      window.clearInterval(retry);
      detach();
    };
  }, [enabled, getScrollEl, pullAnim]);

  // Infinite load: observe footer sentinel (nativeID) inside the scroll root.
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | null = null;
    let observed: Element | null = null;

    const disconnect = () => {
      observer?.disconnect();
      observer = null;
      observed = null;
    };

    const findSentinel = () =>
      document.getElementById('social-feed-load-more-sentinel') ||
      document.querySelector('[id="social-feed-load-more-sentinel"]');

    const findScrollRoot = (target: Element): Element | null => {
      const fromList = getScrollEl();
      if (fromList && fromList.contains(target)) return fromList;
      let p: HTMLElement | null = target.parentElement;
      while (p) {
        const style = window.getComputedStyle(p);
        const oy = style.overflowY;
        if (
          (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
          p.scrollHeight > p.clientHeight + 4
        ) {
          return p;
        }
        p = p.parentElement;
      }
      return fromList;
    };

    const connect = () => {
      const target = findSentinel();
      if (!target) return;
      const root = findScrollRoot(target);
      if (observed === target && observer) return;
      disconnect();
      observed = target;
      observer = new IntersectionObserver(
        (entries) => {
          if (!enabledRef.current || refreshingRef.current) return;
          for (const entry of entries) {
            if (entry.isIntersecting) {
              onNearBottomRef.current();
            }
          }
        },
        { root: root ?? null, rootMargin: '320px 0px', threshold: 0 },
      );
      observer.observe(target);
    };

    connect();
    const retry = window.setInterval(connect, 400);

    // Backup: raw scroll listener (IO can miss if root/sentinel remount).
    let scrollAttached: HTMLElement | null = null;
    const onScroll = () => {
      if (!enabledRef.current || refreshingRef.current) return;
      const el = scrollAttached;
      if (!el) return;
      const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
      if (distance < 420) onNearBottomRef.current();
    };
    const attachScroll = () => {
      const el = getScrollEl();
      if (!el || el === scrollAttached) return;
      scrollAttached?.removeEventListener('scroll', onScroll);
      scrollAttached = el;
      el.addEventListener('scroll', onScroll, { passive: true });
    };
    attachScroll();
    const scrollRetry = window.setInterval(attachScroll, 400);

    return () => {
      window.clearInterval(retry);
      window.clearInterval(scrollRetry);
      scrollAttached?.removeEventListener('scroll', onScroll);
      disconnect();
    };
  }, [enabled, getScrollEl]);

  return {
    listRef,
    showPullOverlay: Platform.OS === 'web' && (pulling || refreshing),
    pullOverlayHeight: pullAnim,
  };
}

/** Footer marker used by IntersectionObserver for infinite load on web. */
export const SOCIAL_FEED_LOAD_MORE_SENTINEL_ID = 'social-feed-load-more-sentinel';

import { useCallback, useEffect, useRef } from 'react';
import { Platform, type ScrollView } from 'react-native';

type Scrollable = ScrollView & {
  getScrollableNode?: () => unknown;
  getScrollResponder?: () => Scrollable | null;
  _scrollRef?: Scrollable;
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

function resolveScrollElement(list: Scrollable | null): HTMLElement | null {
  if (Platform.OS !== 'web' || !list) return null;
  if (typeof list.getScrollableNode === 'function') {
    const n = asElement(list.getScrollableNode());
    if (n) return n;
  }
  const anyList = list as Scrollable & {
    getScrollResponder?: () => unknown;
  };
  const nested =
    anyList._scrollRef ||
    (typeof anyList.getScrollResponder === 'function'
      ? (anyList.getScrollResponder() as Scrollable | null)
      : null);
  if (nested && nested !== list) return resolveScrollElement(nested);
  return null;
}

/** Only treat as drag after intentional movement — avoids eating card taps. */
const DRAG_THRESHOLD_PX = 10;

/**
 * Enables click-and-drag horizontal scrolling for RN Web ScrollView
 * (native touch/trackpad already works; desktop mouse drag does not by default).
 *
 * Important: do NOT pointer-capture on mousedown — that steals presses from child
 * Pressables. Capture only after the drag threshold is crossed.
 */
export function useWebHorizontalDragScroll(enabled = true) {
  const scrollRef = useRef<ScrollView>(null);
  /** When true, the next press should be ignored (user was dragging). */
  const suppressClickRef = useRef(false);
  const drag = useRef({
    active: false,
    capturing: false,
    pointerId: -1,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    let el: HTMLElement | null = null;
    let raf = 0;
    let tries = 0;

    const cleanupFns: Array<() => void> = [];

    const attach = () => {
      el = resolveScrollElement(scrollRef.current as Scrollable | null);
      if (!el) {
        if (tries++ < 30) {
          raf = requestAnimationFrame(attach);
        }
        return;
      }

      el.style.cursor = 'grab';
      el.style.userSelect = 'none';
      (el.style as CSSStyleDeclaration & { webkitUserDrag?: string }).webkitUserDrag = 'none';

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        drag.current = {
          active: true,
          capturing: false,
          pointerId: e.pointerId,
          startX: e.clientX,
          startScroll: el!.scrollLeft,
          moved: false,
        };
        suppressClickRef.current = false;
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
        const dx = e.clientX - drag.current.startX;
        if (!drag.current.moved && Math.abs(dx) >= DRAG_THRESHOLD_PX) {
          drag.current.moved = true;
          suppressClickRef.current = true;
          el!.style.cursor = 'grabbing';
          if (!drag.current.capturing) {
            drag.current.capturing = true;
            try {
              el!.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }
        }
        if (drag.current.moved) {
          el!.scrollLeft = drag.current.startScroll - dx;
          e.preventDefault();
        }
      };

      const endDrag = (e: PointerEvent) => {
        if (!drag.current.active || drag.current.pointerId !== e.pointerId) return;
        const wasDragging = drag.current.moved;
        const wasCapturing = drag.current.capturing;
        drag.current.active = false;
        drag.current.capturing = false;
        el!.style.cursor = 'grab';
        if (wasCapturing) {
          try {
            el!.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }
        // Only suppress the click that follows a real drag.
        if (wasDragging) {
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 120);
        } else {
          suppressClickRef.current = false;
        }
      };

      const onWheel = (e: WheelEvent) => {
        if (!el) return;
        const delta =
          Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta === 0) return;
        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;
        const next = Math.min(max, Math.max(0, el.scrollLeft + delta));
        if (next !== el.scrollLeft) {
          el.scrollLeft = next;
          e.preventDefault();
        }
      };

      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);
      el.addEventListener('lostpointercapture', endDrag);
      el.addEventListener('wheel', onWheel, { passive: false });

      cleanupFns.push(() => {
        el?.removeEventListener('pointerdown', onPointerDown);
        el?.removeEventListener('pointermove', onPointerMove);
        el?.removeEventListener('pointerup', endDrag);
        el?.removeEventListener('pointercancel', endDrag);
        el?.removeEventListener('lostpointercapture', endDrag);
        el?.removeEventListener('wheel', onWheel);
        if (el) {
          el.style.cursor = '';
          el.style.userSelect = '';
        }
      });
    };

    attach();

    return () => {
      cancelAnimationFrame(raf);
      cleanupFns.forEach((fn) => fn());
    };
  }, [enabled]);

  const consumeClickIfDragged = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return { scrollRef, consumeClickIfDragged };
}

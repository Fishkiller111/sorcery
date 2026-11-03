import { useEffect, useState, type RefObject } from 'react';
import { Platform, type View } from 'react-native';

export type UseInViewportOptions = {
  /** 提前进入视口的边距，如 `200px`（仅 Web IntersectionObserver） */
  rootMargin?: string;
  /** 可见比例阈值，默认接近 0 即算进入 */
  threshold?: number | number[];
  /**
   * 原生端：FlatList 已做窗口裁剪时，挂载即视为可见。
   * 设为 false 时原生也保持 false，直到外部再驱动——本 hook 原生默认 true。
   */
  nativeAssumeVisible?: boolean;
};

type HostRef = RefObject<View | Element | null>;

function resolveDomElement(raw: unknown): Element | null {
  if (!raw || typeof raw !== 'object') return null;
  if ('nodeType' in raw && typeof (raw as Node).nodeType === 'number') {
    return raw as Element;
  }
  // 少数 RN Web 包装：尝试取底层节点
  const anyRaw = raw as { getNode?: () => unknown; _nativeNode?: Element };
  if (typeof anyRaw.getNode === 'function') {
    const n = anyRaw.getNode();
    if (n && typeof n === 'object' && 'nodeType' in n) return n as Element;
  }
  if (anyRaw._nativeNode && typeof anyRaw._nativeNode.nodeType === 'number') {
    return anyRaw._nativeNode;
  }
  return null;
}

/**
 * Web：IntersectionObserver 判断是否接近/进入视口。
 * 原生：默认挂载即 true（依赖虚拟列表裁剪屏外节点）。
 */
export function useInViewport(
  ref: HostRef,
  options: UseInViewportOptions = {},
): boolean {
  const {
    rootMargin = '200px 0px',
    threshold = 0.01,
    nativeAssumeVisible = true,
  } = options;
  const [inView, setInView] = useState(
    Platform.OS !== 'web' ? nativeAssumeVisible : false,
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setInView(nativeAssumeVisible);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    let cancelled = false;
    let io: IntersectionObserver | null = null;
    let raf = 0;
    let tries = 0;

    const observe = () => {
      if (cancelled) return;
      const el = resolveDomElement(ref.current);
      if (!el) {
        // 首帧 ref 可能尚未挂上，短重试
        if (tries++ < 20) {
          raf = requestAnimationFrame(observe);
          return;
        }
        setInView(true);
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setInView(entry.isIntersecting);
        },
        { rootMargin, threshold },
      );
      io.observe(el);
    };

    observe();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [ref, rootMargin, threshold, nativeAssumeVisible]);

  return inView;
}

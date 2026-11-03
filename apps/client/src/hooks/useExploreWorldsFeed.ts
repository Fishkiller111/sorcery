import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listExploreWorlds,
  type ExploreCatalogKind,
  type ExploreWorldItem,
} from '../api/exploreWorlds';
import { useI18n } from '../i18n/I18nContext';
import { toBackendLang } from '../utils/userLang';

const PAGE_SIZE = 20;

function catalogItemKey(item: ExploreWorldItem): string {
  if (item.kind === 'simulator' || item.simulator_id) {
    return `simulator:${item.simulator_id || item.code}`;
  }
  return `world:${item.world_id || item.code}`;
}

function feedKey(q: string, lang: string, excludeMature: boolean, kind: ExploreCatalogKind) {
  return `${q}\0${lang}\0${excludeMature ? 1 : 0}\0${kind}`;
}

/** Paginated explore worlds — same waterfall semantics as useExploreRolesFeed. */
export function useExploreWorldsFeed(
  q: string,
  enabled = true,
  excludeMature = false,
  kind: ExploreCatalogKind = 'all',
) {
  const { lang } = useI18n();
  const backendLang = toBackendLang(lang);
  const [items, setItems] = useState<ExploreWorldItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pageRef = useRef(1);
  const activeKeyRef = useRef(feedKey(q, backendLang, excludeMature, kind));
  const qRef = useRef(q);
  const enabledRef = useRef(enabled);
  const excludeMatureRef = useRef(excludeMature);
  const kindRef = useRef(kind);
  qRef.current = q;
  enabledRef.current = enabled;
  excludeMatureRef.current = excludeMature;
  kindRef.current = kind;

  const fetchPage = useCallback(
    async (
      page: number,
      key: string,
      query: string,
      exclude: boolean,
      catalogKind: ExploreCatalogKind,
      mode: 'replace' | 'append',
    ) => {
      const resp = await listExploreWorlds({
        q: query || undefined,
        page,
        pageSize: PAGE_SIZE,
        lang: backendLang,
        excludeMature: exclude || undefined,
        kind: catalogKind,
      });
      if (activeKeyRef.current !== key || !enabledRef.current) return;

      const next = resp.items ?? [];
      if (mode === 'replace') {
        setItems(next);
        setHasMore(page * PAGE_SIZE < (resp.total ?? 0) && next.length >= PAGE_SIZE);
      } else {
        let appended = 0;
        setItems((prev) => {
          const seen = new Set(prev.map(catalogItemKey));
          const merged = next.filter((w) => !seen.has(catalogItemKey(w)));
          appended = merged.length;
          return merged.length > 0 ? [...prev, ...merged] : prev;
        });
        const moreByTotal = page * PAGE_SIZE < (resp.total ?? 0);
        setHasMore(moreByTotal && next.length > 0 && appended > 0);
      }
      pageRef.current = page + 1;
    },
    [backendLang],
  );

  useEffect(() => {
    if (!enabled) return;
    const key = feedKey(q, backendLang, excludeMature, kind);
    activeKeyRef.current = key;
    pageRef.current = 1;
    setHasMore(true);
    setLoading(true);

    let cancelled = false;
    void fetchPage(1, key, q, excludeMature, kind, 'replace')
      .catch(() => {
        if (!cancelled && activeKeyRef.current === key) setItems([]);
      })
      .finally(() => {
        if (!cancelled && activeKeyRef.current === key) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q, backendLang, enabled, excludeMature, kind, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading || loadingMore || refreshing || !hasMore) return;
    const key = activeKeyRef.current;
    setLoadingMore(true);
    try {
      await fetchPage(
        pageRef.current,
        key,
        qRef.current,
        excludeMatureRef.current,
        kindRef.current,
        'append',
      );
    } catch {
      // keep existing list
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, fetchPage, hasMore, loading, loadingMore, refreshing]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const key = activeKeyRef.current;
    setRefreshing(true);
    pageRef.current = 1;
    setHasMore(true);
    try {
      await fetchPage(1, key, qRef.current, excludeMatureRef.current, kindRef.current, 'replace');
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  }, [enabled, fetchPage]);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    refreshing,
    loadMore,
    refresh,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { listExploreRoles } from '../api/roles';
import { useAuthStore } from '../stores/authStore';
import { useI18n } from '../i18n/I18nContext';
import type { ExploreRoleItem } from '../types/api';

const PAGE_SIZE = 20;

type FeedFilters = {
  q: string;
  categoryId: string;
  /** R18 chip off → exclude Mature from API (R still included, ranked first). */
  excludeMature: boolean;
};

function feedKey(filters: FeedFilters, orientationKey: string, lang: string) {
  return `${filters.q}|${filters.categoryId}|${filters.excludeMature ? 1 : 0}|${orientationKey}|${lang}`;
}

export function useExploreRolesFeed(filters: FeedFilters) {
  const userGender = useAuthStore((s) => s.user?.gender ?? '');
  const orientationKey = (userGender || '').trim();
  const { lang } = useI18n();

  const [roles, setRoles] = useState<ExploreRoleItem[]>([]);
  const [hasChattedRoles, setHasChattedRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pageRef = useRef(1);
  const activeKeyRef = useRef(feedKey(filters, orientationKey, lang));

  const fetchPage = useCallback(
    async (page: number, key: string, mode: 'replace' | 'append') => {
      const resp = await listExploreRoles({
        q: filters.q || undefined,
        category_id: filters.categoryId || undefined,
        page,
        page_size: PAGE_SIZE,
        exclude_mature: filters.excludeMature || undefined,
      });

      if (activeKeyRef.current !== key) return;

      setHasChattedRoles(Boolean(resp.has_chatted_roles));

      if (mode === 'replace') {
        setRoles(resp.roles);
        setHasMore(resp.roles.length >= PAGE_SIZE);
      } else {
        let appended = 0;
        setRoles((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          const merged = resp.roles.filter((r) => !seen.has(r.id));
          appended = merged.length;
          return merged.length > 0 ? [...prev, ...merged] : prev;
        });
        // Short page or all-duplicates → end of feed.
        setHasMore(resp.roles.length >= PAGE_SIZE && appended > 0);
      }

      pageRef.current = page + 1;
    },
    [filters.q, filters.categoryId, filters.excludeMature],
  );

  useEffect(() => {
    const key = feedKey(filters, orientationKey, lang);
    activeKeyRef.current = key;
    pageRef.current = 1;
    setHasMore(true);
    setLoading(true);

    let cancelled = false;
    void fetchPage(1, key, 'replace')
      .catch(() => {
        if (!cancelled && activeKeyRef.current === key) setRoles([]);
      })
      .finally(() => {
        if (!cancelled && activeKeyRef.current === key) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.q, filters.categoryId, filters.excludeMature, orientationKey, lang, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    const key = activeKeyRef.current;
    setLoadingMore(true);
    try {
      await fetchPage(pageRef.current, key, 'append');
    } catch {
      // keep existing list
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loading, loadingMore, refreshing]);

  const refresh = useCallback(async () => {
    const key = activeKeyRef.current;
    setRefreshing(true);
    pageRef.current = 1;
    setHasMore(true);
    try {
      await fetchPage(1, key, 'replace');
    } catch {
      setRoles([]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  return {
    roles,
    hasChattedRoles,
    loading,
    loadingMore,
    hasMore,
    refreshing,
    loadMore,
    refresh,
  };
}

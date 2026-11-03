import { useCallback, useEffect, useRef, useState } from 'react';
import { listAiImageGenRecords } from '../api/aiImageGen';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { formatApiError, formatGenRecordError } from '../utils/apiError';
import { notifyError } from '../utils/notify';
import type { AiImageGenRecordItem } from '../types/api';

const PAGE_SIZE = 12;

function isActiveStatus(status: string) {
  return status === 'pending' || status === 'processing';
}

export function useAiImageGenHistory(enabled: boolean) {
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [items, setItems] = useState<AiImageGenRecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** record_id → last known status; used to toast only on active→failed */
  const statusMapRef = useRef<Map<string, string>>(new Map());

  const hasMore = items.length < total;
  const hasActive = items.some((item) => isActiveStatus(item.status));

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!isLoggedIn) {
        setItems([]);
        setTotal(0);
        statusMapRef.current.clear();
        return;
      }
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const resp = await listAiImageGenRecords({ page: nextPage, limit: PAGE_SIZE });
        setPage(resp.page);
        setTotal(resp.total);
        if (!append) {
          const map = statusMapRef.current;
          for (const item of resp.items) {
            const prevStatus = map.get(item.record_id);
            if (prevStatus && isActiveStatus(prevStatus) && item.status === 'failed') {
              notifyError(
                t('creationCenter.historyStatusFailed'),
                formatGenRecordError(t, item, 'image'),
              );
            }
            map.set(item.record_id, item.status);
          }
          setItems(resp.items);
        } else {
          setItems((prev) => [...prev, ...resp.items]);
        }
      } catch (e) {
        setError(formatApiError(t, e));
        if (!append) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isLoggedIn, t],
  );

  const refresh = useCallback(() => {
    void loadPage(1, false);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    void loadPage(page + 1, true);
  }, [hasMore, loadPage, loading, loadingMore, page]);

  useEffect(() => {
    if (!enabled || !isLoggedIn) return;
    void loadPage(1, false);
  }, [enabled, isLoggedIn, loadPage]);

  useEffect(() => {
    if (!enabled || !isLoggedIn || !hasActive) return;
    const timer = setInterval(() => {
      void loadPage(1, false);
    }, 3000);
    return () => clearInterval(timer);
  }, [enabled, hasActive, isLoggedIn, loadPage]);

  return {
    t,
    isLoggedIn,
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    hasActive,
    refresh,
    loadMore,
  };
}

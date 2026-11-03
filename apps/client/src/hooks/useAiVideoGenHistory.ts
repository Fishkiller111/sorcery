/**
 * 生视频历史 Hook：分页加载 + 进行中任务自动轮询。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listAiVideoGenRecords } from '../api/aiVideoGen';
import { useI18n } from '../i18n/I18nContext';
import { useAuthStore } from '../stores/authStore';
import { formatApiError, formatGenRecordError } from '../utils/apiError';
import { notifyError } from '../utils/notify';
import type { AiVideoGenRecordItem } from '../types/api';

/** 每页条数 */
const PAGE_SIZE = 12;

/**
 * 判断任务是否仍在排队 / 生成中（需要继续轮询）。
 */
function isActiveStatus(status: string) {
  return status === 'pending' || status === 'processing' || status === 'queued';
}

/**
 * @param enabled 为 false 时不请求、不轮询（例如离开页面）
 */
export function useAiVideoGenHistory(enabled: boolean) {
  const { t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const [items, setItems] = useState<AiVideoGenRecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** record_id → last known status; used to toast only on active→failed */
  const statusMapRef = useRef<Map<string, string>>(new Map());

  const hasMore = items.length < total;
  // 列表里是否有未结束任务
  const hasActive = items.some((item) => isActiveStatus(item.status));

  /**
   * 拉取指定页；append=true 时追加到现有列表（加载更多）。
   */
  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      // 未登录清空列表，避免展示他人缓存
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
        const resp = await listAiVideoGenRecords({ page: nextPage, limit: PAGE_SIZE });
        setPage(resp.page);
        setTotal(resp.total);
        if (!append) {
          const map = statusMapRef.current;
          for (const item of resp.items) {
            const prevStatus = map.get(item.record_id);
            if (prevStatus && isActiveStatus(prevStatus) && item.status === 'failed') {
              notifyError(
                t('creationCenter.historyStatusFailed'),
                formatGenRecordError(t, item, 'video'),
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
        // 首屏失败才清空，加载更多失败保留已有数据
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

  /** 从第一页重新刷新（提交任务后 / 手动刷新） */
  const refresh = useCallback(() => {
    void loadPage(1, false);
  }, [loadPage]);

  /** 加载下一页 */
  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    void loadPage(page + 1, true);
  }, [hasMore, loadPage, loading, loadingMore, page]);

  // 启用且已登录时拉首屏
  useEffect(() => {
    if (!enabled || !isLoggedIn) return;
    void loadPage(1, false);
  }, [enabled, isLoggedIn, loadPage]);

  // 有进行中任务时约 5s 轮询（视频任务通常数分钟）
  useEffect(() => {
    if (!enabled || !isLoggedIn || !hasActive) return;
    const timer = setInterval(() => {
      void loadPage(1, false);
    }, 5000);
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
    /** 本地移除一条（删除 API 成功后调用，避免整表刷新闪烁） */
    removeItem: (recordId: string) => {
      setItems((prev) => prev.filter((item) => item.record_id !== recordId));
      setTotal((prev) => Math.max(0, prev - 1));
      statusMapRef.current.delete(recordId);
    },
  };
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { resolveStaticUrl } from '../../constants/config';
import {
  archiveRoleMedia,
  archiveRoleMediaBundle,
  confirmRoleMediaRating,
  createRoleMediaBundle,
  deleteRoleMedia,
  deleteRoleMediaBundle,
  listRoleMedia,
  listRoleMediaBundles,
  publishRoleMedia,
  publishRoleMediaBundle,
  updateRoleMedia,
  updateRoleMediaBundle,
  uploadRoleMedia,
} from '../../api/roles';
import type { RoleMediaBundleView, RoleMediaItem } from '../../types/api';
import { formatApiError } from '../../utils/apiError';
import { notifyError, notifySuccess } from '../../utils/notify';
import {
  PhotoPermissionDeniedError,
  pickRoleMediaMultiple,
  roleMediaFromFiles,
  type PickedRoleMedia,
} from '../../utils/pickRoleMedia';
import { promptPhotoLibraryAccessSettings } from '../../utils/promptPhotoLibraryAccessSettings';
import {
  assertUploadHasBytes,
  compressImageForUpload,
  EmptyImageError,
  ImageTooLargeError,
} from '../../utils/compressImageForUpload';
import { isMatureRated, isRRated } from '../../utils/mediaDisplay';
import { Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';

const PAGE_SIZE = 12;
const GRID_GAP = 10;
const UPLOAD_CONCURRENCY = 2;

type AgentMediaLibrarySectionProps = {
  roleId: string;
  disabled?: boolean;
  /** When false, skip auto-load (e.g. tab not visible yet). Default true. */
  active?: boolean;
};

type UploadJob = {
  localId: string;
  previewUri: string;
  filename: string;
  mediaType: 'image' | 'video';
  file: PickedRoleMedia['file'];
  status: 'queued' | 'uploading' | 'error';
  error?: string;
};

function statusLabel(status: string | undefined, t: (k: string) => string): string {
  switch (status) {
    case 'published':
      return t('agent.mediaStatusPublished');
    case 'archived':
      return t('agent.mediaStatusArchived');
    case 'draft':
    default:
      return t('agent.mediaStatusDraft');
  }
}

function newLocalId(): string {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AgentMediaLibrarySection({
  roleId,
  disabled,
  active = true,
}: AgentMediaLibrarySectionProps) {
  const { t, lang } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  // Prefer 4-up on manage screens; tighten to 2 on narrow phones.
  const cols = windowWidth >= 640 ? 4 : 2;
  const [gridWidth, setGridWidth] = useState(0);
  const cardWidth =
    gridWidth > 0
      ? Math.floor((gridWidth - GRID_GAP * (cols - 1)) / cols)
      : Math.floor((Math.min(windowWidth, 960) - 64 - GRID_GAP * (cols - 1)) / cols);

  const [items, setItems] = useState<RoleMediaItem[]>([]);
  const [bundles, setBundles] = useState<RoleMediaBundleView[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [paidDrafts, setPaidDrafts] = useState<Record<string, boolean>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const [creatingPack, setCreatingPack] = useState(false);
  const [packTitleDraft, setPackTitleDraft] = useState('');
  const [packPriceDraft, setPackPriceDraft] = useState('');
  const [bundlePriceDrafts, setBundlePriceDrafts] = useState<Record<string, string>>({});
  const [bundleBusyId, setBundleBusyId] = useState<string | null>(null);

  const queueRef = useRef<UploadJob[]>([]);
  const activeUploadsRef = useRef(0);
  const roleIdRef = useRef(roleId);
  const disabledRef = useRef(!!disabled);
  const handleDropFilesRef = useRef<(files: FileList | File[]) => void>(() => {});
  roleIdRef.current = roleId;
  disabledRef.current = !!disabled;

  const loadBundles = useCallback(async () => {
    if (!roleId) return;
    try {
      const res = await listRoleMediaBundles(roleId);
      const next = res.items ?? [];
      setBundles(next);
      setBundlePriceDrafts((prev) => {
        const prices = { ...prev };
        for (const b of next) {
          prices[b.bundle_id] = String(b.price_points);
        }
        return prices;
      });
    } catch (e) {
      notifyError(formatApiError(t, e));
    }
  }, [roleId, t]);

  const load = useCallback(
    async (nextPage: number) => {
      if (!roleId) return;
      setLoading(true);
      try {
        const res = await listRoleMedia(roleId, nextPage, PAGE_SIZE);
        const next = res.items ?? [];
        const pages = Math.max(1, res.pagination?.total_pages ?? 1);
        const safePage = Math.min(Math.max(1, nextPage), pages);
        if (next.length === 0 && safePage > 1) {
          setLoading(false);
          await load(safePage - 1);
          return;
        }
        setItems(next);
        setPage(res.pagination?.page ?? safePage);
        setTotalPages(pages);
        setTotal(res.pagination?.total ?? next.length);
        setTitleDrafts((prev) => {
          const titles = { ...prev };
          for (const item of next) {
            if (titles[item.media_id] === undefined) {
              titles[item.media_id] = item.title?.trim() || '';
            }
          }
          return titles;
        });
        setPaidDrafts((prev) => {
          const paid = { ...prev };
          for (const item of next) {
            paid[item.media_id] = item.visibility === 'paid';
          }
          return paid;
        });
        setPriceDrafts((prev) => {
          const prices = { ...prev };
          for (const item of next) {
            prices[item.media_id] =
              item.price_points > 0 ? String(item.price_points) : prev[item.media_id] ?? '';
          }
          return prices;
        });
        setSelected((prev) => {
          const ids = new Set(next.map((m) => m.media_id));
          const keep = new Set<string>();
          for (const id of prev) {
            if (ids.has(id)) keep.add(id);
          }
          return keep;
        });
        await loadBundles();
      } catch (e) {
        notifyError(formatApiError(t, e));
      } finally {
        setLoading(false);
      }
    },
    [roleId, t, loadBundles],
  );

  useEffect(() => {
    if (!active) return;
    setPage(1);
    void load(1);
  }, [active, load]);

  const patchItem = (item: RoleMediaItem) => {
    setItems((prev) => prev.map((m) => (m.media_id === item.media_id ? item : m)));
    if (item.title != null) {
      setTitleDrafts((prev) => ({ ...prev, [item.media_id]: item.title?.trim() || '' }));
    }
    setPaidDrafts((prev) => ({ ...prev, [item.media_id]: item.visibility === 'paid' }));
    setPriceDrafts((prev) => ({
      ...prev,
      [item.media_id]: item.price_points > 0 ? String(item.price_points) : '',
    }));
  };

  const setBusy = (mediaId: string, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(mediaId);
      else next.delete(mediaId);
      return next;
    });
  };

  const pumpUploads = useCallback(async () => {
    while (activeUploadsRef.current < UPLOAD_CONCURRENCY) {
      const job = queueRef.current.find((j) => j.status === 'queued');
      if (!job) break;
      job.status = 'uploading';
      activeUploadsRef.current += 1;
      setUploadJobs([...queueRef.current]);

      void (async () => {
        try {
          let file = job.file;
          let filename = job.filename;
          if (job.mediaType === 'image') {
            const compressed = await compressImageForUpload({
              previewUri: job.previewUri,
              file: job.file,
              filename: job.filename,
            });
            file = compressed.file;
            filename = compressed.filename;
          } else {
            await assertUploadHasBytes(job.file);
          }
          await uploadRoleMedia(roleIdRef.current, file, filename);
          queueRef.current = queueRef.current.filter((j) => j.localId !== job.localId);
          setUploadJobs([...queueRef.current]);
          // Refresh list without blocking other uploads.
          void load(1);
        } catch (e) {
          let message = formatApiError(t, e);
          if (e instanceof EmptyImageError) message = t('agent.mediaUploadEmpty');
          else if (e instanceof ImageTooLargeError) message = t('errors.socialInvalidMedia');
          job.status = 'error';
          job.error = message;
          setUploadJobs([...queueRef.current]);
        } finally {
          activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
          void pumpUploads();
        }
      })();
    }
  }, [load, t]);

  const enqueueUploads = useCallback(
    (picked: PickedRoleMedia[]) => {
      if (!picked.length || disabled) return;
      const jobs: UploadJob[] = picked.map((p) => ({
        localId: newLocalId(),
        previewUri: p.previewUri,
        filename: p.filename,
        mediaType: p.mediaType,
        file: p.file,
        status: 'queued' as const,
      }));
      queueRef.current = [...jobs, ...queueRef.current];
      setUploadJobs([...queueRef.current]);
      notifySuccess(
        t('agent.mediaUploadQueued').replace('{count}', String(jobs.length)),
      );
      void pumpUploads();
    },
    [disabled, pumpUploads, t],
  );

  const handlePickUpload = async () => {
    if (disabled) return;
    try {
      const picked = await pickRoleMediaMultiple();
      enqueueUploads(picked);
    } catch (e) {
      if (e instanceof PhotoPermissionDeniedError) {
        promptPhotoLibraryAccessSettings(t);
      } else {
        notifyError(formatApiError(t, e));
      }
    }
  };

  const handleDropFiles = useCallback(
    (files: FileList | File[]) => {
      const picked = roleMediaFromFiles(files);
      if (picked.length === 0) {
        notifyError(t('errors.socialInvalidMedia'));
        return;
      }
      enqueueUploads(picked);
    },
    [enqueueUploads, t],
  );
  handleDropFilesRef.current = handleDropFiles;

  // RN Web Pressable often drops drag events; bind native DOM listeners instead.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.getElementById('agent-media-drop-zone');
    if (!el) return;

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabledRef.current) setDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabledRef.current) setDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const related = e.relatedTarget as Node | null;
      if (related && el.contains(related)) return;
      setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (disabledRef.current) return;
      const files = e.dataTransfer?.files;
      if (files?.length) handleDropFilesRef.current(files);
    };

    el.addEventListener('dragenter', onDragEnter);
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragenter', onDragEnter);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  const runAction = async (mediaId: string, action: () => Promise<void>) => {
    if (disabled || busyIds.has(mediaId) || batchBusy) return;
    setBusy(mediaId, true);
    try {
      await action();
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBusy(mediaId, false);
    }
  };

  const handleSaveTitle = (item: RoleMediaItem) =>
    runAction(item.media_id, async () => {
      const title = (titleDrafts[item.media_id] ?? '').trim();
      if (!title) {
        notifyError(t('agent.mediaTitleRequired'));
        return;
      }
      const updated = await updateRoleMedia(roleId, item.media_id, { title });
      patchItem(updated);
      notifySuccess(t('agent.mediaSaved'));
    });

  const handleSavePaid = (item: RoleMediaItem) =>
    runAction(item.media_id, async () => {
      if (item.status === 'published') {
        notifyError(t('agent.mediaPaidLockHint'));
        return;
      }
      const paid = !!paidDrafts[item.media_id];
      const price = Math.floor(Number(priceDrafts[item.media_id] ?? ''));
      if (paid && (!Number.isFinite(price) || price <= 0)) {
        notifyError(t('agent.mediaPriceRequired'));
        return;
      }
      const updated = await updateRoleMedia(roleId, item.media_id, {
        visibility: paid ? 'paid' : 'public',
        price_points: paid ? price : 0,
      });
      patchItem(updated);
      notifySuccess(t('agent.mediaPaidSaved'));
    });

  const handlePublish = (item: RoleMediaItem) =>
    runAction(item.media_id, async () => {
      const paid = !!paidDrafts[item.media_id];
      const price = Math.floor(Number(priceDrafts[item.media_id] ?? ''));
      if (paid && (!Number.isFinite(price) || price <= 0)) {
        notifyError(t('agent.mediaPriceRequired'));
        return;
      }
      const needsSync =
        (paid && (item.visibility !== 'paid' || item.price_points !== price)) ||
        (!paid && item.visibility === 'paid');
      if (needsSync) {
        await updateRoleMedia(roleId, item.media_id, {
          visibility: paid ? 'paid' : 'public',
          price_points: paid ? price : 0,
        });
      }
      const updated = await publishRoleMedia(roleId, item.media_id);
      patchItem(updated);
      notifySuccess(t('agent.mediaPublished'));
    });

  const handleArchive = (item: RoleMediaItem) =>
    runAction(item.media_id, async () => {
      const updated = await archiveRoleMedia(roleId, item.media_id);
      patchItem(updated);
      notifySuccess(t('agent.mediaArchived'));
    });

  const handleDelete = (item: RoleMediaItem) =>
    runAction(item.media_id, async () => {
      await deleteRoleMedia(roleId, item.media_id);
      notifySuccess(t('agent.mediaDeleted'));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(item.media_id);
        return next;
      });
      await load(page);
    });

  const handleConfirmRating = (item: RoleMediaItem, accept: boolean) =>
    runAction(item.media_id, async () => {
      const updated = await confirmRoleMediaRating(roleId, item.media_id, { accept });
      patchItem(updated);
      notifySuccess(t('agent.mediaRatingConfirmed'));
    });

  const handleSetContentRating = (
    item: RoleMediaItem,
    contentRating: 'mature' | 'r' | 'standard',
  ) =>
    runAction(item.media_id, async () => {
      const updated = await updateRoleMedia(roleId, item.media_id, {
        content_rating: contentRating,
      });
      patchItem(updated);
      notifySuccess(
        contentRating === 'mature'
          ? t('agent.mediaMarkedMature')
          : contentRating === 'r'
            ? t('agent.mediaMarkedR')
            : t('agent.mediaMarkedStandard'),
      );
    });

  const toggleSelect = (mediaId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelected(new Set(items.map((m) => m.media_id)));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedItems = useMemo(
    () => items.filter((m) => selected.has(m.media_id)),
    [items, selected],
  );

  const packEligibleSelected = useMemo(
    () =>
      selectedItems.filter(
        (m) => m.visibility === 'paid' && m.price_points > 0 && !m.bundle_id,
      ),
    [selectedItems],
  );

  const handleStartCreatePack = () => {
    if (packEligibleSelected.length < 2) {
      notifyError(t('agent.mediaPackNeedPaid'));
      return;
    }
    setCreatingPack(true);
    setPackTitleDraft('');
    setPackPriceDraft('');
  };

  const handleConfirmCreatePack = async () => {
    if (disabled || batchBusy) return;
    if (packEligibleSelected.length < 2) {
      notifyError(t('agent.mediaPackNeedPaid'));
      return;
    }
    const price = Math.floor(Number(packPriceDraft));
    if (!Number.isFinite(price) || price <= 0) {
      notifyError(t('agent.mediaPriceRequired'));
      return;
    }
    setBatchBusy(true);
    try {
      await createRoleMediaBundle(roleId, {
        title: packTitleDraft.trim() || undefined,
        price_points: price,
        media_ids: packEligibleSelected.map((m) => m.media_id),
      });
      notifySuccess(t('agent.mediaPackCreated'));
      setCreatingPack(false);
      clearSelection();
      await load(page);
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBatchBusy(false);
    }
  };

  const runBundleAction = async (bundleId: string, action: () => Promise<void>) => {
    if (disabled || bundleBusyId) return;
    setBundleBusyId(bundleId);
    try {
      await action();
      await loadBundles();
      await load(page);
    } catch (e) {
      notifyError(formatApiError(t, e));
    } finally {
      setBundleBusyId(null);
    }
  };

  const runBatch = async (action: (item: RoleMediaItem) => Promise<void>) => {
    if (disabled || batchBusy || selectedItems.length === 0) return;
    setBatchBusy(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const item of selectedItems) {
        try {
          await action(item);
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      if (ok > 0) {
        notifySuccess(
          t('agent.mediaBatchDone')
            .replace('{ok}', String(ok))
            .replace('{fail}', String(fail)),
        );
      } else if (fail > 0) {
        notifyError(t('agent.mediaBatchFailed'));
      }
      clearSelection();
      await load(page);
    } finally {
      setBatchBusy(false);
    }
  };

  const uploadingCount = uploadJobs.filter((j) => j.status !== 'error').length;
  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;

  return (
    <View style={styles.wrap}>
      <Text style={Typo(styles.hint, 'sans', lang)}>{t('agent.mediaHint')}</Text>

      <Pressable
        nativeID="agent-media-drop-zone"
        style={({ pressed }) => [
          styles.uploadZone,
          dragging && styles.uploadZoneDragging,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
        onPress={() => void handlePickUpload()}
        disabled={disabled}
        accessibilityRole="button"
      >
        <Ionicons
          name="cloud-upload-outline"
          size={22}
          color={dragging ? TOKENS.colors.accent : TOKENS.colors.text}
        />
        <Text style={Typo(styles.uploadTitle, 'sans', lang)}>
          {dragging ? t('agent.mediaDropNow') : t('agent.mediaUploadBatch')}
        </Text>
        <Text style={Typo(styles.uploadSub, 'sans', lang)}>{t('agent.mediaDropHint')}</Text>
        {uploadingCount > 0 ? (
          <View style={styles.uploadProgressRow}>
            <ActivityIndicator size="small" color={TOKENS.colors.accent} />
            <Text style={Typo(styles.uploadProgressText, 'sans', lang)}>
              {t('agent.mediaUploadingCount').replace('{count}', String(uploadingCount))}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {selected.size > 0 ? (
        <View style={styles.batchBar}>
          <Text style={Typo(styles.batchCount, 'sans', lang)}>
            {t('agent.mediaSelectedCount').replace('{count}', String(selected.size))}
          </Text>
          <View style={styles.batchActions}>
            <Pressable
              style={[styles.batchBtn, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={() =>
                void runBatch(async (item) => {
                  if (item.status === 'published') return;
                  await publishRoleMedia(roleId, item.media_id);
                })
              }
            >
              <Text style={styles.batchBtnText}>{t('agent.mediaBatchPublish')}</Text>
            </Pressable>
            <Pressable
              style={[styles.batchBtn, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={() =>
                void runBatch(async (item) => {
                  if (item.status !== 'published') return;
                  await archiveRoleMedia(roleId, item.media_id);
                })
              }
            >
              <Text style={styles.batchBtnText}>{t('agent.mediaBatchArchive')}</Text>
            </Pressable>
            <Pressable
              style={[styles.batchBtn, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={() =>
                void runBatch(async (item) => {
                  if (isRRated(item)) return;
                  await updateRoleMedia(roleId, item.media_id, { content_rating: 'r' });
                })
              }
            >
              <Text style={styles.batchBtnText}>{t('agent.mediaBatchR')}</Text>
            </Pressable>
            <Pressable
              style={[styles.batchBtn, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={() =>
                void runBatch(async (item) => {
                  if (isMatureRated(item)) return;
                  await updateRoleMedia(roleId, item.media_id, { content_rating: 'mature' });
                })
              }
            >
              <Text style={styles.batchBtnText}>{t('agent.mediaBatchMature')}</Text>
            </Pressable>
            <Pressable
              style={[styles.batchBtn, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={handleStartCreatePack}
            >
              <Text style={styles.batchBtnText}>{t('agent.mediaCreatePack')}</Text>
            </Pressable>
            <Pressable
              style={[styles.batchBtnDanger, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={() =>
                void runBatch(async (item) => {
                  if (item.status === 'published') return;
                  await deleteRoleMedia(roleId, item.media_id);
                })
              }
            >
              <Text style={styles.batchBtnDangerText}>{t('agent.mediaBatchDelete')}</Text>
            </Pressable>
            <Pressable style={styles.batchBtnGhost} onPress={clearSelection} disabled={batchBusy}>
              <Text style={styles.batchBtnGhostText}>{t('agent.mediaClearSelection')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {creatingPack ? (
        <View style={styles.batchBar}>
          <Text style={Typo(styles.batchCount, 'sans', lang)}>
            {t('agent.mediaCreatePack')} · {packEligibleSelected.length}
          </Text>
          <TextInput
            style={styles.titleInput}
            value={packTitleDraft}
            onChangeText={setPackTitleDraft}
            placeholder={t('agent.mediaPackTitlePlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
            editable={!disabled && !batchBusy}
          />
          <TextInput
            style={styles.titleInput}
            value={packPriceDraft}
            onChangeText={(v) => setPackPriceDraft(v.replace(/[^\d]/g, ''))}
            placeholder={t('agent.mediaPackPricePlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
            keyboardType="number-pad"
            editable={!disabled && !batchBusy}
          />
          <View style={styles.batchActions}>
            <Pressable
              style={[styles.batchBtn, batchBusy && styles.disabled]}
              disabled={batchBusy || disabled}
              onPress={() => void handleConfirmCreatePack()}
            >
              <Text style={styles.batchBtnText}>{t('agent.mediaPackConfirmCreate')}</Text>
            </Pressable>
            <Pressable
              style={styles.batchBtnGhost}
              disabled={batchBusy}
              onPress={() => setCreatingPack(false)}
            >
              <Text style={styles.batchBtnGhostText}>{t('agent.mediaPackCancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {bundles.length > 0 ? (
        <View style={styles.bundleSection}>
          <Text style={Typo(styles.listCount, 'sans', lang)}>{t('agent.mediaPackSection')}</Text>
          {bundles.map((b) => {
            const busy = bundleBusyId === b.bundle_id;
            const published = b.status === 'published';
            return (
              <View key={b.bundle_id} style={styles.bundleCard}>
                <Text style={Typo(styles.bundleTitle, 'sans', lang)} numberOfLines={1}>
                  {(b.title || t('agent.mediaPackSection')).trim()} ·{' '}
                  {t('agent.mediaPackItems').replace('{count}', String(b.media_count))}
                </Text>
                <Text style={Typo(styles.statusBadge, 'sans', lang)}>
                  {statusLabel(b.status, t)} · {b.price_points} PTS
                </Text>
                {published ? (
                  <Text style={Typo(styles.paidLockHint, 'sans', lang)}>
                    {t('agent.mediaPackLockHint')}
                  </Text>
                ) : (
                  <View style={styles.priceRow}>
                    <TextInput
                      style={styles.priceInput}
                      value={bundlePriceDrafts[b.bundle_id] ?? String(b.price_points)}
                      onChangeText={(v) =>
                        setBundlePriceDrafts((prev) => ({
                          ...prev,
                          [b.bundle_id]: v.replace(/[^\d]/g, ''),
                        }))
                      }
                      keyboardType="number-pad"
                      editable={!disabled && !busy}
                    />
                    <Pressable
                      style={styles.miniBtnGhost}
                      disabled={disabled || busy}
                      onPress={() =>
                        void runBundleAction(b.bundle_id, async () => {
                          const price = Math.floor(
                            Number(bundlePriceDrafts[b.bundle_id] ?? b.price_points),
                          );
                          if (!Number.isFinite(price) || price <= 0) {
                            notifyError(t('agent.mediaPriceRequired'));
                            return;
                          }
                          await updateRoleMediaBundle(roleId, b.bundle_id, {
                            price_points: price,
                          });
                          notifySuccess(t('agent.mediaPaidSaved'));
                        })
                      }
                    >
                      <Text style={styles.miniBtnGhostText}>{t('agent.mediaPackSavePrice')}</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.actionCol}>
                  {busy ? <ActivityIndicator size="small" color={TOKENS.colors.accent} /> : null}
                  {b.status === 'draft' || b.status === 'archived' ? (
                    <Pressable
                      style={styles.miniBtn}
                      disabled={disabled || busy}
                      onPress={() =>
                        void runBundleAction(b.bundle_id, async () => {
                          await publishRoleMediaBundle(roleId, b.bundle_id);
                          notifySuccess(t('agent.mediaPackPublished'));
                        })
                      }
                    >
                      <Text style={styles.miniBtnText}>{t('agent.mediaPackPublish')}</Text>
                    </Pressable>
                  ) : null}
                  {published ? (
                    <Pressable
                      style={styles.miniBtnGhost}
                      disabled={disabled || busy}
                      onPress={() =>
                        void runBundleAction(b.bundle_id, async () => {
                          await archiveRoleMediaBundle(roleId, b.bundle_id);
                          notifySuccess(t('agent.mediaPackArchived'));
                        })
                      }
                    >
                      <Text style={styles.miniBtnGhostText}>{t('agent.mediaPackArchive')}</Text>
                    </Pressable>
                  ) : null}
                  {!published ? (
                    <Pressable
                      style={styles.miniBtnDanger}
                      disabled={disabled || busy}
                      onPress={() =>
                        void runBundleAction(b.bundle_id, async () => {
                          await deleteRoleMediaBundle(roleId, b.bundle_id);
                          notifySuccess(t('agent.mediaPackDeleted'));
                        })
                      }
                    >
                      <Text style={styles.miniBtnDangerText}>{t('agent.mediaPackDelete')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {loading && items.length === 0 && uploadJobs.length === 0 ? (
        <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
      ) : items.length === 0 && uploadJobs.length === 0 ? (
        <Text style={Typo(styles.empty, 'sans', lang)}>{t('agent.mediaEmpty')}</Text>
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={Typo(styles.listCount, 'sans', lang)}>
              {t('agent.mediaListCount').replace('{count}', String(total))}
            </Text>
            <View style={styles.listHeaderRight}>
              {items.length > 0 ? (
                <Pressable onPress={selectAllOnPage} hitSlop={8}>
                  <Text style={Typo(styles.selectAll, 'sans', lang)}>
                    {t('agent.mediaSelectAll')}
                  </Text>
                </Pressable>
              ) : null}
              {loading ? <ActivityIndicator size="small" color={TOKENS.colors.accent} /> : null}
            </View>
          </View>

          <View
            style={styles.grid}
            onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          >
            {uploadJobs.map((job) => (
              <View key={job.localId} style={[styles.card, { width: cardWidth }]}>
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: job.previewUri }} style={styles.thumb} contentFit="cover" />
                  <View style={styles.uploadOverlay}>
                    {job.status === 'error' ? (
                      <Ionicons name="alert-circle" size={22} color={TOKENS.colors.accent} />
                    ) : (
                      <ActivityIndicator color="#fff" />
                    )}
                  </View>
                </View>
                <Text style={Typo(styles.cardTitle, 'sans', lang)} numberOfLines={2}>
                  {job.status === 'error'
                    ? job.error || t('agent.mediaUploadFailed')
                    : job.status === 'uploading'
                      ? t('agent.mediaUploading')
                      : t('agent.mediaQueued')}
                </Text>
                {job.status === 'error' ? (
                  <Pressable
                    style={styles.miniBtnGhost}
                    onPress={() => {
                      queueRef.current = queueRef.current.filter((j) => j.localId !== job.localId);
                      setUploadJobs([...queueRef.current]);
                    }}
                  >
                    <Text style={styles.miniBtnGhostText}>{t('agent.mediaDismissUpload')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {items.map((item) => {
              const thumb = resolveStaticUrl(item.cover_url || item.file_url);
              const busy = busyIds.has(item.media_id) || batchBusy;
              const status = item.status || 'draft';
              const isSelected = selected.has(item.media_id);
              return (
                <View
                  key={item.media_id}
                  style={[styles.card, isSelected && styles.cardSelected, { width: cardWidth }]}
                >
                  <Pressable
                    style={styles.thumbWrap}
                    onPress={() => toggleSelect(item.media_id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <Ionicons
                          name={item.media_type === 'video' ? 'videocam-outline' : 'image-outline'}
                          size={22}
                          color={TOKENS.colors.textMuted}
                        />
                      </View>
                    )}
                    {item.media_type === 'video' ? (
                      <View style={styles.videoBadge} pointerEvents="none">
                        <Ionicons name="play" size={12} color="#fff" />
                      </View>
                    ) : null}
                    <View
                      style={[styles.checkBadge, isSelected && styles.checkBadgeOn]}
                      pointerEvents="none"
                    >
                      {isSelected ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : null}
                    </View>
                  </Pressable>

                  <View style={styles.metaRow}>
                    <Text style={Typo(styles.statusBadge, 'sans', lang)} numberOfLines={1}>
                      {statusLabel(status, t)}
                    </Text>
                    <Text
                      style={Typo(
                        isMatureRated(item)
                          ? styles.matureBadge
                          : isRRated(item)
                            ? styles.rBadge
                            : styles.standardBadge,
                        'sans',
                        lang,
                      )}
                      numberOfLines={1}
                    >
                      {isMatureRated(item)
                        ? t('agent.mediaRatingMature')
                        : isRRated(item)
                          ? t('agent.mediaRatingR')
                          : t('agent.mediaRatingStandard')}
                    </Text>
                    <Text
                      style={Typo(
                        item.visibility === 'paid' ? styles.paidBadge : styles.standardBadge,
                        'sans',
                        lang,
                      )}
                      numberOfLines={1}
                    >
                      {item.bundle_id
                        ? t('agent.mediaPackInBundle')
                        : item.visibility === 'paid'
                          ? `${t('agent.mediaPaid')}${item.price_points > 0 ? ` · ${item.price_points}` : ''}`
                          : t('agent.mediaFree')}
                    </Text>
                  </View>

                  <TextInput
                    style={styles.titleInput}
                    value={titleDrafts[item.media_id] ?? ''}
                    onChangeText={(v) =>
                      setTitleDrafts((prev) => ({ ...prev, [item.media_id]: v }))
                    }
                    placeholder={t('agent.mediaTitlePlaceholder')}
                    placeholderTextColor={TOKENS.colors.textMuted}
                    editable={!disabled && !busy}
                  />

                  {!item.bundle_id ? (
                  <View style={styles.paidBlock}>
                    <Pressable
                      style={[
                        styles.paidToggleRow,
                        (status === 'published' || busy || disabled) && styles.disabled,
                      ]}
                      disabled={status === 'published' || busy || disabled}
                      onPress={() =>
                        setPaidDrafts((prev) => ({
                          ...prev,
                          [item.media_id]: !prev[item.media_id],
                        }))
                      }
                      accessibilityRole="switch"
                      accessibilityState={{
                        checked: !!paidDrafts[item.media_id],
                        disabled: status === 'published',
                      }}
                    >
                      <View
                        style={[
                          styles.paidSwitch,
                          paidDrafts[item.media_id] && styles.paidSwitchOn,
                        ]}
                      >
                        <View style={styles.paidSwitchKnob} />
                      </View>
                      <Text style={Typo(styles.paidToggleLabel, 'sans', lang)}>
                        {t('agent.mediaPaidUnlock')}
                      </Text>
                    </Pressable>
                    {paidDrafts[item.media_id] ? (
                      <View style={styles.priceRow}>
                        <Text style={Typo(styles.priceLabel, 'sans', lang)}>
                          {t('agent.mediaPricePoints')}
                        </Text>
                        <TextInput
                          style={[
                            styles.priceInput,
                            status === 'published' && styles.inputDisabled,
                          ]}
                          value={priceDrafts[item.media_id] ?? ''}
                          onChangeText={(v) =>
                            setPriceDrafts((prev) => ({
                              ...prev,
                              [item.media_id]: v.replace(/[^\d]/g, ''),
                            }))
                          }
                          placeholder={t('agent.mediaPricePlaceholder')}
                          placeholderTextColor={TOKENS.colors.textMuted}
                          keyboardType="number-pad"
                          editable={status !== 'published' && !disabled && !busy}
                        />
                      </View>
                    ) : null}
                    {status === 'published' ? (
                      <Text style={Typo(styles.paidLockHint, 'sans', lang)}>
                        {t('agent.mediaPaidLockHint')}
                      </Text>
                    ) : (
                      <Pressable
                        style={styles.miniBtnGhost}
                        disabled={busy || disabled}
                        onPress={() => void handleSavePaid(item)}
                      >
                        <Text style={styles.miniBtnGhostText}>{t('agent.mediaSavePaid')}</Text>
                      </Pressable>
                    )}
                  </View>
                  ) : (
                    <Text style={Typo(styles.paidLockHint, 'sans', lang)}>
                      {t('agent.mediaPackInBundle')}
                    </Text>
                  )}

                  {item.rating_pending ? (
                    <View style={styles.actionCol}>
                      <Pressable
                        style={styles.miniBtn}
                        disabled={busy || disabled}
                        onPress={() => void handleConfirmRating(item, true)}
                      >
                        <Text style={styles.miniBtnText}>{t('agent.mediaAcceptRating')}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.miniBtnGhost}
                        disabled={busy || disabled}
                        onPress={() => void handleConfirmRating(item, false)}
                      >
                        <Text style={styles.miniBtnGhostText}>{t('agent.mediaRejectRating')}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.actionCol}>
                      {isMatureRated(item) || isRRated(item) ? (
                        <Pressable
                          style={styles.miniBtnGhost}
                          disabled={busy || disabled}
                          onPress={() => void handleSetContentRating(item, 'standard')}
                        >
                          <Text style={styles.miniBtnGhostText}>
                            {t('agent.mediaMarkStandard')}
                          </Text>
                        </Pressable>
                      ) : null}
                      {!isRRated(item) ? (
                        <Pressable
                          style={styles.miniBtn}
                          disabled={busy || disabled}
                          onPress={() => void handleSetContentRating(item, 'r')}
                        >
                          <Text style={styles.miniBtnText}>{t('agent.mediaMarkR')}</Text>
                        </Pressable>
                      ) : null}
                      {!isMatureRated(item) ? (
                        <Pressable
                          style={styles.miniBtn}
                          disabled={busy || disabled}
                          onPress={() => void handleSetContentRating(item, 'mature')}
                        >
                          <Text style={styles.miniBtnText}>{t('agent.mediaMarkMature')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}

                  <View style={styles.actionCol}>
                    {busy ? <ActivityIndicator size="small" color={TOKENS.colors.accent} /> : null}
                    <Pressable
                      style={styles.miniBtnGhost}
                      disabled={busy || disabled}
                      onPress={() => void handleSaveTitle(item)}
                    >
                      <Text style={styles.miniBtnGhostText}>{t('agent.mediaSaveTitle')}</Text>
                    </Pressable>
                    {status === 'draft' || status === 'archived' ? (
                      <Pressable
                        style={styles.miniBtn}
                        disabled={busy || disabled}
                        onPress={() => void handlePublish(item)}
                      >
                        <Text style={styles.miniBtnText}>{t('agent.mediaPublish')}</Text>
                      </Pressable>
                    ) : null}
                    {status === 'published' ? (
                      <Pressable
                        style={styles.miniBtnGhost}
                        disabled={busy || disabled}
                        onPress={() => void handleArchive(item)}
                      >
                        <Text style={styles.miniBtnGhostText}>{t('agent.mediaArchive')}</Text>
                      </Pressable>
                    ) : null}
                    {status !== 'published' ? (
                      <Pressable
                        style={styles.miniBtnDanger}
                        disabled={busy || disabled}
                        onPress={() => void handleDelete(item)}
                      >
                        <Text style={styles.miniBtnDangerText}>{t('agent.mediaDelete')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          {totalPages > 1 ? (
            <View style={styles.pager}>
              <Pressable
                style={[styles.pagerBtn, !canPrev && styles.disabled]}
                disabled={!canPrev}
                onPress={() => void load(page - 1)}
                accessibilityRole="button"
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={canPrev ? TOKENS.colors.text : TOKENS.colors.textMuted}
                />
                <Text
                  style={[
                    Typo(styles.pagerBtnText, 'sans', lang),
                    !canPrev && styles.pagerBtnTextDisabled,
                  ]}
                >
                  {t('agent.mediaPrevPage')}
                </Text>
              </Pressable>

              <Text style={Typo(styles.pagerMeta, 'sans', lang)}>
                {t('agent.mediaPageOf')
                  .replace('{page}', String(page))
                  .replace('{total}', String(totalPages))}
              </Text>

              <Pressable
                style={[styles.pagerBtn, !canNext && styles.disabled]}
                disabled={!canNext}
                onPress={() => void load(page + 1)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    Typo(styles.pagerBtnText, 'sans', lang),
                    !canNext && styles.pagerBtnTextDisabled,
                  ]}
                >
                  {t('agent.mediaNextPage')}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={canNext ? TOKENS.colors.text : TOKENS.colors.textMuted}
                />
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  hint: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  uploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 108,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  uploadZoneDragging: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
  },
  uploadTitle: {
    color: TOKENS.colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  uploadSub: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  uploadProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  uploadProgressText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  batchBar: {
    gap: 8,
    padding: 12,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.1)',
  },
  batchCount: {
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  batchActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  batchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: 'rgba(186, 60, 71, 0.22)',
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
  },
  batchBtnText: {
    color: TOKENS.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  batchBtnDanger: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.55)',
  },
  batchBtnDangerText: {
    color: TOKENS.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  batchBtnGhost: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  batchBtnGhostText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  loader: { marginTop: 16 },
  empty: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  listHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listCount: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  selectAll: {
    color: TOKENS.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    gap: 8,
    padding: 10,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    flexGrow: 0,
    flexShrink: 0,
  },
  cardSelected: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.bgElevated,
  },
  thumb: { width: '100%', height: '100%' },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  videoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeOn: {
    backgroundColor: TOKENS.colors.accent,
    borderColor: TOKENS.colors.accent,
  },
  cardTitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    color: TOKENS.colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  matureBadge: {
    color: '#f2a4ab',
    fontSize: 10,
    fontWeight: '700',
  },
  rBadge: {
    color: '#f0a0a0',
    fontSize: 10,
    fontWeight: '700',
  },
  standardBadge: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  paidBadge: {
    color: '#e8c27a',
    fontSize: 10,
    fontWeight: '700',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    backgroundColor: TOKENS.colors.inputBg,
    borderRadius: TOKENS.radius.input,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: TOKENS.colors.text,
    fontSize: 12,
  },
  paidBlock: {
    gap: 6,
  },
  paidToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidSwitch: {
    width: 34,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
  },
  paidSwitchOn: {
    backgroundColor: 'rgba(186, 60, 71, 0.85)',
    justifyContent: 'flex-end',
  },
  paidSwitchKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  paidToggleLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: TOKENS.colors.inputBorder,
    backgroundColor: TOKENS.colors.inputBg,
    borderRadius: TOKENS.radius.input,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: TOKENS.colors.text,
    fontSize: 12,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  paidLockHint: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  bundleSection: {
    gap: 8,
  },
  bundleCard: {
    gap: 8,
    padding: 10,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.08)',
  },
  bundleTitle: {
    color: TOKENS.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  actionCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  miniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: TOKENS.radius.pill,
    backgroundColor: 'rgba(186, 60, 71, 0.2)',
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
  },
  miniBtnText: {
    color: TOKENS.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  miniBtnGhost: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  miniBtnGhostText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  miniBtnDanger: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.45)',
  },
  miniBtnDangerText: {
    color: TOKENS.colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
    paddingVertical: 4,
  },
  pagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  pagerBtnText: {
    color: TOKENS.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  pagerBtnTextDisabled: {
    color: TOKENS.colors.textMuted,
  },
  pagerMeta: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.55 },
});

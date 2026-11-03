import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  FlatList,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typo } from '../../../theme/typography';
import type { RoleMediaItem } from '../../../types/api';
import {
  isMatureMediaLocked,
  isMatureRated,
  isRoleMediaSoftBlurred,
  isRoleMediaVideo,
  MATURE_LOCKED_REASON,
  needsMatureMediaRefresh,
  resolveRoleMediaFileUrl,
  resolveRoleMediaThumbUrl,
  softBlurRadius,
} from '../../../utils/mediaDisplay';
import {
  isSessionRevealed,
  markSessionRevealed,
  mediaRevealKey,
} from '../../../utils/mediaRevealSession';
import { AgentMediaVideoView } from './AgentMediaVideoView';

type AgentMediaPreviewModalProps = {
  visible: boolean;
  item: RoleMediaItem | null;
  /** Same-tab gallery for prev/next swipe & buttons. Falls back to `[item]`. */
  items?: RoleMediaItem[];
  onClose: () => void;
  closeLabel?: string;
  revealRLabel?: string;
  canSeeMature?: boolean;
};

type SlideProps = {
  item: RoleMediaItem;
  width: number;
  height: number;
  active: boolean;
  revealRLabel: string;
  canSeeMature: boolean;
};

function PreviewSlide({ item, width, height, active, revealRLabel, canSeeMature }: SlideProps) {
  const revealKey = mediaRevealKey('media', item.media_id);
  const [rRevealed, setRRevealed] = useState(() => isSessionRevealed(revealKey));

  useEffect(() => {
    setRRevealed(isSessionRevealed(revealKey));
  }, [revealKey, active]);

  const paidLocked = Boolean(item.locked) && item.locked_reason !== MATURE_LOCKED_REASON;
  const hardLocked = paidLocked || isMatureMediaLocked(item, canSeeMature);
  const softBlurred =
    !hardLocked && isRoleMediaSoftBlurred(item, { canSeeMature, revealed: rRevealed });
  const isVideo = isRoleMediaVideo(item);
  const useWebFilterBlur = Platform.OS === 'web';
  const fileUri =
    hardLocked || softBlurred || needsMatureMediaRefresh(item, canSeeMature)
      ? undefined
      : resolveRoleMediaFileUrl(item, { revealed: rRevealed, canSeeMature });
  const thumbUri = resolveRoleMediaThumbUrl(item, { revealed: rRevealed, canSeeMature });
  // 软遮罩无封面视频：用清晰视频源叠 blur（与列表卡片一致）
  const softBlurVideoUri =
    softBlurred && isVideo && !thumbUri && !needsMatureMediaRefresh(item, canSeeMature)
      ? resolveRoleMediaFileUrl(item, { revealed: true, canSeeMature })
      : undefined;
  const imageUri = hardLocked || softBlurred ? thumbUri : fileUri || thumbUri;
  const videoUri = !hardLocked && !softBlurred && isVideo && active ? fileUri : undefined;
  const softBlurPx = softBlurRadius(
    Boolean(item.blur_url || item.blur_cover_url),
    softBlurred,
  ) || (hardLocked && !item.blur_url && !item.blur_cover_url ? 28 : 0);
  const webSoftFilter =
    useWebFilterBlur && softBlurred && softBlurVideoUri
      ? ({ filter: `blur(12px)` } as object)
      : null;

  const reveal = () => {
    markSessionRevealed(revealKey);
    setRRevealed(true);
  };

  const softRevealOverlay = softBlurred ? (
    <View style={styles.rOverlay} pointerEvents="none">
      <View style={styles.rBadge}>
        <Text style={styles.rBadgeText}>
          {isMatureRated(item) || item.locked_reason === MATURE_LOCKED_REASON
            ? 'M'
            : 'R'}
        </Text>
      </View>
      <Text style={styles.rHint}>{revealRLabel}</Text>
    </View>
  ) : null;

  return (
    <View style={[styles.slide, { width, height }]}>
      {videoUri ? (
        <View style={styles.mediaInner}>
          <AgentMediaVideoView
            key={item.media_id}
            uri={videoUri}
            style={styles.media}
            contentFit="contain"
            autoPlay
            loop={false}
            muted={false}
            nativeControls
            interactive
          />
        </View>
      ) : softBlurVideoUri ? (
        <Pressable
          style={styles.mediaInner}
          onPress={reveal}
        >
          <AgentMediaVideoView
            key={`${item.media_id}-soft`}
            uri={softBlurVideoUri}
            style={[styles.media, webSoftFilter]}
            contentFit="contain"
            autoPlay={false}
            loop={false}
            muted
            nativeControls={false}
            interactive={false}
          />
          {!useWebFilterBlur ? <View style={styles.softBlurScrim} pointerEvents="none" /> : null}
          {softRevealOverlay}
        </Pressable>
      ) : imageUri ? (
        <Pressable
          style={styles.mediaInner}
          disabled={!softBlurred}
          onPress={softBlurred ? reveal : undefined}
        >
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.media,
              useWebFilterBlur && softBlurred && softBlurPx > 0
                ? ({ filter: `blur(${Math.max(softBlurPx, 12)}px)` } as object)
                : null,
            ]}
            contentFit="contain"
            cachePolicy="memory-disk"
            recyclingKey={item.media_id}
            transition={150}
            blurRadius={useWebFilterBlur ? 0 : softBlurPx}
          />
          {softRevealOverlay}
        </Pressable>
      ) : (
        <Text style={styles.empty}>—</Text>
      )}
    </View>
  );
}
export function AgentMediaPreviewModal({
  visible,
  item,
  items,
  onClose,
  closeLabel = 'Close',
  revealRLabel = 'Tap to view',
  canSeeMature = false,
}: AgentMediaPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<RoleMediaItem>>(null);
  const isWeb = Platform.OS === 'web';

  const gallery = useMemo(() => {
    if (items && items.length > 0) return items;
    return item ? [item] : [];
  }, [items, item]);

  const initialIndex = useMemo(() => {
    if (!item || gallery.length === 0) return 0;
    const idx = gallery.findIndex((m) => m.media_id === item.media_id);
    return idx >= 0 ? idx : 0;
  }, [gallery, item]);

  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    // Defer scroll until list mounts with the new index.
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [visible, initialIndex, item?.media_id]);

  const mediaHeight = height - insets.top - insets.bottom - 72;
  const canPrev = index > 0;
  const canNext = index < gallery.length - 1;
  // Wide layouts (desktop / landscape tablet): chrome arrows. Phones rely on swipe.
  const showChromeNav = gallery.length > 1 && width >= 720;

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= gallery.length) return;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [gallery.length],
  );

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (!visible || !isWeb || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, isWeb, goPrev, goNext, onClose]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / Math.max(width, 1));
      if (next >= 0 && next < gallery.length && next !== index) {
        setIndex(next);
      }
    },
    [gallery.length, index, width],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<RoleMediaItem> | null | undefined, i: number) => ({
      length: width,
      offset: width * i,
      index: i,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item: slide, index: slideIndex }: ListRenderItemInfo<RoleMediaItem>) => (
      <PreviewSlide
        item={slide}
        width={width}
        height={mediaHeight}
        active={slideIndex === index}
        revealRLabel={revealRLabel}
        canSeeMature={canSeeMature}
      />
    ),
    [width, mediaHeight, index, revealRLabel, canSeeMature],
  );

  const keyExtractor = useCallback((m: RoleMediaItem) => m.media_id, []);

  if (!item || !visible || gallery.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.topBar,
            { paddingTop: Math.max(insets.top, 12), paddingHorizontal: 12 },
          ]}
        >
          {gallery.length > 1 ? (
            <Text style={styles.counter} pointerEvents="none">
              {index + 1} / {gallery.length}
            </Text>
          ) : (
            <View />
          )}
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          >
            <Ionicons name="close" size={22} color="#fff" />
            <Text style={styles.closeText}>{closeLabel}</Text>
          </Pressable>
        </View>

        <View style={[styles.mediaWrap, { width, height: mediaHeight }]} pointerEvents="box-none">
          <FlatList
            ref={listRef}
            data={gallery}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={gallery.length > 1}
            onMomentumScrollEnd={onMomentumEnd}
            onScrollEndDrag={onMomentumEnd}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex}
            windowSize={3}
            maxToRenderPerBatch={3}
            removeClippedSubviews={Platform.OS !== 'web'}
            style={styles.list}
          />

          {showChromeNav ? (
            <>
              <Pressable
                onPress={goPrev}
                disabled={!canPrev}
                style={[
                  styles.navBtn,
                  styles.navBtnLeft,
                  !canPrev && styles.navBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Previous"
              >
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </Pressable>
              <Pressable
                onPress={goNext}
                disabled={!canNext}
                style={[
                  styles.navBtn,
                  styles.navBtnRight,
                  !canNext && styles.navBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Next"
              >
                <Ionicons name="chevron-forward" size={28} color="#fff" />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  topBar: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: Typo(
    { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '600' },
    'sans',
  ),
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  closeText: Typo({ color: '#fff', fontSize: 14, fontWeight: '600' }, 'sans'),
  mediaWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  empty: Typo({ color: 'rgba(255,255,255,0.5)', fontSize: 18 }, 'sans'),
  rOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(8, 10, 16, 0.28)',
  },
  softBlurScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 16, 0.55)',
  },
  rBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180, 60, 60, 0.92)',
    paddingHorizontal: 10,
  },
  rBadgeText: Typo({ color: '#fff', fontSize: 14, fontWeight: '800' }, 'sans'),
  rHint: Typo({ color: '#fff', fontSize: 13, fontWeight: '600' }, 'sans'),
  navBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    zIndex: 3,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  navBtnLeft: {
    left: 16,
  },
  navBtnRight: {
    right: 16,
  },
  navBtnDisabled: {
    opacity: 0.28,
  },
});

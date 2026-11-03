import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedGeneralConfirmModal } from '../../../components/ui/ThemedGeneralConfirmModal';
import { useSimulatorAccess } from '../../../hooks/useSimulatorAccess';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

type DefaultCreateEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  /** When set, only these entry kinds are shown (order preserved). */
  kinds?: Array<'agent' | 'world' | 'simulator' | 'image' | 'video' | 'voice'>;
  title?: string;
  subtitle?: string;
};

type CreateEntryOption = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;
const ROWS_PER_PAGE = 3;
const GRID_GAP = 10;

function resolveColumns(windowWidth: number): number {
  if (windowWidth >= 1100) return MAX_COLUMNS;
  if (windowWidth >= 820) return 3;
  return MIN_COLUMNS;
}

function CreateTile({
  icon,
  title,
  subtitle,
  width,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  width: number | `${number}%`;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { width },
        pressed && styles.tilePressed,
      ]}
    >
      <View style={styles.tileIconWrap}>
        <Ionicons name={icon} size={22} color={TOKENS.colors.accent} />
      </View>
      <Text style={styles.tileTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.tileSubtitle} numberOfLines={3}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

export function DefaultCreateEntryModal({
  visible,
  onClose,
  kinds,
  title,
  subtitle,
}: DefaultCreateEntryModalProps) {
  const router = useRouter();
  const { t, tp } = useI18n();
  const { canAccessSimulator } = useSimulatorAccess();
  const { width: windowWidth } = useWindowDimensions();
  const columns = resolveColumns(windowWidth);
  const pageSize = columns * ROWS_PER_PAGE;
  const [page, setPage] = useState(0);
  const [gridWidth, setGridWidth] = useState(0);

  const handleClose = () => {
    onClose();
  };

  const options = useMemo<CreateEntryOption[]>(() => {
    const catalog: CreateEntryOption[] = [
      {
        key: 'agent',
        icon: 'sparkles-outline',
        title: t('createEntry.createAgent'),
        subtitle: t('createEntry.createAgentHint'),
        onPress: () => {
          handleClose();
          router.push('/create-agent');
        },
      },
      {
        key: 'world',
        icon: 'planet-outline',
        title: t('createEntry.createWorld'),
        subtitle: t('createEntry.createWorldHint'),
        onPress: () => {
          handleClose();
          router.push('/create-world');
        },
      },
      {
        key: 'simulator',
        icon: 'flask-outline',
        title: t('createEntry.createSimulator'),
        subtitle: t('createEntry.createSimulatorHint'),
        onPress: () => {
          handleClose();
          router.push('/simulator/create');
        },
      },
      {
        key: 'image',
        icon: 'image-outline',
        title: t('createEntry.imageGeneration'),
        subtitle: t('createEntry.imageGenerationHint'),
        onPress: () => {
          handleClose();
          router.push('/creation-center/image');
        },
      },
      {
        key: 'video',
        icon: 'videocam-outline',
        title: t('createEntry.videoGeneration'),
        subtitle: t('createEntry.videoGenerationHint'),
        onPress: () => {
          handleClose();
          router.push('/creation-center/video');
        },
      },
      {
        key: 'voice',
        icon: 'mic-outline',
        title: t('createEntry.voiceDesign'),
        subtitle: t('createEntry.voiceDesignHint'),
        onPress: () => {
          handleClose();
          router.push('/creation-center/voice');
        },
      },
    ];

    const allowed = new Set(
      (kinds ?? catalog.map((o) => o.key)).filter((k) =>
        k === 'simulator' ? canAccessSimulator : true,
      ),
    );
    return catalog.filter((o) => allowed.has(o.key));
  }, [canAccessSimulator, kinds, router, t]);

  const pageCount = Math.max(1, Math.ceil(options.length / pageSize));

  useEffect(() => {
    if (!visible) return;
    setPage(0);
  }, [visible, options.length, columns, pageSize]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const pageItems = options.slice(page * pageSize, page * pageSize + pageSize);
  const tileWidth =
    gridWidth > 0
      ? (gridWidth - GRID_GAP * (columns - 1)) / columns
      : (`${100 / columns}%` as `${number}%`);

  const cardWidth = columns >= 4 ? 760 : columns >= 3 ? 640 : 560;

  const bodyContent = (
    <View style={styles.menuBody}>
      <Text style={styles.menuSubtitle}>{subtitle ?? t('createEntry.subtitle')}</Text>
      <View
        style={styles.grid}
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.width);
          if (next > 0 && next !== gridWidth) setGridWidth(next);
        }}
      >
        {pageItems.map((item) => (
          <CreateTile
            key={item.key}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            width={tileWidth}
            onPress={item.onPress}
          />
        ))}
      </View>
      {pageCount > 1 ? (
        <View style={styles.pager}>
          <Pressable
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0}
            hitSlop={10}
            style={({ pressed }) => [
              styles.pagerBtn,
              page <= 0 && styles.pagerBtnDisabled,
              pressed && page > 0 && styles.pagerBtnPressed,
            ]}
            accessibilityLabel={t('createEntry.prevPage')}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={page <= 0 ? TOKENS.colors.textMuted : TOKENS.colors.text}
            />
          </Pressable>
          <View style={styles.dots}>
            {Array.from({ length: pageCount }, (_, i) => (
              <Pressable
                key={`dot-${i}`}
                onPress={() => setPage(i)}
                hitSlop={8}
                style={[styles.dot, i === page && styles.dotActive]}
                accessibilityLabel={tp('createEntry.pageIndicator', {
                  current: i + 1,
                  total: pageCount,
                })}
              />
            ))}
          </View>
          <Pressable
            onPress={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            hitSlop={10}
            style={({ pressed }) => [
              styles.pagerBtn,
              page >= pageCount - 1 && styles.pagerBtnDisabled,
              pressed && page < pageCount - 1 && styles.pagerBtnPressed,
            ]}
            accessibilityLabel={t('createEntry.nextPage')}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={page >= pageCount - 1 ? TOKENS.colors.textMuted : TOKENS.colors.text}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="star"
      title={title ?? t('createEntry.title')}
      bodyContent={bodyContent}
      bodyMinHeight={280}
      bodyMaxHeight={640}
      cardWidth={cardWidth}
      hideCancel
      confirmBtnWidthRatio={0.42}
      confirmLabel={t('createEntry.close')}
      onCancel={handleClose}
      onConfirm={handleClose}
      dismissOnBackdrop={false}
    />
  );
}

const styles = StyleSheet.create({
  menuBody: {
    width: '100%',
    gap: 14,
  },
  menuSubtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 2,
    },
    'sans',
  ),
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    minHeight: 128,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8, 10, 15, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  tilePressed: {
    opacity: 0.92,
    borderColor: TOKENS.colors.accent,
    transform: [{ scale: 0.985 }],
  },
  tileIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      textAlign: 'center',
    },
    'serif',
  ),
  tileSubtitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
    'sans',
  ),
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },
  pagerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 10, 15, 0.45)',
  },
  pagerBtnDisabled: {
    opacity: 0.4,
  },
  pagerBtnPressed: {
    opacity: 0.85,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 240, 232, 0.22)',
  },
  dotActive: {
    width: 16,
    backgroundColor: TOKENS.colors.accent,
  },
});

import type { Lang } from '../../i18n/types';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo, FONT_FAMILY } from '../../theme/typography';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { resolveStaticUrl } from '../../constants/config';
import { getWorldview } from '../../api/worldviews';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';
import { DividerStar } from '../ui/DividerStar';
import { StoryWorldviewArticleCard } from './StoryWorldviewArticleCard';
import { StoryWorldviewSupplementModal } from './StoryWorldviewSupplementModal';
import type { WorldviewDetailResp, WorldviewSupplementItem } from '../../types/api';

const EMBLEM_BADGE = require('../../../assets/images/ui/agents/emblem_cccp_badge.png');
const SCENE_ROW_BG = require('../../../assets/images/ui/story/scene_row_bg.png');
const STATUS_BAR_BG = require('../../../assets/images/ui/story/status_bar_bg.png');
const CHAPTER_PANEL_BG = require('../../../assets/images/ui/story/chapter_panel_bg.png');

const PAPER_INK = '#2A2522';
const PAPER_INK_MUTED = '#554F4A';
const PAPER_LABEL = '#4A4238';
const PAPER_ACTION = '#8B2318';
const PAPER_BODY = '#3D3834';

const CONTENT_PAD = 28;
const STATUS_METRIC_HEIGHT = 62;
const CONCEPT_ICON_SIZE = 52;
const CONCEPT_CARD_HEIGHT = CONCEPT_ICON_SIZE + 24;
const CONCEPT_GRID_GAP = 10;
const CONCEPT_MAX_ROWS = 3;

/** Inter Bold + 保留 fontWeight，避免 Web 上中文回退字体不加粗 */
const EMPHASIS_SANS = {
  fontFamily: FONT_FAMILY.sansBold,
  fontWeight: '800' as const,
  ...(Platform.OS === 'web' ? ({ fontSynthesis: 'weight' } as object) : {}),
};

type TimelineEntry = {
  date: string;
  title: string;
  body: string;
};

interface StoryWorldviewEncyclopediaProps {
  worldviewId: string;
}

function parseTimeline(text: string): TimelineEntry[] {
  const blocks = text.split(/\n\n+/).filter((b) => b.trim());
  const entries: TimelineEntry[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const first = lines[0]?.trim() ?? '';
    const match = first.match(/^([+-]?\d{1,4})\s*[：:.]\s*(.+)$/);
    if (match) {
      entries.push({
        date: match[1],
        title: match[2].trim(),
        body: lines.slice(1).join('\n').trim(),
      });
    } else {
      const colonMatch = first.match(/^(.+?)\s*[：:]\s*(.+)$/);
      if (colonMatch && lines.length > 1) {
        entries.push({
          date: colonMatch[1].trim(),
          title: colonMatch[2].trim(),
          body: lines.slice(1).join('\n').trim(),
        });
      } else {
        entries.push({ date: '', title: first, body: lines.slice(1).join('\n').trim() });
      }
    }
  }

  return entries;
}

function BodyText({ text, style }: { text: string; style?: object }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) {
    return <Text style={[Typo(styles.bodyText, 'sans', lang), style]}>{text}</Text>;
  }
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={[Typo(styles.bodyText, 'sans', lang), index > 0 && styles.bodyParagraph, style]}>
          {paragraph.trim()}
        </Text>
      ))}
    </>
  );
}

function MetaSlip({ label, value }: { label: string; value: string }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={styles.metaSlipOuter}>
      <View style={styles.metaSlipInner}>
        <ExpoImage source={SCENE_ROW_BG} style={styles.bgFill} contentFit="fill" pointerEvents="none" />
        <View style={styles.metaCol}>
          <Text style={[styles.metaLabel, { color: PAPER_LABEL }]}>{label}</Text>
          <Text style={[styles.metaValue, { color: PAPER_ACTION }]}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

function MetaBar({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={styles.metaBarOuter}>
      <View style={styles.metaBarInner}>
        <ExpoImage source={STATUS_BAR_BG} style={styles.bgFill} contentFit="fill" pointerEvents="none" />
        <View style={styles.metaBarContent}>{children}</View>
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={styles.sectionHeader}>
      <DividerStar size={12} color={COLORS.soviet.embroideryLight} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SectionPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  return (
    <View style={styles.sectionPanelOuter}>
      <View style={styles.sectionPanelInner}>
        <ExpoImage source={CHAPTER_PANEL_BG} style={styles.bgFill} contentFit="fill" pointerEvents="none" />
        <View style={styles.sectionPanelHeader}>
          <SectionHeader title={title} />
        </View>
        <View style={styles.sectionPanelBody}>{children}</View>
      </View>
    </View>
  );
}

function OverviewSection({ detail }: { detail: WorldviewDetailResp }) {
  const coverUrl = detail.cover_image ? resolveStaticUrl(detail.cover_image) : null;
  const overviewText = detail.background?.trim() || detail.summary?.trim() || '';

  if (!overviewText && !coverUrl) return null;

  return (
    <StoryWorldviewArticleCard title={detail.name} imageUrl={coverUrl} body={overviewText} />
  );
}

function ChronologySection({ timeline }: { timeline: string }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const entries = useMemo(() => parseTimeline(timeline), [timeline]);
  if (entries.length === 0) return null;

  return (
    <View style={styles.timelineWrap}>
        {entries.map((entry, index) => (
          <View key={index} style={styles.timelineRow}>
            <View style={styles.timelineRail}>
              <View style={styles.timelineDot} />
              {index < entries.length - 1 ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineContent}>
              {entry.date ? <Text style={Typo(styles.timelineDate, 'mono', lang)}>{entry.date}</Text> : null}
              <Text style={Typo(styles.timelineTitle, 'display', lang)}>{entry.title}</Text>
              {entry.body ? <BodyText text={entry.body} style={styles.timelineBody} /> : null}
            </View>
          </View>
        ))}
    </View>
  );
}

function ConceptCard({ item, onPress }: { item: WorldviewSupplementItem; onPress: () => void }) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.conceptCard}>
      <ExpoImage source={SCENE_ROW_BG} style={styles.bgFill} contentFit="fill" pointerEvents="none" />
      {item.image ? (
        <View style={styles.conceptIcon}>
          <ExpoImage
            source={{ uri: resolveStaticUrl(item.image) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>
      ) : (
        <View style={[styles.conceptIcon, styles.conceptIconFallback]}>
          <Text style={Typo(styles.conceptIconStar, 'display', lang)}>★</Text>
        </View>
      )}
      <View style={styles.conceptTextCol}>
        <Text style={Typo(styles.conceptTitle, 'display', lang)} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        {item.summary ? (
          <Text style={Typo(styles.conceptSummary, 'sans', lang)} numberOfLines={2} ellipsizeMode="tail">
            {item.summary}
          </Text>
        ) : item.content ? (
          <Text style={Typo(styles.conceptSummary, 'sans', lang)} numberOfLines={2} ellipsizeMode="tail">
            {item.content}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function CoreSettingsSection({
  supplements,
  onItemPress,
}: {
  supplements: WorldviewSupplementItem[];
  onItemPress: (item: WorldviewSupplementItem) => void;
}) {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const { width } = useWindowDimensions();
  const numColumns = width >= 640 ? 2 : 1;
  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);
  const scrollWebStyle = scrollWebProps.style as object | undefined;
  const maxGridHeight = CONCEPT_CARD_HEIGHT * CONCEPT_MAX_ROWS + CONCEPT_GRID_GAP * (CONCEPT_MAX_ROWS - 1);

  if (supplements.length === 0) return null;

  return (
    <ScrollView
      {...scrollWebProps}
      style={[styles.conceptGridScroll, { maxHeight: maxGridHeight }, scrollWebStyle]}
      contentContainerStyle={[styles.conceptGrid, numColumns === 1 && styles.conceptGridSingle]}
      showsVerticalScrollIndicator
      nestedScrollEnabled
    >
      {supplements.map((item) => (
        <View key={item.id} style={[styles.conceptGridItem, numColumns === 2 && styles.conceptGridItemHalf]}>
          <ConceptCard item={item} onPress={() => onItemPress(item)} />
        </View>
      ))}
    </ScrollView>
  );
}

export function StoryWorldviewEncyclopedia({
 worldviewId }: StoryWorldviewEncyclopediaProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const { width: windowWidth } = useWindowDimensions();
  const [detail, setDetail] = useState<WorldviewDetailResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedSupplement, setSelectedSupplement] = useState<WorldviewSupplementItem | null>(null);

  const contentWidth = Math.min(720, Math.max(280, windowWidth - 40));
  const emblemSize = Math.round(Math.min(56, contentWidth * 0.12));
  const titleSize = Math.round(Math.min(26, contentWidth * 0.058));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    setDetail(null);

    getWorldview(worldviewId)
      .then((resp) => {
        if (!cancelled) setDetail(resp);
      })
      .catch((err) => {
        console.error('Failed to load worldview detail:', err);
        if (!cancelled) {
          notifyError(t('system.error'), formatApiError(t, err));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [worldviewId, lang, t]);

  const hasOverview = Boolean(
    detail?.summary?.trim() || detail?.background?.trim() || detail?.cover_image,
  );
  const hasTimeline = Boolean(detail?.timeline?.trim());
  const hasSupplements = (detail?.supplements.length ?? 0) > 0;
  const hasContent = hasOverview || hasTimeline || hasSupplements;

  return (
    <>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { maxWidth: contentWidth, alignSelf: 'center' }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <ExpoImage source={EMBLEM_BADGE} style={{ width: emblemSize, height: emblemSize }} contentFit="contain" />
        <View style={styles.titleRow}>
          <DividerStar size={14} color={COLORS.soviet.embroideryLight} />
          <Text style={[styles.pageTitle, { fontSize: titleSize, lineHeight: titleSize * 1.12 }]}>
            {t('storyWorldview.title')}
          </Text>
          <DividerStar size={14} color={COLORS.soviet.embroideryLight} />
        </View>
      </View>

      <MetaBar>
        <View style={styles.metaMetricsRow}>
          <MetaSlip label={t('storyWorldview.entryNumber')} value="002" />
          <MetaSlip label={t('storyWorldview.category')} value={t('storyWorldview.categoryValue')} />
        </View>
      </MetaBar>

      {loading ? (
        <ActivityIndicator color={COLORS.soviet.stainLight} style={styles.loader} />
      ) : loadFailed ? (
        <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('storyWorldview.loadFailed')}</Text>
      ) : !hasContent ? (
        <Text style={Typo(styles.emptyText, 'sans', lang)}>{t('freeChat.worldviewNoContent')}</Text>
      ) : (
        <View style={styles.sectionsStack}>
          {hasOverview && detail ? (
            <SectionPanel title={t('storyWorldview.worldOverview')}>
              <OverviewSection detail={detail} />
            </SectionPanel>
          ) : null}

          {hasTimeline && detail?.timeline ? (
            <SectionPanel title={t('storyWorldview.chronology')}>
              <ChronologySection timeline={detail.timeline} />
            </SectionPanel>
          ) : null}

          {hasSupplements && detail ? (
            <SectionPanel title={t('storyWorldview.coreSettings')}>
              <CoreSettingsSection
                supplements={detail.supplements}
                onItemPress={setSelectedSupplement}
              />
            </SectionPanel>
          ) : null}
        </View>
      )}
    </ScrollView>
    <StoryWorldviewSupplementModal
      item={selectedSupplement}
      onClose={() => setSelectedSupplement(null)}
    />
    </>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 14,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  pageTitle: Typo(
    {
      color: COLORS.soviet.parchment,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
      flexShrink: 1,
    },
    'display', lang
  ),
  metaBarOuter: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metaBarInner: {
    overflow: 'hidden',
    position: 'relative',
  },
  metaBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  metaSlipOuter: {
    flex: 1,
    borderRadius: 4,
    minWidth: 0,
  },
  metaSlipInner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: STATUS_METRIC_HEIGHT,
    gap: 6,
    overflow: 'hidden',
  },
  metaCol: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  metaLabel: Typo(
    {
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  metaValue: {
    ...EMPHASIS_SANS,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  loader: { marginTop: 40 },
  emptyText: { color: COLORS.text.muted, fontSize: 14, textAlign: 'center', marginTop: 40 },
  sectionsStack: {
    gap: 18,
    marginTop: 4,
  },
  sectionPanelOuter: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionPanelInner: {
    position: 'relative',
    overflow: 'hidden',
  },
  sectionPanelHeader: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: CONTENT_PAD,
  },
  sectionPanelBody: {
    paddingHorizontal: CONTENT_PAD,
    paddingBottom: 16,
  },
  bgFill: {
    ...StyleSheet.absoluteFill,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: Typo(
    {
      color: COLORS.soviet.parchment,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    'sans', lang
  ),
  bodyText: { color: PAPER_BODY, fontSize: 13, lineHeight: 21 },
  bodyParagraph: { marginTop: 10 },
  timelineWrap: {
    gap: 0,
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 56,
  },
  timelineRail: {
    width: 16,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PAPER_ACTION,
    borderWidth: 2,
    borderColor: 'rgba(139, 35, 24, 0.25)',
    marginTop: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(139, 35, 24, 0.3)',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 18,
    gap: 4,
    minWidth: 0,
  },
  timelineDate: { color: PAPER_ACTION, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  timelineTitle: { color: PAPER_INK, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  timelineBody: Typo({ color: PAPER_INK_MUTED, fontSize: 12, lineHeight: 19 }),
  conceptGridScroll: {
    width: '100%',
  },
  conceptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CONCEPT_GRID_GAP,
  },
  conceptGridSingle: {
    flexDirection: 'column',
  },
  conceptGridItem: {
    width: '100%',
  },
  conceptGridItemHalf: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
  },
  conceptCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 4,
    overflow: 'hidden',
    padding: 12,
    height: CONCEPT_CARD_HEIGHT,
  },
  conceptIcon: {
    width: CONCEPT_ICON_SIZE,
    height: CONCEPT_ICON_SIZE,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(44, 38, 32, 0.15)',
    flexShrink: 0,
  },
  conceptIconFallback: {
    backgroundColor: 'rgba(139, 35, 24, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conceptIconStar: { color: PAPER_ACTION, fontSize: 18 },
  conceptTextCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    justifyContent: 'center',
  },
  conceptTitle: { color: PAPER_INK, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  conceptSummary: { color: PAPER_INK_MUTED, fontSize: 11, lineHeight: 17 },
});
};

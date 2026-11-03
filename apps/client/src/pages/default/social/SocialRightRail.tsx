import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Typo } from '../../../theme/typography';
import { hiddenScrollViewProps } from '../../../theme/webScrollbar';
import { SOCIAL_IMAGES } from '../theme/images';
import { SocialLeaderboardCard } from './SocialLeaderboardCard';
import { SOCIAL } from './socialTokens';

const COMPOSE_BAR_H = 72;
const COMPOSE_BOTTOM_GAP = 4;

/** Web right-rail hot list length (leaderboard sits below). */
const WEB_HOT_LIMIT = 5;

export type HotTopicItem = {
  topic_id: string;
  title: string;
  summary?: string;
  rank: number;
  primary_source: string;
  source_url?: string;
  pinned?: boolean;
};

type SocialRightRailProps = {
  searchPlaceholder: string;
  postLabel: string;
  /** Shown beside the compose avatar (username). Falls back to postLabel. */
  composeHint?: string;
  avatarUri?: string | null;
  hotTopics?: HotTopicItem[];
  hotLoading?: boolean;
  hotEmptyLabel?: string;
  /** Controlled search query (desktop feed search). */
  searchValue?: string;
  onSearchChange?: (q: string) => void;
  onSearchSubmit?: (q: string) => void;
  onHotTopicPress?: (topic: HotTopicItem) => void;
  onPostPress: () => void;
};

export function SocialRightRail({
  searchPlaceholder,
  postLabel,
  composeHint,
  avatarUri,
  hotTopics = [],
  hotLoading = false,
  hotEmptyLabel = 'No trending topics yet',
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onHotTopicPress,
  onPostPress,
}: SocialRightRailProps) {
  const [localQ, setLocalQ] = useState('');
  const controlled = searchValue !== undefined;
  const q = controlled ? searchValue : localQ;
  const setQ = (next: string) => {
    if (!controlled) setLocalQ(next);
    onSearchChange?.(next);
  };
  const top = hotTopics[0];
  const hintText = composeHint?.trim() || postLabel;
  const scrollHideProps = hiddenScrollViewProps();
  const scrollHideStyle = scrollHideProps.style as object | undefined;

  return (
    <View style={styles.rail}>
      <ScrollView
        {...scrollHideProps}
        style={[styles.railScroll, scrollHideStyle]}
        contentContainerStyle={[
          styles.railScrollContent,
          { paddingBottom: COMPOSE_BAR_H + COMPOSE_BOTTOM_GAP + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchPill}>
          <Image source={SOCIAL_IMAGES.searchIcon} style={styles.searchIcon} contentFit="contain" />
          <TextInput
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder={searchPlaceholder}
            placeholderTextColor={SOCIAL.handle}
            returnKeyType="search"
            onSubmitEditing={() => onSearchSubmit?.(q.trim())}
          />
          {q.length > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setQ('');
                onSearchSubmit?.('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clear}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.listBlock}>
          {hotLoading ? (
            <ActivityIndicator color={SOCIAL.handle} style={{ marginVertical: 12 }} />
          ) : hotTopics.length === 0 ? (
            <Text style={styles.emptyHot}>{hotEmptyLabel}</Text>
          ) : (
            hotTopics.slice(0, WEB_HOT_LIMIT).map((item, i) => (
              <Pressable
                key={item.topic_id}
                style={({ pressed }) => [styles.hotRow, pressed && styles.hotRowPressed]}
                onPress={() => {
                  setQ(item.title);
                  onHotTopicPress?.(item);
                  onSearchSubmit?.(item.title);
                }}
              >
                <Text style={styles.hotRank}>{item.pinned ? '★' : i + 1}</Text>
                <Text style={styles.hotTitle} numberOfLines={2}>
                  {item.title}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        <SocialLeaderboardCard />

        {top ? (
          <Pressable
            style={styles.featureCardWrap}
            onPress={() => {
              setQ(top.title);
              onHotTopicPress?.(top);
              onSearchSubmit?.(top.title);
            }}
          >
            <LinearGradient
              colors={['#1a2240', '#3a2a4a']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.featureCard}
            >
              <Text style={styles.featureEyebrow}>Trending</Text>
              <Text style={styles.featureTitle} numberOfLines={3}>
                {top.title}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Image
            source={SOCIAL_IMAGES.featureCard}
            style={styles.featureCardImg}
            contentFit="cover"
          />
        )}
      </ScrollView>

      {/* Floating compose — no LinearGradient/backdrop wrapper (those paint a black rect on web). */}
      <Pressable
        style={({ pressed }) => [styles.composeBar, pressed && styles.composeBarPressed]}
        onPress={onPostPress}
      >
        <View style={styles.composeAvatarWrap} pointerEvents="none">
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.composeAvatar} contentFit="cover" />
          ) : (
            <Image
              source={SOCIAL_IMAGES.composeAvatar}
              style={styles.composeAvatar}
              contentFit="contain"
            />
          )}
        </View>
        <View style={styles.composeBody} pointerEvents="none">
          <Text style={styles.composeHint} numberOfLines={1}>
            {hintText}
          </Text>
        </View>
        <View style={styles.postBtn} pointerEvents="none">
          <Text style={styles.postBtnText}>{postLabel}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 300,
    maxWidth: 300,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 300,
    minHeight: 0,
    alignSelf: 'stretch',
    marginLeft: 'auto',
    paddingTop: 8,
    paddingRight: 12,
    paddingBottom: 8,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  railScroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  railScrollContent: {
    gap: 20,
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    width: '100%',
    paddingLeft: 4,
    paddingRight: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'transparent',
  },
  searchIcon: {
    width: 40,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#F2F2F4',
    fontSize: 14,
    outlineStyle: 'none' as never,
  },
  clear: {
    color: SOCIAL.handle,
    fontSize: 22,
    lineHeight: 22,
    paddingHorizontal: 2,
  },
  listBlock: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    width: '100%',
    minHeight: 120,
  },
  emptyHot: {
    color: SOCIAL.handle,
    fontSize: 13,
    paddingVertical: 8,
  },
  hotRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  hotRowPressed: {
    opacity: 0.7,
  },
  hotRank: {
    width: 18,
    color: SOCIAL.handle,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  hotTitle: {
    flex: 1,
    color: '#F2F2F4',
    fontSize: 13,
    lineHeight: 18,
  },
  featureCardWrap: {
    width: '100%',
  },
  featureCard: {
    width: '100%',
    height: 180,
    borderRadius: 19,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 8,
  },
  featureCardImg: {
    width: '100%',
    height: 180,
    borderRadius: 19,
  },
  featureEyebrow: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  featureTitle: {
    color: '#F8F8FA',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  composeBar: {
    position: 'absolute',
    left: 0,
    right: 12,
    bottom: COMPOSE_BOTTOM_GAP,
    zIndex: 30,
    elevation: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: COMPOSE_BAR_H,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    /** Opaque enough glass — avoids LinearGradient's black rect under translucent colors. */
    backgroundColor: 'rgba(28, 32, 48, 0.92)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        }),
  },
  composeBarPressed: {
    backgroundColor: 'rgba(36, 40, 58, 0.96)',
    transform: [{ scale: 0.995 }],
  },
  composeAvatarWrap: {
    flexShrink: 0,
  },
  composeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  composeBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  composeHint: {
    color: SOCIAL.name,
    fontSize: 13,
    fontWeight: '600',
  },
  postBtn: {
    backgroundColor: SOCIAL.postBtn,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  postBtnText: Typo(
    {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    'sans',
  ),
});

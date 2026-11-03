import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  type TextInput as TextInputType,
} from 'react-native';
import { Image } from 'expo-image';
import { Typo } from '../../../theme/typography';
import { hiddenScrollViewProps } from '../../../theme/webScrollbar';
import { SOCIAL_IMAGES } from '../theme/images';
import type { HotTopicItem } from './SocialRightRail';
import { SocialLeaderboardCard } from './SocialLeaderboardCard';
import { SOCIAL } from './socialTokens';

/** Mobile search dropdown: top hot topics; ranks 5–8 replaced by leaderboard. */
const MOBILE_HOT_LIMIT = 4;

export type SocialMobileSearchBarHandle = {
  dismiss: () => void;
};

type SocialMobileSearchBarProps = {
  placeholder: string;
  hotTitle: string;
  hotEmptyLabel: string;
  hotTopics: HotTopicItem[];
  hotLoading?: boolean;
  value: string;
  onChangeText: (q: string) => void;
  onSubmit?: (q: string) => void;
  onHotTopicPress?: (topic: HotTopicItem) => void;
  onFocusChange?: (focused: boolean) => void;
};

type Anchor = { x: number; y: number; width: number; height: number };

export const SocialMobileSearchBar = forwardRef<
  SocialMobileSearchBarHandle,
  SocialMobileSearchBarProps
>(function SocialMobileSearchBar(
  {
    placeholder,
    hotTitle,
    hotEmptyLabel,
    hotTopics,
    hotLoading = false,
    value,
    onChangeText,
    onSubmit,
    onHotTopicPress,
    onFocusChange,
  },
  ref,
) {
  const anchorRef = useRef<View>(null);
  const modalInputRef = useRef<TextInputType>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0, width: 0, height: 52 });
  const scrollHideProps = hiddenScrollViewProps();
  const scrollHideStyle = scrollHideProps.style as object | undefined;

  useEffect(() => {
    onFocusChange?.(open);
  }, [open, onFocusChange]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => modalInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    modalInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  const openSearch = useCallback(() => {
    const node = anchorRef.current;
    const finish = (next: Anchor) => {
      setAnchor(next);
      setOpen(true);
    };
    if (!node) {
      finish({ x: 12, y: 56, width: 0, height: 52 });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      finish({
        x: Number.isFinite(x) ? x : 12,
        y: Number.isFinite(y) ? y : 56,
        width: width > 0 ? width : 0,
        height: height > 0 ? height : 52,
      });
    });
  }, []);

  useImperativeHandle(ref, () => ({ dismiss: close }), [close]);

  const panelLeft = anchor.width > 0 ? anchor.x : 12;
  const panelWidth = anchor.width > 0 ? anchor.width : undefined;
  const displayText = value.length > 0 ? value : placeholder;
  const isPlaceholder = value.length === 0;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* Display-only anchor — never focuses, so closing Modal cannot bounce-focus reopen */}
      <View
        ref={anchorRef}
        collapsable={false}
        style={open ? styles.anchorHidden : undefined}
        pointerEvents={open ? 'none' : 'auto'}
      >
        <Pressable
          onPress={openSearch}
          accessibilityRole="search"
          accessibilityLabel={placeholder}
        >
          <View style={styles.searchPill}>
            <Image
              source={SOCIAL_IMAGES.searchIcon}
              style={styles.searchIcon}
              contentFit="contain"
            />
            <Text
              style={[styles.searchDisplay, isPlaceholder && styles.searchPlaceholder]}
              numberOfLines={1}
            >
              {displayText}
            </Text>
            {value.length > 0 ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  onChangeText('');
                  onSubmit?.('');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.clear}>×</Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          {/*
            TouchableWithoutFeedback + onPressIn:
            iOS often cancels Pressable.onPress when the keyboard steals the first tap.
          */}
          <TouchableWithoutFeedback onPress={close} onPressIn={close}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.modalPanel,
              {
                top: Math.max(anchor.y, 0),
                left: panelLeft,
                width: panelWidth,
                right: panelWidth ? undefined : 12,
              },
            ]}
          >
            <View style={styles.searchPill}>
              <Image
                source={SOCIAL_IMAGES.searchIcon}
                style={styles.searchIcon}
                contentFit="contain"
              />
              <TextInput
                ref={modalInputRef}
                style={styles.searchInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={SOCIAL.handle}
                returnKeyType="search"
                autoFocus
                showSoftInputOnFocus
                onSubmitEditing={() => {
                  onSubmit?.(value.trim());
                  close();
                }}
              />
              {value.length > 0 ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    onChangeText('');
                    onSubmit?.('');
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.clear}>×</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.dropdown}>
              <ScrollView
                {...scrollHideProps}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                style={[styles.dropdownScroll, scrollHideStyle]}
                contentContainerStyle={styles.dropdownScrollContent}
              >
                <Text style={styles.dropdownTitle}>{hotTitle}</Text>
                {hotLoading ? (
                  <ActivityIndicator color={SOCIAL.handle} style={{ marginVertical: 12 }} />
                ) : hotTopics.length === 0 ? (
                  <Text style={styles.empty}>{hotEmptyLabel}</Text>
                ) : (
                  hotTopics.slice(0, MOBILE_HOT_LIMIT).map((item, i) => (
                    <Pressable
                      key={item.topic_id}
                      style={({ pressed }) => [styles.hotRow, pressed && styles.hotRowPressed]}
                      onPress={() => {
                        onChangeText(item.title);
                        onHotTopicPress?.(item);
                        onSubmit?.(item.title);
                        close();
                      }}
                    >
                      <Text style={[styles.hotRank, i < 3 && styles.hotRankTop]}>
                        {item.pinned ? '★' : i + 1}
                      </Text>
                      <View style={styles.hotTextCol}>
                        <Text style={styles.hotTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {item.summary ? (
                          <Text style={styles.hotSummary} numberOfLines={1}>
                            {item.summary}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))
                )}
                <SocialLeaderboardCard compact onNavigated={close} />
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    zIndex: 30,
    position: 'relative',
  },
  anchorHidden: {
    opacity: 0,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(44, 52, 69, 0.9)',
    backgroundColor: 'rgba(12, 14, 22, 0.88)',
    paddingHorizontal: 18,
    gap: 10,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        } as object)
      : {}),
  },
  searchIcon: {
    width: 18,
    height: 18,
    opacity: 0.85,
  },
  searchDisplay: {
    flex: 1,
    color: SOCIAL.name,
    fontSize: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 11,
  },
  searchPlaceholder: {
    color: SOCIAL.handle,
  },
  searchInput: {
    flex: 1,
    color: SOCIAL.name,
    fontSize: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 11,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  clear: {
    color: SOCIAL.handle,
    fontSize: 22,
    lineHeight: 22,
    paddingHorizontal: 2,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalPanel: {
    position: 'absolute',
    zIndex: 2,
    elevation: 8,
    gap: 8,
  },
  dropdown: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SOCIAL.feedPanelBorder,
    backgroundColor: 'rgba(14, 17, 26, 0.98)',
    paddingVertical: 10,
    paddingHorizontal: 6,
    maxHeight: 420,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }),
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownScrollContent: {
    paddingBottom: 4,
    gap: 4,
  },
  dropdownTitle: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      paddingHorizontal: 10,
      marginBottom: 6,
    },
    'sans',
  ),
  empty: Typo(
    {
      color: SOCIAL.action,
      fontSize: 13,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    'sans',
  ),
  hotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  hotRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hotRank: Typo(
    {
      width: 18,
      color: SOCIAL.handle,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    'sans',
  ),
  hotRankTop: {
    color: SOCIAL.postBtn,
  },
  hotTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hotTitle: Typo(
    {
      color: SOCIAL.name,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  hotSummary: Typo(
    {
      color: SOCIAL.handle,
      fontSize: 12,
      lineHeight: 16,
    },
    'sans',
  ),
});

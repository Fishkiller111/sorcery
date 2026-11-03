import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { useI18n } from '../../i18n/I18nContext';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { resolveStaticUrl } from '../../constants/config';
import { StoryWorldviewArticleCard } from './StoryWorldviewArticleCard';
import type { WorldviewSupplementItem } from '../../types/api';

interface StoryWorldviewSupplementModalProps {
  item: WorldviewSupplementItem | null;
  onClose: () => void;
}

export function StoryWorldviewSupplementModal({ item, onClose }: StoryWorldviewSupplementModalProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);
  const scrollWebStyle = scrollWebProps.style as object | undefined;
  const cardWidth = Math.min(640, Math.max(280, windowWidth - 48));
  const maxCardHeight = Math.min(windowHeight * 0.88, windowHeight - insets.top - insets.bottom - 32);

  const body = item?.content?.trim() || item?.summary?.trim() || '';
  const imageUrl = item?.image ? resolveStaticUrl(item.image) : null;

  return (
    <Modal visible={item != null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.cardShell, { width: cardWidth, maxHeight: maxCardHeight }]}
          onPress={() => {}}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={10}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('chat.close')}
          >
            <Ionicons name="close" size={20} color={COLORS.agents.paleGold} />
          </TouchableOpacity>
          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebStyle]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {item ? (
              <StoryWorldviewArticleCard title={item.title} imageUrl={imageUrl} body={body} />
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 10, 14, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardShell: {
    position: 'relative',
    maxWidth: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingTop: 4,
  },
});

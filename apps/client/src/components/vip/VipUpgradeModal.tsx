import React, { useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { useTheme } from '../../theme/useTheme';
import { TOKENS } from '../../pages/default/theme/tokens';
import { VipSubscribePanel } from './VipSubscribePanel';
import { DefaultVipSubscribePanel } from '../../pages/default/components/DefaultVipSubscribePanel';
import { MessageHost } from '../ui/Message';
import { themedScrollViewProps } from '../../theme/webScrollbar';

type VipUpgradeModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** VIP 升级弹层：按主题切换 Soviet / Soulthread 订阅面板 */
export function VipUpgradeModal({ visible, onClose }: VipUpgradeModalProps) {
  const { t } = useI18n();
  const { themeId, loaded } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDefault = loaded && themeId === 'default';
  const scrollWebProps = useMemo(
    () => themedScrollViewProps(isDefault ? 'default' : 'soviet'),
    [isDefault],
  );

  const contentWidth = useMemo(
    () => Math.min(Math.max(windowWidth - 48, 280), 560),
    [windowWidth],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, isDefault && styles.backdropDefault]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
        <View
          style={[
            styles.sheet,
            { maxWidth: contentWidth + 40 },
            isDefault && styles.sheetDefault,
          ]}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('chat.close')}
          >
            <Ionicons
              name="close"
              size={22}
              color={isDefault ? TOKENS.colors.textMuted : COLORS.agents.paleGoldMuted}
            />
          </TouchableOpacity>

          <ScrollView
            {...scrollWebProps}
            style={scrollWebProps.style}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isDefault ? (
              <DefaultVipSubscribePanel
                isDesktop={windowWidth >= 900}
                active={visible}
              />
            ) : (
              <VipSubscribePanel contentWidth={contentWidth} active={visible} />
            )}
          </ScrollView>
        </View>
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropDefault: {
    backgroundColor: 'rgba(4, 5, 8, 0.78)',
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sheetDefault: {
    backgroundColor: TOKENS.colors.cardSolid,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.cardLg,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
        } as object)
      : {}),
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 24,
    alignItems: 'center',
  },
});

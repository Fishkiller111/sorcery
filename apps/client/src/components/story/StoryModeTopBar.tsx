import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Pressable,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { MenuPanel, MenuPanelModal } from '../ui/MenuPanel';
import type { FreeChatUiVariant } from '../free-chat/freeChatUi';
import { glassWebStyle } from '../free-chat/freeChatUi';
import { TOKENS } from '../../pages/default/theme/tokens';
import { useStoryAudioStore } from '../../stores/storyAudioStore';
import { storyAudioPlayer } from '../../utils/storyAudioPlayer';

const GEAR_ICON = require('../../../assets/images/ui/profile/icon_settings_gear.png');

export const STORY_MODE_TOP_BAR_HEIGHT = 36;

type StoryModeTopBarProps = {
  style?: StyleProp<ViewStyle>;
  variant?: FreeChatUiVariant;
};

export function StoryModeTopBar({ style, variant }: StoryModeTopBarProps) {
  const { themeId } = useTheme();
  const uiVariant: FreeChatUiVariant = variant ?? (themeId === 'default' ? 'default' : 'soviet');
  const isDefault = uiVariant === 'default';
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const muted = useStoryAudioStore((s) => s.muted);
  const toggleMuted = useStoryAudioStore((s) => s.toggleMuted);
  const [menuOpen, setMenuOpen] = useState(false);
  const gearRef = useRef<View>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleToggleMute = useCallback(() => {
    toggleMuted();
    closeMenu();
  }, [toggleMuted, closeMenu]);

  const handleBack = useCallback(() => {
    void storyAudioPlayer.stopAll();
    router.replace('/');
  }, [router]);

  return (
    <>
      <View style={[styles.slot, { paddingTop: insets.top + 8 }, style]}>
        <View style={[styles.bar, isDefault && styles.barDefault]}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('menu.back')}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={isDefault ? TOKENS.colors.textSecondary : COLORS.agents.paleGold}
            />
          </TouchableOpacity>

          <View style={[styles.divider, isDefault && styles.dividerDefault]} />

          <Pressable
            ref={gearRef}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && (isDefault ? styles.iconBtnPressedDefault : styles.iconBtnPressed),
            ]}
            onPress={() => setMenuOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={t('menu.settings')}
          >
            {isDefault ? (
              <Ionicons name="settings-outline" size={17} color={TOKENS.colors.textSecondary} />
            ) : (
              <Image source={GEAR_ICON} style={styles.gearIcon} resizeMode="contain" />
            )}
          </Pressable>
        </View>
      </View>

      <MenuPanelModal
        visible={menuOpen}
        onClose={closeMenu}
        placement="bottom-end"
        anchorRef={gearRef}
        gap={6}
      >
        <MenuPanel
          variant={uiVariant}
          items={[
            {
              key: 'mute',
              label: muted ? t('storyAudio.unmute') : t('storyAudio.mute'),
              leading: (
                <Ionicons
                  name={muted ? 'volume-high-outline' : 'volume-mute-outline'}
                  size={18}
                  color={
                    isDefault
                      ? muted
                        ? TOKENS.colors.accent
                        : TOKENS.colors.textSecondary
                      : muted
                        ? COLORS.agents.brightGold
                        : COLORS.agents.paleGold
                  }
                />
              ),
              selected: muted,
              onPress: handleToggleMute,
            },
          ]}
          style={styles.menuPanel}
        />
      </MenuPanelModal>
    </>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: STORY_MODE_TOP_BAR_HEIGHT,
    paddingHorizontal: 2,
    backgroundColor: 'rgba(18, 20, 26, 0.92)',
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 4px 16px rgba(0,0,0,0.35)' } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  barDefault: {
    backgroundColor: TOKENS.colors.card,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    ...glassWebStyle,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 24px rgba(0,0,0,0.28)' } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.28,
          shadowRadius: 10,
          elevation: 6,
        }),
  },
  iconBtn: {
    width: 36,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(232, 213, 181, 0.08)',
  },
  iconBtnPressedDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 6,
    backgroundColor: 'rgba(232, 213, 181, 0.22)',
  },
  dividerDefault: {
    backgroundColor: TOKENS.colors.lineFaint,
  },
  gearIcon: {
    width: 16,
    height: 16,
    opacity: 0.92,
  },
  menuPanel: {
    minWidth: 160,
  },
});

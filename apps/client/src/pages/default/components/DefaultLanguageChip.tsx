import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../i18n/I18nContext';
import { APP_LANGS, LANG_LABELS } from '../../../i18n/langs';
import type { Lang } from '../../../i18n/types';
import { useAuthStore } from '../../../stores/authStore';
import { Typo } from '../../../theme/typography';
import { notifyError } from '../../../utils/notify';
import { TOKENS } from '../theme/tokens';

const MENU_WIDTH = 200;

/** Home filter-bar language picker — compact chip + dropdown, left of orientation. */
export function DefaultLanguageChip() {
  const { lang, setLang, t } = useI18n();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const updateUserLang = useAuthStore((s) => s.updateUserLang);
  const chipRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const [saving, setSaving] = useState(false);

  const measureAndOpen = useCallback(() => {
    if (saving) return;
    chipRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, [saving]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
  }, [saving]);

  const applyLang = useCallback(
    async (next: Lang) => {
      if (next === lang || saving) return;
      setOpen(false);
      setLang(next);
      if (!isLoggedIn) return;
      setSaving(true);
      try {
        await updateUserLang(next);
      } catch {
        notifyError(t('settings.saveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [isLoggedIn, lang, saving, setLang, t, updateUserLang],
  );

  const menuTop = anchor ? anchor.y + anchor.height + 8 : 0;
  const windowWidth = Dimensions.get('window').width;
  const menuStyle = anchor
    ? {
        top: menuTop,
        left: Math.min(Math.max(12, anchor.x + anchor.width - MENU_WIDTH), windowWidth - MENU_WIDTH - 12),
      }
    : { top: 72, right: 12 };

  return (
    <>
      <View ref={chipRef} collapsable={false}>
        <Pressable
          style={[styles.chip, open && styles.chipOpen, saving && styles.chipSaving]}
          onPress={measureAndOpen}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, busy: saving }}
          accessibilityLabel={t('explore.languageSwitch')}
        >
          <Ionicons name="globe-outline" size={14} color={TOKENS.colors.text} />
          <Text style={styles.label}>{LANG_LABELS[lang].short}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={TOKENS.colors.textMuted}
          />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" />
          <View style={[styles.menu, menuStyle]}>
            <Text style={styles.menuTitle}>{t('settings.language')}</Text>
            {APP_LANGS.map((code, index) => {
              const selected = code === lang;
              return (
                <Pressable
                  key={code}
                  style={[
                    styles.option,
                    index < APP_LANGS.length - 1 && styles.optionDivider,
                    selected && styles.optionSelected,
                  ]}
                  onPress={() => void applyLang(code)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {LANG_LABELS[code].native}
                  </Text>
                  <Text style={[styles.optionSub, selected && styles.optionSubSelected]}>
                    {LANG_LABELS[code].short}
                  </Text>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(8, 9, 13, 0.55)',
  },
  chipOpen: {
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipSaving: {
    opacity: 0.6,
  },
  label: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    'sans',
  ),
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(18, 20, 28, 0.98)',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 12px 32px rgba(0,0,0,0.45)' } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }),
  },
  menuTitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      paddingHorizontal: 8,
      paddingBottom: 6,
      paddingTop: 2,
    },
    'sans',
  ),
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 8,
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0,
  },
  optionSelected: {
    backgroundColor: 'rgba(186, 60, 71, 0.16)',
  },
  optionLabel: Typo(
    {
      flex: 1,
      color: TOKENS.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    'sans',
  ),
  optionLabelSelected: {
    color: '#FFB4BA',
  },
  optionSub: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    'sans',
  ),
  optionSubSelected: {
    color: '#F0717A',
  },
  check: {
    color: TOKENS.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});

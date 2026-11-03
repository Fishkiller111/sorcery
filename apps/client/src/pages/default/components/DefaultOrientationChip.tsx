import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutRectangle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../i18n/I18nContext';
import { Typo } from '../../../theme/typography';
import type { UserGender } from '../../../types/api';
import {
  GENDER_OPTIONS,
  formatUserGenderDisplay,
  genderLabelKey,
  type GenderOption,
} from '../../../utils/userGender';
import { TOKENS } from '../theme/tokens';

const GENDER_SUBLABEL_KEYS: Record<GenderOption, string> = {
  male: 'settings.genderSublabelMale',
  female: 'settings.genderSublabelFemale',
  other: 'settings.genderSublabelOther',
};

type DefaultOrientationChipProps = {
  gender?: UserGender | null;
  genderCustom?: string | null;
  saving?: boolean;
  onSelect: (gender: UserGender, custom: string) => void;
  onPressWhenLoggedOut?: () => void;
  loggedIn: boolean;
};

/** Home filter-bar orientation picker — compact chip + dropdown. */
export function DefaultOrientationChip({
  gender,
  genderCustom,
  saving = false,
  onSelect,
  onPressWhenLoggedOut,
  loggedIn,
}: DefaultOrientationChipProps) {
  const { t } = useI18n();
  const chipRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);
  const [draftOther, setDraftOther] = useState(false);
  const [custom, setCustom] = useState(genderCustom?.trim() ?? '');
  const [error, setError] = useState<string | null>(null);

  const display = formatUserGenderDisplay(
    { gender: gender ?? '', gender_custom: genderCustom ?? '' },
    t,
  );

  useEffect(() => {
    if (!open) return;
    setDraftOther((gender ?? '') === 'other');
    setCustom(genderCustom?.trim() ?? '');
    setError(null);
  }, [open, gender, genderCustom]);

  const measureAndOpen = useCallback(() => {
    if (!loggedIn) {
      onPressWhenLoggedOut?.();
      return;
    }
    chipRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }, [loggedIn, onPressWhenLoggedOut]);

  const close = useCallback(() => {
    if (saving) return;
    setOpen(false);
    setError(null);
  }, [saving]);

  const pick = useCallback(
    (id: GenderOption) => {
      if (saving) return;
      if (id === 'other') {
        setDraftOther(true);
        setError(null);
        return;
      }
      onSelect(id, '');
      setOpen(false);
    },
    [onSelect, saving],
  );

  const confirmOther = useCallback(() => {
    if (saving) return;
    const trimmed = custom.trim();
    if (!trimmed) {
      setError(t('settings.genderCustomRequired'));
      return;
    }
    onSelect('other', trimmed);
    setOpen(false);
  }, [custom, onSelect, saving, t]);

  const menuTop = anchor ? anchor.y + anchor.height + 8 : 0;
  const windowWidth = Dimensions.get('window').width;
  const menuStyle = anchor
    ? {
        top: menuTop,
        left: Math.min(Math.max(12, anchor.x + anchor.width - 200), windowWidth - 212),
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
          accessibilityLabel={t('settings.gender')}
        >
          <Text style={styles.label} numberOfLines={1}>
            {display}
          </Text>
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
            <Text style={styles.menuTitle}>{t('settings.gender')}</Text>
            {GENDER_OPTIONS.map((id, index) => {
              const selected = !draftOther && (gender ?? '') === id;
              const otherSelected = draftOther && id === 'other';
              const isSelected = id === 'other' ? otherSelected || (gender ?? '') === 'other' : selected;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.option,
                    index < GENDER_OPTIONS.length - 1 && !draftOther && styles.optionDivider,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => pick(id)}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {t(genderLabelKey(id))}
                  </Text>
                  <Text style={[styles.optionSub, isSelected && styles.optionSubSelected]}>
                    {t(GENDER_SUBLABEL_KEYS[id])}
                  </Text>
                  {isSelected && id !== 'other' ? (
                    <Text style={styles.check}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}

            {draftOther ? (
              <View style={styles.otherBlock}>
                <TextInput
                  style={styles.input}
                  value={custom}
                  onChangeText={(text) => {
                    setCustom(text);
                    setError(null);
                  }}
                  placeholder={t('settings.genderCustomPlaceholder')}
                  placeholderTextColor={TOKENS.colors.textMuted}
                  maxLength={64}
                  editable={!saving}
                  autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable
                  style={[styles.confirmBtn, saving && styles.chipSaving]}
                  onPress={confirmOther}
                  disabled={saving}
                  accessibilityRole="button"
                >
                  <Text style={styles.confirmBtnText}>{t('settings.save')}</Text>
                </Pressable>
              </View>
            ) : null}
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
    maxWidth: 108,
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
      flexShrink: 1,
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
    width: 200,
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
  otherBlock: {
    marginTop: 6,
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  input: Typo(
    {
      borderWidth: 1,
      borderColor: TOKENS.colors.inputBorder,
      borderRadius: TOKENS.radius.input,
      backgroundColor: TOKENS.colors.inputBg,
      paddingHorizontal: 10,
      paddingVertical: 9,
      color: TOKENS.colors.text,
      fontSize: 13,
    },
    'sans',
  ),
  error: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 12,
    },
    'sans',
  ),
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radius.pill,
    backgroundColor: TOKENS.colors.accent,
    paddingVertical: 10,
  },
  confirmBtnText: Typo(
    {
      color: '#fff',
      fontSize: 13,
      fontWeight: '700',
    },
    'sans',
  ),
});

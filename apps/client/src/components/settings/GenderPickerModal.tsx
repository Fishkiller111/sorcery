import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { useTheme } from '../../theme/system/ThemeContext';
import { Typo } from '../../theme/typography';
import type { UserGender } from '../../types/api';
import { GENDER_OPTIONS, genderLabelKey, type GenderOption } from '../../utils/userGender';
import { BODY_MAX_HEIGHT, DEFAULT_BODY_MAX_HEIGHT, ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { DefaultPickerList, DefaultPickerRow } from '../../pages/default/components/DefaultPickerList';
import { TOKENS } from '../../pages/default/theme/tokens';

type GenderPickerModalProps = {
  visible: boolean;
  currentGender?: UserGender;
  currentCustom?: string;
  saving?: boolean;
  /** When true: no cancel, no backdrop dismiss (onboarding gate). */
  force?: boolean;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  onSave: (gender: UserGender, custom: string) => void;
  onClose: () => void;
};

const GENDER_SUBLABEL_KEYS: Record<GenderOption, string> = {
  male: 'settings.genderSublabelMale',
  female: 'settings.genderSublabelFemale',
  other: 'settings.genderSublabelOther',
};

function GenderOptionRow({
  label,
  sublabel,
  selected,
  isLast,
  onPress,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = hovered || selected;
  const hoverHandlers =
    Platform.OS === 'web'
      ? ({
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } as object)
      : {};

  return (
    <Pressable
      {...hoverHandlers}
      style={[
        styles.row,
        !isLast && styles.rowDivider,
        highlighted && styles.rowHighlighted,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.rowLabel, highlighted && styles.rowLabelHighlighted]}>{label}</Text>
      <Text style={[styles.rowSublabel, highlighted && styles.rowSublabelHighlighted]}>{sublabel}</Text>
      {selected ? <Text style={styles.checkMark}>✓</Text> : null}
    </Pressable>
  );
}

function GenderOptionList({
  selected,
  custom,
  error,
  saving,
  onSelect,
  onCustomChange,
  t,
  isDefaultTheme,
}: {
  selected: UserGender;
  custom: string;
  error: string | null;
  saving: boolean;
  onSelect: (gender: GenderOption) => void;
  onCustomChange: (text: string) => void;
  t: (key: string) => string;
  isDefaultTheme: boolean;
}) {
  const list = isDefaultTheme ? (
    <DefaultPickerList>
      {GENDER_OPTIONS.map((id, index) => (
        <DefaultPickerRow
          key={id}
          label={t(genderLabelKey(id))}
          sublabel={t(GENDER_SUBLABEL_KEYS[id])}
          selected={selected === id}
          isLast={index === GENDER_OPTIONS.length - 1}
          onPress={() => onSelect(id)}
        />
      ))}
    </DefaultPickerList>
  ) : (
    <View style={styles.list}>
      {GENDER_OPTIONS.map((id, index) => (
        <GenderOptionRow
          key={id}
          label={t(genderLabelKey(id))}
          sublabel={t(GENDER_SUBLABEL_KEYS[id])}
          selected={selected === id}
          isLast={index === GENDER_OPTIONS.length - 1}
          onPress={() => onSelect(id)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.body}>
      {list}
      {selected === 'other' ? (
        <TextInput
          style={[styles.input, isDefaultTheme && styles.inputDefault]}
          value={custom}
          onChangeText={onCustomChange}
          placeholder={t('settings.genderCustomPlaceholder')}
          placeholderTextColor={isDefaultTheme ? TOKENS.colors.textMuted : 'rgba(201, 168, 108, 0.45)'}
          maxLength={64}
          editable={!saving}
        />
      ) : null}
      {error ? <Text style={[styles.error, isDefaultTheme && styles.errorDefault]}>{error}</Text> : null}
    </View>
  );
}

export function GenderPickerModal({
  visible,
  currentGender = '',
  currentCustom = '',
  saving = false,
  force = false,
  title,
  subtitle,
  confirmLabel,
  onSave,
  onClose,
}: GenderPickerModalProps) {
  const { t } = useI18n();
  const { themeId, loaded } = useTheme();
  const isDefaultTheme = themeId === 'default' && loaded;
  const [selected, setSelected] = useState<UserGender>(currentGender);
  const [custom, setCustom] = useState(currentCustom);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelected(currentGender);
    setCustom(currentCustom);
    setError(null);
  }, [visible, currentGender, currentCustom]);

  const handleSave = () => {
    if (!selected) {
      setError(t('settings.genderRequired'));
      return;
    }
    if (selected === 'other' && !custom.trim()) {
      setError(t('settings.genderCustomRequired'));
      return;
    }
    onSave(selected, selected === 'other' ? custom.trim() : '');
  };

  const bodyContent = useMemo(
    () => (
      <View style={styles.body}>
        {subtitle ? (
          <Text style={[styles.gateHint, isDefaultTheme && styles.gateHintDefault]}>{subtitle}</Text>
        ) : null}
        <GenderOptionList
          selected={selected}
          custom={custom}
          error={error}
          saving={saving}
          onSelect={(id) => {
            setSelected(id);
            setError(null);
          }}
          onCustomChange={(text) => {
            setCustom(text);
            setError(null);
          }}
          t={t}
          isDefaultTheme={isDefaultTheme}
        />
      </View>
    ),
    [custom, error, isDefaultTheme, saving, selected, subtitle, t],
  );

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="star"
      title={title ?? t('settings.gender')}
      bodyMaxHeight={(isDefaultTheme ? DEFAULT_BODY_MAX_HEIGHT : BODY_MAX_HEIGHT) + (subtitle ? 120 : 80)}
      bodyContent={bodyContent}
      cancelLabel={t('settings.cancel')}
      confirmLabel={confirmLabel ?? t('settings.save')}
      onCancel={force ? () => undefined : onClose}
      onConfirm={handleSave}
      loading={saving}
      dismissOnBackdrop={!force}
      hideCancel={force}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: 12,
  },
  gateHint: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 4,
    },
    'sans',
  ),
  gateHintDefault: {
    color: TOKENS.colors.textMuted,
  },
  list: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(138, 130, 120, 0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', transition: 'background-color 0.15s ease' } as const)
      : {}),
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 130, 120, 0.22)',
  },
  rowHighlighted: {
    backgroundColor: 'rgba(196, 62, 62, 0.08)',
  },
  rowLabel: Typo(
    {
      flex: 1,
      color: COLORS.agents.paleGold,
      fontSize: 14,
      lineHeight: 20,
    },
    'sans',
  ),
  rowLabelHighlighted: {
    color: COLORS.agents.brightGold,
  },
  rowSublabel: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    'sans',
  ),
  rowSublabelHighlighted: {
    color: COLORS.agents.brightGold,
  },
  checkMark: {
    color: '#c43e3e',
    fontSize: 14,
    fontWeight: '700',
  },
  input: Typo(
    {
      borderWidth: 1,
      borderColor: 'rgba(138, 130, 120, 0.35)',
      borderRadius: 2,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: COLORS.agents.paleGold,
      fontSize: 14,
    },
    'sans',
  ),
  error: Typo(
    {
      color: '#c43e3e',
      fontSize: 12,
    },
    'sans',
  ),
  errorDefault: {
    color: TOKENS.colors.accent,
  },
  inputDefault: {
    borderColor: TOKENS.colors.inputBorder,
    borderRadius: TOKENS.radius.input,
    backgroundColor: TOKENS.colors.inputBg,
    color: TOKENS.colors.text,
  },
});

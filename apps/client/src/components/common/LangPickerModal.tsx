import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_LANGS, LANG_LABELS } from '../../i18n/langs';
import { useI18n } from '../../i18n/I18nContext';
import type { Lang } from '../../i18n/types';
import { COLORS } from '../../theme/colors';
import { useTheme } from '../../theme/system/ThemeContext';
import { Typo } from '../../theme/typography';
import { BODY_MAX_HEIGHT, DEFAULT_BODY_MAX_HEIGHT, ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { MenuPanel, MenuPanelModal } from '../ui/MenuPanel';
import { DefaultPickerList, DefaultPickerRow } from '../../pages/default/components/DefaultPickerList';

type LangPickerModalProps = {
  visible: boolean;
  current: Lang;
  onSelect: (lang: Lang) => void;
  onClose: () => void;
  variant?: 'menu' | 'general';
};

function LangOptionList({
  current,
  onSelect,
  onClose,
  isDefaultTheme,
}: {
  current: Lang;
  onSelect: (lang: Lang) => void;
  onClose: () => void;
  isDefaultTheme: boolean;
}) {
  if (isDefaultTheme) {
    return (
      <DefaultPickerList>
        {APP_LANGS.map((code, index) => (
          <DefaultPickerRow
            key={code}
            label={LANG_LABELS[code].native}
            sublabel={LANG_LABELS[code].short}
            selected={code === current}
            isLast={index === APP_LANGS.length - 1}
            onPress={() => {
              onSelect(code);
              onClose();
            }}
          />
        ))}
      </DefaultPickerList>
    );
  }

  return (
    <View style={generalStyles.list}>
      {APP_LANGS.map((code, index) => {
        const selected = code === current;
        return (
          <LangOptionRow
            key={code}
            label={LANG_LABELS[code].native}
            sublabel={LANG_LABELS[code].short}
            selected={selected}
            isLast={index === APP_LANGS.length - 1}
            onPress={() => {
              onSelect(code);
              onClose();
            }}
          />
        );
      })}
    </View>
  );
}

function LangOptionRow({
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
        generalStyles.row,
        !isLast && generalStyles.rowDivider,
        highlighted && generalStyles.rowHighlighted,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[generalStyles.rowLabel, highlighted && generalStyles.rowLabelHighlighted]}>
        {label}
      </Text>
      <Text style={[generalStyles.rowSublabel, highlighted && generalStyles.rowSublabelHighlighted]}>
        {sublabel}
      </Text>
      {selected ? <Text style={generalStyles.checkMark}>✓</Text> : null}
    </Pressable>
  );
}

export function LangPickerModal({
  visible,
  current,
  onSelect,
  onClose,
  variant = 'menu',
}: LangPickerModalProps) {
  const { t } = useI18n();
  const { themeId, loaded } = useTheme();
  const isDefaultTheme = themeId === 'default' && loaded;

  const items = useMemo(
    () =>
      APP_LANGS.map((code) => ({
        key: code,
        label: LANG_LABELS[code].native,
        sublabel: LANG_LABELS[code].short,
        selected: code === current,
        onPress: () => {
          onSelect(code);
          onClose();
        },
      })),
    [current, onClose, onSelect],
  );

  if (variant === 'general') {
    return (
      <ThemedGeneralConfirmModal
        visible={visible}
        icon="globe"
        title={t('settings.language')}
        bodyMaxHeight={(isDefaultTheme ? DEFAULT_BODY_MAX_HEIGHT : BODY_MAX_HEIGHT) + 40}
        bodyContent={
          <LangOptionList
            current={current}
            onSelect={onSelect}
            onClose={onClose}
            isDefaultTheme={isDefaultTheme}
          />
        }
        hideCancel
        hideConfirm
        confirmLabel={t('settings.cancel')}
        onCancel={onClose}
        onConfirm={onClose}
        dismissOnBackdrop
      />
    );
  }

  return (
    <MenuPanelModal visible={visible} onClose={onClose} placement="center">
      <MenuPanel items={items} style={styles.panel} />
    </MenuPanelModal>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    maxWidth: 360,
    minWidth: 280,
  },
});

const generalStyles = StyleSheet.create({
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
});

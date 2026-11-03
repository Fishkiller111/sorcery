import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { THEME_IDS, themeMeta } from '../../theme/useTheme';
import { useTheme } from '../../theme/system/ThemeContext';
import type { ThemeId } from '../../theme/system/types';
import { Typo } from '../../theme/typography';
import { BODY_MAX_HEIGHT, DEFAULT_BODY_MAX_HEIGHT, ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import {
  DefaultPickerList,
  DefaultPickerPreviewDot,
  DefaultPickerRow,
} from '../../pages/default/components/DefaultPickerList';

type ThemePickerModalProps = {
  visible: boolean;
  current: ThemeId;
  onSelect: (themeId: ThemeId) => void;
  onClose: () => void;
};

function ThemeOptionList({
  current,
  onSelect,
  onClose,
  isDefaultTheme,
}: {
  current: ThemeId;
  onSelect: (themeId: ThemeId) => void;
  onClose: () => void;
  isDefaultTheme: boolean;
}) {
  const { t } = useI18n();

  if (isDefaultTheme) {
    return (
      <DefaultPickerList>
        {THEME_IDS.map((id, index) => {
          const meta = themeMeta[id];
          return (
            <DefaultPickerRow
              key={id}
              label={t(`settings.themeNames.${id}`)}
              selected={id === current}
              isLast={index === THEME_IDS.length - 1}
              leading={<DefaultPickerPreviewDot color={meta.previewColor} />}
              onPress={() => {
                onSelect(id);
                onClose();
              }}
            />
          );
        })}
      </DefaultPickerList>
    );
  }

  return (
    <View style={styles.list}>
      {THEME_IDS.map((id, index) => {
        const selected = id === current;
        const meta = themeMeta[id];
        return (
          <ThemeOptionRow
            key={id}
            label={t(`settings.themeNames.${id}`)}
            previewColor={meta.previewColor}
            selected={selected}
            isLast={index === THEME_IDS.length - 1}
            onPress={() => {
              onSelect(id);
              onClose();
            }}
          />
        );
      })}
    </View>
  );
}

function ThemeOptionRow({
  label,
  previewColor,
  selected,
  isLast,
  onPress,
}: {
  label: string;
  previewColor: string;
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
      <View style={[styles.previewDot, { backgroundColor: previewColor }]} />
      <Text style={[styles.rowLabel, highlighted && styles.rowLabelHighlighted]}>{label}</Text>
      {selected ? <Text style={styles.checkMark}>✓</Text> : null}
    </Pressable>
  );
}

export function ThemePickerModal({ visible, current, onSelect, onClose }: ThemePickerModalProps) {
  const { t } = useI18n();
  const { themeId, loaded } = useTheme();
  const isDefaultTheme = themeId === 'default' && loaded;

  const bodyContent = useMemo(
    () => (
      <ThemeOptionList
        current={current}
        onSelect={onSelect}
        onClose={onClose}
        isDefaultTheme={isDefaultTheme}
      />
    ),
    [current, isDefaultTheme, onClose, onSelect],
  );

  return (
    <ThemedGeneralConfirmModal
      visible={visible}
      icon="globe"
      title={t('settings.theme')}
      bodyMaxHeight={(isDefaultTheme ? DEFAULT_BODY_MAX_HEIGHT : BODY_MAX_HEIGHT) + 40}
      bodyContent={bodyContent}
      hideCancel
      hideConfirm
      confirmLabel={t('settings.cancel')}
      onCancel={onClose}
      onConfirm={onClose}
      dismissOnBackdrop
    />
  );
}

const styles = StyleSheet.create({
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
    gap: 10,
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
  previewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
  checkMark: {
    color: '#c43e3e',
    fontSize: 14,
    fontWeight: '700',
  },
});

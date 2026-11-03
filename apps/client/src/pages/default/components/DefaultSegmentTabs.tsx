import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Typo } from '../../../theme/typography';
import { TOKENS } from '../theme/tokens';

export type DefaultSegmentTab<T extends string> = {
  key: T;
  label: string;
};

type DefaultSegmentTabsProps<T extends string> = {
  tabs: DefaultSegmentTab<T>[];
  activeKey: T;
  onChange: (key: T) => void;
};

export function DefaultSegmentTabs<T extends string>({
  tabs,
  activeKey,
  onChange,
}: DefaultSegmentTabsProps<T>) {
  return (
    <View style={styles.track}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8, 9, 13, 0.55)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        } as object)
      : {}),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.pill,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: TOKENS.colors.line,
  },
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  labelActive: {
    color: TOKENS.colors.text,
  },
});

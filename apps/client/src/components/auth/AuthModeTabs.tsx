import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';

export type AuthTabMode = 'login' | 'register';

type AuthModeTabsProps = {
  mode: AuthTabMode;
  loginLabel: string;
  registerLabel: string;
  onChange: (mode: AuthTabMode) => void;
  disabled?: boolean;
};

export function AuthModeTabs({
  mode,
  loginLabel,
  registerLabel,
  onChange,
  disabled,
}: AuthModeTabsProps) {
  return (
    <View style={styles.tabs}>
      {(['login', 'register'] as const).map((tab) => {
        const active = mode === tab;
        const label = tab === 'login' ? loginLabel : registerLabel;
        return (
          <Pressable
            key={tab}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tab)}
            disabled={disabled}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 4,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  tabActive: {
    backgroundColor: COLORS.agents.tabActive,
  },
  tabText: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  tabTextActive: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'display',
  ),
});

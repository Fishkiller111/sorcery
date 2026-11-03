import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Typo } from '../../../theme/typography';
import { AGENT_MEDIA } from './agentMediaTokens';

export type AgentMediaFilterTab<T extends string> = {
  key: T;
  label: string;
};

type Props<T extends string> = {
  tabs: AgentMediaFilterTab<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  /** Centered cluster (mobile Figma); default equal-width slots (desktop). */
  centered?: boolean;
};

/**
 * Figma `847:94` — 4 equal slots, active #FF9ABA@20% pill 84×44.
 * Mobile `1114:14` — centered tab cluster.
 */
export function AgentMediaFilterTabs<T extends string>({
  tabs,
  activeKey,
  onChange,
  centered = false,
}: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <View style={[styles.row, centered && styles.rowCentered]}>
        {tabs.map((item) => {
          const active = activeKey === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={({ pressed }) => [
                centered ? styles.slotCentered : styles.slot,
                pressed && styles.slotPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.pill, active && styles.pillActive]}>
                <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    paddingTop: 6,
    paddingBottom: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: AGENT_MEDIA.tabPillHeight,
  },
  rowCentered: {
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 0,
  },
  slot: {
    flex: 1,
    height: AGENT_MEDIA.tabPillHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCentered: {
    height: AGENT_MEDIA.tabPillHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  slotPressed: {
    opacity: 0.85,
  },
  pill: {
    height: AGENT_MEDIA.tabPillHeight,
    minWidth: AGENT_MEDIA.tabPillMinWidth,
    paddingHorizontal: AGENT_MEDIA.tabPillPadX,
    borderRadius: AGENT_MEDIA.tabPillHeight / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: AGENT_MEDIA.tabActiveBg,
  },
  label: Typo(
    {
      color: AGENT_MEDIA.tabInactive,
      fontSize: AGENT_MEDIA.tabFontSize,
      fontWeight: '400',
      lineHeight: 22,
      textAlign: 'center',
    },
    'sans',
  ),
  labelActive: Typo(
    {
      color: AGENT_MEDIA.tabActiveText,
      fontSize: AGENT_MEDIA.tabFontSize,
      fontWeight: '400',
      lineHeight: 22,
      textAlign: 'center',
    },
    'sans',
  ),
});

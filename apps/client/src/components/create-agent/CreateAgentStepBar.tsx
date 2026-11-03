import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { WIZARD_STEPS, type WizardStep } from './types';

const STEP_TAB_BG = require('../../../assets/images/ui/create-agent/lable.png');

const STEP_META: Record<
  WizardStep,
  { labelKey: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  style: { labelKey: 'createAgent.wizard.stepStyle', icon: 'color-palette-outline' },
  basics: { labelKey: 'createAgent.wizard.stepBasics', icon: 'person-outline' },
  voice: { labelKey: 'createAgent.wizard.stepVoice', icon: 'musical-notes-outline' },
  personality: { labelKey: 'createAgent.wizard.stepPersonality', icon: 'heart-outline' },
  image: { labelKey: 'createAgent.wizard.stepImage', icon: 'image-outline' },
};

type CreateAgentStepBarProps = {
  current: WizardStep;
  maxReachedIndex: number;
  onSelect: (step: WizardStep) => void;
};

/** 向导顶部步骤 Tab：Style / Basics / Voice / Personality / Image — 五等分一排，不滑动 */
export function CreateAgentStepBar({
  current,
  maxReachedIndex,
  onSelect,
}: CreateAgentStepBarProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const currentIndex = WIZARD_STEPS.indexOf(current);

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('createAgent.wizard.heading')}</Text>
      <View style={styles.bar}>
        {WIZARD_STEPS.map((step, index) => {
          const meta = STEP_META[step];
          const selected = step === current;
          const done = index < currentIndex;
          const reachable = index <= maxReachedIndex;
          const disabled = !reachable && !selected;
          const iconColor = selected ? COLORS.accent.gold : '#000000';

          return (
            <Pressable
              key={step}
              style={[
                styles.tab,
                index < WIZARD_STEPS.length - 1 && styles.tabDivider,
                disabled && styles.tabDisabled,
              ]}
              onPress={() => reachable && onSelect(step)}
              disabled={disabled}
            >
              <ImageBackground
                source={STEP_TAB_BG}
                style={styles.tabBg}
                imageStyle={styles.tabBgImage}
                resizeMode="stretch"
              >
                {selected ? <View style={styles.tabSelectedOverlay} pointerEvents="none" /> : null}
                <View style={styles.tabInner}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : meta.icon}
                    size={13}
                    color={iconColor}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      selected && styles.tabTextSelected,
                      done && !selected && styles.tabTextDone,
                      disabled && styles.tabTextDisabled,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {t(meta.labelKey)}
                  </Text>
                </View>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
    wrap: { marginBottom: 20 },
    heading: Typo(
      {
        color: COLORS.agents.paleGold,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        letterSpacing: 0.5,
      },
      'display',
      lang,
    ),
    bar: {
      flexDirection: 'row',
      width: '100%',
      borderWidth: 1,
      borderColor: 'rgba(42, 34, 24, 0.5)',
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
      ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : {}),
    },
    tabDivider: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: 'rgba(42, 34, 24, 0.45)',
    },
    tabDisabled: {
      opacity: 0.45,
    },
    tabBg: {
      justifyContent: 'center',
      minHeight: 36,
    },
    tabBgImage: {
      resizeMode: 'stretch',
    },
    tabSelectedOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: COLORS.agents.tabActive,
    },
    tabInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 4,
      paddingVertical: 8,
      zIndex: 1,
    },
    tabText: Typo(
      {
        color: '#000000',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
        flexShrink: 1,
        minWidth: 0,
      },
      'display',
      lang,
    ),
    tabTextSelected: Typo(
      {
        color: COLORS.accent.gold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.2,
        flexShrink: 1,
        minWidth: 0,
      },
      'display',
      lang,
    ),
    tabTextDone: Typo(
      {
        color: '#000000',
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
        flexShrink: 1,
        minWidth: 0,
      },
      'display',
      lang,
    ),
    tabTextDisabled: Typo({ color: '#000000', fontSize: 10, flexShrink: 1, minWidth: 0 }, 'sans'),
  });
}

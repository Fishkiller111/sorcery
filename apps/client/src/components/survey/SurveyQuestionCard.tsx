import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import type { SurveyQuestionItem } from '../../types/api';

type SurveyQuestionCardProps = {
  question: SurveyQuestionItem;
  value: string;
  onChange: (value: string) => void;
  showRequiredHint?: boolean;
};

function parseMultiChoice(value: string): string[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function SurveyQuestionCard({
  question,
  value,
  onChange,
  showRequiredHint,
}: SurveyQuestionCardProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const options = question.options ?? [];

  const body = useMemo(() => {
    switch (question.question_type) {
      case 'text':
        return (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder={question.title}
            placeholderTextColor={COLORS.agents.paleGoldMuted}
          />
        );
      case 'textarea':
        return (
          <TextInput
            style={[styles.input, styles.textarea]}
            value={value}
            onChangeText={onChange}
            placeholder={question.title}
            placeholderTextColor={COLORS.agents.paleGoldMuted}
            multiline
            textAlignVertical="top"
          />
        );
      case 'single_choice':
        return (
          <View style={styles.optionList}>
            {options.map((opt) => {
              const selected = value === opt;
              return (
                <Pressable
                  key={opt}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onChange(opt)}
                >
                  <Text style={[Typo(styles.optionText, 'sans', lang), selected && Typo(styles.optionTextSelected, 'sans', lang)]}>{opt}</Text>
                  <View style={styles.optionIconSlot}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.agents.brightGold}
                      style={selected ? undefined : styles.optionIconHidden}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      case 'multi_choice': {
        const selected = parseMultiChoice(value);
        return (
          <View style={styles.optionList}>
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <Pressable
                  key={opt}
                  style={[styles.option, checked && styles.optionSelected]}
                  onPress={() => {
                    const next = checked
                      ? selected.filter((x) => x !== opt)
                      : [...selected, opt];
                    onChange(JSON.stringify(next));
                  }}
                >
                  <Text style={[Typo(styles.optionText, 'sans', lang), checked && Typo(styles.optionTextSelected, 'sans', lang)]}>{opt}</Text>
                  <View style={styles.optionIconSlot}>
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={checked ? COLORS.agents.brightGold : COLORS.agents.paleGoldMuted}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      }
      case 'rating':
        return (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = value === String(n);
              return (
                <Pressable
                  key={n}
                  style={[styles.ratingBtn, selected && styles.ratingBtnSelected]}
                  onPress={() => onChange(String(n))}
                >
                  <Text style={[Typo(styles.ratingText, 'display', lang), selected && Typo(styles.ratingTextSelected, 'display', lang)]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      default:
        return null;
    }
  }, [onChange, options, question.question_type, question.title, value]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{question.title}</Text>
      {question.description ? <Text style={styles.description}>{question.description}</Text> : null}
      {body}
      {showRequiredHint && question.required && !value.trim() ? (
        <Text style={Typo(styles.requiredHint, 'sans', lang)}>{t('survey.requiredHint')}</Text>
      ) : null}
      {question.question_type === 'rating' ? (
        <Text style={Typo(styles.ratingHint, 'mono', lang)}>{t('survey.ratingLabel')}</Text>
      ) : null}
    </ScrollView>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 16,
  },
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 30,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
  description: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    'sans', lang
  ),
  input: {
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.agents.paleGold,
    minHeight: 48,
  },
  textarea: {
    minHeight: 140,
    maxHeight: 280,
  },
  optionList: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  optionSelected: {
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: 'rgba(139, 26, 26, 0.25)',
  },
  optionText: { color: COLORS.agents.paleGoldMuted, fontSize: 15, flex: 1, lineHeight: 22 },
  optionTextSelected: {
    color: COLORS.agents.paleGold,
  },
  optionIconSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionIconHidden: {
    opacity: 0,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  ratingBtn: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  ratingBtnSelected: {
    borderColor: COLORS.agents.brightGold,
    backgroundColor: COLORS.agents.tabActive,
  },
  ratingText: { color: COLORS.agents.paleGoldMuted, fontSize: 18, fontWeight: '700' },
  ratingTextSelected: {
    color: COLORS.agents.paleGold,
  },
  ratingHint: { color: COLORS.agents.paleGoldMuted, fontSize: 11, marginTop: 4, letterSpacing: 0.8 },
  requiredHint: { color: COLORS.accent.red, fontSize: 13 },
});
};

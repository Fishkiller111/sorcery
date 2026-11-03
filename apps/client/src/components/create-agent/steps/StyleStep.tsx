import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { COLORS } from '../../../theme/colors';
import { Typo } from '../../../theme/typography';
import { OptionCard } from '../OptionCard';
import { OptionChip } from '../OptionChip';
import { OptionGrid } from '../OptionGrid';
import { DEFAULT_AGE } from '../age';
import { getStyleGenderImage } from '../options/optionAssets';
import { ART_STYLE_OPTIONS, GENDER_OPTIONS } from '../options/styleOptions';
import type { StyleDraft } from '../types';
import { DefaultCreateAgentAgeField } from '../../../pages/default/components/create-agent/DefaultCreateAgentAgeField';
import { useAuthStore } from '../../../stores/authStore';
import { canUserSeeMature } from '../../../utils/agentRatingDisplay';

type StyleStepProps = {
  draft: StyleDraft;
  onChange: (patch: Partial<StyleDraft>) => void;
};

export function StyleStep({ draft, onChange }: StyleStepProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const r18 = canUserSeeMature(user);
  const previewGender = draft.gender ?? 'female';
  const age = draft.age ?? DEFAULT_AGE;

  return (
    <View>
      <Text style={styles.section}>{t('createAgent.wizard.genderSection')}</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((opt) => (
          <OptionChip
            key={opt.id}
            label={t(opt.labelKey)}
            emoji={opt.emoji}
            selected={draft.gender === opt.id}
            onPress={() => onChange({ gender: opt.id })}
          />
        ))}
      </View>

      <Text style={styles.section}>{t('createAgent.wizard.ageSection')}</Text>
      <DefaultCreateAgentAgeField
        value={age}
        onChange={(next) => onChange({ age: next })}
      />

      <Text style={styles.section}>{t('createAgent.wizard.artSection')}</Text>
      <OptionGrid>
        {ART_STYLE_OPTIONS.map((opt) => (
          <OptionCard
            key={opt.id}
            label={t(opt.labelKey)}
            image={getStyleGenderImage(previewGender, opt.id, r18)}
            selected={draft.artStyle === opt.id}
            onPress={() => onChange({ artStyle: opt.id })}
          />
        ))}
      </OptionGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  section: Typo(
    { color: COLORS.agents.paleGoldMuted, fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 4, letterSpacing: 0.4 },
    'sans',
  ),
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
});

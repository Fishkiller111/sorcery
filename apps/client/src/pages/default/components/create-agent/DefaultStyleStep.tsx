import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useI18n } from '../../../../i18n/I18nContext';
import { DefaultCreateAgentSectionLabel } from './DefaultCreateAgentSectionLabel';
import { DefaultCreateAgentGenderOption } from './DefaultCreateAgentGenderOption';
import { DefaultCreateAgentOptionCard } from './DefaultCreateAgentOptionCard';
import { DefaultCreateAgentOptionGrid } from './DefaultCreateAgentOptionGrid';
import { DefaultCreateAgentAgeField } from './DefaultCreateAgentAgeField';
import { DEFAULT_AGE } from '../../../../components/create-agent/age';
import { getStyleGenderImage } from '../../../../components/create-agent/options/optionAssets';
import { ART_STYLE_OPTIONS, GENDER_OPTIONS } from '../../../../components/create-agent/options/styleOptions';
import type { StyleDraft } from '../../../../components/create-agent/types';
import { useAuthStore } from '../../../../stores/authStore';
import { canUserSeeMature } from '../../../../utils/agentRatingDisplay';

type DefaultStyleStepProps = {
  draft: StyleDraft;
  onChange: (patch: Partial<StyleDraft>) => void;
};

export function DefaultStyleStep({ draft, onChange }: DefaultStyleStepProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  // 与首页 R18 芯片一致：mature tier + VIP 时用 r18 选项图
  const r18 = canUserSeeMature(user);
  const previewGender = draft.gender ?? 'female';
  const age = draft.age ?? DEFAULT_AGE;

  return (
    <View style={styles.wrap}>
      <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.genderSection')} />
      <View style={styles.genderRow}>
        {GENDER_OPTIONS.map((opt) => (
          <DefaultCreateAgentGenderOption
            key={opt.id}
            label={t(opt.labelKey)}
            selected={draft.gender === opt.id}
            onPress={() => onChange({ gender: opt.id })}
          />
        ))}
      </View>

      <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.ageSection')} />
      <DefaultCreateAgentAgeField
        value={age}
        onChange={(next) => onChange({ age: next })}
      />

      <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.artSection')} />
      <DefaultCreateAgentOptionGrid large nativeColumns={2}>
        {ART_STYLE_OPTIONS.map((opt) => (
          <DefaultCreateAgentOptionCard
            key={opt.id}
            label={t(opt.labelKey)}
            image={getStyleGenderImage(previewGender, opt.id, r18)}
            selected={draft.artStyle === opt.id}
            onPress={() => onChange({ artStyle: opt.id })}
            large
          />
        ))}
      </DefaultCreateAgentOptionGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    width: '100%',
  },
});

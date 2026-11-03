import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { PersonalityTagInput } from '../../../../components/agent/PersonalityTagInput';
import { RoleEventEditor } from '../../../../components/agent/RoleEventEditor';
import { IntroCharCounter } from '../../../../components/create-agent/IntroCharCounter';
import { DefaultCreateAgentField } from './DefaultCreateAgentField';
import { DefaultCreateAgentSectionLabel } from './DefaultCreateAgentSectionLabel';
import { DefaultCreateAgentOptionCard } from './DefaultCreateAgentOptionCard';
import { DefaultCreateAgentOptionGrid } from './DefaultCreateAgentOptionGrid';
import { getPersonalityImage } from '../../../../components/create-agent/options/optionAssets';
import { PERSONALITY_PRESETS } from '../../../../components/create-agent/options/personalityPresets';
import { type LocaleFields } from '../../../../components/create-agent/types';
import type { RoleEventInput } from '../../../../types/api';
import { INTRO_MAX, introLength } from '../../../../utils/roleForm';
import { useAuthStore } from '../../../../stores/authStore';
import { canUserSeeMature } from '../../../../utils/agentRatingDisplay';

type DefaultPersonalityStepProps = {
  locale: LocaleFields;
  tagInput: string;
  showAdvanced: boolean;
  events: RoleEventInput[];
  onEventsChange: (events: RoleEventInput[]) => void;
  onUpdate: (patch: Partial<LocaleFields>) => void;
  onTagInputChange: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePreset: (tag: string) => void;
  onToggleAdvanced: () => void;
  onError: (msg: string | null) => void;
};

export function DefaultPersonalityStep({
  locale,
  tagInput,
  showAdvanced,
  events,
  onEventsChange,
  onUpdate,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onTogglePreset,
  onToggleAdvanced,
  onError,
}: DefaultPersonalityStepProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  // 与首页 R18 芯片一致：开启后用 r18 选项图
  const r18 = canUserSeeMature(user);
  const introLen = introLength(locale.introduction);
  const introOverMax = introLen > INTRO_MAX;

  return (
    <View>
      <Text style={styles.hint}>{t('createAgent.langSupport')}</Text>

      <DefaultCreateAgentField
        label={t('createAgent.name')}
        value={locale.name}
        onChangeText={(v) => onUpdate({ name: v })}
      />
      <DefaultCreateAgentField
        label={t('createAgent.introduction')}
        value={locale.introduction}
        onChangeText={(v) => onUpdate({ introduction: v })}
        multiline
        error={introOverMax}
      />
      <IntroCharCounter length={introLen} />

      <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.presetsSection')} />
      <DefaultCreateAgentOptionGrid nativeColumns={3}>
        {PERSONALITY_PRESETS.map((opt) => {
          const tag = t(opt.labelKey);
          const selected = locale.personality.includes(tag);
          return (
            <DefaultCreateAgentOptionCard
              key={opt.id}
              label={t(opt.labelKey)}
              image={getPersonalityImage(opt.id, r18)}
              selected={selected}
              onPress={() => onTogglePreset(tag)}
            />
          );
        })}
      </DefaultCreateAgentOptionGrid>

      <PersonalityTagInput
        label={t('createAgent.personality')}
        tags={locale.personality}
        input={tagInput}
        placeholder={t('createAgent.personalityPlaceholder')}
        onChangeInput={onTagInputChange}
        onAdd={onAddTag}
        onRemove={onRemoveTag}
      />

      <DefaultCreateAgentSectionLabel label={t('createAgent.wizard.interactionsSection')} />
      <Text style={styles.eventsHint}>{t('createAgent.wizard.defaultEventsHint')}</Text>
      <RoleEventEditor
        events={events}
        onChange={onEventsChange}
        disabled={false}
        showHeader={false}
        onError={onError}
        accentColor={TOKENS.colors.accent}
      />

      <Pressable onPress={onToggleAdvanced}>
        <Text style={styles.advancedToggle}>{t('createAgent.advanced')}</Text>
      </Pressable>

      {showAdvanced ? (
        <>
          <DefaultCreateAgentField
            label={t('createAgent.appearance')}
            value={locale.appearance}
            onChangeText={(v) => onUpdate({ appearance: v })}
          />
          <DefaultCreateAgentField
            label={t('createAgent.sceneName')}
            value={locale.sceneName}
            onChangeText={(v) => onUpdate({ sceneName: v })}
          />
          <DefaultCreateAgentField
            label={t('createAgent.sceneDesc')}
            value={locale.sceneDesc}
            onChangeText={(v) => onUpdate({ sceneDesc: v })}
            multiline
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 12,
    },
    'sans',
  ),
  eventsHint: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 10,
    },
    'sans',
  ),
  advancedToggle: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 16,
      marginBottom: 8,
    },
    'sans',
  ),
});

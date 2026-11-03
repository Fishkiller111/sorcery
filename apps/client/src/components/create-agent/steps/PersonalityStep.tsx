import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { COLORS } from '../../../theme/colors';
import { Typo } from '../../../theme/typography';
import { PersonalityTagInput } from '../../agent/PersonalityTagInput';
import { RoleEventEditor } from '../../agent/RoleEventEditor';
import { CreateAgentField } from '../CreateAgentField';
import { IntroCharCounter } from '../IntroCharCounter';
import { OptionCard } from '../OptionCard';
import { OptionGrid } from '../OptionGrid';
import { getPersonalityImage } from '../options/optionAssets';
import { PERSONALITY_PRESETS } from '../options/personalityPresets';
import { type LocaleFields } from '../types';
import type { RoleEventInput } from '../../../types/api';
import { INTRO_MAX, introLength } from '../../../utils/roleForm';
import { useAuthStore } from '../../../stores/authStore';
import { canUserSeeMature } from '../../../utils/agentRatingDisplay';

type PersonalityStepProps = {
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

export function PersonalityStep({
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
}: PersonalityStepProps) {

  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const r18 = canUserSeeMature(user);
  const introLen = introLength(locale.introduction);
  const introOverMax = introLen > INTRO_MAX;

  return (
    <View>
      <Text style={Typo(styles.hint, 'sans', lang)}>{t('createAgent.langSupport')}</Text>

      <CreateAgentField
        label={t('createAgent.name')}
        value={locale.name}
        onChangeText={(v) => onUpdate({ name: v })}
      />
      <CreateAgentField
        label={t('createAgent.introduction')}
        value={locale.introduction}
        onChangeText={(v) => onUpdate({ introduction: v })}
        multiline
        error={introOverMax}
      />
      <IntroCharCounter length={introLen} />

      <Text style={Typo(styles.section, 'sans', lang)}>{t('createAgent.wizard.presetsSection')}</Text>
      <OptionGrid columns={3}>
        {PERSONALITY_PRESETS.map((opt) => {
          const tag = t(opt.labelKey);
          const selected = locale.personality.includes(tag);
          return (
            <OptionCard
              key={opt.id}
              label={t(opt.labelKey)}
              image={getPersonalityImage(opt.id, r18)}
              selected={selected}
              onPress={() => onTogglePreset(tag)}
            />
          );
        })}
      </OptionGrid>

      <PersonalityTagInput
        label={t('createAgent.personality')}
        tags={locale.personality}
        input={tagInput}
        placeholder={t('createAgent.personalityPlaceholder')}
        onChangeInput={onTagInputChange}
        onAdd={onAddTag}
        onRemove={onRemoveTag}
      />

      <Text style={Typo(styles.section, 'sans', lang)}>{t('createAgent.wizard.interactionsSection')}</Text>
      <Text style={Typo(styles.eventsHint, 'sans', lang)}>{t('createAgent.wizard.defaultEventsHint')}</Text>
      <RoleEventEditor
        events={events}
        onChange={onEventsChange}
        disabled={false}
        showHeader={false}
        onError={onError}
      />

      <Pressable onPress={onToggleAdvanced}>
        <Text style={Typo(styles.advancedToggle, 'sans', lang)}>{t('createAgent.advanced')}</Text>
      </Pressable>

      {showAdvanced ? (
        <>
          <CreateAgentField
            label={t('createAgent.appearance')}
            value={locale.appearance}
            onChangeText={(v) => onUpdate({ appearance: v })}
          />
          <CreateAgentField
            label={t('createAgent.sceneName')}
            value={locale.sceneName}
            onChangeText={(v) => onUpdate({ sceneName: v })}
          />
          <CreateAgentField
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
  section: { color: COLORS.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 8 },
  eventsHint: { color: COLORS.text.muted, fontSize: 12, marginBottom: 8 },
  advancedToggle: { color: COLORS.accent.gold, fontSize: 14, marginVertical: 12 },
  hint: { color: COLORS.text.muted, fontSize: 12, marginBottom: 10 },
});

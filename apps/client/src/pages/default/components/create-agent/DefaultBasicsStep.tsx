import React, { useState } from 'react';
import { View } from 'react-native';
import { useI18n } from '../../../../i18n/I18nContext';
import { DefaultCreateAgentSectionLabel } from './DefaultCreateAgentSectionLabel';
import { DefaultCreateAgentOptionCard } from './DefaultCreateAgentOptionCard';
import { DefaultCreateAgentMoreCard } from './DefaultCreateAgentMoreCard';
import { DefaultCreateAgentOptionGrid } from './DefaultCreateAgentOptionGrid';
import { DefaultBasicsCustomPromptModal } from './DefaultBasicsCustomPromptModal';
import {
  getBodyTypeImage,
  getEthnicityImage,
  getHairStyleImage,
} from '../../../../components/create-agent/options/optionAssets';
import {
  BODY_TYPE_OPTIONS,
  ETHNICITY_OPTIONS,
  HAIR_STYLE_OPTIONS,
} from '../../../../components/create-agent/options/basicsOptions';
import {
  CUSTOM_OPTION_ID,
  type BasicsCustomField,
  type BasicsDraft,
  type OptionDef,
} from '../../../../components/create-agent/types';
import { useAuthStore } from '../../../../stores/authStore';
import { canUserSeeMature } from '../../../../utils/agentRatingDisplay';

type DefaultBasicsStepProps = {
  draft: BasicsDraft;
  onChange: (patch: Partial<BasicsDraft>) => void;
};

type OptionSectionProps = {
  title: string;
  options: OptionDef[];
  selected?: string;
  customText?: string;
  field: BasicsCustomField;
  onSelectPreset: (id: string) => void;
  onOpenCustom: () => void;
  resolveImage: (id: string) => ReturnType<typeof getEthnicityImage>;
  t: (key: string) => string;
};

function OptionSection({
  title,
  options,
  selected,
  customText,
  onSelectPreset,
  onOpenCustom,
  resolveImage,
  t,
}: OptionSectionProps) {
  const customSelected = selected === CUSTOM_OPTION_ID;
  const moreHint = customSelected && customText?.trim() ? customText.trim() : t('createAgent.wizard.basicsMoreHint');

  return (
    <>
      <DefaultCreateAgentSectionLabel label={title} />
      <DefaultCreateAgentOptionGrid nativeColumns={3}>
        {options.map((opt) => (
          <DefaultCreateAgentOptionCard
            key={opt.id}
            label={t(opt.labelKey)}
            image={resolveImage(opt.id)}
            selected={selected === opt.id}
            onPress={() => onSelectPreset(opt.id)}
          />
        ))}
        <DefaultCreateAgentMoreCard
          label={t('createAgent.wizard.basicsMore')}
          hint={moreHint}
          selected={customSelected}
          onPress={onOpenCustom}
        />
      </DefaultCreateAgentOptionGrid>
    </>
  );
}

export function DefaultBasicsStep({ draft, onChange }: DefaultBasicsStepProps) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  // 与首页 R18 芯片一致：开启后用 r18 选项图
  const r18 = canUserSeeMature(user);
  const [customField, setCustomField] = useState<BasicsCustomField | null>(null);

  const customModalMeta = (() => {
    if (customField === 'ethnicity') {
      return {
        title: t('createAgent.wizard.basicsCustomEthnicityTitle'),
        placeholder: t('createAgent.wizard.basicsCustomEthnicityPlaceholder'),
        initialValue: draft.ethnicityCustom ?? '',
      };
    }
    if (customField === 'hairStyle') {
      return {
        title: t('createAgent.wizard.basicsCustomHairTitle'),
        placeholder: t('createAgent.wizard.basicsCustomHairPlaceholder'),
        initialValue: draft.hairStyleCustom ?? '',
      };
    }
    if (customField === 'bodyType') {
      return {
        title: t('createAgent.wizard.basicsCustomBodyTitle'),
        placeholder: t('createAgent.wizard.basicsCustomBodyPlaceholder'),
        initialValue: draft.bodyTypeCustom ?? '',
      };
    }
    return null;
  })();

  return (
    <View>
      <OptionSection
        title={t('createAgent.wizard.ethnicitySection')}
        options={ETHNICITY_OPTIONS}
        field="ethnicity"
        selected={draft.ethnicity}
        customText={draft.ethnicityCustom}
        onSelectPreset={(id) => onChange({ ethnicity: id, ethnicityCustom: undefined })}
        onOpenCustom={() => setCustomField('ethnicity')}
        resolveImage={(id) => getEthnicityImage(id, r18)}
        t={t}
      />
      <OptionSection
        title={t('createAgent.wizard.hairSection')}
        options={HAIR_STYLE_OPTIONS}
        field="hairStyle"
        selected={draft.hairStyle}
        customText={draft.hairStyleCustom}
        onSelectPreset={(id) => onChange({ hairStyle: id, hairStyleCustom: undefined })}
        onOpenCustom={() => setCustomField('hairStyle')}
        resolveImage={(id) => getHairStyleImage(id, r18)}
        t={t}
      />
      <OptionSection
        title={t('createAgent.wizard.bodySection')}
        options={BODY_TYPE_OPTIONS}
        field="bodyType"
        selected={draft.bodyType}
        customText={draft.bodyTypeCustom}
        onSelectPreset={(id) => onChange({ bodyType: id, bodyTypeCustom: undefined })}
        onOpenCustom={() => setCustomField('bodyType')}
        resolveImage={(id) => getBodyTypeImage(id, r18)}
        t={t}
      />

      {customModalMeta ? (
        <DefaultBasicsCustomPromptModal
          visible={customField != null}
          title={customModalMeta.title}
          placeholder={customModalMeta.placeholder}
          initialValue={customModalMeta.initialValue}
          onClose={() => setCustomField(null)}
          onConfirm={(value) => {
            if (customField === 'ethnicity') {
              onChange({ ethnicity: CUSTOM_OPTION_ID, ethnicityCustom: value });
            } else if (customField === 'hairStyle') {
              onChange({ hairStyle: CUSTOM_OPTION_ID, hairStyleCustom: value });
            } else if (customField === 'bodyType') {
              onChange({ bodyType: CUSTOM_OPTION_ID, bodyTypeCustom: value });
            }
            setCustomField(null);
          }}
        />
      ) : null}
    </View>
  );
}

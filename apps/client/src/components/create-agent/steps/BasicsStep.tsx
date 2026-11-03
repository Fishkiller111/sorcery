import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../../i18n/I18nContext';
import { COLORS } from '../../../theme/colors';
import { Typo } from '../../../theme/typography';
import { OptionCard } from '../OptionCard';
import { OptionGrid } from '../OptionGrid';
import {
  getBodyTypeImage,
  getEthnicityImage,
  getHairStyleImage,
  OPTION_CARD_ASPECT,
} from '../options/optionAssets';
import {
  BODY_TYPE_OPTIONS,
  ETHNICITY_OPTIONS,
  HAIR_STYLE_OPTIONS,
} from '../options/basicsOptions';
import {
  CUSTOM_OPTION_ID,
  type BasicsCustomField,
  type BasicsDraft,
  type OptionDef,
} from '../types';
import { useAuthStore } from '../../../stores/authStore';
import { canUserSeeMature } from '../../../utils/agentRatingDisplay';

type BasicsStepProps = {
  draft: BasicsDraft;
  onChange: (patch: Partial<BasicsDraft>) => void;
};

function MoreCard({
  label,
  hint,
  selected,
  onPress,
  style,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const { lang } = useI18n();
  return (
    <Pressable
      style={[styles.moreWrap, selected && styles.moreWrapSelected, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.moreCard}>
        <Ionicons name="create-outline" size={22} color={COLORS.agents.brightGold} />
        <Text style={Typo(styles.moreLabel, 'display', lang)} numberOfLines={2}>
          {label.toUpperCase()}
        </Text>
        {hint ? (
          <Text style={Typo(styles.moreHint, 'sans', lang)} numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type OptionSectionProps = {
  title: string;
  options: OptionDef[];
  selected?: string;
  customText?: string;
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
  const { lang } = useI18n();
  const customSelected = selected === CUSTOM_OPTION_ID;
  const moreHint =
    customSelected && customText?.trim()
      ? customText.trim()
      : t('createAgent.wizard.basicsMoreHint');

  return (
    <>
      <Text style={Typo(styles.section, 'sans', lang)}>{title}</Text>
      <OptionGrid columns={3}>
        {options.map((opt) => (
          <OptionCard
            key={opt.id}
            label={t(opt.labelKey)}
            image={resolveImage(opt.id)}
            selected={selected === opt.id}
            onPress={() => onSelectPreset(opt.id)}
          />
        ))}
        <MoreCard
          label={t('createAgent.wizard.basicsMore')}
          hint={moreHint}
          selected={customSelected}
          onPress={onOpenCustom}
        />
      </OptionGrid>
    </>
  );
}

export function BasicsStep({ draft, onChange }: BasicsStepProps) {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const r18 = canUserSeeMature(user);
  const [customField, setCustomField] = useState<BasicsCustomField | null>(null);
  const [draftText, setDraftText] = useState('');

  const openCustom = (field: BasicsCustomField) => {
    const initial =
      field === 'ethnicity'
        ? draft.ethnicityCustom ?? ''
        : field === 'hairStyle'
          ? draft.hairStyleCustom ?? ''
          : draft.bodyTypeCustom ?? '';
    setDraftText(initial);
    setCustomField(field);
  };

  const title =
    customField === 'ethnicity'
      ? t('createAgent.wizard.basicsCustomEthnicityTitle')
      : customField === 'hairStyle'
        ? t('createAgent.wizard.basicsCustomHairTitle')
        : t('createAgent.wizard.basicsCustomBodyTitle');
  const placeholder =
    customField === 'ethnicity'
      ? t('createAgent.wizard.basicsCustomEthnicityPlaceholder')
      : customField === 'hairStyle'
        ? t('createAgent.wizard.basicsCustomHairPlaceholder')
        : t('createAgent.wizard.basicsCustomBodyPlaceholder');

  const canSave = draftText.trim().length > 0;

  return (
    <View>
      <OptionSection
        title={t('createAgent.wizard.ethnicitySection')}
        options={ETHNICITY_OPTIONS}
        selected={draft.ethnicity}
        customText={draft.ethnicityCustom}
        onSelectPreset={(id) => onChange({ ethnicity: id, ethnicityCustom: undefined })}
        onOpenCustom={() => openCustom('ethnicity')}
        resolveImage={(id) => getEthnicityImage(id, r18)}
        t={t}
      />
      <OptionSection
        title={t('createAgent.wizard.hairSection')}
        options={HAIR_STYLE_OPTIONS}
        selected={draft.hairStyle}
        customText={draft.hairStyleCustom}
        onSelectPreset={(id) => onChange({ hairStyle: id, hairStyleCustom: undefined })}
        onOpenCustom={() => openCustom('hairStyle')}
        resolveImage={(id) => getHairStyleImage(id, r18)}
        t={t}
      />
      <OptionSection
        title={t('createAgent.wizard.bodySection')}
        options={BODY_TYPE_OPTIONS}
        selected={draft.bodyType}
        customText={draft.bodyTypeCustom}
        onSelectPreset={(id) => onChange({ bodyType: id, bodyTypeCustom: undefined })}
        onOpenCustom={() => openCustom('bodyType')}
        resolveImage={(id) => getBodyTypeImage(id, r18)}
        t={t}
      />

      <Modal
        visible={customField != null}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomField(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCustomField(null)} />
          <View style={styles.modalSheet}>
            <Text style={Typo(styles.modalTitle, 'display', lang)}>{title}</Text>
            <Text style={Typo(styles.modalHint, 'sans', lang)}>
              {t('createAgent.wizard.basicsCustomHint')}
            </Text>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder={placeholder}
              placeholderTextColor={COLORS.agents.paleGoldMuted}
              multiline
              textAlignVertical="top"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={() => setCustomField(null)}>
                <Text style={Typo(styles.modalBtnSecondaryText, 'sans', lang)}>{t('chat.close')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnPrimary, !canSave && styles.modalBtnDisabled]}
                disabled={!canSave}
                onPress={() => {
                  const value = draftText.trim();
                  if (customField === 'ethnicity') {
                    onChange({ ethnicity: CUSTOM_OPTION_ID, ethnicityCustom: value });
                  } else if (customField === 'hairStyle') {
                    onChange({ hairStyle: CUSTOM_OPTION_ID, hairStyleCustom: value });
                  } else if (customField === 'bodyType') {
                    onChange({ bodyType: CUSTOM_OPTION_ID, bodyTypeCustom: value });
                  }
                  setCustomField(null);
                }}
              >
                <Text style={Typo(styles.modalBtnPrimaryText, 'sans', lang)}>
                  {t('createAgent.wizard.basicsCustomConfirm')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: COLORS.text.secondary, fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 12 },
  moreWrap: {
    borderRadius: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.agents.brightGold,
    overflow: 'hidden',
    backgroundColor: 'rgba(139, 26, 26, 0.18)',
  },
  moreWrapSelected: {
    borderStyle: 'solid',
    borderColor: COLORS.accent.red,
  },
  moreCard: {
    width: '100%',
    aspectRatio: OPTION_CARD_ASPECT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  moreLabel: {
    color: COLORS.agents.paleGold,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  moreHint: {
    color: COLORS.agents.paleGoldMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    backgroundColor: COLORS.bg.primary,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: COLORS.agents.paleGold,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHint: {
    color: COLORS.agents.paleGoldMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: COLORS.agents.paleGold,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalBtnSecondary: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.agents.borderStrong,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    flex: 1,
    minHeight: 42,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.red,
  },
  modalBtnDisabled: {
    opacity: 0.45,
  },
  modalBtnSecondaryText: {
    color: COLORS.agents.paleGold,
    fontSize: 14,
    fontWeight: '600',
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

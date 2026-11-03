import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { AvatarCropModal } from '../../components/profile/AvatarCropModal';
import { FigureRegenerateModal } from '../../components/create-agent/FigureRegenerateModal';
import { useCreateAgentWizard } from '../../components/create-agent/useCreateAgentWizard';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { DefaultShell } from './components/DefaultShell';
import { DefaultCreateAgentStepBar } from './components/create-agent/DefaultCreateAgentStepBar';
import { DefaultCreateAgentNav } from './components/create-agent/DefaultCreateAgentNav';
import { DefaultStyleStep } from './components/create-agent/DefaultStyleStep';
import { DefaultBasicsStep } from './components/create-agent/DefaultBasicsStep';
import { DefaultVoiceStep } from './components/create-agent/DefaultVoiceStep';
import { DefaultPersonalityStep } from './components/create-agent/DefaultPersonalityStep';
import { DefaultImageStep } from './components/create-agent/DefaultImageStep';
import { TOKENS } from './theme/tokens';

export default function DefaultCreateAgent() {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const wizard = useCreateAgentWizard();

  const stepContent = useMemo(() => {
    switch (wizard.step) {
      case 'style':
        return (
          <DefaultStyleStep
            draft={wizard.styleDraft}
            onChange={(p) => wizard.setStyleDraft((s) => ({ ...s, ...p }))}
          />
        );
      case 'basics':
        return (
          <DefaultBasicsStep
            draft={wizard.basicsDraft}
            onChange={(p) => wizard.setBasicsDraft((s) => ({ ...s, ...p }))}
          />
        );
      case 'voice':
        return (
          <DefaultVoiceStep
            selectedId={wizard.voiceReferenceId || undefined}
            onSelect={wizard.setVoiceReferenceId}
          />
        );
      case 'personality':
        return (
          <DefaultPersonalityStep
            locale={wizard.locale}
            tagInput={wizard.tagInput}
            showAdvanced={wizard.showAdvanced}
            events={wizard.events}
            onEventsChange={wizard.setEvents}
            onUpdate={wizard.updateLocale}
            onTagInputChange={wizard.setTagInput}
            onAddTag={wizard.addTag}
            onRemoveTag={wizard.removeTag}
            onTogglePreset={wizard.togglePreset}
            onToggleAdvanced={() => wizard.setShowAdvanced((v) => !v)}
            onError={wizard.showStepError}
          />
        );
      case 'image':
        return (
          <DefaultImageStep
            name={wizard.previewName}
            personality={wizard.previewPersonality}
            previewUri={wizard.previewUri}
            uploading={wizard.uploading}
            generatingPreview={wizard.generatingPreview}
            previewProgress={wizard.previewProgress}
            previewEnabled={wizard.previewEnabled}
            onPickFigure={wizard.handlePickFigure}
            onRegeneratePress={wizard.openRegenerate}
          />
        );
      default:
        return null;
    }
  }, [wizard]);

  return (
    <DefaultShell scrollable>
      <View style={[styles.content, isDesktop ? styles.contentDesktop : styles.contentMobile, pageContentPadding]}>
        <Text style={styles.heading}>{t('createAgent.wizard.heading')}</Text>
        <Text style={styles.subtitle}>{t('createAgent.wizard.subtitle')}</Text>

        <DefaultCreateAgentStepBar
          current={wizard.step}
          maxReachedIndex={wizard.maxReachedIndex}
          onSelect={wizard.goToStep}
        />

        <View style={styles.stepPanel}>{stepContent}</View>

        <DefaultCreateAgentNav
          step={wizard.step}
          submitting={wizard.submitting}
          canProceed={wizard.canProceed}
          canCreate={wizard.canCreate}
          onBack={wizard.onBack}
          onNext={wizard.onNext}
          onCreate={wizard.onSubmit}
        />
      </View>

      {Platform.OS === 'web' ? (
        <AvatarCropModal
          variant="figure"
          visible={wizard.cropPick != null}
          imageUri={wizard.cropPick?.previewUri ?? ''}
          loading={wizard.uploading}
          onConfirm={wizard.handleCropConfirm}
          onCancel={wizard.handleCropCancel}
        />
      ) : null}

      <FigureRegenerateModal
        visible={wizard.regenerateOpen}
        accentColor={TOKENS.colors.accent}
        costLabel={wizard.previewCostLabel}
        onClose={wizard.closeRegenerate}
        onConfirm={wizard.onRegenerate}
      />
    </DefaultShell>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: 8,
  },
  contentDesktop: {
    paddingTop: 28,
    paddingHorizontal: 40,
    maxWidth: 920,
    alignSelf: 'center',
    paddingBottom: 56,
  },
  contentMobile: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heading: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '600',
      letterSpacing: 2.2,
      textTransform: 'uppercase',
    },
    'serif',
  ),
  subtitle: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 8,
      maxWidth: 520,
    },
    'sans',
  ),
  stepPanel: {
    minHeight: 120,
    width: '100%',
  },
});

import type { Lang } from '../../i18n/types';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { AvatarCropModal } from '../profile/AvatarCropModal';
import { CreateAgentNav } from './CreateAgentNav';
import { CreateAgentStepBar } from './CreateAgentStepBar';
import { ContestThemeStrip } from './ContestThemeStrip';
import { FigureRegenerateModal } from './FigureRegenerateModal';
import { BasicsStep } from './steps/BasicsStep';
import { ImageStep } from './steps/ImageStep';
import { PersonalityStep } from './steps/PersonalityStep';
import { StyleStep } from './steps/StyleStep';
import { VoiceStep } from './steps/VoiceStep';
import { useCreateAgentWizard } from './useCreateAgentWizard';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { themedScrollViewProps } from '../../theme/webScrollbar';

/** 创建 Agent 多步向导：编排步骤切换、校验与最终提交 */
export function CreateAgentWizard() {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const wizard = useCreateAgentWizard();

  const stepContent = useMemo(() => {
    switch (wizard.step) {
      case 'style':
        return (
          <StyleStep
            draft={wizard.styleDraft}
            onChange={(p) => wizard.setStyleDraft((s) => ({ ...s, ...p }))}
          />
        );
      case 'basics':
        return (
          <BasicsStep
            draft={wizard.basicsDraft}
            onChange={(p) => wizard.setBasicsDraft((s) => ({ ...s, ...p }))}
          />
        );
      case 'voice':
        return (
          <VoiceStep
            selectedId={wizard.voiceReferenceId || undefined}
            onSelect={wizard.setVoiceReferenceId}
          />
        );
      case 'personality':
        return (
          <PersonalityStep
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
          <ImageStep
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
    <>
      <ScrollView
        {...scrollWebProps}
        style={[styles.scroll, scrollWebProps.style]}
        contentContainerStyle={[styles.content, pageContentPadding]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{t('createAgent.wizard.subtitle')}</Text>
        <ContestThemeStrip />

        <View style={styles.layout}>
          <View style={styles.mainCol}>
            <CreateAgentStepBar
              current={wizard.step}
              maxReachedIndex={wizard.maxReachedIndex}
              onSelect={wizard.goToStep}
            />

            <View style={styles.stepPanel}>{stepContent}</View>

            <CreateAgentNav
              step={wizard.step}
              submitting={wizard.submitting}
              canProceed={wizard.canProceed}
              canCreate={wizard.canCreate}
              onBack={wizard.onBack}
              onNext={wizard.onNext}
              onCreate={wizard.onSubmit}
            />
          </View>
        </View>
      </ScrollView>

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
        accentColor={COLORS.soviet.embroideryLight}
        costLabel={wizard.previewCostLabel}
        onClose={wizard.closeRegenerate}
        onConfirm={wizard.onRegenerate}
      />
    </>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  subtitle: Typo({ color: COLORS.text.muted, fontSize: 13, marginBottom: 16, lineHeight: 20 }, 'sans', lang),
  layout: { gap: 0 },
  mainCol: { flex: 1, minWidth: 0 },
  stepPanel: { minHeight: 120 },
});
};

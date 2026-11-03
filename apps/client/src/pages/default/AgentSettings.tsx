import type { Lang } from '../../i18n/types';
import { useI18n } from '../../i18n/I18nContext';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { DefaultShell } from './components/DefaultShell';
import { DefaultBackButton } from './components/DefaultBackButton';
import { DefaultCreateAgentField } from './components/create-agent/DefaultCreateAgentField';
import { DefaultCreateAgentSectionLabel } from './components/create-agent/DefaultCreateAgentSectionLabel';
import { DefaultVoiceStep } from './components/create-agent/DefaultVoiceStep';
import { DefaultCreateAgentPreview } from './components/create-agent/DefaultCreateAgentPreview';
import { DefaultSegmentTabs } from './components/DefaultSegmentTabs';
import { TOKENS } from './theme/tokens';
import { Typo } from '../../theme/typography';
import { useAgentSettings } from '../../hooks/useAgentSettings';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { PublishStatusBadge } from '../../components/agent/PublishStatusBadge';
import { PersonalityTagInput } from '../../components/agent/PersonalityTagInput';
import { RoleCategoryTagEditor } from '../../components/agent/RoleCategoryTagEditor';
import { RoleEventEditor } from '../../components/agent/RoleEventEditor';
import { AgentScheduleSection } from '../../components/agent/AgentScheduleSection';
import { AgentMediaLibrarySection } from '../../components/agent/AgentMediaLibrarySection';
import { IntroCharCounter } from '../../components/create-agent/IntroCharCounter';
import { ThemedGeneralConfirmModal } from '../../components/ui/ThemedGeneralConfirmModal';
import { AvatarCropModal } from '../../components/profile/AvatarCropModal';
import { resolveStaticUrl } from '../../constants/config';
import { INTRO_MAX, introLength } from '../../utils/roleForm';
import { useMobilePageContentPaddingStyle } from '../../hooks/useMobileSafeAreaPadding';
import { safeGoBack } from '../../utils/safeGoBack';

type SettingsTab = 'voice' | 'events' | 'schedule' | 'media';

export default function DefaultAgentSettings() {
  const { lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isDesktop = useIsDesktop();
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const vm = useAgentSettings();
  const [tab, setTab] = useState<SettingsTab>('voice');

  const previewUri =
    vm.figurePreview || (vm.figureUrl ? resolveStaticUrl(vm.figureUrl) : undefined);

  const tabs = [
    { key: 'voice' as const, label: vm.t('agent.tabVoice') },
    { key: 'events' as const, label: vm.t('agent.tabEvents') },
    { key: 'schedule' as const, label: vm.t('agent.tabSchedule') },
    { key: 'media' as const, label: vm.t('agent.tabMedia') },
  ];

  return (
    <DefaultShell scrollable>
      <View style={[styles.content, isDesktop ? styles.contentDesktop : styles.contentMobile, pageContentPadding]}>
        <View style={styles.topRow}>
          <DefaultBackButton onPress={() => safeGoBack('/free-chat', vm.router)} accessibilityLabel={vm.t('menu.back')} />
          <Text style={styles.heading}>{vm.t('agent.settings')}</Text>
          <View style={styles.topSpacer} />
        </View>

        {vm.loading ? (
          <ActivityIndicator color={TOKENS.colors.accent} style={styles.loader} />
        ) : vm.loadFailed && !vm.detail ? (
          <Text style={Typo(styles.error, 'sans', vm.lang)}>{vm.t('errors.unknown')}</Text>
        ) : vm.detail ? (
          <>
            <View style={styles.statusRow}>
              <PublishStatusBadge status={vm.publishStatus} />
              {vm.detail.version ? (
                <Text style={Typo(styles.versionText, 'mono', vm.lang)}>v{vm.detail.version}</Text>
              ) : null}
            </View>

            {vm.detail.moderation_note ? (
              <Text style={Typo(styles.moderationNote, 'sans', vm.lang)}>{vm.detail.moderation_note}</Text>
            ) : null}

            {!vm.canEdit ? (
              <Text style={Typo(styles.hint, 'sans', vm.lang)}>{vm.t('agent.pendingEditHint')}</Text>
            ) : (
              <View style={styles.formCol}>
                <DefaultCreateAgentPreview
                  name={vm.name}
                  personality={vm.personality}
                  figureUri={previewUri}
                  uploading={vm.figureUploading}
                  onPickFigure={vm.handlePickFigure}
                />

                <DefaultCreateAgentField label={vm.t('createAgent.name')} value={vm.name} onChangeText={vm.setName} />
                <DefaultCreateAgentField
                  label={vm.t('createAgent.introduction')}
                  value={vm.introduction}
                  onChangeText={vm.setIntroduction}
                  multiline
                  error={introLength(vm.introduction) > INTRO_MAX}
                />
                <IntroCharCounter length={introLength(vm.introduction)} />

                <PersonalityTagInput
                  label={vm.t('createAgent.personality')}
                  tags={vm.personality}
                  input={vm.tagInput}
                  placeholder={vm.t('createAgent.personalityPlaceholder')}
                  onChangeInput={vm.setTagInput}
                  onAdd={vm.addTag}
                  onRemove={vm.removeTag}
                />

                <RoleCategoryTagEditor
                  variant="default"
                  selectedIds={vm.categoryIds}
                  onChange={vm.setCategoryIds}
                  disabled={!!vm.busy}
                  seedCategories={vm.seedCategories}
                />

                <DefaultCreateAgentField
                  label={vm.t('createAgent.appearance')}
                  value={vm.appearance}
                  onChangeText={vm.setAppearance}
                />
                <DefaultCreateAgentField
                  label={vm.t('createAgent.sceneName')}
                  value={vm.sceneName}
                  onChangeText={vm.setSceneName}
                />
                <DefaultCreateAgentField
                  label={vm.t('createAgent.sceneDesc')}
                  value={vm.sceneDesc}
                  onChangeText={vm.setSceneDesc}
                  multiline
                />

                <View style={styles.tabsBlock}>
                  <DefaultSegmentTabs tabs={tabs} activeKey={tab} onChange={setTab} />
                </View>

                {tab === 'voice' ? (
                  <DefaultVoiceStep
                    selectedId={vm.voiceReferenceId || undefined}
                    onSelect={vm.setVoiceReferenceId}
                  />
                ) : null}

                {tab === 'events' ? (
                  <View style={styles.tabPanel}>
                    <DefaultCreateAgentSectionLabel label={vm.t('events.title')} />
                    <RoleEventEditor
                      events={vm.events}
                      onChange={vm.setEvents}
                      disabled={!!vm.busy}
                      onError={vm.showFormError}
                      accentColor={TOKENS.colors.accent}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.btn,
                        styles.btnGhost,
                        pressed && styles.btnPressed,
                        vm.busy === 'events' && styles.btnDisabled,
                      ]}
                      onPress={() => void vm.onSaveEvents()}
                      disabled={!!vm.busy}
                    >
                      {vm.busy === 'events' ? (
                        <ActivityIndicator color={TOKENS.colors.text} />
                      ) : (
                        <Text style={Typo(styles.btnGhostText, 'sans', vm.lang)}>{vm.t('events.save')}</Text>
                      )}
                    </Pressable>
                  </View>
                ) : null}

                {tab === 'schedule' ? (
                  <AgentScheduleSection
                    timezone={vm.scheduleTimezone}
                    startHour={vm.scheduleStartHour}
                    endHour={vm.scheduleEndHour}
                    usingDefault={vm.scheduleUsingDefault}
                    busy={vm.busy === 'schedule'}
                    accentColor={TOKENS.colors.accent}
                    mutedColor={TOKENS.colors.textMuted}
                    textColor={TOKENS.colors.text}
                    borderColor={TOKENS.colors.line}
                    chipBg={TOKENS.colors.bgElevated}
                    chipActiveBg="rgba(186, 60, 71, 0.18)"
                    onChangeTimezone={vm.onChangeScheduleTimezone}
                    onChangeStartHour={vm.onChangeScheduleStartHour}
                    onChangeEndHour={vm.onChangeScheduleEndHour}
                    onResetDefault={vm.onResetScheduleDefault}
                    onSave={() => void vm.onSaveSchedule()}
                    mediaWeightStandard={vm.mediaWeightStandard}
                    mediaWeightR={vm.mediaWeightR}
                    mediaWeightMature={vm.mediaWeightMature}
                    onChangeMediaWeightStandard={vm.setMediaWeightStandard}
                    onChangeMediaWeightR={vm.setMediaWeightR}
                    onChangeMediaWeightMature={vm.setMediaWeightMature}
                    SectionLabel={DefaultCreateAgentSectionLabel}
                  />
                ) : null}

                {tab === 'media' && vm.detail?.id ? (
                  <AgentMediaLibrarySection
                    roleId={vm.detail.id}
                    disabled={!!vm.busy}
                    active={tab === 'media'}
                  />
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    styles.btnSecondary,
                    pressed && styles.btnSecondaryPressed,
                    vm.busy === 'save' && styles.btnDisabled,
                  ]}
                  onPress={() => void vm.onSave()}
                  disabled={!!vm.busy}
                >
                  {vm.busy === 'save' ? (
                    <ActivityIndicator color={TOKENS.colors.accent} />
                  ) : (
                    <Text style={Typo(styles.btnSecondaryText, 'sans', vm.lang)}>{vm.t('agent.save')}</Text>
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.footerCol}>
              <View style={styles.actionRow}>
                {vm.canPublish ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnPrimary,
                      styles.btnFlex,
                      pressed && styles.btnPrimaryPressed,
                      vm.busy === 'publish' && styles.btnDisabled,
                    ]}
                    onPress={() => void vm.onPublish()}
                    disabled={!!vm.busy}
                  >
                    {vm.busy === 'publish' ? (
                      <ActivityIndicator color={TOKENS.colors.text} />
                    ) : (
                      <Text style={Typo(styles.btnPrimaryText, 'sans', vm.lang)}>{vm.t('agent.publish')}</Text>
                    )}
                  </Pressable>
                ) : null}
                {vm.canUnpublish ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.btn,
                      styles.btnGhost,
                      styles.btnFlex,
                      pressed && styles.btnPressed,
                      vm.busy === 'unpublish' && styles.btnDisabled,
                    ]}
                    onPress={() => void vm.onUnpublish()}
                    disabled={!!vm.busy}
                  >
                    <Text style={Typo(styles.btnGhostText, 'sans', vm.lang)}>{vm.t('agent.unpublish')}</Text>
                  </Pressable>
                ) : null}
              </View>

              <DefaultCreateAgentSectionLabel label={vm.t('agent.versions')} />
              {vm.revisions.length === 0 ? (
                <Text style={Typo(styles.hint, 'sans', vm.lang)}>{vm.t('agent.noVersions')}</Text>
              ) : (
                vm.revisions.map((rev) => (
                  <View key={rev.version} style={styles.revisionRow}>
                    <View style={styles.revisionInfo}>
                      <Text style={Typo(styles.revisionVersion, 'mono', vm.lang)}>v{rev.version}</Text>
                      <Text style={Typo(styles.revisionSummary, 'sans', vm.lang)}>{rev.change_summary || '—'}</Text>
                    </View>
                    {vm.canEdit && rev.version !== vm.detail?.version ? (
                      <Pressable
                        onPress={() => vm.onRestore(rev.version)}
                        disabled={!!vm.busy}
                        style={styles.restoreBtn}
                      >
                        <Text style={Typo(styles.restoreText, 'sans', vm.lang)}>{vm.t('agent.restoreVersion')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnDanger,
                  pressed && styles.btnPressed,
                  vm.busy === 'delete' && styles.btnDisabled,
                ]}
                onPress={vm.onDelete}
                disabled={!!vm.busy}
              >
                <Text style={Typo(styles.btnDangerText, 'sans', vm.lang)}>{vm.t('agent.delete')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      <ThemedGeneralConfirmModal
        visible={vm.confirmDelete}
        icon="trash"
        title={vm.t('agent.delete')}
        subtitle={vm.t('agent.deleteConfirm')}
        subtitleTone="warning"
        cancelLabel={vm.t('menu.back')}
        confirmLabel={vm.t('agent.delete')}
        onCancel={() => vm.setConfirmDelete(false)}
        onConfirm={() => void vm.confirmDeleteAction()}
        loading={vm.busy === 'delete'}
      />

      <ThemedGeneralConfirmModal
        visible={vm.confirmRestoreVersion != null}
        icon="warning"
        title={vm.t('agent.restoreVersion')}
        subtitle={
          vm.confirmRestoreVersion != null
            ? vm.t('agent.restoreConfirm').replace('{version}', String(vm.confirmRestoreVersion))
            : undefined
        }
        subtitleTone="warning"
        cancelLabel={vm.t('menu.back')}
        confirmLabel={vm.t('agent.restoreVersion')}
        onCancel={() => vm.setConfirmRestoreVersion(null)}
        onConfirm={() => void vm.confirmRestoreAction()}
        loading={vm.busy === `restore-${vm.confirmRestoreVersion ?? ''}`}
      />

      {Platform.OS === 'web' ? (
        <AvatarCropModal
          variant="figure"
          visible={vm.cropPick != null}
          imageUri={vm.cropPick?.previewUri ?? ''}
          loading={vm.figureUploading}
          onConfirm={vm.handleCropConfirm}
          onCancel={vm.handleCropCancel}
        />
      ) : null}
    </DefaultShell>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  content: {
    width: '100%',
    gap: 8,
  },
  contentDesktop: {
    paddingTop: 28,
    paddingHorizontal: 40,
    maxWidth: 720,
    alignSelf: 'center',
    paddingBottom: 56,
  },
  contentMobile: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  topSpacer: {
    width: 40,
  },
  heading: Typo(
    {
      flex: 1,
      textAlign: 'center',
      color: TOKENS.colors.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    'serif', lang
  ),
  loader: {
    marginTop: 32,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  versionText: { color: TOKENS.colors.textMuted, fontSize: 12 },
  moderationNote: { color: TOKENS.colors.accent, fontSize: 13, marginBottom: 12 },
  hint: { color: TOKENS.colors.textMuted, fontSize: 13, marginBottom: 12 },
  formCol: {
    width: '100%',
  },
  tabsBlock: {
    marginTop: 20,
    marginBottom: 8,
  },
  tabPanel: {
    width: '100%',
  },
  footerCol: {
    width: '100%',
    marginTop: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  revisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  revisionInfo: {
    flex: 1,
    marginRight: 12,
  },
  revisionVersion: { color: TOKENS.colors.text, fontSize: 14, fontWeight: '600' },
  revisionSummary: { color: TOKENS.colors.textMuted, fontSize: 12, marginTop: 2 },
  restoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restoreText: { color: TOKENS.colors.accent, fontSize: 12, fontWeight: '600' },
  btn: {
    borderRadius: TOKENS.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    alignSelf: 'center',
    marginTop: 12,
    minWidth: 140,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : {}),
  },
  btnFlex: {
    flex: 1,
    minWidth: 120,
  },
  btnPrimary: {
    backgroundColor: TOKENS.colors.accent,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    ...(Platform.OS === 'web'
      ? ({
          transitionProperty: 'background-color, border-color, box-shadow, transform',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
        } as object)
      : {}),
  },
  btnPrimaryHover: {
    backgroundColor: '#C94A55',
    borderColor: 'rgba(186, 60, 71, 0.5)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 18px rgba(186, 60, 71, 0.38)',
        } as object)
      : {}),
  },
  btnPrimaryPressed: {
    backgroundColor: TOKENS.colors.accentPressed,
    borderColor: TOKENS.colors.accentPressed,
    opacity: 1,
    transform: [{ scale: 0.99 }],
  },
  btnPrimaryText: { color: TOKENS.colors.text, fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    backgroundColor: TOKENS.colors.inviteBanner,
    borderWidth: 1,
    borderColor: TOKENS.colors.inviteBannerBorder,
    ...(Platform.OS === 'web'
      ? ({
          transitionProperty: 'background-color, border-color, transform',
          transitionDuration: '160ms',
          transitionTimingFunction: 'ease-out',
        } as object)
      : {}),
  },
  btnSecondaryHover: {
    backgroundColor: 'rgba(186, 60, 71, 0.18)',
    borderColor: 'rgba(186, 60, 71, 0.38)',
  },
  btnSecondaryPressed: {
    backgroundColor: 'rgba(186, 60, 71, 0.24)',
    borderColor: 'rgba(186, 60, 71, 0.42)',
    opacity: 1,
    transform: [{ scale: 0.99 }],
  },
  btnSecondaryText: { color: 'rgba(242, 242, 244, 0.78)', fontSize: 15, fontWeight: '600' },
  btnGhost: {
    backgroundColor: TOKENS.colors.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  btnGhostText: { color: TOKENS.colors.textSecondary, fontSize: 15, fontWeight: '600' },
  btnDanger: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.45)',
    backgroundColor: 'rgba(186, 60, 71, 0.12)',
  },
  btnDangerText: { color: TOKENS.colors.accent, fontSize: 15, fontWeight: '600' },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  btnDisabled: {
    opacity: 0.55,
  },
  error: { color: TOKENS.colors.accent, fontSize: 13, marginTop: 12 },
});
}

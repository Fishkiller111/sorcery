import type { Lang } from '../../../src/i18n/types';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeChatShell } from '../../../src/components/shell/FreeChatShell';
import { GeneralConfirmModal } from '../../../src/components/ui/GeneralConfirmModal';
import { PublishStatusBadge } from '../../../src/components/agent/PublishStatusBadge';
import { PersonalityTagInput } from '../../../src/components/agent/PersonalityTagInput';
import { RoleCategoryTagEditor } from '../../../src/components/agent/RoleCategoryTagEditor';
import { COLORS } from '../../../src/theme/colors';
import { Typo } from '../../../src/theme/typography';
import { resolveStaticUrl } from '../../../src/constants/config';
import { AvatarCropModal } from '../../../src/components/profile/AvatarCropModal';
import { INTRO_MAX, introLength } from '../../../src/utils/roleForm';
import { RoleEventEditor } from '../../../src/components/agent/RoleEventEditor';
import { AgentScheduleSection } from '../../../src/components/agent/AgentScheduleSection';
import { AgentMediaLibrarySection } from '../../../src/components/agent/AgentMediaLibrarySection';
import { CreateAgentField } from '../../../src/components/create-agent/CreateAgentField';
import { IntroCharCounter } from '../../../src/components/create-agent/IntroCharCounter';
import { VoiceStep } from '../../../src/components/create-agent/steps/VoiceStep';
import { useAgentSettings } from '../../../src/hooks/useAgentSettings';
import { useThemePage } from '../../../src/theme/useThemePage';
import DefaultAgentSettings from '../../../src/pages/default/AgentSettings';
import { DefaultSegmentTabs } from '../../../src/pages/default/components/DefaultSegmentTabs';
import { useMobilePageContentPaddingStyle } from '../../../src/hooks/useMobileSafeAreaPadding';
import { safeGoBack } from '../../../src/utils/safeGoBack';

type SettingsTab = 'voice' | 'events' | 'schedule' | 'media';

function SovietAgentSettingsScreen() {
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const vm = useAgentSettings();
  const styles = useMemo(() => createStyles(vm.lang), [vm.lang]);
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
    <FreeChatShell>
      <LinearGradient colors={['#1c1f28', '#0a0b0f', '#0a0b0f']} style={styles.gradient} />

      <ScrollView contentContainerStyle={[styles.content, pageContentPadding]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => safeGoBack('/free-chat', vm.router)} style={styles.backRow}>
          <Text style={Typo(styles.backText, 'sans', vm.lang)}>← {vm.t('menu.back')}</Text>
        </Pressable>

        <Text style={styles.title}>{vm.t('agent.settings')}</Text>

        {vm.loading ? (
          <ActivityIndicator color={COLORS.accent.gold} style={{ marginTop: 32 }} />
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
                <Pressable
                  style={styles.figureBox}
                  onPress={vm.handlePickFigure}
                  disabled={!!vm.busy || vm.figureUploading}
                >
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.figureImage} resizeMode="cover" />
                  ) : (
                    <Text style={Typo(styles.figurePlaceholder, 'sans', vm.lang)}>
                      {vm.figureUploading ? '…' : vm.t('createAgent.pickImage')}
                    </Text>
                  )}
                </Pressable>

                <CreateAgentField
                  label={vm.t('createAgent.name')}
                  value={vm.name}
                  onChangeText={vm.setName}
                />
                <CreateAgentField
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
                  variant="soviet"
                  selectedIds={vm.categoryIds}
                  onChange={vm.setCategoryIds}
                  disabled={!!vm.busy}
                  seedCategories={vm.seedCategories}
                />

                <CreateAgentField
                  label={vm.t('createAgent.appearance')}
                  value={vm.appearance}
                  onChangeText={vm.setAppearance}
                />
                <CreateAgentField
                  label={vm.t('createAgent.sceneName')}
                  value={vm.sceneName}
                  onChangeText={vm.setSceneName}
                />
                <CreateAgentField
                  label={vm.t('createAgent.sceneDesc')}
                  value={vm.sceneDesc}
                  onChangeText={vm.setSceneDesc}
                  multiline
                />

                <View style={styles.tabsBlock}>
                  <DefaultSegmentTabs tabs={tabs} activeKey={tab} onChange={setTab} />
                </View>

                {tab === 'voice' ? (
                  <>
                    <Text style={styles.sectionTitle}>{vm.t('createAgent.voiceSection')}</Text>
                    <Text style={Typo(styles.hint, 'sans', vm.lang)}>{vm.t('createAgent.voiceHint')}</Text>
                    <VoiceStep
                      selectedId={vm.voiceReferenceId || undefined}
                      onSelect={vm.setVoiceReferenceId}
                    />
                  </>
                ) : null}

                {tab === 'events' ? (
                  <>
                    <RoleEventEditor
                      events={vm.events}
                      onChange={vm.setEvents}
                      disabled={!!vm.busy}
                      onError={vm.showFormError}
                    />
                    <Pressable
                      style={[styles.secondaryBtn, vm.busy === 'events' && styles.btnDisabled]}
                      onPress={() => void vm.onSaveEvents()}
                      disabled={!!vm.busy}
                    >
                      {vm.busy === 'events' ? (
                        <ActivityIndicator color={COLORS.agents.paleGold} />
                      ) : (
                        <Text style={Typo(styles.secondaryBtnText, 'sans', vm.lang)}>{vm.t('events.save')}</Text>
                      )}
                    </Pressable>
                  </>
                ) : null}

                {tab === 'schedule' ? (
                  <AgentScheduleSection
                    timezone={vm.scheduleTimezone}
                    startHour={vm.scheduleStartHour}
                    endHour={vm.scheduleEndHour}
                    usingDefault={vm.scheduleUsingDefault}
                    busy={vm.busy === 'schedule'}
                    accentColor={COLORS.accent.gold}
                    mutedColor={COLORS.text.muted}
                    textColor={COLORS.text.primary}
                    borderColor="rgba(255,255,255,0.12)"
                    chipBg={COLORS.bg.elevated}
                    chipActiveBg="rgba(212, 175, 55, 0.18)"
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
                  style={[styles.primaryBtn, vm.busy === 'save' && styles.btnDisabled]}
                  onPress={() => void vm.onSave()}
                  disabled={!!vm.busy}
                >
                  {vm.busy === 'save' ? (
                    <ActivityIndicator color={COLORS.agents.paleGold} />
                  ) : (
                    <Text style={Typo(styles.primaryBtnText, 'display', vm.lang)}>{vm.t('agent.save')}</Text>
                  )}
                </Pressable>
              </View>
            )}

            <View style={styles.footerCol}>
              <View style={styles.actionRow}>
                {vm.canPublish ? (
                  <Pressable
                    style={[styles.secondaryBtn, vm.busy === 'publish' && styles.btnDisabled]}
                    onPress={() => void vm.onPublish()}
                    disabled={!!vm.busy}
                  >
                    <Text style={Typo(styles.secondaryBtnText, 'sans', vm.lang)}>{vm.t('agent.publish')}</Text>
                  </Pressable>
                ) : null}
                {vm.canUnpublish ? (
                  <Pressable
                    style={[styles.secondaryBtn, vm.busy === 'unpublish' && styles.btnDisabled]}
                    onPress={() => void vm.onUnpublish()}
                    disabled={!!vm.busy}
                  >
                    <Text style={Typo(styles.secondaryBtnText, 'sans', vm.lang)}>{vm.t('agent.unpublish')}</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={styles.sectionTitle}>{vm.t('agent.versions')}</Text>
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
                style={[styles.dangerBtn, vm.busy === 'delete' && styles.btnDisabled]}
                onPress={vm.onDelete}
                disabled={!!vm.busy}
              >
                <Text style={Typo(styles.dangerBtnText, 'sans', vm.lang)}>{vm.t('agent.delete')}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>

      <GeneralConfirmModal
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

      <GeneralConfirmModal
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
    </FreeChatShell>
  );
}

export default function AgentSettings() {
  const ThemedPage = useThemePage({ default: DefaultAgentSettings });
  if (ThemedPage) return <ThemedPage />;
  return <SovietAgentSettingsScreen />;
}

const FORM_MAX_WIDTH = 960;

function createStyles(lang: Lang) {
  return StyleSheet.create({
  gradient: { ...StyleSheet.absoluteFill },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: FORM_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  formCol: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  footerCol: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  backRow: { marginBottom: 8 },
  backText: { color: COLORS.text.muted, fontSize: 14 },
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 16,
      letterSpacing: 1,
    },
    'display',
    lang,
  ),
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  versionText: { color: COLORS.text.muted, fontSize: 12 },
  moderationNote: { color: COLORS.accent.red, fontSize: 13, marginBottom: 12 },
  hint: { color: COLORS.text.muted, fontSize: 13, marginBottom: 12 },
  figureBox: {
    width: 120,
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: COLORS.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  figureImage: { width: '100%', height: '100%' },
  figurePlaceholder: { color: COLORS.text.muted, fontSize: 12, textAlign: 'center', paddingHorizontal: 8 },
  tabsBlock: { marginTop: 16, marginBottom: 12 },
  sectionTitle: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 15,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    'display',
    lang,
  ),
  actionRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  revisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  revisionInfo: { flex: 1, marginRight: 12 },
  revisionVersion: { color: COLORS.text.primary, fontSize: 14, fontWeight: '600' },
  revisionSummary: { color: COLORS.text.muted, fontSize: 12, marginTop: 2 },
  restoreBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  restoreText: { color: COLORS.accent.gold, fontSize: 12, fontWeight: '600' },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.agents.tabActive,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.agents.paleGold, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
  },
  secondaryBtnText: { color: COLORS.agents.paleGold, fontSize: 14, fontWeight: '600' },
  dangerBtn: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(220, 80, 80, 0.5)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(220, 80, 80, 0.12)',
  },
  dangerBtnText: { color: '#e87878', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.55 },
  error: { color: COLORS.accent.red, fontSize: 13, marginTop: 12 },
});
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { TOKENS } from '../../pages/default/theme/tokens';
import { COLORS } from '../../theme/colors';
import { resolveStaticUrl } from '../../constants/config';
import { uploadRoleAsset } from '../../api/roles';
import {
  getChatBackgroundTemplates,
  type ChatBgThemeVariant,
} from '../../data/chatBackgroundTemplates';
import {
  type ChatBackgroundPreference,
  clearChatBackgroundPreference,
  saveChatBackgroundPreference,
} from '../../utils/chatBackgroundStore';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import {
  ChatBgAspectError,
  pickChatBackgroundImage,
} from '../../utils/pickChatBackground';
import { PhotoPermissionDeniedError } from '../../utils/pickChatImage';
import { promptPhotoLibraryAccessSettings } from '../../utils/promptPhotoLibraryAccessSettings';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/notify';
import { type FreeChatUiVariant, glassWebStyle } from './freeChatUi';

type Props = {
  visible: boolean;
  roleId: string;
  preference: ChatBackgroundPreference | null;
  onClose: () => void;
  onApplied: (pref: ChatBackgroundPreference | null) => void;
  variant?: FreeChatUiVariant;
};

type DraftUpload = {
  previewUri: string;
  url?: string;
  uploading?: boolean;
};

export function ChatBackgroundPickerModal({
  visible,
  roleId,
  preference,
  onClose,
  onApplied,
  variant = 'default',
}: Props) {
  const { t } = useI18n();
  const { width: winW } = useWindowDimensions();
  const isDefault = variant === 'default';
  const themeVariant: ChatBgThemeVariant = isDefault ? 'default' : 'soviet';
  const scrollWebProps = useMemo(
    () => themedScrollViewProps(isDefault ? 'default' : 'soviet'),
    [isDefault],
  );
  const templates = useMemo(() => getChatBackgroundTemplates(themeVariant), [themeVariant]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [portrait, setPortrait] = useState<DraftUpload | null>(null);
  const [landscape, setLandscape] = useState<DraftUpload | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (preference?.source === 'template' && preference.templateId) {
      setSelectedTemplateId(preference.templateId);
      setPortrait(null);
      setLandscape(null);
      return;
    }
    if (preference?.source === 'custom') {
      setSelectedTemplateId(null);
      setPortrait(
        preference.portraitUrl
          ? { previewUri: resolveStaticUrl(preference.portraitUrl) || preference.portraitUrl, url: preference.portraitUrl }
          : null,
      );
      setLandscape(
        preference.landscapeUrl
          ? {
              previewUri: resolveStaticUrl(preference.landscapeUrl) || preference.landscapeUrl,
              url: preference.landscapeUrl,
            }
          : null,
      );
      return;
    }
    setSelectedTemplateId(null);
    setPortrait(null);
    setLandscape(null);
  }, [visible, preference]);

  const modalMaxWidth = Math.min(440, winW - 32);

  const templateName = useCallback(
    (nameKey: string) => t(`chat.bgTemplates.${nameKey}`),
    [t],
  );

  const pickAndUpload = useCallback(
    async (aspect: 'portrait' | 'landscape') => {
      try {
        const picked = await pickChatBackgroundImage(aspect);
        if (!picked) return;
        const setDraft = aspect === 'portrait' ? setPortrait : setLandscape;
        setDraft({ previewUri: picked.previewUri, uploading: true });
        setSelectedTemplateId(null);
        try {
          const resp = await uploadRoleAsset('background', picked.file, picked.filename);
          setDraft({
            previewUri: resolveStaticUrl(resp.url) || picked.previewUri,
            url: resp.url,
            uploading: false,
          });
        } catch (err) {
          setDraft(null);
          notifyError(t('chat.bgUploadFailed'));
        }
      } catch (err) {
        if (err instanceof PhotoPermissionDeniedError) {
          promptPhotoLibraryAccessSettings(t);
          return;
        }
        if (err instanceof ChatBgAspectError) {
          notifyWarning(
            err.expected === 'portrait' ? t('chat.bgNeedPortrait') : t('chat.bgNeedLandscape'),
          );
          return;
        }
        notifyError(t('chat.bgUploadFailed'));
      }
    },
    [t],
  );

  const canApplyCustom = Boolean(portrait?.url && landscape?.url);
  const busy = saving || Boolean(portrait?.uploading || landscape?.uploading);

  const onApplyTemplate = useCallback(
    async (templateId: string) => {
      const tpl = templates.find((x) => x.id === templateId);
      if (!tpl) return;
      setSaving(true);
      try {
        const pref: ChatBackgroundPreference = {
          source: 'template',
          templateId: tpl.id,
          portraitUrl: tpl.kind === 'image' ? tpl.portraitUrl : undefined,
          landscapeUrl: tpl.kind === 'image' ? tpl.landscapeUrl : undefined,
          fallbackColor: tpl.previewColor,
        };
        await saveChatBackgroundPreference(roleId, pref);
        onApplied(pref);
        notifySuccess(t('chat.bgApplied'));
        onClose();
      } catch {
        notifyError(t('chat.bgSaveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [onApplied, onClose, roleId, t, templates],
  );

  const onApplyCustom = useCallback(async () => {
    if (!portrait?.url || !landscape?.url) {
      notifyWarning(t('chat.bgNeedBoth'));
      return;
    }
    setSaving(true);
    try {
      const pref: ChatBackgroundPreference = {
        source: 'custom',
        portraitUrl: portrait.url,
        landscapeUrl: landscape.url,
      };
      await saveChatBackgroundPreference(roleId, pref);
      onApplied(pref);
      notifySuccess(t('chat.bgApplied'));
      onClose();
    } catch {
      notifyError(t('chat.bgSaveFailed'));
    } finally {
      setSaving(false);
    }
  }, [landscape?.url, onApplied, onClose, portrait?.url, roleId, t]);

  const onResetDefault = useCallback(async () => {
    setSaving(true);
    try {
      await clearChatBackgroundPreference(roleId);
      onApplied(null);
      notifySuccess(t('chat.bgReset'));
      onClose();
    } catch {
      notifyError(t('chat.bgSaveFailed'));
    } finally {
      setSaving(false);
    }
  }, [onApplied, onClose, roleId, t]);

  const accent = isDefault ? TOKENS.colors.accent : COLORS.accent.gold;

  const uploadSlot = useMemo(
    () =>
      function UploadSlot({
        label,
        hint,
        draft,
        onPress,
      }: {
        label: string;
        hint: string;
        draft: DraftUpload | null;
        onPress: () => void;
      }) {
        return (
          <Pressable
            onPress={onPress}
            disabled={busy}
            style={[styles.slot, isDefault && styles.slotDefault]}
          >
            {draft?.previewUri ? (
              <Image source={{ uri: draft.previewUri }} style={styles.slotImage} contentFit="cover" />
            ) : (
              <View style={styles.slotEmpty}>
                <Ionicons name="image-outline" size={22} color={isDefault ? TOKENS.colors.textMuted : COLORS.agents.paleGoldMuted} />
              </View>
            )}
            {draft?.uploading ? (
              <View style={styles.slotBusy}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
            <View style={styles.slotMeta}>
              <Text style={[styles.slotLabel, isDefault && styles.slotLabelDefault]}>{label}</Text>
              <Text style={[styles.slotHint, isDefault && styles.slotHintDefault]}>{hint}</Text>
            </View>
          </Pressable>
        );
      },
    [busy, isDefault],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, isDefault && styles.sheetDefault, { maxWidth: modalMaxWidth }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, isDefault && styles.titleDefault]}>{t('chat.bgTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={t('chat.close')}>
              <Ionicons
                name="close"
                size={22}
                color={isDefault ? TOKENS.colors.textSecondary : COLORS.agents.paleGold}
              />
            </Pressable>
          </View>

          <ScrollView
            {...scrollWebProps}
            style={[styles.scroll, scrollWebProps.style]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.section, isDefault && styles.sectionDefault]}>
              {t('chat.bgTemplatesTitle')}
            </Text>
            <View style={styles.templateGrid}>
              {templates.map((tpl) => {
                const active = selectedTemplateId === tpl.id;
                const previewSource =
                  tpl.kind === 'image'
                    ? tpl.portraitSource ||
                      tpl.landscapeSource ||
                      (tpl.portraitUrl || tpl.landscapeUrl
                        ? { uri: resolveStaticUrl(tpl.portraitUrl || tpl.landscapeUrl || '') }
                        : undefined)
                    : undefined;
                return (
                  <Pressable
                    key={tpl.id}
                    onPress={() => {
                      setSelectedTemplateId(tpl.id);
                      setPortrait(null);
                      setLandscape(null);
                      void onApplyTemplate(tpl.id);
                    }}
                    disabled={busy}
                    style={[
                      styles.templateCard,
                      isDefault && styles.templateCardDefault,
                      active && { borderColor: accent },
                    ]}
                  >
                    {previewSource ? (
                      <Image
                        source={previewSource}
                        style={styles.templateSwatch}
                        contentFit="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[tpl.previewColor, tpl.secondaryColor]}
                        style={styles.templateSwatch}
                      />
                    )}
                    <Text
                      style={[styles.templateName, isDefault && styles.templateNameDefault]}
                      numberOfLines={1}
                    >
                      {templateName(tpl.nameKey)}
                    </Text>
                    {tpl.kind === 'solid' ? (
                      <Text style={[styles.templateHint, isDefault && styles.templateHintDefault]}>
                        {t('chat.bgSolidFill')}
                      </Text>
                    ) : (
                      <View style={styles.templateHintSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.section, isDefault && styles.sectionDefault]}>
              {t('chat.bgCustomTitle')}
            </Text>
            <Text style={[styles.help, isDefault && styles.helpDefault]}>{t('chat.bgCustomHelp')}</Text>
            <View style={styles.slotsRow}>
              {uploadSlot({
                label: t('chat.bgPortrait'),
                hint: '9:16',
                draft: portrait,
                onPress: () => void pickAndUpload('portrait'),
              })}
              {uploadSlot({
                label: t('chat.bgLandscape'),
                hint: '16:9',
                draft: landscape,
                onPress: () => void pickAndUpload('landscape'),
              })}
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => void onApplyCustom()}
                disabled={busy || !canApplyCustom}
                style={[
                  styles.primaryBtn,
                  isDefault && styles.primaryBtnDefault,
                  (!canApplyCustom || busy) && styles.btnDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('chat.bgApplyCustom')}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => void onResetDefault()}
                disabled={busy}
                style={[styles.secondaryBtn, isDefault && styles.secondaryBtnDefault]}
              >
                <Text style={[styles.secondaryBtnText, isDefault && styles.secondaryBtnTextDefault]}>
                  {t('chat.bgUseDefault')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.agents.border,
    backgroundColor: '#0c0d10',
    overflow: 'hidden',
  },
  sheetDefault: {
    borderRadius: TOKENS.radius.cardLg,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.bgElevated,
    ...glassWebStyle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: Typo({ color: COLORS.agents.paleGold, fontSize: 17, fontWeight: '700' }, 'display'),
  titleDefault: Typo({ color: TOKENS.colors.text, fontSize: 17, fontWeight: '600' }, 'serif'),
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  section: Typo(
    { color: COLORS.agents.paleGold, fontSize: 13, fontWeight: '600', marginTop: 6 },
    'sans',
  ),
  sectionDefault: Typo({ color: TOKENS.colors.text, fontSize: 13, fontWeight: '600', marginTop: 6 }, 'sans'),
  help: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 12, lineHeight: 17 }, 'sans'),
  helpDefault: Typo({ color: TOKENS.colors.textSecondary, fontSize: 12, lineHeight: 17 }, 'sans'),
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  templateCardDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorderFaint,
  },
  templateSwatch: { width: '100%', aspectRatio: 9 / 12 },
  templateName: Typo(
    { color: COLORS.agents.paleGold, fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingTop: 6 },
    'sans',
  ),
  templateNameDefault: Typo({ color: TOKENS.colors.text, fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingTop: 6 }, 'sans'),
  templateHint: Typo(
    { color: COLORS.agents.paleGoldMuted, fontSize: 10, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 2 },
    'sans',
  ),
  templateHintDefault: Typo(
    { color: TOKENS.colors.textMuted, fontSize: 10, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 2 },
    'sans',
  ),
  templateHintSpacer: { height: 8 },
  slotsRow: { flexDirection: 'row', gap: 10 },
  slot: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  slotDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorder,
  },
  slotImage: { width: '100%', aspectRatio: 9 / 14 },
  slotEmpty: {
    width: '100%',
    aspectRatio: 9 / 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  slotBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotMeta: { paddingHorizontal: 8, paddingVertical: 8, gap: 2 },
  slotLabel: Typo({ color: COLORS.agents.paleGold, fontSize: 12, fontWeight: '600' }, 'sans'),
  slotLabelDefault: Typo({ color: TOKENS.colors.text, fontSize: 12, fontWeight: '600' }, 'sans'),
  slotHint: Typo({ color: COLORS.agents.paleGoldMuted, fontSize: 11 }, 'mono'),
  slotHintDefault: Typo({ color: TOKENS.colors.textMuted, fontSize: 11 }, 'mono'),
  actions: { gap: 8, marginTop: 8 },
  primaryBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent.redDark,
  },
  primaryBtnDefault: {
    borderRadius: TOKENS.radius.input,
    backgroundColor: TOKENS.colors.accent,
  },
  primaryBtnText: Typo({ color: '#fff', fontSize: 14, fontWeight: '700' }, 'sans'),
  secondaryBtn: {
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  secondaryBtnDefault: {
    borderRadius: TOKENS.radius.input,
    borderColor: TOKENS.colors.cardBorder,
  },
  secondaryBtnText: Typo({ color: COLORS.agents.paleGold, fontSize: 13, fontWeight: '600' }, 'sans'),
  secondaryBtnTextDefault: Typo({ color: TOKENS.colors.textSecondary, fontSize: 13, fontWeight: '600' }, 'sans'),
  btnDisabled: { opacity: 0.45 },
});

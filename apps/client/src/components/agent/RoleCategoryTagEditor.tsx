import type { Lang } from '../../i18n/types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import { COLORS } from '../../theme/colors';
import { TOKENS } from '../../pages/default/theme/tokens';
import { glassWebStyle } from '../free-chat/freeChatUi';
import {
  createUserRoleCategory,
  deleteUserRoleCategory,
  listUserRoleCategories,
} from '../../api/roles';
import type { ExploreRoleCategory } from '../../types/api';
import { ROLE_CATEGORY_HISTORY_ID } from '../../utils/roleCategory';
import { DefaultCreateAgentSectionLabel } from '../../pages/default/components/create-agent/DefaultCreateAgentSectionLabel';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';
import { notifyError } from '../../utils/notify';
import { formatApiError } from '../../utils/apiError';

const MAX_CATEGORIES = 5;

type RoleCategoryTagEditorProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  variant?: 'soviet' | 'default';
  seedCategories?: ExploreRoleCategory[];
};

export function RoleCategoryTagEditor({
  selectedIds,
  onChange,
  disabled,
  variant = 'soviet',
  seedCategories = [],
}: RoleCategoryTagEditorProps) {
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const isDefault = variant === 'default';
  const [available, setAvailable] = useState<ExploreRoleCategory[]>(seedCategories);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [input, setInput] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [pendingCategory, setPendingCategory] = useState<ExploreRoleCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listUserRoleCategories()
      .then((resp) => {
        if (cancelled) return;
        const items = (resp.items ?? []).filter(
          (c) => c.category_id !== ROLE_CATEGORY_HISTORY_ID && c.category_id !== 'myself',
        );
        // List API is authoritative for ownership (`is_mine`); seed only fills gaps.
        const map = new Map<string, ExploreRoleCategory>();
        for (const cat of seedCategories) {
          if (cat.category_id && cat.category_id !== 'myself') {
            map.set(cat.category_id, cat);
          }
        }
        for (const cat of items) {
          if (cat.category_id) {
            map.set(cat.category_id, { ...map.get(cat.category_id), ...cat });
          }
        }
        setAvailable(Array.from(map.values()));
      })
      .catch(() => {
        if (!cancelled) setAvailable(seedCategories.filter((c) => c.category_id !== 'myself'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seedCategories]);

  const sorted = useMemo(
    () => [...available].sort((a, b) => a.name.localeCompare(b.name)),
    [available],
  );
  const deletableCount = useMemo(
    () => sorted.filter((c) => c.is_mine === true).length,
    [sorted],
  );

  useEffect(() => {
    if (deletableCount === 0 && deleteMode) {
      setDeleteMode(false);
      setPendingCategory(null);
    }
  }, [deletableCount, deleteMode]);

  const toggle = useCallback(
    (id: string) => {
      if (disabled || deleteMode) return;
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((x) => x !== id));
        return;
      }
      if (selectedIds.length >= MAX_CATEGORIES) {
        return;
      }
      onChange([...selectedIds, id]);
    },
    [deleteMode, disabled, onChange, selectedIds],
  );

  const toggleDeleteMode = useCallback(() => {
    if (deletableCount === 0) return;
    setDeleteMode((prev) => !prev);
    setPendingCategory(null);
  }, [deletableCount]);

  const confirmDeleteCategory = useCallback(async () => {
    if (!pendingCategory || deleting) return;
    if (pendingCategory.is_mine !== true) {
      setPendingCategory(null);
      return;
    }
    const id = pendingCategory.category_id;
    setDeleting(true);
    try {
      await deleteUserRoleCategory(id);
      setAvailable((prev) => prev.filter((c) => c.category_id !== id));
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      }
      setPendingCategory(null);
    } catch (err) {
      notifyError(t('freeChat.error'), formatApiError(t, err));
    } finally {
      setDeleting(false);
    }
  }, [deleting, onChange, pendingCategory, selectedIds, t]);

  const addCustom = useCallback(async () => {
    const name = input.trim();
    if (!name || disabled || creating || deleteMode) return;
    const existing = sorted.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.category_id)) {
        if (selectedIds.length < MAX_CATEGORIES) {
          onChange([...selectedIds, existing.category_id]);
        }
      }
      setInput('');
      return;
    }
    if (selectedIds.length >= MAX_CATEGORIES) return;
    setCreating(true);
    try {
      const created = await createUserRoleCategory(name);
      setAvailable((prev) => {
        const idx = prev.findIndex((c) => c.category_id === created.category_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...created };
          return next;
        }
        return [...prev, created];
      });
      onChange([...selectedIds, created.category_id]);
      setInput('');
    } catch {
      // caller may surface via notify
    } finally {
      setCreating(false);
    }
  }, [creating, deleteMode, disabled, input, onChange, selectedIds, sorted]);

  const labelStyle = isDefault ? styles.defaultLabel : Typo(styles.sovietLabel, 'sans', lang);
  const hintStyle = isDefault ? Typo(styles.defaultHint, 'sans', lang) : Typo(styles.sovietHint, 'sans', lang);
  const inputStyle = isDefault ? styles.defaultInput : styles.sovietInput;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        {isDefault ? (
          <View style={styles.labelGrow}>
            <DefaultCreateAgentSectionLabel label={t('agent.categoryTags')} />
          </View>
        ) : (
          <Text style={[labelStyle, styles.labelGrow]}>{t('agent.categoryTags')}</Text>
        )}
        {!loading && deletableCount > 0 ? (
          <Pressable
            onPress={toggleDeleteMode}
            disabled={disabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('agent.deleteCategoryMode')}
            style={[
              styles.deleteIconBtn,
              isDefault && styles.deleteIconBtnDefault,
              deleteMode && styles.deleteIconBtnActive,
              disabled && styles.chipDisabled,
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={
                deleteMode
                  ? '#f0a0a0'
                  : isDefault
                    ? TOKENS.colors.textMuted
                    : COLORS.text.muted
              }
            />
          </Pressable>
        ) : null}
      </View>
      <Text style={hintStyle}>{t('agent.categoryTagsHint')}</Text>

      {loading ? (
        <ActivityIndicator
          color={isDefault ? TOKENS.colors.accent : COLORS.accent.gold}
          style={styles.loader}
        />
      ) : (
        <View style={styles.chipRow}>
          {sorted.map((cat) => {
            const active = selectedIds.includes(cat.category_id);
            return (
              <View key={cat.category_id} style={styles.chipWrap}>
                <Pressable
                  disabled={disabled || deleteMode}
                  onPress={() => toggle(cat.category_id)}
                  style={[
                    styles.chip,
                    isDefault ? styles.chipDefault : styles.chipSoviet,
                    active && (isDefault ? styles.chipDefaultActive : styles.chipSovietActive),
                    (disabled || deleteMode) && styles.chipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isDefault
                        ? Typo(styles.chipTextDefault, 'sans', lang)
                        : Typo(styles.chipTextSoviet, 'sans', lang),
                      active &&
                        (isDefault
                          ? Typo(styles.chipTextDefaultActive, 'sans', lang)
                          : Typo(styles.chipTextSovietActive, 'sans', lang)),
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
                {deleteMode && cat.is_mine === true ? (
                  <Pressable
                    style={[styles.chipRemoveBtn, isDefault && styles.chipRemoveBtnDefault]}
                    onPress={() => setPendingCategory(cat)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('agent.deleteCategory')}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <TextInput
        style={inputStyle}
        value={input}
        onChangeText={setInput}
        placeholder={t('agent.createCategoryPlaceholder')}
        placeholderTextColor={isDefault ? TOKENS.colors.textMuted : COLORS.text.muted}
        editable={!disabled && !creating && !deleteMode}
        onSubmitEditing={() => void addCustom()}
        returnKeyType="done"
      />
      {selectedIds.length >= MAX_CATEGORIES ? (
        <Text style={hintStyle}>{t('agent.categoryMax')}</Text>
      ) : null}

      <ThemedGeneralConfirmModal
        visible={pendingCategory !== null}
        icon="trash"
        title={t('agent.deleteCategory')}
        subtitle={t('agent.deleteCategoryConfirm')}
        subtitleTone="warning"
        cancelLabel={t('menu.back')}
        confirmLabel={t('agent.deleteCategory')}
        onCancel={() => setPendingCategory(null)}
        onConfirm={() => void confirmDeleteCategory()}
        loading={deleting}
      />
    </View>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelGrow: {
    flex: 1,
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteIconBtnDefault: {
    marginTop: 0,
  },
  /** Match PublishStatusBadge `rejected` (未通过审核). */
  deleteIconBtnActive: {
    backgroundColor: 'rgba(180,60,60,0.3)',
  },
  loader: {
    marginVertical: 8,
  },
  sovietLabel: { color: COLORS.text.secondary, fontSize: 13, marginBottom: 6, marginTop: 8 },
  defaultLabel: {},
  sovietHint: { color: COLORS.text.muted, fontSize: 12, marginBottom: 8, lineHeight: 17 },
  defaultHint: { color: TOKENS.colors.textMuted, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chipWrap: {
    position: 'relative',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  chipSoviet: {
    borderColor: COLORS.border,
    backgroundColor: 'rgba(20,22,28,0.85)',
  },
  chipSovietActive: {
    borderColor: COLORS.agents.tabActive,
    backgroundColor: 'rgba(180,60,60,0.25)',
  },
  chipDefault: {
    borderColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: TOKENS.colors.card,
    ...glassWebStyle,
  },
  chipDefaultActive: {
    borderColor: TOKENS.colors.inviteBannerBorder,
    backgroundColor: TOKENS.colors.inviteBanner,
  },
  chipDisabled: {
    opacity: 0.55,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSoviet: { color: COLORS.text.secondary },
  chipTextSovietActive: { color: COLORS.text.primary },
  chipTextDefault: { color: TOKENS.colors.textMuted },
  chipTextDefaultActive: { color: TOKENS.colors.accent },
  chipRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(180,60,60,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  chipRemoveBtnDefault: {
    backgroundColor: 'rgba(180,60,60,0.95)',
  },
  sovietInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text.primary,
    fontSize: 15,
    backgroundColor: 'rgba(20,22,28,0.85)',
  },
  defaultInput: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TOKENS.colors.text,
    fontSize: 15,
    backgroundColor: TOKENS.colors.card,
    marginBottom: 4,
    ...glassWebStyle,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
});
};

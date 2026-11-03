import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import { ThemedGeneralConfirmModal } from '../ui/ThemedGeneralConfirmModal';

interface PersonalityTagInputProps {
  label: string;
  tags: string[];
  input: string;
  placeholder: string;
  onChangeInput: (v: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}

export function PersonalityTagInput({
  label,
  tags,
  input,
  placeholder,
  onChangeInput,
  onAdd,
  onRemove,
}: PersonalityTagInputProps) {
  const { t, lang } = useI18n();
  const [deleteMode, setDeleteMode] = useState(false);
  const [pendingTag, setPendingTag] = useState<string | null>(null);

  const toggleDeleteMode = useCallback(() => {
    setDeleteMode((prev) => !prev);
    setPendingTag(null);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (!pendingTag) return;
    onRemove(pendingTag);
    setPendingTag(null);
  }, [onRemove, pendingTag]);

  return (
    <>
      <View style={styles.labelRow}>
        <Text style={Typo(styles.label, 'sans', lang)}>{label}</Text>
        {tags.length > 0 ? (
          <Pressable
            onPress={toggleDeleteMode}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('createAgent.deleteTagMode')}
            style={[styles.deleteIconBtn, deleteMode && styles.deleteIconBtnActive]}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={deleteMode ? '#f0a0a0' : COLORS.text.muted}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tagRow}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tagWrap}>
            <View style={styles.tag}>
              <Text style={Typo(styles.tagText, 'sans', lang)}>{tag}</Text>
            </View>
            {deleteMode ? (
              <Pressable
                style={styles.tagRemoveBtn}
                onPress={() => setPendingTag(tag)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('createAgent.deleteTag')}
              >
                <Ionicons name="close" size={12} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={input}
        onChangeText={onChangeInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.muted}
        onSubmitEditing={onAdd}
        returnKeyType="done"
      />

      <ThemedGeneralConfirmModal
        visible={pendingTag !== null}
        icon="trash"
        title={t('createAgent.deleteTag')}
        subtitle={t('createAgent.deleteTagConfirm')}
        subtitleTone="warning"
        cancelLabel={t('menu.back')}
        confirmLabel={t('createAgent.deleteTag')}
        onCancel={() => setPendingTag(null)}
        onConfirm={handleConfirmRemove}
      />
    </>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 8,
    gap: 8,
  },
  label: { color: COLORS.text.secondary, fontSize: 13, flex: 1 },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtnActive: {
    backgroundColor: 'rgba(180,60,60,0.3)',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text.primary,
    fontSize: 15,
    backgroundColor: 'rgba(20,22,28,0.85)',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagWrap: {
    position: 'relative',
  },
  tag: {
    backgroundColor: 'rgba(180,60,60,0.25)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: COLORS.text.primary, fontSize: 13 },
  tagRemoveBtn: {
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
});

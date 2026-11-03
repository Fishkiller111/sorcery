import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { SimpleWorldEditorState } from './useSimpleWorldEditor';
import {
  listHappenedThings,
  listLevelBadEnds,
  listLevelCgCards,
  listLevelHappenedThings,
  type CgTriggerPreset,
} from '../../lib/worldDocument';
import { uploadWorldAsset } from '../../api/worldEditor';
import { ApiError } from '../../api/client';
import { pickWorldEditorImage } from '../../utils/pickRoleImage';
import { resolveStaticUrl } from '../../constants/config';
import { notifyError } from '../../utils/notify';
import { DefaultCreateAgentSectionLabel } from '../../pages/default/components/create-agent/DefaultCreateAgentSectionLabel';
import { TOKENS } from '../../pages/default/theme/tokens';
import { Typo } from '../../theme/typography';

const TRIGGERS: { value: CgTriggerPreset; labelKey: string }[] = [
  { value: 'enter_level', labelKey: 'worldEditor.cg.triggerEnter' },
  { value: 'level_clear', labelKey: 'worldEditor.cg.triggerClear' },
  { value: 'intent', labelKey: 'worldEditor.cg.triggerIntent' },
  { value: 'flag', labelKey: 'worldEditor.cg.triggerFlag' },
];

type Props = {
  editor: SimpleWorldEditorState;
  levelCode: string;
  worldId: string;
  t: (key: string) => string;
};

export function LevelExtrasPanel({ editor, levelCode, worldId, t }: Props) {
  const doc = editor.doc!;
  const cgs = listLevelCgCards(doc, levelCode);
  const flags = listLevelHappenedThings(doc, levelCode);
  const allFlags = listHappenedThings(doc);
  const badEnds = listLevelBadEnds(doc, levelCode);

  const [cgTitle, setCgTitle] = useState('');
  const [cgTrigger, setCgTrigger] = useState<CgTriggerPreset>('level_clear');
  const [cgKeywords, setCgKeywords] = useState('');
  const [cgRequireFlag, setCgRequireFlag] = useState('');
  const [cgUploading, setCgUploading] = useState(false);
  const [pendingCgImage, setPendingCgImage] = useState('');

  const [flagLabel, setFlagLabel] = useState('');
  const [flagTrigger, setFlagTrigger] = useState<CgTriggerPreset>('level_clear');
  const [flagKeywords, setFlagKeywords] = useState('');
  const [badHint, setBadHint] = useState('');
  const [badTrigger, setBadTrigger] = useState<CgTriggerPreset>('intent');
  const [badKeywords, setBadKeywords] = useState('');

  const uploadImage = async (kind: 'gallery' | 'background' | 'cover') => {
    try {
      const picked = await pickWorldEditorImage(kind === 'background' ? 'background' : kind === 'cover' ? 'cover' : 'gallery');
      if (!picked) return null;
      setCgUploading(true);
      const resp = await uploadWorldAsset(worldId, kind, picked.file, picked.filename);
      return resp.url;
    } catch (e) {
      notifyError(e instanceof ApiError ? e.message : t('worldEditor.uploadFailed'));
      return null;
    } finally {
      setCgUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <DefaultCreateAgentSectionLabel label={t('worldEditor.cg.section')} />
      <Text style={styles.hint}>{t('worldEditor.cg.hint')}</Text>

      {cgs.map((cg) => (
        <View key={cg.gallery_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{cg.title}</Text>
            <Pressable onPress={() => editor.deleteCg(cg.gallery_id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={TOKENS.colors.textMuted} />
            </Pressable>
          </View>
          {cg.image_path ? (
            <Image source={{ uri: resolveStaticUrl(cg.image_path) }} style={styles.thumb} contentFit="cover" />
          ) : null}
          <Text style={styles.meta}>
            {t(TRIGGERS.find((x) => x.value === cg.trigger)?.labelKey || 'worldEditor.cg.triggerClear')}
            {cg.keywords ? ` · ${cg.keywords}` : ''}
          </Text>
        </View>
      ))}

      <TextInput
        style={styles.input}
        value={cgTitle}
        onChangeText={setCgTitle}
        placeholder={t('worldEditor.cg.titlePlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />
      <View style={styles.row}>
        {TRIGGERS.map((tr) => {
          const active = cgTrigger === tr.value;
          return (
            <Pressable
              key={tr.value}
              onPress={() => setCgTrigger(tr.value)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{t(tr.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      {cgTrigger === 'intent' ? (
        <TextInput
          style={styles.input}
          value={cgKeywords}
          onChangeText={setCgKeywords}
          placeholder={t('worldEditor.cg.keywordsPlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
        />
      ) : null}
      {allFlags.length > 0 ? (
        <View style={styles.row}>
          <Pressable
            onPress={() => setCgRequireFlag('')}
            style={[styles.chip, !cgRequireFlag && styles.chipOn]}
          >
            <Text style={[styles.chipText, !cgRequireFlag && styles.chipTextOn]}>
              {t('worldEditor.cg.noExtraFlag')}
            </Text>
          </Pressable>
          {allFlags.map((f) => {
            const active = cgRequireFlag === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setCgRequireFlag(f.id)}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            void (async () => {
              const url = await uploadImage('gallery');
              if (url) setPendingCgImage(url);
            })();
          }}
          style={styles.secondaryBtn}
          disabled={cgUploading}
        >
          {cgUploading ? (
            <ActivityIndicator color={TOKENS.colors.accent} size="small" />
          ) : (
            <Text style={styles.secondaryBtnText}>
              {pendingCgImage ? t('worldEditor.cg.imageReady') : t('worldEditor.cg.uploadImage')}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            if (!cgTitle.trim()) return;
            editor.upsertCg(levelCode, {
              title: cgTitle.trim(),
              image_path: pendingCgImage || undefined,
              trigger: cgTrigger,
              keywords: cgKeywords,
              require_flag: cgRequireFlag || undefined,
            });
            setCgTitle('');
            setCgKeywords('');
            setPendingCgImage('');
            setCgRequireFlag('');
          }}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>{t('worldEditor.cg.add')}</Text>
        </Pressable>
      </View>

      <DefaultCreateAgentSectionLabel label={t('worldEditor.flags.section')} />
      <Text style={styles.hint}>{t('worldEditor.flags.hint')}</Text>
      {flags.map((f) => (
        <View key={f.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{f.label}</Text>
            <Pressable onPress={() => editor.deleteFlag(f.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={TOKENS.colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.meta}>{f.id}</Text>
        </View>
      ))}
      <TextInput
        style={styles.input}
        value={flagLabel}
        onChangeText={setFlagLabel}
        placeholder={t('worldEditor.flags.labelPlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />
      <View style={styles.row}>
        {TRIGGERS.filter((tr) => tr.value !== 'flag').map((tr) => {
          const active = flagTrigger === tr.value;
          return (
            <Pressable
              key={tr.value}
              onPress={() => setFlagTrigger(tr.value)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{t(tr.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      {flagTrigger === 'intent' ? (
        <TextInput
          style={styles.input}
          value={flagKeywords}
          onChangeText={setFlagKeywords}
          placeholder={t('worldEditor.cg.keywordsPlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
        />
      ) : null}
      <Pressable
        onPress={() => {
          if (!flagLabel.trim()) return;
          editor.upsertFlag(levelCode, {
            label: flagLabel.trim(),
            trigger: flagTrigger,
            keywords: flagKeywords,
          });
          setFlagLabel('');
          setFlagKeywords('');
        }}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryBtnText}>{t('worldEditor.flags.add')}</Text>
      </Pressable>

      <DefaultCreateAgentSectionLabel label={t('worldEditor.badEnd.section')} />
      <Text style={styles.hint}>{t('worldEditor.badEnd.hint')}</Text>
      {badEnds.map((b) => (
        <View key={b.event_id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{b.hint}</Text>
            <Pressable onPress={() => editor.deleteBadEnd(b.event_id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={TOKENS.colors.textMuted} />
            </Pressable>
          </View>
        </View>
      ))}
      <TextInput
        style={styles.input}
        value={badHint}
        onChangeText={setBadHint}
        placeholder={t('worldEditor.badEnd.hintPlaceholder')}
        placeholderTextColor={TOKENS.colors.textMuted}
      />
      <View style={styles.row}>
        {TRIGGERS.filter((tr) => tr.value !== 'flag').map((tr) => {
          const active = badTrigger === tr.value;
          return (
            <Pressable
              key={tr.value}
              onPress={() => setBadTrigger(tr.value)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{t(tr.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      {badTrigger === 'intent' ? (
        <TextInput
          style={styles.input}
          value={badKeywords}
          onChangeText={setBadKeywords}
          placeholder={t('worldEditor.cg.keywordsPlaceholder')}
          placeholderTextColor={TOKENS.colors.textMuted}
        />
      ) : null}
      <Pressable
        onPress={() => {
          if (!badHint.trim()) return;
          editor.upsertBadEnd(levelCode, {
            hint: badHint.trim(),
            trigger: badTrigger,
            keywords: badKeywords,
            rollback_checkpoint: levelCode,
          });
          setBadHint('');
          setBadKeywords('');
        }}
        style={styles.secondaryBtn}
      >
        <Text style={styles.secondaryBtnText}>{t('worldEditor.badEnd.add')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12 },
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 18 }, 'sans'),
  card: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    padding: 10,
    gap: 6,
    backgroundColor: 'rgba(8,10,15,0.4)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: Typo({ color: TOKENS.colors.text, fontSize: 14, fontWeight: '600', flex: 1 }, 'sans'),
  meta: Typo({ color: TOKENS.colors.textMuted, fontSize: 11 }, 'sans'),
  thumb: { width: '100%', height: 120, borderRadius: 8, backgroundColor: '#111' },
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TOKENS.colors.text,
    backgroundColor: TOKENS.colors.inputBg,
    fontSize: 14,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.18)',
  },
  chipText: Typo({ color: TOKENS.colors.textMuted, fontSize: 11, fontWeight: '600' }, 'sans'),
  chipTextOn: { color: TOKENS.colors.text },
  primaryBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.button,
    backgroundColor: TOKENS.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: Typo({ color: '#fff', fontSize: 12, fontWeight: '700' }, 'sans'),
  secondaryBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8,10,15,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: Typo({ color: TOKENS.colors.text, fontSize: 12, fontWeight: '600' }, 'sans'),
});

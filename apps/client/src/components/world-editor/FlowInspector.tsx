import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SimpleWorldEditorState } from './useSimpleWorldEditor';
import type { FlowSelect } from '../../lib/worldFlowCanvas';
import {
  emptyEffectCard,
  eventEffectSummary,
  isLinearLevelTopology,
  listHappenedThings,
  parseEventEffects,
  parseEventTrigger,
  serializeEventTrigger,
  type CgTriggerPreset,
  type EventEffectCard,
  type EventEffectKind,
} from '../../lib/worldDocument';
import { DefaultCreateAgentSectionLabel } from '../../pages/default/components/create-agent/DefaultCreateAgentSectionLabel';
import { TOKENS } from '../../pages/default/theme/tokens';
import { Typo } from '../../theme/typography';

type Props = {
  editor: SimpleWorldEditorState;
  selection: FlowSelect | null;
  t: (key: string) => string;
  onOpenSimple: (tab: 'levels' | 'endings' | 'lore') => void;
  onDeleted?: () => void;
};

const TRIGGER_KINDS: { value: CgTriggerPreset; labelKey: string }[] = [
  { value: 'enter_level', labelKey: 'worldEditor.advanced.triggerEnterFull' },
  { value: 'level_clear', labelKey: 'worldEditor.advanced.triggerClearFull' },
  { value: 'intent', labelKey: 'worldEditor.advanced.triggerIntentFull' },
  { value: 'flag', labelKey: 'worldEditor.advanced.triggerFlagFull' },
];

const EFFECT_KINDS: { value: EventEffectKind; labelKey: string }[] = [
  { value: 'unlock_levels', labelKey: 'worldEditor.advanced.efUnlockLevel' },
  { value: 'bad_end', labelKey: 'worldEditor.advanced.efBadEnd' },
  { value: 'unlock_gallery', labelKey: 'worldEditor.advanced.efUnlockGallery' },
  { value: 'set_flags', labelKey: 'worldEditor.advanced.efSetFlag' },
  { value: 'narration', labelKey: 'worldEditor.advanced.efNarration' },
  { value: 'ending', labelKey: 'worldEditor.advanced.efEnding' },
];

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.value || '__empty'}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EventInspector({
  editor,
  eventId,
  t,
  onDeleted,
}: {
  editor: SimpleWorldEditorState;
  eventId: string;
  t: (key: string) => string;
  onDeleted?: () => void;
}) {
  const doc = editor.doc!;
  const ev = doc.events.find((e) => e.event_id === eventId);
  const flags = useMemo(() => listHappenedThings(doc), [doc]);

  if (!ev) return null;

  const trigger = parseEventTrigger(ev.trigger);
  const effects = parseEventEffects(ev.effects);
  const levelCode = ev.level_code || trigger.levelCode || doc.levels[0]?.code || '';

  const patchEffects = (next: EventEffectCard[]) => {
    editor.updateFlowEvent(eventId, { effects: next });
  };

  const setTriggerKind = (kind: CgTriggerPreset) => {
    const code = levelCode || doc.levels[0]?.code || '';
    editor.updateFlowEvent(eventId, {
      level_code: code,
      trigger: serializeEventTrigger(kind, code, trigger.keywords, trigger.flagId),
    });
  };

  const setLevel = (code: string) => {
    const kind = trigger.kind;
    editor.updateFlowEvent(eventId, {
      level_code: code,
      trigger:
        kind === 'enter_level' || kind === 'level_clear'
          ? serializeEventTrigger(kind, code, trigger.keywords, trigger.flagId)
          : ev.trigger,
    });
  };

  const addEffect = (kind: EventEffectKind) => {
    if (effects.some((e) => e.kind === kind)) return;
    patchEffects([...effects, emptyEffectCard(kind, doc)]);
  };

  const updateEffect = (index: number, patch: Partial<EventEffectCard>) => {
    patchEffects(effects.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeEffect = (index: number) => {
    patchEffects(effects.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap}>
      <DefaultCreateAgentSectionLabel label={t('worldEditor.advanced.inspectorEventProps')} />
      <Text style={styles.title} numberOfLines={2}>
        {ev.event_id}
      </Text>

      <Text style={styles.label}>{t('worldEditor.advanced.eventLevel')}</Text>
      <ChipRow
        value={levelCode}
        onChange={setLevel}
        options={doc.levels.map((lv) => ({ value: lv.code, label: lv.title || lv.code }))}
      />

      <Text style={styles.label}>{t('worldEditor.advanced.eventTriggerKind')}</Text>
      <ChipRow
        value={trigger.kind}
        onChange={(v) => setTriggerKind(v as CgTriggerPreset)}
        options={TRIGGER_KINDS.map((tr) => ({ value: tr.value, label: t(tr.labelKey) }))}
      />

      {(trigger.kind === 'enter_level' || trigger.kind === 'level_clear') && (
        <>
          <Text style={styles.label}>{t('worldEditor.advanced.eventTriggerLevel')}</Text>
          <ChipRow
            value={trigger.levelCode || levelCode}
            onChange={setLevel}
            options={doc.levels.map((lv) => ({ value: lv.code, label: lv.title || lv.code }))}
          />
        </>
      )}

      {trigger.kind === 'intent' ? (
        <>
          <Text style={styles.label}>{t('worldEditor.advanced.eventKeywords')}</Text>
          <TextInput
            style={styles.input}
            value={trigger.keywords || ''}
            onChangeText={(text) =>
              editor.updateFlowEvent(eventId, {
                trigger: serializeEventTrigger('intent', levelCode, text, trigger.flagId),
              })
            }
            placeholder={t('worldEditor.cg.keywordsPlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
          />
        </>
      ) : null}

      {trigger.kind === 'flag' ? (
        <>
          <Text style={styles.label}>{t('worldEditor.advanced.eventFlag')}</Text>
          {flags.length ? (
            <ChipRow
              value={trigger.flagId || ''}
              onChange={(id) =>
                editor.updateFlowEvent(eventId, {
                  trigger: serializeEventTrigger('flag', levelCode, trigger.keywords, id),
                })
              }
              options={[
                { value: '', label: t('worldEditor.advanced.pickPlaceholder') },
                ...flags.map((f) => ({ value: f.id, label: f.label })),
              ]}
            />
          ) : (
            <Text style={styles.hint}>{t('worldEditor.advanced.noFlags')}</Text>
          )}
        </>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.section}>{t('worldEditor.advanced.effectsTitle')}</Text>
      <Text style={styles.hint}>{t('worldEditor.advanced.effectsHint')}</Text>
      <View style={styles.row}>
        {EFFECT_KINDS.map((ef) => (
          <Pressable key={ef.value} style={styles.addChip} onPress={() => addEffect(ef.value)}>
            <Text style={styles.addChipText}>{t(ef.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {effects.map((ef, ei) => (
        <View key={`${ef.kind}-${ei}`} style={styles.effectCard}>
          <View style={styles.effectHeader}>
            <Text style={styles.effectTitle}>
              {t(EFFECT_KINDS.find((x) => x.value === ef.kind)?.labelKey || '')}
            </Text>
            <Pressable onPress={() => removeEffect(ei)} hitSlop={8}>
              <Text style={styles.danger}>{t('worldEditor.advanced.delete')}</Text>
            </Pressable>
          </View>

          {ef.kind === 'unlock_levels' ? (
            <ChipRow
              value={ef.unlockLevels?.[0] || ''}
              onChange={(code) => updateEffect(ei, { unlockLevels: code ? [code] : [] })}
              options={[
                { value: '', label: t('worldEditor.advanced.pickLevel') },
                ...doc.levels.map((lv) => ({ value: lv.code, label: lv.title || lv.code })),
              ]}
            />
          ) : null}

          {ef.kind === 'unlock_gallery' ? (
            <ChipRow
              value={ef.galleryIds?.[0] || ''}
              onChange={(id) => updateEffect(ei, { galleryIds: id ? [id] : [] })}
              options={[
                { value: '', label: t('worldEditor.advanced.pickGallery') },
                ...(doc.gallery || []).map((g) => ({
                  value: g.gallery_id,
                  label: g.title || g.gallery_id,
                })),
              ]}
            />
          ) : null}

          {ef.kind === 'set_flags' ? (
            flags.length ? (
              <ChipRow
                value={ef.flagIds?.[0] || ''}
                onChange={(id) => updateEffect(ei, { flagIds: id ? [id] : [] })}
                options={[
                  { value: '', label: t('worldEditor.advanced.pickPlaceholder') },
                  ...flags.map((f) => ({ value: f.id, label: f.label })),
                ]}
              />
            ) : (
              <Text style={styles.hint}>{t('worldEditor.advanced.noFlags')}</Text>
            )
          ) : null}

          {ef.kind === 'ending' ? (
            <ChipRow
              value={ef.endingId || ''}
              onChange={(id) => updateEffect(ei, { endingId: id })}
              options={[
                { value: '', label: t('worldEditor.advanced.pickEnding') },
                ...(doc.endings.nodes || []).map((n) => ({
                  value: n.ending_id,
                  label: n.title || n.ending_id,
                })),
              ]}
            />
          ) : null}

          {ef.kind === 'narration' ? (
            <TextInput
              style={styles.input}
              value={ef.narration || ''}
              onChangeText={(text) => updateEffect(ei, { narration: text })}
              placeholder={t('worldEditor.advanced.narrationPlaceholder')}
              placeholderTextColor={TOKENS.colors.textMuted}
            />
          ) : null}

          {ef.kind === 'bad_end' ? (
            <>
              <TextInput
                style={styles.input}
                value={ef.badEndHint || ''}
                onChangeText={(text) => updateEffect(ei, { badEndHint: text })}
                placeholder={t('worldEditor.advanced.badEndPlaceholder')}
                placeholderTextColor={TOKENS.colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={ef.rollbackCheckpoint || ''}
                onChangeText={(text) => updateEffect(ei, { rollbackCheckpoint: text })}
                placeholder={t('worldEditor.advanced.rollbackPlaceholder')}
                placeholderTextColor={TOKENS.colors.textMuted}
              />
            </>
          ) : null}

          <Text style={styles.meta}>{eventEffectSummary(ef, doc, flags)}</Text>
        </View>
      ))}

      <View style={styles.failBox}>
        <Pressable
          style={styles.checkRow}
          onPress={() =>
            editor.updateFlowEvent(eventId, {
              fail_hint_visible: !ev.fail_hint_visible,
              fail_hint: ev.fail_hint || t('worldEditor.advanced.failHintDefault'),
            })
          }
        >
          <View style={[styles.checkbox, ev.fail_hint_visible && styles.checkboxOn]} />
          <Text style={styles.hint}>{t('worldEditor.advanced.failHintToggle')}</Text>
        </Pressable>
        {ev.fail_hint_visible ? (
          <TextInput
            style={styles.input}
            value={ev.fail_hint || ''}
            onChangeText={(text) => editor.updateFlowEvent(eventId, { fail_hint: text })}
            placeholder={t('worldEditor.advanced.failHintPlaceholder')}
            placeholderTextColor={TOKENS.colors.textMuted}
          />
        ) : null}
      </View>

      <Pressable
        style={styles.dangerBtn}
        onPress={() => {
          editor.removeFlowNode({ kind: 'event', id: eventId });
          onDeleted?.();
        }}
      >
        <Text style={styles.dangerBtnText}>{t('worldEditor.advanced.deleteEvent')}</Text>
      </Pressable>
    </ScrollView>
  );
}

export function FlowInspector({ editor, selection, t, onOpenSimple, onDeleted }: Props) {
  const doc = editor.doc;
  if (!doc) return null;

  const linear = isLinearLevelTopology(doc);

  if (!selection) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.hint}>{t('worldEditor.advanced.inspectorEmpty')}</Text>
        <View style={[styles.banner, linear ? styles.bannerOk : styles.bannerWarn]}>
          <Text style={styles.bannerText}>
            {linear ? t('worldEditor.advanced.linearOk') : t('worldEditor.advanced.branched')}
          </Text>
        </View>
      </View>
    );
  }

  if (selection.kind === 'event') {
    return (
      <EventInspector editor={editor} eventId={selection.id} t={t} onDeleted={onDeleted} />
    );
  }

  if (selection.kind === 'level') {
    const lv = doc.levels.find((l) => l.code === selection.code);
    if (!lv) return null;
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        <DefaultCreateAgentSectionLabel label={t('worldEditor.advanced.inspectorLevel')} />
        <Text style={styles.title}>{lv.title}</Text>
        <Text style={styles.meta}>{lv.code}</Text>
        <Text style={styles.hint}>
          {t('worldEditor.advanced.unlockFrom')}: {(lv.unlock_from || []).join(', ') || '—'}
        </Text>
        <Pressable style={styles.chip} onPress={() => editor.makeStart(lv.code)}>
          <Text style={styles.chipText}>{t('worldEditor.advanced.asStart')}</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => onOpenSimple('levels')}>
          <Text style={styles.linkText}>{t('worldEditor.advanced.editInSimple')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (selection.kind === 'gallery') {
    const g = (doc.gallery || []).find((x) => x.gallery_id === selection.id);
    if (!g) return null;
    return (
      <View style={styles.wrap}>
        <DefaultCreateAgentSectionLabel label={t('worldEditor.advanced.inspectorGallery')} />
        <Text style={styles.title}>{g.title}</Text>
        <Text style={styles.meta}>{g.gallery_id}</Text>
        <Pressable style={styles.linkBtn} onPress={() => onOpenSimple('levels')}>
          <Text style={styles.linkText}>{t('worldEditor.advanced.editInSimple')}</Text>
        </Pressable>
      </View>
    );
  }

  const n = (doc.endings.nodes || []).find((x) => x.ending_id === selection.id);
  if (!n) return null;
  return (
    <View style={styles.wrap}>
      <DefaultCreateAgentSectionLabel label={t('worldEditor.advanced.inspectorEnding')} />
      <Text style={styles.title}>{n.title}</Text>
      <Text style={styles.meta}>{n.ending_id}</Text>
      <Pressable style={styles.linkBtn} onPress={() => onOpenSimple('endings')}>
        <Text style={styles.linkText}>{t('worldEditor.advanced.editInSimple')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  wrap: { gap: 10, padding: 12, paddingBottom: 28 },
  title: Typo({ color: TOKENS.colors.text, fontSize: 15, fontWeight: '700' }, 'sans'),
  meta: Typo({ color: TOKENS.colors.textMuted, fontSize: 11 }, 'mono'),
  hint: Typo({ color: TOKENS.colors.textSecondary, fontSize: 11, lineHeight: 16 }, 'sans'),
  label: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    'sans',
  ),
  section: Typo({ color: TOKENS.colors.textSecondary, fontSize: 12, fontWeight: '700' }, 'sans'),
  input: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: TOKENS.colors.text,
    fontSize: 13,
    backgroundColor: TOKENS.colors.cardSolid,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: TOKENS.colors.cardSolid,
    maxWidth: '100%',
  },
  chipOn: { borderColor: TOKENS.colors.accent, backgroundColor: 'rgba(232,93,117,0.12)' },
  chipText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 11, fontWeight: '600' }, 'sans'),
  chipTextOn: Typo({ color: TOKENS.colors.accent, fontSize: 11, fontWeight: '700' }, 'sans'),
  addChip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  addChipText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 10, fontWeight: '600' }, 'sans'),
  effectCard: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    backgroundColor: 'rgba(20,24,32,0.6)',
  },
  effectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  effectTitle: Typo({ color: TOKENS.colors.text, fontSize: 12, fontWeight: '700' }, 'sans'),
  danger: Typo({ color: TOKENS.colors.textMuted, fontSize: 11 }, 'sans'),
  divider: { height: 1, backgroundColor: TOKENS.colors.cardBorderFaint, marginVertical: 4 },
  failBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
  },
  checkboxOn: { backgroundColor: TOKENS.colors.accent, borderColor: TOKENS.colors.accent },
  dangerBtn: { paddingVertical: 10, alignItems: 'center' },
  dangerBtnText: Typo({ color: '#f87171', fontSize: 13, fontWeight: '600' }, 'sans'),
  banner: { borderWidth: 1, borderRadius: 10, padding: 10 },
  bannerOk: { borderColor: 'rgba(91,191,138,0.45)', backgroundColor: 'rgba(91,191,138,0.08)' },
  bannerWarn: { borderColor: 'rgba(186,60,71,0.45)', backgroundColor: 'rgba(186,60,71,0.1)' },
  bannerText: Typo({ color: TOKENS.colors.textSecondary, fontSize: 12, lineHeight: 18 }, 'sans'),
  linkBtn: { paddingVertical: 6 },
  linkText: Typo({ color: TOKENS.colors.accent, fontSize: 13, fontWeight: '600' }, 'sans'),
});

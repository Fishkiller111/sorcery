import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';
import type { RoleEventInput } from '../../types/api';
import {
  MAX_EVENT_DISPLAY_LEN,
  MAX_EVENT_SUFFIX_LEN,
  textLengthTrimmed,
} from '../../utils/roleForm';

const MAX_EVENTS = 6;
const EVENT_NAME_RE = /^[a-z][a-z0-9_]{0,31}$/;

const STANDARD_EVENT_NAMES = new Set([
  'pat_head',
  'poke_cheek',
  'hold_hand',
  'pat_shoulder',
  'hug',
  'wave',
]);

export function emptyRoleEvent(index: number): RoleEventInput {
  return {
    event_name: `action_${index + 1}`,
    display_name: '',
    prompt_suffix: '',
    sort_order: index,
    is_active: true,
  };
}

export function parseEditableEvents(
  events: Array<{ event_name: string; display_name: string; prompt_suffix?: string; sort_order: number; is_active?: boolean }>,
): RoleEventInput[] {
  return events
    .filter((e) => e.event_name !== 'welcome')
    .map((e, i) => ({
      event_name: e.event_name,
      display_name: e.display_name,
      prompt_suffix: e.prompt_suffix ?? '',
      sort_order: e.sort_order ?? i,
      is_active: e.is_active !== false,
    }));
}

type Props = {
  events: RoleEventInput[];
  onChange: (events: RoleEventInput[]) => void;
  disabled?: boolean;
  showHeader?: boolean;
  onError?: (msg: string | null) => void;
  /** Active Switch / accents — Default theme passes red (`TOKENS.colors.accent`). */
  accentColor?: string;
};

type EventRowProps = {
  ev: RoleEventInput;
  index: number;
  disabled?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<RoleEventInput>) => void;
  onRemove: () => void;
  accentColor: string;
  accentTrack: string;
};

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function EventRow({
  ev,
  index,
  disabled,
  expanded,
  onToggleExpand,
  onUpdate,
  onRemove,
  accentColor,
  accentTrack,
}: EventRowProps) {

  const { t, tp, lang } = useI18n();
  const isStandard = STANDARD_EVENT_NAMES.has(ev.event_name);
  const title = ev.display_name.trim() || ev.event_name || tp('events.item', { n: index + 1 });
  const promptPreview = ev.prompt_suffix.trim() || t('events.emptyPrompt');
  const inactive = ev.is_active === false;

  if (disabled) {
    return (
      <View style={[styles.rowCard, inactive && styles.rowCardInactive]}>
        <View style={styles.rowMain}>
          <Text style={Typo(styles.rowTitle, 'sans', lang)}>{title}</Text>
          <Text style={Typo(styles.rowPrompt, 'sans', lang)} numberOfLines={1}>
            {promptPreview}
          </Text>
        </View>
        {inactive ? <Text style={Typo(styles.inactiveBadge, 'sans', lang)}>{t('events.inactive')}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.rowCard, expanded && styles.rowCardExpanded, inactive && !expanded && styles.rowCardInactive]}>
      <View style={styles.rowHeader}>
        <Pressable style={styles.rowTapArea} onPress={onToggleExpand}>
          <View style={styles.rowMain}>
            <Text style={Typo(styles.rowTitle, 'sans', lang)} numberOfLines={1}>
              {title}
            </Text>
            {!expanded ? (
              <Text style={Typo(styles.rowPrompt, 'sans', lang)} numberOfLines={1}>
                {promptPreview}
              </Text>
            ) : null}
          </View>
          <Text style={Typo(styles.chevron, 'sans', lang)}>{expanded ? '▾' : '▸'}</Text>
        </Pressable>
        <Switch
          value={ev.is_active !== false}
          onValueChange={(v) => onUpdate({ is_active: v })}
          trackColor={{ false: COLORS.border, true: accentTrack }}
          thumbColor={ev.is_active !== false ? accentColor : COLORS.text.muted}
        />
      </View>

      {expanded ? (
        <View style={styles.rowBody}>
          <TextInput
            style={styles.input}
            value={ev.display_name}
            onChangeText={(v) => onUpdate({ display_name: v })}
            placeholder={t('events.displayName')}
            placeholderTextColor={COLORS.text.muted}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={ev.prompt_suffix}
            onChangeText={(v) => onUpdate({ prompt_suffix: v })}
            placeholder={t('events.promptSuffix')}
            placeholderTextColor={COLORS.text.muted}
            multiline
            numberOfLines={2}
          />
          {!isStandard ? (
            <TextInput
              style={[styles.input, styles.inputId]}
              value={ev.event_name}
              onChangeText={(v) => onUpdate({ event_name: v.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              placeholder={t('events.eventName')}
              placeholderTextColor={COLORS.text.muted}
              autoCapitalize="none"
            />
          ) : (
            <Text style={Typo(styles.idHint, 'sans', lang)}>{t('events.standardId')}: {ev.event_name}</Text>
          )}
          <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
            <Text style={Typo(styles.remove, 'sans', lang)}>{t('events.remove')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function RoleEventEditor({
  events,
  onChange,
  disabled,
  showHeader = true,
  onError,
  accentColor = COLORS.accent.gold,
}: Props) {
  const { t, lang } = useI18n();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const accentTrack = withAlpha(accentColor, 0.35);

  const update = (index: number, patch: Partial<RoleEventInput>) => {
    const next = events.map((ev, i) => (i === index ? { ...ev, ...patch } : ev));
    onChange(next);
    onError?.(null);
  };

  const addEvent = () => {
    if (events.length >= MAX_EVENTS) {
      onError?.(t('events.maxReached'));
      return;
    }
    const nextIndex = events.length;
    onChange([...events, emptyRoleEvent(nextIndex)]);
    setExpandedIndex(nextIndex);
    onError?.(null);
  };

  const removeEvent = (index: number) => {
    onChange(events.filter((_, i) => i !== index));
    setExpandedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const canAdd = events.length < MAX_EVENTS;

  return (
    <View>
      {showHeader ? (
        <>
          <Text style={Typo(styles.sectionTitle, 'display', lang)}>{t('events.title')}</Text>
          <Text style={Typo(styles.hint, 'sans', lang)}>{t('events.hint')}</Text>
        </>
      ) : null}

      <View style={styles.list}>
        {events.map((ev, index) => (
          <EventRow
            key={`${index}-${ev.event_name}`}
            ev={ev}
            index={index}
            disabled={disabled}
            expanded={!disabled && expandedIndex === index}
            onToggleExpand={() => toggleExpand(index)}
            onUpdate={(patch) => update(index, patch)}
            onRemove={() => removeEvent(index)}
            accentColor={accentColor}
            accentTrack={accentTrack}
          />
        ))}
      </View>

      {!disabled ? (
        <Pressable
          style={[
            styles.addBtn,
            { borderColor: canAdd ? accentColor : COLORS.border },
            canAdd && { backgroundColor: withAlpha(accentColor, 0.08) },
            !canAdd && styles.addBtnMuted,
          ]}
          onPress={addEvent}
          accessibilityRole="button"
          accessibilityLabel={t('events.add')}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={canAdd ? accentColor : COLORS.text.muted}
          />
          <Text
            style={Typo(
              canAdd
                ? { ...styles.addBtnText, color: accentColor }
                : styles.addBtnTextMuted,
              'sans',
              lang,
            )}
          >
            {t('events.add')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function validateRoleEvents(
  events: RoleEventInput[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  const names = new Set<string>();
  for (const ev of events) {
    const name = ev.event_name.trim();
    const display = ev.display_name.trim();
    const suffix = ev.prompt_suffix.trim();
    if (!EVENT_NAME_RE.test(name)) return t('events.invalidName');
    if (names.has(name)) return t('events.duplicateName');
    names.add(name);
    if (
      !display ||
      !suffix ||
      textLengthTrimmed(display) > MAX_EVENT_DISPLAY_LEN ||
      textLengthTrimmed(suffix) > MAX_EVENT_SUFFIX_LEN
    ) {
      return t('events.invalidFields');
    }
  }
  return null;
}

const styles = StyleSheet.create({
  sectionTitle: { color: COLORS.text.primary, fontSize: 16, fontWeight: '600', marginTop: 16 },
  hint: { color: COLORS.text.muted, fontSize: 12, marginTop: 4, marginBottom: 10 },
  list: { gap: 6 },
  rowCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(20,22,28,0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCardExpanded: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingBottom: 12,
  },
  rowCardInactive: { opacity: 0.55 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  rowTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: COLORS.text.primary, fontSize: 14, fontWeight: '600' },
  rowPrompt: { color: COLORS.text.muted, fontSize: 12, marginTop: 2 },
  chevron: { color: COLORS.text.muted, fontSize: 12, width: 14, textAlign: 'center' },
  inactiveBadge: { color: COLORS.text.muted, fontSize: 11 },
  rowBody: { width: '100%', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.text.primary,
    fontSize: 14,
    backgroundColor: 'rgba(10,11,15,0.5)',
  },
  inputMultiline: { minHeight: 48, maxHeight: 72, textAlignVertical: 'top' },
  inputId: { fontSize: 13 },
  idHint: { color: COLORS.text.muted, fontSize: 11 },
  removeBtn: { alignSelf: 'flex-start' },
  remove: { color: '#e57373', fontSize: 12 },
  addBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addBtnMuted: {
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },
  addBtnTextMuted: { color: COLORS.text.muted, fontSize: 14, fontWeight: '600' },
});

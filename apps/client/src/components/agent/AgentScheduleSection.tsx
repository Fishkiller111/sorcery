import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import type { Lang } from '../../i18n/types';
import { useI18n } from '../../i18n/I18nContext';
import { Typo } from '../../theme/typography';
import {
  AUTO_POST_TIMEZONE_OPTIONS,
  classifyScheduleWindow,
  clampMediaWeight,
  findTimezoneOption,
  formatHourLabel,
  timezoneOptionLabel,
} from '../../api/autopost';

const START_HOURS = Array.from({ length: 24 }, (_, i) => i);
const END_HOURS = Array.from({ length: 24 }, (_, i) => i + 1); // 1..24
const IS_WEB = Platform.OS === 'web';

type Props = {
  timezone: string;
  startHour: number;
  endHour: number;
  usingDefault: boolean;
  busy: boolean;
  accentColor: string;
  mutedColor: string;
  textColor: string;
  borderColor: string;
  chipBg: string;
  chipActiveBg: string;
  onChangeTimezone: (tz: string) => void;
  onChangeStartHour: (hour: number) => void;
  onChangeEndHour: (hour: number) => void;
  onResetDefault: () => void;
  onSave: () => void;
  mediaWeightStandard?: number;
  mediaWeightR?: number;
  mediaWeightMature?: number;
  onChangeMediaWeightStandard?: (n: number) => void;
  onChangeMediaWeightR?: (n: number) => void;
  onChangeMediaWeightMature?: (n: number) => void;
  SectionLabel?: React.ComponentType<{ label: string }>;
};

export function AgentScheduleSection({
  timezone,
  startHour,
  endHour,
  usingDefault,
  busy,
  accentColor,
  mutedColor,
  textColor,
  borderColor,
  chipBg,
  chipActiveBg,
  onChangeTimezone,
  onChangeStartHour,
  onChangeEndHour,
  onResetDefault,
  onSave,
  mediaWeightStandard = 80,
  mediaWeightR = 20,
  mediaWeightMature = 0,
  onChangeMediaWeightStandard,
  onChangeMediaWeightR,
  onChangeMediaWeightMature,
  SectionLabel,
}: Props) {
  const { t, tp, lang } = useI18n();
  const styles = useMemo(
    () =>
      createStyles({
        accentColor,
        mutedColor,
        textColor,
        borderColor,
        chipBg,
        chipActiveBg,
      }),
    [accentColor, mutedColor, textColor, borderColor, chipBg, chipActiveBg],
  );

  const kind = classifyScheduleWindow(startHour, endHour);
  const startLabel = formatHourLabel(startHour);
  const endLabel = formatHourLabel(endHour);
  const tzOpt = findTimezoneOption(timezone);
  const tzLabel = tzOpt
    ? `${timezoneOptionLabel(tzOpt, lang)} · ${tzOpt.offset}`
    : timezone;

  const rangeSummary =
    kind === 'all_day'
      ? tp('agent.scheduleSummaryAllDay', { tz: tzLabel })
      : kind === 'overnight'
        ? tp('agent.scheduleSummaryOvernight', {
            start: startLabel,
            end: endLabel,
            tz: tzLabel,
          })
        : tp('agent.scheduleSummarySameDay', {
            start: startLabel,
            end: endLabel,
            tz: tzLabel,
          });

  const kindHint =
    kind === 'all_day'
      ? t('agent.scheduleKindAllDay')
      : kind === 'overnight'
        ? t('agent.scheduleKindOvernight')
        : t('agent.scheduleKindSameDay');

  const mixTotal = mediaWeightStandard + mediaWeightR + mediaWeightMature;
  const mixPct = (n: number) => (mixTotal > 0 ? Math.round((n / mixTotal) * 100) : 0);
  const showMediaMix =
    IS_WEB && onChangeMediaWeightStandard && onChangeMediaWeightR && onChangeMediaWeightMature;

  return (
    <View style={styles.wrap}>
      {SectionLabel ? (
        <SectionLabel label={t('agent.scheduleTitle')} />
      ) : (
        <Text style={Typo(styles.title, 'sans', lang)}>{t('agent.scheduleTitle')}</Text>
      )}
      <Text style={Typo(styles.hint, 'sans', lang)}>{t('agent.scheduleHint')}</Text>
      <Text style={Typo(styles.hintSecondary, 'sans', lang)}>{t('agent.scheduleClockHint')}</Text>

      <View style={styles.summaryBox}>
        {usingDefault ? (
          <Text style={Typo(styles.badge, 'sans', lang)}>{t('agent.scheduleDefaultBadge')}</Text>
        ) : null}
        <Text style={Typo(styles.badgeCustom, 'sans', lang)}>{rangeSummary}</Text>
        <Text style={Typo(styles.kindTag, 'sans', lang)}>{kindHint}</Text>
      </View>

      <Text style={Typo(styles.label, 'sans', lang)}>{t('agent.scheduleTimezone')}</Text>
      <Text style={Typo(styles.fieldHint, 'sans', lang)}>{t('agent.scheduleTimezoneHint')}</Text>
      <ChipRail styles={styles}>
        {!tzOpt ? (
          <Pressable style={[styles.tzChip, styles.chipActive]}>
            <Text style={Typo(styles.chipTextActive, 'sans', lang)} numberOfLines={1}>
              {timezone}
            </Text>
          </Pressable>
        ) : null}
        {AUTO_POST_TIMEZONE_OPTIONS.map((opt) => {
          const active = opt.id === timezone;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChangeTimezone(opt.id)}
              style={[styles.tzChip, active && styles.chipActive]}
            >
              <Text style={Typo(active ? styles.chipTextActive : styles.chipText, 'sans', lang)} numberOfLines={1}>
                {timezoneOptionLabel(opt, lang)}
              </Text>
              <Text style={Typo(active ? styles.tzOffsetActive : styles.tzOffset, 'mono', lang)}>
                {opt.offset}
              </Text>
            </Pressable>
          );
        })}
      </ChipRail>

      <Text style={Typo(styles.label, 'sans', lang)}>{t('agent.scheduleStart')}</Text>
      <Text style={Typo(styles.fieldHint, 'sans', lang)}>{t('agent.scheduleStartHint')}</Text>
      <HourRow
        hours={START_HOURS}
        selected={startHour}
        onSelect={onChangeStartHour}
        styles={styles}
        lang={lang}
      />

      <Text style={Typo(styles.label, 'sans', lang)}>{t('agent.scheduleEnd')}</Text>
      <Text style={Typo(styles.fieldHint, 'sans', lang)}>{t('agent.scheduleEndHint')}</Text>
      <HourRow
        hours={END_HOURS}
        selected={endHour}
        onSelect={onChangeEndHour}
        styles={styles}
        lang={lang}
      />

      {showMediaMix ? (
        <View style={styles.mixWrap}>
          <Text style={Typo(styles.label, 'sans', lang)}>{t('agent.mediaMixTitle')}</Text>
          <Text style={Typo(styles.fieldHint, 'sans', lang)}>{t('agent.mediaMixHint')}</Text>
          <View style={styles.mixRow}>
            <MixField
              label={t('agent.mediaMixStandard')}
              value={mediaWeightStandard}
              onChange={onChangeMediaWeightStandard!}
              styles={styles}
              lang={lang}
            />
            <MixField
              label={t('agent.mediaMixR')}
              value={mediaWeightR}
              onChange={onChangeMediaWeightR!}
              styles={styles}
              lang={lang}
            />
            <MixField
              label={t('agent.mediaMixMature')}
              value={mediaWeightMature}
              onChange={onChangeMediaWeightMature!}
              styles={styles}
              lang={lang}
            />
          </View>
          <Text style={Typo(styles.kindTag, 'sans', lang)}>
            {tp('agent.mediaMixPreview', {
              standard: mixPct(mediaWeightStandard),
              r: mixPct(mediaWeightR),
              mature: mixPct(mediaWeightMature),
            })}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
          onPress={onResetDefault}
          disabled={busy}
        >
          <Text style={Typo(styles.btnGhostText, 'sans', lang)}>{t('agent.scheduleReset')}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed, busy && styles.disabled]}
          onPress={onSave}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <Text style={Typo(styles.btnPrimaryText, 'sans', lang)}>{t('agent.scheduleSave')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/** Web: wrap chips so mouse users can click without horizontal drag.
 *  Native: keep a sideways rail. */
function ChipRail({
  children,
  styles,
}: {
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  if (IS_WEB) {
    return <View style={styles.chipWrapRow}>{children}</View>;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
      {children}
    </ScrollView>
  );
}

function HourRow({
  hours,
  selected,
  onSelect,
  styles,
  lang,
}: {
  hours: number[];
  selected: number;
  onSelect: (h: number) => void;
  styles: ReturnType<typeof createStyles>;
  lang: Lang;
}) {
  return (
    <ChipRail styles={styles}>
      {hours.map((h) => {
        const active = h === selected;
        return (
          <Pressable
            key={h}
            onPress={() => onSelect(h)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={Typo(active ? styles.chipTextActive : styles.chipText, 'mono', lang)}>
              {String(h).padStart(2, '0')}
            </Text>
          </Pressable>
        );
      })}
    </ChipRail>
  );
}

function MixField({
  label,
  value,
  onChange,
  styles,
  lang,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  styles: ReturnType<typeof createStyles>;
  lang: Lang;
}) {
  return (
    <View style={styles.mixField}>
      <Text style={Typo(styles.mixFieldLabel, 'sans', lang)}>{label}</Text>
      <TextInput
        style={Typo(styles.mixInput, 'mono', lang)}
        value={String(value)}
        onChangeText={(text) => {
          const parsed = Number.parseInt(text.replace(/[^\d]/g, ''), 10);
          onChange(clampMediaWeight(Number.isFinite(parsed) ? parsed : 0));
        }}
        keyboardType="number-pad"
        maxLength={3}
        accessibilityLabel={label}
      />
    </View>
  );
}

function createStyles(c: {
  accentColor: string;
  mutedColor: string;
  textColor: string;
  borderColor: string;
  chipBg: string;
  chipActiveBg: string;
}) {
  return StyleSheet.create({
    wrap: { gap: 10, marginTop: 8 },
    title: { color: c.textColor, fontSize: 15, fontWeight: '600' },
    hint: { color: c.mutedColor, fontSize: 12, lineHeight: 18 },
    hintSecondary: { color: c.mutedColor, fontSize: 12, lineHeight: 18, marginTop: -4 },
    fieldHint: { color: c.mutedColor, fontSize: 11, lineHeight: 16, marginTop: -2 },
    summaryBox: {
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderColor,
      backgroundColor: c.chipBg,
    },
    badge: { color: c.mutedColor, fontSize: 11 },
    badgeCustom: { color: c.accentColor, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    kindTag: { color: c.textColor, fontSize: 12, lineHeight: 17 },
    label: { color: c.textColor, fontSize: 13, marginTop: 4 },
    mixWrap: { gap: 8, marginTop: 4 },
    mixRow: { flexDirection: 'row', gap: 8 },
    mixField: { flex: 1, gap: 4 },
    mixFieldLabel: { color: c.mutedColor, fontSize: 11, fontWeight: '600' },
    mixInput: {
      borderWidth: 1,
      borderColor: c.borderColor,
      backgroundColor: c.chipBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: c.textColor,
      fontSize: 14,
      fontWeight: '700',
    },
    hourRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
    chipWrapRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingVertical: 4,
      width: '100%',
    },
    chip: {
      minWidth: 40,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderColor,
      backgroundColor: c.chipBg,
      alignItems: 'center',
    },
    tzChip: {
      minWidth: 108,
      maxWidth: 160,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.borderColor,
      backgroundColor: c.chipBg,
      gap: 2,
    },
    chipActive: {
      borderColor: c.accentColor,
      backgroundColor: c.chipActiveBg,
    },
    chipText: { color: c.mutedColor, fontSize: 12 },
    chipTextActive: { color: c.accentColor, fontSize: 12, fontWeight: '700' },
    tzOffset: { color: c.mutedColor, fontSize: 10 },
    tzOffsetActive: { color: c.accentColor, fontSize: 10, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    btnGhost: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderColor,
      alignItems: 'center',
    },
    btnGhostText: { color: c.textColor, fontSize: 13 },
    btnPrimary: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.accentColor,
      alignItems: 'center',
    },
    btnPrimaryText: { color: '#0a0b0f', fontSize: 13, fontWeight: '700' },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
  });
}

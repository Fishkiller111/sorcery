import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchLiveContests } from '../../api/contests';
import type { ContestListItem } from '../../types/api';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { useI18n } from '../../i18n/I18nContext';

/** 进行中的造角赛题面提示（无 live 赛季时不渲染） */
export function ContestThemeStrip() {
  const router = useRouter();
  const { lang } = useI18n();
  const [contest, setContest] = useState<ContestListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await fetchLiveContests();
        const first = resp.items?.[0];
        if (!cancelled && first?.theme_title) setContest(first);
        else if (!cancelled) setContest(null);
      } catch {
        if (!cancelled) setContest(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!contest?.theme_title) return null;

  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={() => router.push(`/contest/${encodeURIComponent(contest.slug)}`)}
      accessibilityRole="button"
    >
      <Text style={Typo(styles.label, 'sans', lang)}>本期造角赛</Text>
      <Text style={Typo(styles.title, 'serif', lang)} numberOfLines={2}>
        {contest.theme_title}
      </Text>
      <Text style={Typo(styles.hint, 'sans', lang)}>公开后将自动参赛 · 查看规则</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg.elevated,
  },
  pressed: { opacity: 0.92 },
  label: { color: COLORS.soviet.embroideryLight, fontSize: 12, marginBottom: 4 },
  title: { color: COLORS.text.primary, fontSize: 16, lineHeight: 22 },
  hint: { color: COLORS.text.muted, fontSize: 12, marginTop: 6 },
});

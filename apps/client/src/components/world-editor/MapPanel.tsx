import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { SimpleWorldEditorState } from './useSimpleWorldEditor';
import { ensureLevelMapLayout } from '../../lib/worldDocument';
import { uploadWorldAsset } from '../../api/worldEditor';
import { ApiError } from '../../api/client';
import { pickWorldEditorImage } from '../../utils/pickRoleImage';
import { resolveStaticUrl } from '../../constants/config';
import { notifyError } from '../../utils/notify';
import { DefaultCreateAgentSectionLabel } from '../../pages/default/components/create-agent/DefaultCreateAgentSectionLabel';
import { TOKENS } from '../../pages/default/theme/tokens';
import { Typo } from '../../theme/typography';

type Props = {
  editor: SimpleWorldEditorState;
  t: (key: string) => string;
};

export function MapPanel({ editor, t }: Props) {
  const doc = editor.doc!;
  const worldId = editor.world?.world_id || '';
  const mapOn = (doc.entries.enabled || []).includes('map');
  const primary = doc.entries.primary || 'level_list';
  const [uploading, setUploading] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>{t('worldEditor.map.hint')}</Text>

      <Pressable
        onPress={() => editor.setMapEnabled(!mapOn)}
        style={[styles.toggle, mapOn && styles.toggleOn]}
      >
        <Text style={styles.toggleText}>
          {mapOn ? t('worldEditor.map.enabled') : t('worldEditor.map.disabled')}
        </Text>
      </Pressable>

      {mapOn ? (
        <>
          <DefaultCreateAgentSectionLabel label={t('worldEditor.map.primary')} />
          <View style={styles.row}>
            {(['level_list', 'map'] as const).map((p) => {
              const active = primary === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => editor.setPrimaryEntry(p)}
                  style={[styles.chip, active && styles.chipOn]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextOn]}>
                    {t(`worldEditor.map.entry.${p === 'level_list' ? 'levels' : 'map'}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <DefaultCreateAgentSectionLabel label={t('worldEditor.map.image')} />
          {doc.entries.map_image ? (
            <Image
              source={{ uri: resolveStaticUrl(doc.entries.map_image) }}
              style={styles.mapPreview}
              contentFit="cover"
            />
          ) : null}
          <Pressable
            style={styles.secondaryBtn}
            disabled={uploading || !worldId}
            onPress={() => {
              void (async () => {
                try {
                  const picked = await pickWorldEditorImage('map');
                  if (!picked || !worldId) return;
                  setUploading(true);
                  const resp = await uploadWorldAsset(worldId, 'map', picked.file, picked.filename);
                  editor.setMapImage(resp.url);
                } catch (e) {
                  notifyError(e instanceof ApiError ? e.message : t('worldEditor.uploadFailed'));
                } finally {
                  setUploading(false);
                }
              })();
            }}
          >
            {uploading ? (
              <ActivityIndicator color={TOKENS.colors.accent} size="small" />
            ) : (
              <Text style={styles.secondaryBtnText}>
                {doc.entries.map_image ? t('worldEditor.map.replaceImage') : t('worldEditor.map.uploadImage')}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => editor.resetMapLayout()}
          >
            <Text style={styles.secondaryBtnText}>{t('worldEditor.map.resetLayout')}</Text>
          </Pressable>

          <DefaultCreateAgentSectionLabel label={t('worldEditor.map.pins')} />
          <View style={styles.pinBoard}>
            {ensureLevelMapLayout(doc).levels.map((lv) => (
              <View
                key={lv.code}
                style={[
                  styles.pin,
                  {
                    left: `${lv.map_position?.x ?? 20}%`,
                    top: `${lv.map_position?.y ?? 30}%`,
                  },
                ]}
              >
                <Text style={styles.pinText} numberOfLines={1}>
                  {lv.title}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>{t('worldEditor.map.advancedDrag')}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10, marginTop: 4 },
  hint: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, lineHeight: 18 }, 'sans'),
  toggle: {
    minHeight: 42,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  toggleOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.18)',
  },
  toggleText: Typo({ color: TOKENS.colors.text, fontSize: 14, fontWeight: '600' }, 'sans'),
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    borderRadius: TOKENS.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: {
    borderColor: TOKENS.colors.accent,
    backgroundColor: 'rgba(186,60,71,0.18)',
  },
  chipText: Typo({ color: TOKENS.colors.textMuted, fontSize: 12, fontWeight: '600' }, 'sans'),
  chipTextOn: { color: TOKENS.colors.text },
  secondaryBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radius.button,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(8,10,15,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: Typo({ color: TOKENS.colors.text, fontSize: 13, fontWeight: '600' }, 'sans'),
  mapPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: TOKENS.radius.card,
    backgroundColor: '#111',
  },
  pinBoard: {
    height: 200,
    borderRadius: TOKENS.radius.card,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: 'rgba(20,24,36,0.9)',
    position: 'relative',
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    maxWidth: 100,
    marginLeft: -40,
    marginTop: -12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: TOKENS.colors.accent,
  },
  pinText: Typo({ color: '#fff', fontSize: 10, fontWeight: '700' }, 'sans'),
});

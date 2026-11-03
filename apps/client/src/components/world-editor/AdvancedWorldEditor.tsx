import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SimpleWorldEditorState } from './useSimpleWorldEditor';
import { WorldFlowCanvas } from './WorldFlowCanvas';
import { FlowInspector } from './FlowInspector';
import type { FlowLinkFrom, FlowSelect } from '../../lib/worldFlowCanvas';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { TOKENS } from '../../pages/default/theme/tokens';
import { Typo } from '../../theme/typography';
import type { WorldEditorTab } from '../../types/worldDocument';
import { notifyError, notifySuccess } from '../../utils/notify';

type Props = {
  editor: SimpleWorldEditorState;
  t: (key: string) => string;
  worldId: string;
  /** When true, parent shell owns back / mode toggle — hide local chrome. */
  embedded?: boolean;
};

type PaletteBlock = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  bg: string;
  onPress: () => void;
};

export function AdvancedWorldEditor({ editor, t, worldId, embedded }: Props) {
  const isDesktop = useIsDesktop();
  const [selection, setSelection] = useState<FlowSelect | null>(null);
  const [linkFrom, setLinkFrom] = useState<FlowLinkFrom | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [canvasKey, setCanvasKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doc = editor.doc;
  if (!doc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={TOKENS.colors.accent} />
      </View>
    );
  }

  const selectedLevelCode =
    selection?.kind === 'level'
      ? selection.code
      : selection?.kind === 'event'
        ? doc.events.find((e) => e.event_id === selection.id)?.level_code
        : undefined;

  const onOpenSimple = useCallback(
    (tab: WorldEditorTab) => {
      editor.exitCanvasMode(tab);
    },
    [editor],
  );

  const exportJson = useCallback(() => {
    const body = editor.exportDocumentJson();
    if (!body) return;
    const name = (doc.identity.title || 'world').replace(/[\\/:*?"<>|]+/g, '_');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([body], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.world.json`;
      a.click();
      URL.revokeObjectURL(url);
      notifySuccess(t('worldEditor.advanced.exportOk'));
      return;
    }
    notifySuccess(t('worldEditor.advanced.exportOk'));
  }, [doc.identity.title, editor, t]);

  const importJson = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      fileInputRef.current?.click();
      return;
    }
    notifyError(t('worldEditor.advanced.importWebOnly'));
  }, [t]);

  const onFilePicked = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!parsed || typeof parsed !== 'object') {
          notifyError(t('worldEditor.advanced.importInvalid'));
          return;
        }
        editor.replaceDocument(parsed);
        setSelection(null);
        setLinkFrom(null);
        setCanvasKey((k) => k + 1);
        notifySuccess(t('worldEditor.advanced.importOk'));
      } catch {
        notifyError(t('worldEditor.advanced.importInvalid'));
      }
    },
    [editor, t],
  );

  const addTriggerEvent = useCallback(
    (kind: 'enter_level' | 'level_clear' | 'intent' | 'flag') => {
      if (!selectedLevelCode) {
        notifyError(t('worldEditor.advanced.pickLevelFirst'));
        return;
      }
      const levelCode = selectedLevelCode;
      const eventId = editor.addFlowEvent(levelCode, kind);
      if (!eventId) return;
      setExpanded((prev) => ({ ...prev, [levelCode]: true }));
      setSelection({ kind: 'event', id: eventId });
    },
    [editor, selectedLevelCode, t],
  );

  const blocks: PaletteBlock[] = [
    {
      key: 'level',
      icon: 'map-outline',
      label: t('worldEditor.advanced.blockLevel'),
      tint: '#0284c7',
      bg: 'rgba(14,165,233,0.12)',
      onPress: () => editor.addFlowLevel(),
    },
    {
      key: 'gallery',
      icon: 'image-outline',
      label: t('worldEditor.advanced.blockGallery'),
      tint: '#7c3aed',
      bg: 'rgba(139,92,246,0.12)',
      onPress: () => editor.addFlowGallery(),
    },
    {
      key: 'ending',
      icon: 'trophy-outline',
      label: t('worldEditor.advanced.blockEnding'),
      tint: '#b45309',
      bg: 'rgba(245,158,11,0.12)',
      onPress: () => editor.addFlowEnding(),
    },
  ];

  const triggers: PaletteBlock[] = [
    {
      key: 'enter',
      icon: 'enter-outline',
      label: t('worldEditor.advanced.triggerEnter'),
      tint: '#047857',
      bg: 'rgba(16,185,129,0.12)',
      onPress: () => addTriggerEvent('enter_level'),
    },
    {
      key: 'clear',
      icon: 'checkmark-circle-outline',
      label: t('worldEditor.advanced.triggerClear'),
      tint: '#0369a1',
      bg: 'rgba(14,165,233,0.12)',
      onPress: () => addTriggerEvent('level_clear'),
    },
    {
      key: 'intent',
      icon: 'chatbubble-ellipses-outline',
      label: t('worldEditor.advanced.triggerIntent'),
      tint: '#4338ca',
      bg: 'rgba(99,102,241,0.12)',
      onPress: () => addTriggerEvent('intent'),
    },
    {
      key: 'flag',
      icon: 'flag-outline',
      label: t('worldEditor.advanced.triggerFlag'),
      tint: '#9f1239',
      bg: 'rgba(244,63,94,0.12)',
      onPress: () => addTriggerEvent('flag'),
    },
  ];

  return (
    <View style={styles.root}>
      {!embedded ? (
        <View style={styles.topBar}>
          <Pressable onPress={() => editor.exitCanvasMode('overview')} hitSlop={10}>
            <Text style={styles.back}>{t('worldEditor.advanced.backToSimple')}</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {t('worldEditor.advanced.canvasTitle')}
          </Text>
          <View style={styles.topActions}>
            <Pressable style={styles.iconBtn} onPress={exportJson}>
              <Ionicons name="download-outline" size={18} color={TOKENS.colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={importJson}>
              <Ionicons name="cloud-upload-outline" size={18} color={TOKENS.colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => void editor.save()}
              disabled={editor.saving || !editor.dirty}
              style={[styles.primaryBtn, (!editor.dirty || editor.saving) && styles.btnDisabled]}
            >
              {editor.saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {editor.dirty ? t('worldEditor.save') : t('worldEditor.saved')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.embeddedActions}>
          <Pressable style={styles.iconBtn} onPress={exportJson}>
            <Ionicons name="download-outline" size={18} color={TOKENS.colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={importJson}>
            <Ionicons name="cloud-upload-outline" size={18} color={TOKENS.colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => void editor.save()}
            disabled={editor.saving || !editor.dirty}
            style={[styles.primaryBtn, (!editor.dirty || editor.saving) && styles.btnDisabled]}
          >
            {editor.saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {editor.dirty ? t('worldEditor.save') : t('worldEditor.saved')}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {Platform.OS === 'web'
        ? React.createElement('input', {
            ref: (el: HTMLInputElement | null) => {
              fileInputRef.current = el;
            },
            type: 'file',
            accept: 'application/json,.json',
            style: { display: 'none' },
            onChange: (e: { target: { files?: FileList | null } }) => {
              const file = e.target.files?.[0];
              if (file) void onFilePicked(file);
              if (fileInputRef.current) fileInputRef.current.value = '';
            },
          })
        : null}

      <Text style={styles.subtitle}>
        {editor.world?.code || worldId}
        {editor.dirty ? ` · ${t('worldEditor.dirty')}` : ''}
      </Text>

      <View style={[styles.body, !isDesktop && styles.bodyMobile]}>
        <View style={[styles.palette, !isDesktop && styles.paletteMobile]}>
          <Text style={styles.paletteTitle}>{t('worldEditor.advanced.palette')}</Text>
          <View style={styles.blockGrid}>
            {blocks.map((b) => (
              <Pressable
                key={b.key}
                style={({ pressed }) => [styles.blockCard, pressed && styles.blockPressed]}
                onPress={b.onPress}
              >
                <View style={[styles.blockIconWrap, { backgroundColor: b.bg }]}>
                  <Ionicons name={b.icon} size={18} color={b.tint} />
                </View>
                <Text style={styles.blockLabel}>{b.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.paletteDivider} />
          <Text style={styles.paletteTitle}>{t('worldEditor.advanced.triggers')}</Text>
          <Text style={styles.paletteHint}>{t('worldEditor.advanced.triggersHint')}</Text>
          <View style={styles.triggerGrid}>
            {triggers.map((b) => (
              <Pressable
                key={b.key}
                style={({ pressed }) => [styles.triggerCard, pressed && styles.blockPressed]}
                onPress={b.onPress}
              >
                <Ionicons name={b.icon} size={16} color={b.tint} />
                <Text style={styles.triggerLabel}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.canvasWrap}>
          <WorldFlowCanvas
            key={canvasKey}
            doc={doc}
            selection={selection}
            linkFrom={linkFrom}
            expanded={expanded}
            onSelect={setSelection}
            onToggleExpand={(code) =>
              setExpanded((prev) => ({ ...prev, [code]: !prev[code] }))
            }
            onRequestLink={(from) => setLinkFrom(from)}
            onCancelLink={() => setLinkFrom(null)}
            onDropLink={(to) => {
              if (!linkFrom) return;
              editor.connectFlow(linkFrom, to);
              setLinkFrom(null);
            }}
            onRemoveLink={(link) => editor.disconnectFlow(link)}
            onRemoveNode={(sel) => {
              editor.removeFlowNode(sel);
              setSelection(null);
            }}
            onMoveLevel={editor.moveFlowLevel}
            onMoveGallery={editor.moveFlowGallery}
            onMoveEnding={editor.moveFlowEnding}
            onOrganize={() => {
              editor.organizeFlow();
              setCanvasKey((k) => k + 1);
            }}
          />
        </View>

        <View style={[styles.inspector, !isDesktop && styles.inspectorMobile]}>
          <FlowInspector
            editor={editor}
            selection={selection}
            t={t}
            onOpenSimple={(tab) => onOpenSimple(tab)}
            onDeleted={() => setSelection(null)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 10, minHeight: 560 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 240 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: Typo({ color: TOKENS.colors.accent, fontSize: 14, fontWeight: '600' }, 'sans'),
  title: Typo({ flex: 1, color: TOKENS.colors.text, fontSize: 18, fontWeight: '700' }, 'serif'),
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  embeddedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: TOKENS.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  primaryBtnText: Typo({ color: '#fff', fontSize: 13, fontWeight: '700' }, 'sans'),
  btnDisabled: { opacity: 0.45 },
  subtitle: Typo({ color: TOKENS.colors.textMuted, fontSize: 12 }, 'mono'),
  body: { flex: 1, flexDirection: 'row', gap: 0, minHeight: 480 },
  bodyMobile: { flexDirection: 'column' },
  palette: {
    width: 216,
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8,10,15,0.45)',
  },
  paletteMobile: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.cardBorderFaint,
  },
  paletteTitle: Typo(
    {
      color: TOKENS.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  paletteHint: Typo({ color: TOKENS.colors.textMuted, fontSize: 9, lineHeight: 13 }, 'sans'),
  paletteDivider: {
    height: 1,
    backgroundColor: TOKENS.colors.cardBorderFaint,
    marginTop: 4,
  },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  blockCard: {
    width: '31%',
    minWidth: 58,
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  blockPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  blockIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockLabel: Typo({ color: TOKENS.colors.text, fontSize: 10, fontWeight: '600' }, 'sans'),
  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  triggerCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  triggerLabel: Typo({ color: TOKENS.colors.text, fontSize: 11, fontWeight: '600' }, 'sans'),
  canvasWrap: { flex: 1, minHeight: 420, minWidth: 0 },
  inspector: {
    width: 300,
    borderLeftWidth: 1,
    borderLeftColor: TOKENS.colors.cardBorderFaint,
    backgroundColor: 'rgba(8,10,15,0.45)',
  },
  inspectorMobile: { width: '100%', borderLeftWidth: 0 },
});

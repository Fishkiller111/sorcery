import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { resolveLocalized } from '../../i18n/utils';
import { resolveImage } from '../../utils/assets';
import type { LocalizedString } from '../../i18n/types';

export interface ParallelGalleryCell {
  id: string;
  label?: LocalizedString;
  standardImage?: string;
  matureImage?: string;
}

interface ParallelGalleryModalProps {
  visible: boolean;
  title: LocalizedString;
  caption?: LocalizedString;
  cells: ParallelGalleryCell[];
  matureEnabled: boolean;
  onClose: () => void;
}

export function ParallelGalleryModal({
  visible,
  title,
  caption,
  cells,
  matureEnabled,
  onClose,
}: ParallelGalleryModalProps) {

  const { lang, t } = useI18n();
  const [index, setIndex] = useState(0);
  const cell = cells[index];
  const imagePath = cell
    ? matureEnabled
      ? cell.matureImage || cell.standardImage
      : cell.standardImage || cell.matureImage
    : undefined;
  const imageSource = imagePath ? resolveImage(imagePath) : undefined;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={Typo(styles.title, 'display', lang)}>{resolveLocalized(title, lang)}</Text>
          {caption ? (
            <Text style={Typo(styles.caption, 'sans', lang)}>{resolveLocalized(caption, lang)}</Text>
          ) : null}
          <View style={styles.imageWrap}>
            {imageSource ? (
              <Image source={imageSource} style={styles.image} contentFit="contain" />
            ) : (
              <View style={styles.placeholder}>
                <Text style={Typo(styles.placeholderText, 'sans', lang)}>{t('gallery.branchLocked')}</Text>
              </View>
            )}
          </View>
          {cell?.label ? (
            <Text style={Typo(styles.cellLabel, 'sans', lang)}>{resolveLocalized(cell.label, lang)}</Text>
          ) : null}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, index <= 0 && styles.navDisabled]}
              disabled={index <= 0}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
            >
              <Text style={Typo(styles.navText, 'sans', lang)}>{t('gallery.prev')}</Text>
            </TouchableOpacity>
            <Text style={Typo(styles.counter, 'mono', lang)}>
              {index + 1}/{cells.length}
            </Text>
            <TouchableOpacity
              style={[styles.navBtn, index >= cells.length - 1 && styles.navDisabled]}
              disabled={index >= cells.length - 1}
              onPress={() => setIndex((i) => Math.min(cells.length - 1, i + 1))}
            >
              <Text style={Typo(styles.navText, 'sans', lang)}>{t('gallery.next')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={Typo(styles.closeText, 'sans', lang)}>{t('gallery.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    backgroundColor: COLORS.bg.elevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.35)',
    padding: 16,
    maxHeight: '92%',
  },
  title: { color: COLORS.accent.gold, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  caption: { color: COLORS.text.secondary, fontSize: 13, marginTop: 8, textAlign: 'center' },
  imageWrap: {
    marginTop: 14,
    height: 360,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: COLORS.text.secondary },
  cellLabel: { color: COLORS.text.primary, fontSize: 14, marginTop: 10, textAlign: 'center' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navDisabled: { opacity: 0.35 },
  navText: { color: COLORS.accent.gold, fontSize: 14 },
  counter: { color: COLORS.text.secondary, fontSize: 13 },
  closeBtn: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeText: { color: COLORS.text.secondary, fontSize: 14 },
});

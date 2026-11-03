import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Cropper, { type Area } from 'react-easy-crop';
import { useI18n } from '../../i18n/I18nContext';
import { COLORS } from '../../theme/colors';
import { Typo } from '../../theme/typography';
import { MessageHost } from '../ui/Message';
import type { CroppedAreaPixels } from '../../utils/cropAvatarImage';
import type { AvatarCropModalProps, CropModalVariant } from './AvatarCropModal.types';

import 'react-easy-crop/react-easy-crop.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const VARIANTS: Record<
  CropModalVariant,
  {
    aspect: number;
    cropShape: 'round' | 'rect';
    cropHeightMax: number;
    titleKey: string;
    confirmKey: string;
    cancelKey: string;
    zoomInKey: string;
    zoomOutKey: string;
  }
> = {
  avatar: {
    aspect: 1,
    cropShape: 'round',
    cropHeightMax: 360,
    titleKey: 'profile.avatarCropTitle',
    confirmKey: 'profile.avatarCropConfirm',
    cancelKey: 'profile.avatarCropCancel',
    zoomInKey: 'profile.avatarCropZoomIn',
    zoomOutKey: 'profile.avatarCropZoomOut',
  },
  figure: {
    aspect: 9 / 16,
    cropShape: 'rect',
    cropHeightMax: 480,
    titleKey: 'createAgent.figureCropTitle',
    confirmKey: 'profile.avatarCropConfirm',
    cancelKey: 'profile.avatarCropCancel',
    zoomInKey: 'profile.avatarCropZoomIn',
    zoomOutKey: 'profile.avatarCropZoomOut',
  },
};

/** Web 裁切 Modal：react-easy-crop 拖拽/缩放，确认时输出像素区域。 */
export function AvatarCropModal({
  visible,
  imageUri,
  loading = false,
  onConfirm,
  onCancel,
  variant = 'avatar',
}: AvatarCropModalProps) {
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const cropAreaRef = useRef<CroppedAreaPixels | null>(null);
  const config = VARIANTS[variant];

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const cardWidth = Math.min(Math.round(windowWidth * 0.92), 420);
  const cropHeight = Math.round(Math.min(windowWidth * 0.85, config.cropHeightMax));

  useEffect(() => {
    if (!visible) return;
    // 每次打开 Modal 或换图时重置裁切状态。
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    cropAreaRef.current = null;
  }, [visible, imageUri]);

  /** 将 react-easy-crop 的像素矩形同步到 ref，供确认按钮读取。 */
  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    cropAreaRef.current = areaPixels;
  }, []);

  /** 读取 ref 中最新裁切区域并回调 onConfirm。 */
  const handleConfirm = useCallback(() => {
    const area = cropAreaRef.current;
    if (!area || loading) return;
    onConfirm(area);
  }, [loading, onConfirm]);

  /** 步进调整缩放比例。 */
  const nudgeZoom = useCallback((delta: number) => {
    setZoom((value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((value + delta).toFixed(2)))));
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: cardWidth }]}>
          <Text style={styles.title}>{t(config.titleKey)}</Text>

          <View style={[styles.cropHost, { height: cropHeight }]}>
            {imageUri ? (
              <Cropper
                image={imageUri}
                crop={crop}
                zoom={zoom}
                aspect={config.aspect}
                cropShape={config.cropShape}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            ) : null}
          </View>

          <View style={styles.zoomRow}>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => nudgeZoom(-0.1)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t(config.zoomOutKey)}
            >
              <Text style={styles.zoomBtnText}>−</Text>
            </Pressable>
            <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
            <Pressable
              style={styles.zoomBtn}
              onPress={() => nudgeZoom(0.1)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t(config.zoomInKey)}
            >
              <Text style={styles.zoomBtnText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{t(config.cancelKey)}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.confirmBtn, loading && styles.actionBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.accent.red} />
              ) : (
                <Text style={styles.confirmText}>{t(config.confirmKey)}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1a1816',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 62, 62, 0.35)',
    padding: 16,
    gap: 14,
    maxWidth: '100%',
  },
  title: Typo(
    {
      color: '#d1cec7',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 1,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    'display',
  ),
  cropHost: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#0d0c0b',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196, 62, 62, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: Typo(
    {
      color: '#d1cec7',
      fontSize: 20,
      lineHeight: 22,
      fontWeight: '600',
    },
    'sans',
  ),
  zoomLabel: Typo(
    {
      color: '#8a8278',
      fontSize: 13,
      minWidth: 48,
      textAlign: 'center',
    },
    'mono',
  ),
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionBtnDisabled: {
    opacity: 0.65,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(138, 130, 120, 0.45)',
  },
  confirmBtn: {
    borderWidth: 1,
    borderColor: 'rgba(196, 62, 62, 0.55)',
    backgroundColor: 'rgba(196, 62, 62, 0.12)',
  },
  cancelText: Typo(
    {
      color: '#8a8278',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'sans',
  ),
  confirmText: Typo(
    {
      color: COLORS.accent.red,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    'display',
  ),
});

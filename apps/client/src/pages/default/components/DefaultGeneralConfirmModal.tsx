import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typo } from '../../../theme/typography';
import { themedScrollViewProps } from '../../../theme/webScrollbar';
import { useI18n } from '../../../i18n/I18nContext';
import { TOKENS } from '../theme/tokens';
import type { ConfirmModalIcon, GeneralConfirmModalProps } from '../../../components/ui/GeneralConfirmModal';
import { MessageHost } from '../../../components/ui/Message';

export const DEFAULT_BODY_MAX_HEIGHT = 220;

const ICON_MAP: Record<ConfirmModalIcon, keyof typeof Ionicons.glyphMap> = {
  globe: 'globe-outline',
  star: 'sparkles-outline',
  warning: 'alert-circle-outline',
  trash: 'trash-outline',
};

type PanelProps = Omit<GeneralConfirmModalProps, 'visible' | 'dismissOnBackdrop'>;

function DefaultModalButton({
  label,
  variant,
  onPress,
  disabled,
  loading,
  width,
}: {
  label: string;
  variant: 'primary' | 'secondary';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  width?: number;
}) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.modalBtn,
        isPrimary ? styles.modalBtnPrimary : styles.modalBtnSecondary,
        width != null ? { width } : styles.modalBtnFlex,
        (disabled || loading) && styles.modalBtnDisabled,
        pressed && !disabled && !loading && styles.modalBtnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? '#fff' : TOKENS.colors.text} />
      ) : (
        <Text
          style={[styles.modalBtnText, isPrimary ? styles.modalBtnTextPrimary : styles.modalBtnTextSecondary]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function DefaultConfirmModalPanel({
  icon,
  title,
  subtitle,
  subtitleTone = 'warning',
  bodyMaxHeight = DEFAULT_BODY_MAX_HEIGHT,
  bodyMinHeight,
  cardWidth: cardWidthOverride,
  confirmBtnWidthRatio,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
  hideCancel,
  hideConfirm,
  hideTitle,
  bodyContent,
  footerExtra,
}: PanelProps) {
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('default'), []);
  const scrollWebStyle = scrollWebProps.style as object | undefined;

  const cardWidth = cardWidthOverride ?? Math.min(Math.round(windowWidth * 0.92), 560);
  const padH = 28;
  const innerWidth = cardWidth - padH * 2;
  const footerBtnGap = hideCancel ? 0 : 12;
  const footerBtnCount = hideCancel ? 1 : 2;
  const footerBtnWidth = (innerWidth - footerBtnGap * (footerBtnCount - 1)) / footerBtnCount;
  const confirmBtnWidth =
    hideCancel && confirmBtnWidthRatio != null
      ? Math.round(innerWidth * confirmBtnWidthRatio)
      : footerBtnWidth;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={ICON_MAP[icon]} size={26} color={TOKENS.colors.accent} />
        </View>
      ) : null}

      {hideTitle ? null : (
        <Text style={styles.title} numberOfLines={4}>
          {title}
        </Text>
      )}

      {bodyContent ? (
        <ScrollView
          {...scrollWebProps}
          style={[
            styles.bodyScroll,
            { maxHeight: bodyMaxHeight },
            bodyMinHeight != null ? { minHeight: bodyMinHeight } : null,
            scrollWebStyle,
          ]}
          contentContainerStyle={styles.bodyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {bodyContent}
        </ScrollView>
      ) : subtitle ? (
        subtitleTone === 'body' ? (
          <ScrollView
            {...scrollWebProps}
            style={[
              styles.bodyScroll,
              { maxHeight: bodyMaxHeight },
              bodyMinHeight != null ? { minHeight: bodyMinHeight } : null,
              scrollWebStyle,
            ]}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.bodyText}>{subtitle}</Text>
          </ScrollView>
        ) : (
          <Text style={styles.subtitleWarning} numberOfLines={4}>
            {subtitle}
          </Text>
        )
      ) : null}

      <View style={styles.footerBlock}>
        {footerExtra ? <View style={styles.footerExtra}>{footerExtra}</View> : null}

        {!hideConfirm ? (
          <View style={[styles.footerRow, hideCancel && confirmBtnWidthRatio != null && styles.footerRowCentered]}>
            {!hideCancel ? (
              <DefaultModalButton
                variant="secondary"
                label={cancelLabel ?? t('confirmModal.cancel')}
                onPress={onCancel}
                disabled={loading}
              />
            ) : null}
            <DefaultModalButton
              variant="primary"
              label={confirmLabel}
              onPress={onConfirm}
              disabled={loading}
              loading={loading}
              width={hideCancel && confirmBtnWidthRatio != null ? confirmBtnWidth : undefined}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function DefaultGeneralConfirmModal({
  visible,
  dismissOnBackdrop = true,
  onCancel,
  ...panelProps
}: GeneralConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {dismissOnBackdrop ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityRole="button" />
        ) : null}
        <DefaultConfirmModalPanel {...panelProps} onCancel={onCancel} />
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 8, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    maxWidth: '100%',
    borderRadius: TOKENS.radius.cardLg,
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorder,
    backgroundColor: TOKENS.colors.cardSolid,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 16,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
        } as object)
      : {}),
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: TOKENS.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(186, 60, 71, 0.28)',
    backgroundColor: 'rgba(186, 60, 71, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: Typo(
    {
      color: TOKENS.colors.text,
      fontSize: 22,
      lineHeight: 28,
      textAlign: 'center',
    },
    'serif',
  ),
  subtitleWarning: Typo(
    {
      color: TOKENS.colors.accent,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      fontWeight: '600',
    },
    'sans',
  ),
  bodyScroll: {
    width: '100%',
  },
  bodyScrollContent: {
    paddingVertical: 2,
  },
  bodyText: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 15,
      lineHeight: 24,
      textAlign: 'left',
    },
    'sans',
  ),
  footerBlock: {
    gap: 14,
    marginTop: 4,
  },
  footerExtra: {
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerRowCentered: {
    justifyContent: 'center',
  },
  modalBtn: {
    minHeight: 46,
    borderRadius: TOKENS.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBtnFlex: {
    flex: 1,
  },
  modalBtnPrimary: {
    backgroundColor: TOKENS.colors.accent,
  },
  modalBtnSecondary: {
    backgroundColor: 'rgba(8, 9, 13, 0.55)',
    borderWidth: 1,
    borderColor: TOKENS.colors.cardBorderFaint,
  },
  modalBtnDisabled: {
    opacity: 0.55,
  },
  modalBtnPressed: {
    transform: [{ scale: 0.98 }],
  },
  modalBtnText: Typo(
    {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    'sans',
  ),
  modalBtnTextPrimary: {
    color: '#fff',
  },
  modalBtnTextSecondary: {
    color: TOKENS.colors.text,
  },
});

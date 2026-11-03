import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Typo } from '../../theme/typography';
import { themedScrollViewProps } from '../../theme/webScrollbar';
import { DividerStar } from './DividerStar';
import { useI18n } from '../../i18n/I18nContext';
import { MessageHost } from './Message';

const FRAME_SRC = { width: 1060, height: 693 };
const FRAME_CAP = { left: 88, top: 80, right: 88, bottom: 80 };

const BTN_CANCEL_SRC = { width: 494, height: 132 };
const BTN_CONFIRM_SRC = { width: 483, height: 134 };
const BTN_CAP = { left: 44, top: 44, right: 44, bottom: 44 };

const ICON_SRC = { width: 243, height: 205 };

const OFF_WHITE = '#d1cec7';
const RED = '#c43e3e';
const LABEL = '#8a8278';

const ICON_SOURCES = {
  globe: require('../../../assets/images/ui/modal/icon_globe.png'),
  star: require('../../../assets/images/ui/modal/icon_star.png'),
  warning: require('../../../assets/images/ui/modal/icon_warning.png'),
  trash: require('../../../assets/images/ui/modal/icon_trash.png'),
} as const;

export type ConfirmModalIcon = keyof typeof ICON_SOURCES;

export const BODY_MAX_HEIGHT = 150;

export type GeneralConfirmModalProps = {
  visible: boolean;
  icon?: ConfirmModalIcon;
  title: string;
  subtitle?: string;
  subtitleTone?: 'warning' | 'body';
  bodyMaxHeight?: number;
  bodyMinHeight?: number;
  cardWidth?: number;
  confirmBtnWidthRatio?: number;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  dismissOnBackdrop?: boolean;
  hideCancel?: boolean;
  hideConfirm?: boolean;
  hideTitle?: boolean;
  bodyContent?: React.ReactNode;
  footerExtra?: React.ReactNode;
};

function ModalButton({
  source,
  label,
  labelColor,
  fontSize,
  height,
  width,
  onPress,
  disabled,
  loading,
}: {
  source: number;
  label: string;
  labelColor: string;
  fontSize: number;
  height: number;
  width?: number;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const sized = width != null;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        sized ? styles.modalBtnWrapSized : styles.modalBtnWrap,
        { height, opacity: disabled ? 0.55 : 1 },
        sized ? { width } : null,
      ]}
    >
      <ImageBackground
        source={source}
        style={[
          styles.modalBtnBg,
          { height },
          sized ? { width } : styles.modalBtnBgFluid,
        ]}
        imageStyle={styles.modalBtnImage}
        resizeMode="stretch"
        capInsets={BTN_CAP}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <Text
            style={[styles.modalBtnText, { color: labelColor, fontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
          >
            {label}
          </Text>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
}

export function ConfirmModalPanel({
  icon,
  title,
  subtitle,
  subtitleTone = 'warning',
  bodyMaxHeight = BODY_MAX_HEIGHT,
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
}: Omit<GeneralConfirmModalProps, 'visible' | 'dismissOnBackdrop'>) {
  const { t } = useI18n();
  const { width: windowWidth } = useWindowDimensions();
  const scrollWebProps = useMemo(() => themedScrollViewProps('soviet'), []);
  const scrollWebStyle = scrollWebProps.style as object | undefined;

  const cardWidth = useMemo(
    () => cardWidthOverride ?? Math.min(Math.round(windowWidth * 0.88), 520),
    [cardWidthOverride, windowWidth],
  );
  const frameRefHeight = useMemo(
    () => Math.round(cardWidth * (FRAME_SRC.height / FRAME_SRC.width)),
    [cardWidth],
  );
  const padH = Math.round(cardWidth * 0.1);
  const padTop = Math.round(frameRefHeight * 0.12);
  const padBottom = Math.round(frameRefHeight * 0.1);
  const iconWidth = Math.round(cardWidth * 0.22);
  const iconHeight = Math.round(iconWidth * (ICON_SRC.height / ICON_SRC.width));
  const titleFontSize = Math.round(cardWidth * 0.048);
  const subtitleFontSize = Math.round(cardWidth * 0.028);
  const modalBtnFontSize = Math.round(cardWidth * 0.03);
  const innerWidth = cardWidth - padH * 2;
  const footerBtnGap = hideCancel ? 0 : 10;
  const footerBtnCount = hideCancel ? 1 : 2;
  const footerBtnWidth = (innerWidth - footerBtnGap * (footerBtnCount - 1)) / footerBtnCount;
  const confirmBtnWidth =
    hideCancel && confirmBtnWidthRatio != null
      ? Math.round(innerWidth * confirmBtnWidthRatio)
      : footerBtnWidth;
  const modalBtnHeight = Math.round(
    confirmBtnWidth / (BTN_CONFIRM_SRC.width / BTN_CONFIRM_SRC.height),
  );

  return (
    <View style={[styles.cardOuter, { width: cardWidth }]}>
      <ImageBackground
        source={require('../../../assets/images/ui/modal/confirm_modal_frame.png')}
        style={styles.frame}
        imageStyle={styles.stretchImage}
        resizeMode="stretch"
        capInsets={FRAME_CAP}
      >
        <View style={[styles.content, { paddingHorizontal: padH, paddingTop: padTop, paddingBottom: padBottom }]}>
          {icon ? (
            <Image source={ICON_SOURCES[icon]} style={{ width: iconWidth, height: iconHeight, alignSelf: 'center' }} resizeMode="contain" />
          ) : null}

          {hideTitle ? null : (
            <Text
              style={[styles.title, { fontSize: titleFontSize, lineHeight: titleFontSize + 5 }]}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
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
              >
                <Text
                  style={[styles.bodySubtitle, { fontSize: subtitleFontSize, lineHeight: subtitleFontSize + 6 }]}
                >
                  {subtitle}
                </Text>
              </ScrollView>
            ) : (
              <Text
                style={[styles.subtitle, { fontSize: subtitleFontSize, lineHeight: subtitleFontSize + 6 }]}
                numberOfLines={4}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {subtitle}
              </Text>
            )
          ) : null}

          <View style={styles.footerBlock}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <DividerStar size={Math.round(cardWidth * 0.022)} color={RED} opacity={0.9} />
              <View style={styles.dividerLine} />
            </View>

            {footerExtra}

            {!hideConfirm ? (
              <View
                style={[
                  styles.footerRow,
                  hideCancel && confirmBtnWidthRatio != null ? styles.footerRowCentered : null,
                ]}
              >
                {!hideCancel ? (
                  <ModalButton
                    source={require('../../../assets/images/ui/modal/confirm_btn_cancel.png')}
                    height={modalBtnHeight}
                    label={cancelLabel ?? t('confirmModal.cancel')}
                    labelColor={LABEL}
                    fontSize={modalBtnFontSize}
                    onPress={onCancel}
                    disabled={loading}
                  />
                ) : null}
                <ModalButton
                  source={require('../../../assets/images/ui/modal/confirm_btn_confirm.png')}
                  height={modalBtnHeight}
                  width={hideCancel && confirmBtnWidthRatio != null ? confirmBtnWidth : undefined}
                  label={confirmLabel}
                  labelColor={RED}
                  fontSize={modalBtnFontSize}
                  onPress={onConfirm}
                  disabled={loading}
                  loading={loading}
                />
              </View>
            ) : null}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

export function GeneralConfirmModal({
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
        <ConfirmModalPanel {...panelProps} onCancel={onCancel} />
      </View>
      {visible ? <MessageHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cardOuter: {
    maxWidth: '100%',
    alignSelf: 'center',
  },
  frame: {
    width: '100%',
  },
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    gap: 12,
  },
  footerBlock: {
    gap: 10,
  },
  title: Typo(
    {
      color: OFF_WHITE,
      fontWeight: '700',
      letterSpacing: 1.2,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    'display',
  ),
  subtitle: Typo(
    {
      color: RED,
      fontWeight: '600',
      letterSpacing: 0.8,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    'sans',
  ),
  bodyScroll: {
    width: '100%',
  },
  bodyScrollContent: {
    paddingVertical: 2,
  },
  bodySubtitle: Typo(
    {
      color: LABEL,
      fontWeight: '500',
      letterSpacing: 0.4,
      textAlign: 'center',
    },
    'sans',
  ),
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: RED,
    opacity: 0.35,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerRowCentered: {
    justifyContent: 'center',
  },
  modalBtnWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  modalBtnWrapSized: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  modalBtnBg: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  modalBtnBgFluid: {
    width: '100%',
  },
  modalBtnImage: {
    width: '100%',
    height: '100%',
  },
  modalBtnText: Typo(
    {
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    'display',
  ),
});

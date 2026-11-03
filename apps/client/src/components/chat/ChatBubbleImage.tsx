import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  Platform,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChatImageLightboxProps = {
  uri: string | null;
  onClose: () => void;
};

/** Full-screen chat image preview; tap anywhere / close button to dismiss. */
export function ChatImageLightbox({ uri, onClose }: ChatImageLightboxProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = !!uri;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <View style={[styles.closeWrap, { top: insets.top + 8, right: insets.right + 12 }]} pointerEvents="box-none">
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: width * 0.96, height: height * 0.86 }}
            contentFit="contain"
            accessibilityLabel="full size image"
          />
        ) : null}
      </Pressable>
    </Modal>
  );
}

type ChatBubbleImageProps = {
  uri: string;
  accessibilityLabel?: string;
  maxWidth?: number;
};

const DEFAULT_ASPECT = 3 / 4;

/**
 * Chat inline image: keeps natural aspect ratio (no cover crop), tap to open lightbox.
 */
export function ChatBubbleImage({ uri, accessibilityLabel, maxWidth }: ChatBubbleImageProps) {
  const { width: winW } = useWindowDimensions();
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const boxW = Math.min(maxWidth ?? 240, Math.max(160, winW * 0.55));

  useEffect(() => {
    setAspect(DEFAULT_ASPECT);
  }, [uri]);

  const onLoad = useCallback((e: { source: { width: number; height: number } }) => {
    const w = e?.source?.width;
    const h = e?.source?.height;
    if (w > 0 && h > 0) {
      setAspect(w / h);
    }
  }, []);

  return (
    <>
      <Pressable
        onPress={() => setPreviewUri(uri)}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel || 'Open image'}
        style={({ pressed }) => [styles.thumbWrap, pressed && styles.thumbPressed]}
      >
        <Image
          source={{ uri }}
          style={[styles.thumb, { width: boxW, aspectRatio: aspect }]}
          contentFit="contain"
          onLoad={onLoad}
          accessibilityLabel={accessibilityLabel || 'image'}
        />
      </Pressable>
      <ChatImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  thumbWrap: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
    ...(Platform.OS === 'web' ? ({ cursor: 'zoom-in' } as object) : {}),
  },
  thumbPressed: {
    opacity: 0.88,
  },
  thumb: {
    maxWidth: '100%',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeWrap: {
    position: 'absolute',
    zIndex: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

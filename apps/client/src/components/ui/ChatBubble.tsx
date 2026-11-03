import React from 'react';
import {
  ImageBackground,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  ImageSourcePropType,
  ImageStyle,
} from 'react-native';

type ChatBubbleProps = {
  children: React.ReactNode;
  backgroundImage?: ImageSourcePropType;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  capInsets?: { left: number; top: number; right: number; bottom: number };
  glassStyle?: object;
};

/**
 * iOS (esp. Fabric / large capInsets) can collapse ImageBackground to 0 height when
 * left+right capInsets exceed the bubble width. Prefer solid fill on native.
 */
const USE_IMAGE_BACKGROUND = Platform.OS === 'web';

export function ChatBubble({
  children,
  backgroundImage,
  backgroundColor = 'rgba(18, 20, 26, 0.94)',
  borderColor = 'rgba(232, 213, 181, 0.28)',
  borderRadius = 6,
  style,
  contentStyle,
  imageStyle,
  capInsets,
  glassStyle,
}: ChatBubbleProps) {
  const shellStyle: ViewStyle = {
    borderRadius,
    borderWidth: 1,
    borderColor,
    overflow: 'hidden',
    backgroundColor,
  };

  if (USE_IMAGE_BACKGROUND && backgroundImage) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={[styles.shell, shellStyle, style]}
        imageStyle={[styles.backgroundImage, imageStyle]}
        resizeMode="stretch"
        capInsets={capInsets}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.shell, shellStyle, glassStyle, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  backgroundImage: {
    borderRadius: 0,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

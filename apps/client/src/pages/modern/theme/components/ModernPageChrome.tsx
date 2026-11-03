import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModernPageBackground } from './ModernPageBackground';
import { ModernLeftRail } from './ModernLeftRail';
import { ModernSubNav } from './ModernSubNav';
import { TOKENS } from '../tokens';

type ModernPageChromeProps = {
  children: React.ReactNode;
  /** 全屏浮层（不受 content maxWidth 约束），用于首页右侧操作链等 */
  overlay?: React.ReactNode;
  scrollable?: boolean;
  showEyeBg?: boolean;
  showSubNav?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  onGearPress?: () => void;
};

export function ModernPageChrome({
  children,
  overlay,
  scrollable = true,
  showEyeBg = true,
  showSubNav = true,
  contentStyle,
  onGearPress,
}: ModernPageChromeProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const leftPad = TOKENS.modePage.railWidth + 12;
  const handleGearPress = onGearPress ?? (() => router.push('/settings'));

  const body = (
    <View
      style={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingBottom: showSubNav ? 24 : Math.max(insets.bottom, 16) + 12,
          paddingLeft: leftPad,
          paddingRight: Math.max(insets.right, 16) + 8,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {showEyeBg ? <ModernPageBackground /> : null}
      <View style={styles.body}>
        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={styles.static}>{body}</View>
        )}
      </View>
      {showSubNav ? <ModernSubNav /> : null}
      {overlay ? (
        <View style={styles.overlay} pointerEvents="box-none">
          {overlay}
        </View>
      ) : null}
      <ModernLeftRail onGearPress={handleGearPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: TOKENS.modePage.bgPure,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    minHeight: 0,
    zIndex: 10,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
  },
  static: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 15,
  },
});
